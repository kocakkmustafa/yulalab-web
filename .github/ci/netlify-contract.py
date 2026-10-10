"""Validate packaged adapter artifacts, never deployment or runtime acceptance."""
import argparse
import gzip
import hashlib
import io
import json
import re
import tarfile
import tomllib
import zipfile
from collections import deque
from pathlib import Path, PurePosixPath

HANDLER = "___netlify-server-handler"
MIDDLEWARE = "___netlify-edge-handler-src-middleware"
GENERATOR = "@netlify/plugin-nextjs@5.16.2"
MIDDLEWARE_PATTERN = (
    r"^(?:/(_next/data/[^/]{1,}))?(?:/((?!api|_next|_vercel|.*\..*).*))"
    r"(\.json|\.rsc|\.segments/.+\.segment\.rsc)?[/#\?]?$"
)
EDGE_DIRECTORY = ".netlify/edge-functions-dist"
PROOF_PLUGIN = "./.github/netlify/artifact-proof"
# Fail closed on excessive archives/graphs; fixtures use smaller patched limits.
TAR_LIMITS = {"compressed_bytes": 64 * 1024 * 1024, "expanded_bytes": 128 * 1024 * 1024,
              "members": 20000, "namespace": 50000, "path_bytes": 4096, "depth": 128,
              "manifest_bytes": 64 * 1024 * 1024, "logical_files": 1000000,
              "logical_bytes": 1024 * 1024 * 1024, "logical_depth": 128,
              "reported_links": 64}


class ContractError(ValueError):
    pass


def require(condition, message):
    # Unlike assert, contract checks must remain active under python -O.
    if not condition:
        raise ContractError(message)


def regular_file(root, relative):
    relative = Path(relative)
    require(not relative.is_absolute() and ".." not in relative.parts, "unsafe artifact path")
    path = root
    for part in relative.parts:
        path = path / part
        require(not path.is_symlink(), f"symlink artifact path: {relative}")
    require(path.is_file(), f"missing artifact: {relative}")
    return path


def output_directory(directory):
    # Output roots are supplied by Netlify's lifecycle constants, never by a
    # function manifest. Check original components before resolving the path.
    directory = Path(directory)
    require(directory.is_absolute() and ".." not in directory.parts, "unsafe output directory")
    require(directory != Path(directory.anchor), "filesystem root is not an output directory")
    current = Path(directory.anchor)
    for part in directory.parts[1:]:
        current = current / part
        require(not current.is_symlink(), "symlink output directory")
    require(directory.is_dir(), "missing output directory")
    return directory


def safe_archive_name(name):
    path = PurePosixPath(name)
    return bool(name) and not path.is_absolute() and ".." not in path.parts and "\\" not in name


def check_eszip(data):
    # Bounds of the pinned bundler's ESZIP_V2 sections and header checksum.
    # This is deliberately not a semantic ESZIP parser or runtime execution.
    require(data[:8] == b"ESZIP_V2", "unsupported eszip header")
    offset = 8
    for section in ("header", "sources", "source maps"):
        require(offset + 4 <= len(data), f"truncated eszip {section} length")
        length = int.from_bytes(data[offset:offset + 4], "big")
        offset += 4
        require(offset + length <= len(data), f"truncated eszip {section}")
        contents = data[offset:offset + length]
        offset += length
        if section == "header":
            require(MIDDLEWARE.encode() in contents, "eszip middleware entry missing")
            require(offset + 32 <= len(data), "truncated eszip header checksum")
            require(data[offset:offset + 32] == hashlib.sha256(contents).digest(), "eszip header checksum mismatch")
            offset += 32
        elif section == "sources":
            require(length > 0, "empty eszip sources")
    require(offset == len(data), "unexpected eszip trailing bytes")


def tar_require(condition, message, member):
    require(condition, f"{message}: name={member.name[:512]!r}, "
            f"type={member.type.hex()}, link={member.linkname[:512]!r}")


def tar_member_name(member):
    name = member.name
    tar_require(len(name.encode()) <= TAR_LIMITS["path_bytes"]
                and len(PurePosixPath(name).parts) <= TAR_LIMITS["depth"], "tar path bounds exceeded", member)
    tar_require(safe_archive_name(name) and "\0" not in name
                and not re.match(r"^[A-Za-z]:", name), "unsafe tar member path", member)
    normalized = str(PurePosixPath(name))
    tar_require(normalized != "." and not re.match(r"^[A-Za-z]:", normalized),
                "empty or drive-qualified tar member path", member)
    tar_require(member.isdir() or not name.endswith("/"), "non-directory tar path has trailing slash", member)
    return normalized


def tar_link_target(member, name, directories):
    target = member.linkname
    tar_require(len(target.encode()) <= TAR_LIMITS["path_bytes"]
                and len(target.split("/")) <= TAR_LIMITS["depth"], "tar link bounds exceeded", member)
    tar_require(bool(target) and "\0" not in target and "\\" not in target
                and not PurePosixPath(target).is_absolute()
                and not re.match(r"^[A-Za-z]:", str(PurePosixPath(target))),
                "unsafe tar link target", member)
    # Symlink targets start at their parent; hardlink targets start at archive root.
    parts = list(PurePosixPath(name).parent.parts) if member.issym() else []
    components = target.split("/")
    for index, component in enumerate(components):
        if component == "..":
            tar_require(bool(parts), "tar link escapes archive root", member)
            parts.pop()
        elif component not in ("", "."):
            parts.append(component)
        tar_require(len(parts) <= TAR_LIMITS["depth"], "tar target depth exceeded", member)
        if index < len(components) - 1 and parts:
            # Check raw traversal too: link/../file must not cross a link or a file.
            tar_require("/".join(parts) in directories, "tar link traverses a non-directory", member)
    tar_require(bool(parts), "empty tar link target", member)
    return "/".join(parts)


def tar_manifest_bytes(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode()


def check_tar(data):
    require(len(data) <= TAR_LIMITS["compressed_bytes"], "tar compressed byte bound exceeded")
    # Bounded decompression still consumes/validates gzip trailer and CRC on PASS.
    with gzip.GzipFile(fileobj=io.BytesIO(data)) as compressed:
        expanded = compressed.read(TAR_LIMITS["expanded_bytes"] + 1)
    require(len(expanded) <= TAR_LIMITS["expanded_bytes"], "tar expanded byte bound exceeded")
    members = {}
    regular_files = set()
    records = {}
    with tarfile.open(fileobj=io.BytesIO(expanded), mode="r:") as archive:
        for member in archive:
            require(len(members) < TAR_LIMITS["members"], "tar member bound exceeded")
            name = tar_member_name(member)
            tar_require(name not in members, "duplicate tar member", member)
            members[name] = member
            tar_require(member.sparse is None, "tar sparse members are forbidden", member)
            regular = member.type in (tarfile.REGTYPE, tarfile.AREGTYPE) and member.sparse is None
            tar_require(regular or member.isdir() or member.issym() or member.islnk(),
                        "tar special members are forbidden", member)
            if regular:
                regular_files.add(name)
                tar_require(0 <= member.size <= TAR_LIMITS["expanded_bytes"], "tar file size bound exceeded", member)
                digest = hashlib.sha256()
                length = 0
                with archive.extractfile(member) as stream:
                    while chunk := stream.read(1024 * 1024):
                        digest.update(chunk)
                        length += len(chunk)
                tar_require(length == member.size, "truncated tar member", member)
                records[name] = {"name": name, "kind": "file", "bytes": length, "sha256": digest.hexdigest()}
            else:
                tar_require(member.size == 0, "tar non-file must not contain payload", member)

        directories = {name for name, member in members.items() if member.isdir()}
        namespace = set(members)
        for name, member in members.items():
            for parent in PurePosixPath(name).parents:
                if str(parent) != ".":
                    tar_require(str(parent) not in members or members[str(parent)].isdir(),
                                "tar member ancestor is not a directory", member)
                    directories.add(str(parent))
                    namespace.add(str(parent))
                    require(len(namespace) + 1 <= TAR_LIMITS["namespace"], "tar namespace bound exceeded")
        directories.add(".")  # Internal root node; archive root members/targets remain forbidden.
        for name in directories:
            records[name] = {"name": name, "kind": "directory", "explicit": name in members}
        link_targets = {}
        for name, member in members.items():
            if member.issym() or member.islnk():
                target = tar_link_target(member, name, directories)
                # Direct link-to-link and traversal through a link remain forbidden.
                tar_require(target in regular_files or member.issym() and target in directories,
                            "tar link target is not a real file or directory", member)
                link_targets[name] = target
                records[name] = {"name": name, "kind": "symlink" if member.issym() else "hardlink",
                                 "rawTarget": member.linkname, "target": target}
    require(f"{MIDDLEWARE}.js" in regular_files, "tar middleware entry missing")
    require(len(records) <= TAR_LIMITS["namespace"], "tar namespace bound exceeded")

    # Bound/hash canonical metadata before allocating the graph or closure rows.
    manifest = hashlib.sha256()
    manifest_size = 0
    for name in sorted(records):
        row = tar_manifest_bytes(records[name]) + b"\n"
        manifest_size += len(row)
        require(manifest_size <= TAR_LIMITS["manifest_bytes"], "tar manifest byte bound exceeded")
        manifest.update(row)

    # Entire archive namespace, including implicit directories and every target.
    # Directory-child + link-target edges form a closed graph; never follow links
    # on disk or expand virtual alias trees. Bottom-up processing rejects cycles.
    children = {name: [] for name in records}
    for name in records:
        if name != ".":
            children[str(PurePosixPath(name).parent)].append(name)
    for name, target in link_targets.items():
        children[name].append(target)
    parents = {name: [] for name in records}
    pending = {name: len(edges) for name, edges in children.items()}
    for name, edges in children.items():
        for child in edges:
            parents[child].append(name)
    ready = deque(name for name, count in pending.items() if count == 0)
    closure_hashes = {}
    file_counts = {}
    byte_counts = {}
    depths = {}
    while ready:
        name = ready.popleft()
        file_counts[name] = 1 if name in regular_files else sum(file_counts[child] for child in children[name])
        require(file_counts[name] <= TAR_LIMITS["logical_files"], "tar logical closure bound exceeded")
        byte_counts[name] = records[name]["bytes"] if name in regular_files else sum(byte_counts[child] for child in children[name])
        depths[name] = 1 + max((depths[child] for child in children[name]), default=0)
        require(byte_counts[name] <= TAR_LIMITS["logical_bytes"], "tar logical byte bound exceeded")
        require(depths[name] <= TAR_LIMITS["logical_depth"], "tar logical depth bound exceeded")
        closure_hashes[name] = hashlib.sha256(tar_manifest_bytes({"entry": records[name],
            "children": [[child, closure_hashes[child]] for child in sorted(children[name])]})).hexdigest()
        for parent in parents[name]:
            pending[parent] -= 1
            if pending[parent] == 0:
                ready.append(parent)
    require(len(closure_hashes) == len(records), "tar link/directory cycle")
    for name, target in link_targets.items():
        tar_require(file_counts[target] > 0, "tar directory target has no regular file leaves", members[name])

    reported = []
    for name in sorted(link_targets)[:TAR_LIMITS["reported_links"]]:
        target = link_targets[name]
        label = {key: value[:512] if isinstance(value, str) else value for key, value in records[name].items()}
        reported.append({**label, "metadataTruncated": any(isinstance(value, str) and len(value) > 512
                         for value in records[name].values()), "targetKind": records[target]["kind"],
                         "closureSha256": closure_hashes[target], "regularFileLeaves": file_counts[target],
                         "logicalBytes": byte_counts[target], "logicalDepth": depths[target]})
    return {"archiveSha256": hashlib.sha256(data).hexdigest(), "compressedBytes": len(data),
            "expandedBytes": len(expanded), "memberCount": len(members), "namespaceCount": len(records),
            "regularFileCount": len(regular_files), "directoryCount": len(directories) - 1,
            "linkCount": len(link_targets), "manifestSha256": manifest.hexdigest(),
            "closureSha256": closure_hashes["."], "logicalRegularFileLeaves": file_counts["."],
            "logicalBytes": byte_counts["."], "logicalDepth": depths["."],
            "links": reported, "reportedLinkCount": len(reported),
            "allLinksManifestCovered": True, "linkProofsTruncated": len(reported) < len(link_targets),
            "limits": dict(TAR_LIMITS)}


def validate(root, *, functions_dist=None, edge_functions_dist=None, publish_swapped=False):
    root = Path(root).resolve()
    require((functions_dist is None) == (edge_functions_dist is None), "both provider output roots are required")
    provider_outputs = functions_dist is not None
    require(not publish_swapped or provider_outputs, "publish swap requires provider output roots")
    build_directory = ".netlify/.next" if publish_swapped else ".next"
    static_directory = ".next" if publish_swapped else ".netlify/static"
    functions_directory = output_directory(functions_dist if provider_outputs else root / ".netlify/functions")
    edge_directory = output_directory(edge_functions_dist if provider_outputs else root / EDGE_DIRECTORY)

    def read(relative):
        return regular_file(root, relative).read_bytes()

    def read_json(relative):
        return json.loads(read(relative))

    config = tomllib.loads(read("netlify.toml").decode())
    require(config["build"]["command"] == "pnpm build", "build command mismatch")
    require(config["build"]["publish"] == ".next", "publish directory mismatch")
    require(config["build"]["environment"] == {"NODE_VERSION": "26.9.0", "PNPM_VERSION": "10.33.0"}, "build environment mismatch")
    require(config["plugins"] == [{"package": PROOF_PLUGIN}, {"package": "@netlify/plugin-nextjs"}], "build plugin mismatch")
    package = read_json("package.json")
    require(package["devDependencies"]["@netlify/plugin-nextjs"] == "5.16.2", "adapter version mismatch")
    require(config["headers"] == [{"for": "/portfolio-registry.json", "values": {
        "Access-Control-Allow-Origin": "https://links.yulalab.com",
        "Access-Control-Allow-Methods": "GET",
        "Cache-Control": "public, max-age=300, must-revalidate",
    }}], "registry headers mismatch")

    build_id = read(f"{build_directory}/BUILD_ID").decode().strip()
    require(len(build_id) > 5, "missing build identity")
    require(read(f".netlify/functions-internal/{HANDLER}/.next/BUILD_ID").decode().strip() == build_id, "handler build identity mismatch")
    require(read("public/portfolio-registry.json") == read(f"{static_directory}/portfolio-registry.json"), "registry byte mismatch")
    functions = json.loads(regular_file(functions_directory, "manifest.json").read_bytes())
    require(isinstance(functions["functions"], list) and len(functions["functions"]) == 1, "expected one server function")
    handler = functions["functions"][0]
    require(handler["name"] == HANDLER, "server function identity mismatch")
    require(handler["generator"] == GENERATOR, "server function generator mismatch")
    require(handler.get("runtimeVersion") == "nodejs24.x", "server function runtime must be explicitly nodejs24.x")
    zip_path = regular_file(functions_directory, f"{HANDLER}.zip")
    require(zip_path.stat().st_size > 0, "empty server function zip")
    require(handler["path"] == str(zip_path), "server function package path mismatch")
    with zipfile.ZipFile(zip_path) as archive:
        names = archive.namelist()
        require(len(names) == len(set(names)), "duplicate server zip member")
        require(all(safe_archive_name(name) for name in names), "unsafe server zip member path")
        require(archive.testzip() is None, "server zip CRC mismatch")
        require(archive.read(".next/BUILD_ID").decode().strip() == build_id, "server zip build identity mismatch")

    edge = json.loads(regular_file(edge_directory, "manifest.json").read_bytes())
    require(edge["routes"] == [{"function": MIDDLEWARE, "pattern": MIDDLEWARE_PATTERN, "excluded_patterns": []}], "expected one middleware route")
    require(edge["post_cache_routes"] == [], "unexpected post-cache routes")
    require(edge["function_config"] == {MIDDLEWARE: {"name": "Next.js Middleware Handler", "generator": GENERATOR}}, "middleware function or generator mismatch")
    bundles = edge["bundles"]
    require(isinstance(bundles, list) and len(bundles) in (1, 2), "expected one or two edge formats")
    formats = [bundle["format"] for bundle in bundles]
    require(len(set(formats)) == len(formats), "duplicate edge format")
    require(set(formats) in ({"eszip2"}, {"eszip2", "tar"}), "unsupported edge formats")
    edge_assets = []
    tar_inventories = []
    for bundle in bundles:
        extension = r"eszip" if bundle["format"] == "eszip2" else r"tar\.gz"
        asset = bundle["asset"]
        require(isinstance(asset, str) and re.fullmatch(r"[0-9a-f]{64}\." + extension, asset), "unsafe edge asset path or extension")
        asset_path = regular_file(edge_directory, asset)
        if bundle["format"] == "tar":
            require(asset_path.stat().st_size <= TAR_LIMITS["compressed_bytes"], "tar compressed byte bound exceeded")
        data = asset_path.read_bytes()
        require(bool(data), "empty edge asset")
        require(hashlib.sha256(data).hexdigest() == asset[:64], "edge asset SHA-256 mismatch")
        if bundle["format"] == "eszip2":
            check_eszip(data)
        else:
            tar_inventories.append({"asset": asset, **check_tar(data)})
        edge_assets.append(asset_path)

    paths = [regular_file(root, relative) for relative in
             ("netlify.toml", "pnpm-lock.yaml", f"{build_directory}/BUILD_ID",
              f"{build_directory}/prerender-manifest.json", f"{static_directory}/portfolio-registry.json")]
    paths += [regular_file(functions_directory, "manifest.json"), zip_path,
              regular_file(edge_directory, "manifest.json"), *edge_assets]
    files = []
    for artifact_path in paths:
        data = artifact_path.read_bytes()
        label = str(artifact_path.relative_to(root)) if artifact_path.is_relative_to(root) else str(artifact_path)
        files.append({"path": label, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})
    scope = "provider build artifact; no deployment or runtime execution" if provider_outputs else "local build artifact; no publication or provider execution"
    return {"status": "PASS", "scope": scope,
            "buildId": build_id, "functionSystem": functions["system"],
            "registryByteParity": True, "edgeFormats": sorted(formats), "files": files,
            "tarInventories": tar_inventories}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--functions-dist")
    parser.add_argument("--edge-functions-dist")
    parser.add_argument("--publish-swapped", action="store_true")
    arguments = parser.parse_args()
    try:
        result = validate(Path(__file__).resolve().parents[2],
                          functions_dist=arguments.functions_dist,
                          edge_functions_dist=arguments.edge_functions_dist,
                          publish_swapped=arguments.publish_swapped)
    except (OSError, ValueError, KeyError, TypeError, tarfile.TarError, zipfile.BadZipFile, EOFError) as error:
        raise SystemExit(f"Netlify artifact contract FAIL: {error}") from error
    print(json.dumps(result, indent=2))
