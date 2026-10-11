"""Small temporary artifact fixtures; no build, live requests, or publication claim."""
import gzip
import hashlib
import importlib.util
import io
import json
import struct
import tarfile
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest import mock

SPEC = importlib.util.spec_from_file_location("netlify_contract", Path(__file__).with_name("netlify-contract.py"))
contract = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(contract)
HANDLER = "___netlify-server-handler"
MIDDLEWARE = "___netlify-edge-handler-src-middleware"
EDGE = ".netlify/edge-functions-dist"
BUILD_ID = "fixture-build-20260908"
ERRORS = (ValueError, KeyError, TypeError, OSError, EOFError, tarfile.TarError, zipfile.BadZipFile)


def minimal_eszip():
    # One module, SHA-256 header/source sections, and an empty source-map section.
    # Fixtures exercise framing/integrity only, not execution by an ESZIP runtime.
    specifier = f"file:///root/{MIDDLEWARE}.js".encode()
    source = b"export default () => new Response('fixture');"
    header = struct.pack(">I", len(specifier)) + specifier + b"\0"
    header += struct.pack(">IIII", 0, len(source), 0, 0) + b"\0"
    sources = source + hashlib.sha256(source).digest()
    return (b"ESZIP_V2" + struct.pack(">I", len(header)) + header + hashlib.sha256(header).digest()
            + struct.pack(">I", len(sources)) + sources + struct.pack(">I", 0))


def minimal_tar(name=f"./{MIDDLEWARE}.js", link=False):
    output = io.BytesIO()
    with tarfile.open(fileobj=output, mode="w") as archive:
        member = tarfile.TarInfo(name)
        if link:
            member.type = tarfile.SYMTYPE
            member.linkname = "../outside"
            archive.addfile(member)
        else:
            payload = b"export default () => new Response('fixture');"
            member.size = len(payload)
            archive.addfile(member, io.BytesIO(payload))
    return gzip.compress(output.getvalue(), mtime=0)


def tar_entries(entries):
    output = io.BytesIO()
    with tarfile.open(fileobj=output, mode="w", format=tarfile.PAX_FORMAT) as archive:
        for entry in entries:
            member = tarfile.TarInfo(entry["name"])
            member.type = entry.get("type", tarfile.REGTYPE)
            member.linkname = entry.get("target", "")
            member.pax_headers = entry.get("pax", {})
            payload = entry.get("payload", b"fixture regular content")
            member.size = len(payload) if member.type in (tarfile.REGTYPE, tarfile.AREGTYPE) else entry.get("size", 0)
            archive.addfile(member, io.BytesIO(payload) if member.size else None)
    return gzip.compress(output.getvalue(), mtime=0)


def package_directory_entries(store=".deno"):
    prefix = f"node_modules/{store}"
    undici = f"{prefix}/undici-types@7.10.0/node_modules/undici-types"
    node = f"{prefix}/@types+node@24.2.0/node_modules/@types/node"
    scoped = f"{prefix}/@scope+pkg@1.0.0_peer@2.0.0/node_modules/@scope/pkg"
    return [{"name": f"./{MIDDLEWARE}.js"}, {"name": "deno.json", "payload": b"{}"},
            {"name": ".root-vendor/mod.ts"}, {"name": ".netlify-npm-vendor/module.js"},
            {"name": f"{undici}/index.d.ts", "payload": b"export interface Fixture {}"},
            {"name": f"{undici}/package.json", "payload": b'{"name":"undici-types"}'},
            {"name": f"{node}/index.d.ts"}, {"name": f"{scoped}/lib/index.js"},
            {"name": f"{prefix}/@types+node@24.2.0/node_modules/undici-types", "type": tarfile.SYMTYPE,
             "target": "../../undici-types@7.10.0/node_modules/undici-types"},
            {"name": "node_modules/undici-types", "type": tarfile.SYMTYPE,
             "target": f"{store}/undici-types@7.10.0/node_modules/undici-types"},
            {"name": "node_modules/@types/node", "type": tarfile.SYMTYPE,
             "target": f"../{store}/@types+node@24.2.0/node_modules/@types/node"},
            {"name": "node_modules/@scope/pkg", "type": tarfile.SYMTYPE,
             "target": f"../{store}/@scope+pkg@1.0.0_peer@2.0.0/node_modules/@scope/pkg"}]


class ArtifactContractTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="yula-netlify-contract-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve()
        self.write("netlify.toml", '''[build]
command = "pnpm build"
publish = ".next"
[build.environment]
NODE_VERSION = "26.9.0"
PNPM_VERSION = "10.33.0"
[[plugins]]
package = "./.github/netlify/artifact-proof"
[[plugins]]
package = "@netlify/plugin-nextjs"
[[headers]]
for = "/portfolio-registry.json"
[headers.values]
Access-Control-Allow-Origin = "https://links.yulalab.com"
Access-Control-Allow-Methods = "GET"
Cache-Control = "public, max-age=300, must-revalidate"
''')
        self.write_json("package.json", {"devDependencies": {"@netlify/plugin-nextjs": "5.16.2"}})
        self.write("pnpm-lock.yaml", "fixture lock\n")
        self.write(".next/BUILD_ID", BUILD_ID)
        self.write(".next/prerender-manifest.json", "{}")
        self.write(f".netlify/functions-internal/{HANDLER}/.next/BUILD_ID", BUILD_ID)
        self.write("public/portfolio-registry.json", '{"fixture":true}')
        self.write(".netlify/static/portfolio-registry.json", '{"fixture":true}')
        self.zip_relative = f".netlify/functions/{HANDLER}.zip"
        self.write(self.zip_relative, b"")
        self.make_zip()
        self.functions = {"functions": [{"name": HANDLER, "generator": "@netlify/plugin-nextjs@5.16.2",
                                        "runtimeVersion": "nodejs24.x", "path": str(self.root / self.zip_relative)}],
                          "system": {"arch": "fixture", "platform": "fixture"}}
        self.write_json(".netlify/functions/manifest.json", self.functions)
        self.edge = {"bundles": [self.asset("eszip2", minimal_eszip())],
                     "routes": [{"function": MIDDLEWARE,
                                 "pattern": r"^(?:/(_next/data/[^/]{1,}))?(?:/((?!api|_next|_vercel|.*\..*).*))" r"(\.json|\.rsc|\.segments/.+\.segment\.rsc)?[/#\?]?$",
                                 "excluded_patterns": []}], "post_cache_routes": [],
                     "function_config": {MIDDLEWARE: {"name": "Next.js Middleware Handler", "generator": "@netlify/plugin-nextjs@5.16.2"}}}
        self.write_json(f"{EDGE}/manifest.json", self.edge)

    def write(self, relative, contents):
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(contents.encode() if isinstance(contents, str) else contents)

    def write_json(self, relative, contents):
        self.write(relative, json.dumps(contents))

    def asset(self, format_name, data):
        extension = "eszip" if format_name == "eszip2" else "tar.gz"
        name = f"{hashlib.sha256(data).hexdigest()}.{extension}"
        self.write(f"{EDGE}/{name}", data)
        return {"asset": name, "format": format_name}

    def make_zip(self, build_id=BUILD_ID):
        with zipfile.ZipFile(self.root / self.zip_relative, "w") as archive:
            archive.writestr(".next/BUILD_ID", build_id)

    def rejected(self):
        with self.assertRaises(ERRORS):
            contract.validate(self.root)

    def test_single_and_dual_formats_in_either_order(self):
        tar = self.asset("tar", minimal_tar())
        eszip = self.edge["bundles"][0]
        for bundles in ([eszip], [tar, eszip], [eszip, tar]):
            with self.subTest(formats=[b["format"] for b in bundles]):
                self.edge["bundles"] = bundles
                self.write_json(f"{EDGE}/manifest.json", self.edge)
                result = contract.validate(self.root)
                self.assertEqual(result["status"], "PASS")
                self.assertEqual(result["buildId"], BUILD_ID)
                self.assertEqual(result["functionSystem"], {"arch": "fixture", "platform": "fixture"})
                self.assertEqual(result["edgeFormats"], sorted(b["format"] for b in bundles))
                self.assertEqual(len(result["files"]), 8 + len(bundles))

    def test_provider_publish_swap_preserves_actual_artifact_checks(self):
        # Exact adapter5.16.2 publishStaticDir rename sequence; no build execution.
        (self.root / ".next").rename(self.root / ".netlify/.next")
        (self.root / ".netlify/static").rename(self.root / ".next")
        options = {"functions_dist": self.root / ".netlify/functions",
                   "edge_functions_dist": self.root / EDGE, "publish_swapped": True}
        result = contract.validate(self.root, **options)
        self.assertEqual(result["status"], "PASS")
        self.assertEqual(result["buildId"], BUILD_ID)
        self.assertEqual(result["registryByteParity"], True)
        self.assertIn("provider build artifact", result["scope"])
        paths = {file["path"] for file in result["files"]}
        self.assertIn(".netlify/.next/prerender-manifest.json", paths)
        self.assertIn(".next/portfolio-registry.json", paths)
        self.make_zip("wrong-build-identity")
        with self.assertRaises(ERRORS):
            contract.validate(self.root, **options)

    def test_publish_swap_requires_provider_roots_and_complete_layout(self):
        with self.assertRaises(ERRORS):
            contract.validate(self.root, publish_swapped=True)
        with self.assertRaises(ERRORS):
            contract.validate(self.root, functions_dist=self.root / ".netlify/functions",
                              edge_functions_dist=self.root / EDGE, publish_swapped=True)

    def test_unsupported_missing_and_duplicate_bundle_formats(self):
        eszip = self.edge["bundles"][0]
        tar = self.asset("tar", minimal_tar())
        cases = [[], [tar], [eszip, eszip], [eszip, tar, tar],
                 [{**eszip, "format": "javascript"}], [{"asset": eszip["asset"]}]]
        for bundles in cases:
            with self.subTest(bundles=bundles):
                self.edge["bundles"] = bundles
                self.write_json(f"{EDGE}/manifest.json", self.edge)
                self.rejected()

    def test_route_and_middleware_identity_are_not_relaxed(self):
        route = self.edge["routes"][0]
        cases = [{"routes": []}, {"routes": [route, route]},
                 {"routes": [{**route, "function": "other"}]},
                 {"routes": [{**route, "pattern": ".*"}]},
                 {"post_cache_routes": [route]}, {"function_config": {}},
                 {"function_config": {MIDDLEWARE: {"name": "Next.js Middleware Handler", "generator": "other"}}},
                 {"function_config": {MIDDLEWARE: {"name": "Next.js Middleware Handler"}}}]
        for change in cases:
            with self.subTest(change=change):
                self.write_json(f"{EDGE}/manifest.json", {**self.edge, **change})
                self.rejected()

    def test_server_identity_count_runtime_and_package_path(self):
        handler = self.functions["functions"][0]
        cases = [[], [handler, handler], [{**handler, "name": "other"}],
                 [{**handler, "generator": "other"}], [{**handler, "runtimeVersion": "nodejs20.x"}],
                 [{**handler, "runtimeVersion": "nodejs22.x"}], [{**handler, "runtimeVersion": "nodejs26.x"}],
                 [{key: value for key, value in handler.items() if key != "runtimeVersion"}],
                 [{**handler, "path": "/outside/server.zip"}],
                 [{key: value for key, value in handler.items() if key != "generator"}]]
        for functions in cases:
            with self.subTest(functions=functions):
                self.write_json(".netlify/functions/manifest.json", {**self.functions, "functions": functions})
                self.rejected()

    def test_missing_and_unsafe_asset_paths(self):
        original = self.edge["bundles"][0]
        for name in ("missing.eszip", "../outside.eszip", "/outside.eszip", "folder/asset.eszip",
                     original["asset"].replace(".eszip", ".tar.gz"), "0" * 64 + ".eszip"):
            with self.subTest(name=name):
                self.edge["bundles"] = [{**original, "asset": name}]
                self.write_json(f"{EDGE}/manifest.json", self.edge)
                self.rejected()

    def test_disk_file_and_parent_symlinks_are_rejected(self):
        asset = self.root / EDGE / self.edge["bundles"][0]["asset"]
        target = self.root / "fixture-target"
        target.write_bytes(asset.read_bytes())
        asset.unlink()
        asset.symlink_to(target)
        self.rejected()
        asset.unlink()
        asset.write_bytes(target.read_bytes())
        directory = self.root / EDGE
        moved = self.root / "fixture-edge-directory"
        directory.rename(moved)
        directory.symlink_to(moved, target_is_directory=True)
        self.rejected()

    def test_asset_hash_mismatch_and_zero_bytes(self):
        asset = self.root / EDGE / self.edge["bundles"][0]["asset"]
        for contents in (b"", b"corrupted"):
            with self.subTest(contents=contents):
                asset.write_bytes(contents)
                self.rejected()

    def test_rehashed_short_truncated_and_corrupt_eszip(self):
        data = minimal_eszip()
        # Renaming to the changed SHA ensures framing is checked after file hashing.
        cases = [b"", b"ESZIP_V2", b"NOTESZIP" + data[8:], data[:-1],
                 data[:16], data + b"trailing", data[:8] + b"\xff\xff\xff\xff" + data[12:]]
        header_length = int.from_bytes(data[8:12], "big")
        broken_checksum = bytearray(data)
        broken_checksum[12 + header_length] ^= 1
        cases.append(bytes(broken_checksum))
        for contents in cases:
            with self.subTest(length=len(contents)):
                self.edge["bundles"] = [self.asset("eszip2", contents)]
                self.write_json(f"{EDGE}/manifest.json", self.edge)
                self.rejected()

    def test_rehashed_truncated_tar_and_unsafe_members(self):
        data = minimal_tar()
        cases = [data[:-5], b"not gzip", minimal_tar("../escape.js"), minimal_tar("/escape.js"),
                 minimal_tar(link=True), minimal_tar("unrelated.js")]
        eszip = self.edge["bundles"][0]
        for contents in cases:
            with self.subTest(length=len(contents)):
                self.edge["bundles"] = [eszip, self.asset("tar", contents)]
                self.write_json(f"{EDGE}/manifest.json", self.edge)
                self.rejected()

    def test_tar_middleware_directory_is_not_a_file(self):
        output = io.BytesIO()
        with tarfile.open(fileobj=output, mode="w") as archive:
            member = tarfile.TarInfo(f"./{MIDDLEWARE}.js/")
            member.type = tarfile.DIRTYPE
            archive.addfile(member)
        self.edge["bundles"].append(self.asset("tar", gzip.compress(output.getvalue(), mtime=0)))
        self.write_json(f"{EDGE}/manifest.json", self.edge)
        with self.assertRaisesRegex(contract.ContractError, "tar middleware entry missing"):
            contract.validate(self.root)

    def test_contained_tar_links_to_real_files_preserve_contract_without_extraction(self):
        entries = [{"name": f"./{MIDDLEWARE}.js"}, {"name": "shared/module.js"},
                   {"name": "alias.js", "type": tarfile.SYMTYPE, "target": "./shared/module.js"},
                   {"name": "nested/alias.js", "type": tarfile.SYMTYPE, "target": "../shared/module.js"},
                   {"name": "hard-alias.js", "type": tarfile.LNKTYPE, "target": "./shared/module.js"},
                   {"name": "nested/hard-alias.js", "type": tarfile.LNKTYPE, "target": "shared/module.js"}]
        eszip = self.edge["bundles"][0]
        for order in (entries, list(reversed(entries))):
            with self.subTest(order=[entry["name"] for entry in order]):
                tar = self.asset("tar", tar_entries(order))
                self.edge["bundles"] = [eszip, tar]
                self.write_json(f"{EDGE}/manifest.json", self.edge)
                with mock.patch.object(tarfile.TarFile, "extract", side_effect=AssertionError("filesystem extraction")), \
                     mock.patch.object(tarfile.TarFile, "extractall", side_effect=AssertionError("filesystem extraction")), \
                     mock.patch.object(tarfile.TarFile, "_find_link_target", side_effect=AssertionError("link following")):
                    result = contract.validate(self.root)
                self.assertEqual(result["status"], "PASS")
                self.assertEqual(result["buildId"], BUILD_ID)
                self.assertEqual(result["registryByteParity"], True)
                self.assertEqual(result["edgeFormats"], ["eszip2", "tar"])
                self.assertEqual(len(result["files"]), 10)
                receipt = next(file for file in result["files"] if file["path"].endswith(tar["asset"]))
                self.assertEqual(receipt["sha256"], tar["asset"][:64])

    def test_tar_links_reject_unsafe_targets_and_names(self):
        regular = [{"name": f"{MIDDLEWARE}.js"}, {"name": "shared/file.js"}]
        targets = ("", "/shared/file.js", "//shared/file.js", "C:/shared/file.js", "./C:/shared/file.js",
                   "C:file.js", "shared\\file.js", "../shared/file.js", "shared/../../file.js",
                   "shared/file.js/", "shared/file.js/.", "missing/../shared/file.js", "shared/missing.js")
        for kind in (tarfile.SYMTYPE, tarfile.LNKTYPE):
            for target in targets:
                with self.subTest(kind=kind, target=target):
                    entries = regular + [{"name": "alias.js", "type": kind, "target": target}]
                    with self.assertRaises(contract.ContractError):
                        contract.check_tar(tar_entries(entries))
        for name in ("../alias.js", "/alias.js", "C:/alias.js", "./C:/alias.js", "alias\\file.js", "alias.js/"):
            with self.subTest(name=name):
                with self.assertRaises(contract.ContractError):
                    contract.check_tar(tar_entries(regular + [{"name": name, "type": tarfile.SYMTYPE,
                                                               "target": "shared/file.js"}]))
        # PAX metadata preserves embedded NULs instead of terminating a legacy header field.
        for pax in ({"path": "alias\0.js"}, {"linkpath": "shared/file.js\0ignored"}):
            with self.subTest(pax=pax):
                with self.assertRaises(contract.ContractError):
                    contract.check_tar(tar_entries(regular + [{"name": "alias.js", "type": tarfile.SYMTYPE,
                                                               "target": "shared/file.js", "pax": pax}]))

    def test_tar_links_reject_missing_directory_chain_cycle_and_alias_middleware(self):
        regular = [{"name": f"{MIDDLEWARE}.js"}, {"name": "real.js"}]
        cases = [
            [{"name": "alias.js", "type": tarfile.SYMTYPE, "target": "missing.js"}],
            [{"name": "directory", "type": tarfile.DIRTYPE},
             {"name": "alias.js", "type": tarfile.SYMTYPE, "target": "directory"}],
            [{"name": "first.js", "type": tarfile.SYMTYPE, "target": "real.js"},
             {"name": "second.js", "type": tarfile.SYMTYPE, "target": "first.js"}],
            [{"name": "first.js", "type": tarfile.LNKTYPE, "target": "real.js"},
             {"name": "second.js", "type": tarfile.LNKTYPE, "target": "first.js"}],
            [{"name": "first.js", "type": tarfile.SYMTYPE, "target": "second.js"},
             {"name": "second.js", "type": tarfile.LNKTYPE, "target": "first.js"}],
            [{"name": "self.js", "type": tarfile.SYMTYPE, "target": "self.js"}],
            [{"name": "alias.js", "type": tarfile.SYMTYPE, "target": "real.js", "size": 1}],
        ]
        for entries in cases:
            with self.subTest(entries=entries):
                with self.assertRaises(contract.ContractError):
                    contract.check_tar(tar_entries(regular + entries))
        for kind in (tarfile.SYMTYPE, tarfile.LNKTYPE):
            with self.subTest(middleware_kind=kind):
                with self.assertRaisesRegex(contract.ContractError, "tar middleware entry missing"):
                    contract.check_tar(tar_entries([{"name": "real.js"},
                        {"name": f"{MIDDLEWARE}.js", "type": kind, "target": "real.js"}]))

    def test_tar_links_reject_duplicate_ancestor_collision_and_raw_traversal(self):
        regular = [{"name": f"{MIDDLEWARE}.js"}, {"name": "real.js"}]
        cases = [
            [{"name": "./real.js"}],
            [{"name": "alias.js", "type": tarfile.SYMTYPE, "target": "real.js"}, {"name": "./alias.js"}],
            [{"name": "parent", "type": tarfile.SYMTYPE, "target": "real.js"}, {"name": "parent/child.js"}],
            [{"name": "parent", "type": tarfile.LNKTYPE, "target": "real.js"}, {"name": "parent/child.js"}],
            [{"name": "parent"}, {"name": "parent/child.js"}],
            [{"name": "directory", "type": tarfile.DIRTYPE},
             {"name": "alias", "type": tarfile.SYMTYPE, "target": "real.js"},
             {"name": "link.js", "type": tarfile.SYMTYPE, "target": "alias/../real.js"}],
            [{"name": "link.js", "type": tarfile.SYMTYPE, "target": "real.js/../real.js"}],
            [{"name": "nested/link.js", "type": tarfile.SYMTYPE, "target": "../../real.js"}],
            [{"name": "nested/link.js", "type": tarfile.LNKTYPE, "target": "../real.js"}],
        ]
        for entries in cases:
            with self.subTest(entries=entries):
                with self.assertRaises(contract.ContractError):
                    contract.check_tar(tar_entries(regular + entries))

    def test_tar_links_keep_special_member_hash_crc_and_manifest_rejections(self):
        regular = [{"name": f"{MIDDLEWARE}.js"}, {"name": "real.js"}]
        for kind in (tarfile.CHRTYPE, tarfile.BLKTYPE, tarfile.FIFOTYPE, tarfile.CONTTYPE, b"S", b"X"):
            with self.subTest(kind=kind):
                with self.assertRaises(ERRORS):
                    contract.check_tar(tar_entries(regular + [{"name": "special", "type": kind}]))
        data = tar_entries(regular + [{"name": "alias.js", "type": tarfile.SYMTYPE, "target": "real.js"}])
        eszip = self.edge["bundles"][0]
        tar = self.asset("tar", data)
        self.edge["bundles"] = [eszip, tar]
        self.write_json(f"{EDGE}/manifest.json", self.edge)
        asset = self.root / EDGE / tar["asset"]
        asset.write_bytes(data + b"corrupted")
        with self.assertRaisesRegex(contract.ContractError, "edge asset SHA-256 mismatch"):
            contract.validate(self.root)
        corrupt = bytearray(data)
        corrupt[-8] ^= 1
        self.edge["bundles"] = [eszip, self.asset("tar", bytes(corrupt))]
        self.write_json(f"{EDGE}/manifest.json", self.edge)
        self.rejected()
        self.edge["bundles"] = [eszip, tar]
        asset.write_bytes(data)
        self.write_json(f"{EDGE}/manifest.json", {**self.edge, "routes": []})
        with self.assertRaisesRegex(contract.ContractError, "expected one middleware route"):
            contract.validate(self.root)

    def test_scoped_unscoped_package_directory_links_and_real_undici_shape(self):
        for store in (".deno", ".pnpm"):
            entries = package_directory_entries(store)
            first = None
            for order in (entries, list(reversed(entries))):
                with self.subTest(store=store, reverse=order is not entries):
                    data = tar_entries(order)
                    eszip = self.edge["bundles"][0]
                    self.edge["bundles"] = [eszip, self.asset("tar", data)]
                    self.write_json(f"{EDGE}/manifest.json", self.edge)
                    with mock.patch.object(tarfile.TarFile, "extract", side_effect=AssertionError("extraction")), \
                         mock.patch.object(tarfile.TarFile, "extractall", side_effect=AssertionError("extraction")), \
                         mock.patch.object(tarfile.TarFile, "_find_link_target", side_effect=AssertionError("link following")):
                        result = contract.validate(self.root)
                    receipt = result["tarInventories"][0]
                    self.assertEqual(result["status"], "PASS")
                    self.assertEqual(receipt["archiveSha256"], hashlib.sha256(data).hexdigest())
                    self.assertEqual(receipt["regularFileCount"], 8)
                    self.assertEqual(receipt["linkCount"], 4)
                    self.assertTrue(receipt["allLinksManifestCovered"])
                    self.assertFalse(receipt["linkProofsTruncated"])
                    self.assertEqual({link["targetKind"] for link in receipt["links"]}, {"directory"})
                    self.assertTrue(all(link["regularFileLeaves"] > 0 for link in receipt["links"]))
                    if first:
                        self.assertEqual(receipt["manifestSha256"], first["manifestSha256"])
                        self.assertEqual(receipt["closureSha256"], first["closureSha256"])
                    first = receipt

    def test_directory_closure_covers_nested_direct_dependencies_and_content_hashes(self):
        entries = [{"name": f"{MIDDLEWARE}.js"}, {"name": "packages/a/index.js"},
                   {"name": "packages/b/index.js", "payload": b"dependency version one"},
                   {"name": "packages/a/node_modules/b", "type": tarfile.SYMTYPE, "target": "../../b"},
                   {"name": "node_modules/a", "type": tarfile.SYMTYPE, "target": "../packages/a"},
                   {"name": "packages/a/LICENSE", "type": tarfile.LNKTYPE, "target": "licenses/shared"},
                   {"name": "licenses/shared"}, {"name": "packages/a/empty", "type": tarfile.DIRTYPE}]
        first = contract.check_tar(tar_entries(entries))
        root_link = next(link for link in first["links"] if link["name"] == "node_modules/a")
        self.assertEqual(root_link["regularFileLeaves"], 3)
        changed = [{**entry, "payload": b"dependency version two"} if entry["name"] == "packages/b/index.js" else entry
                   for entry in entries]
        second = contract.check_tar(tar_entries(changed))
        second_link = next(link for link in second["links"] if link["name"] == "node_modules/a")
        self.assertNotEqual(first["manifestSha256"], second["manifestSha256"])
        self.assertNotEqual(root_link["closureSha256"], second_link["closureSha256"])
        self.assertEqual(first["linkCount"], 3)

    def test_explicit_directory_headers_and_regular_file_hardlinks_remain_supported(self):
        entries = package_directory_entries()
        parents = {str(parent) for entry in entries for parent in Path(entry["name"]).parents if str(parent) != "."}
        headers = [{"name": name + "/", "type": tarfile.DIRTYPE} for name in sorted(parents)]
        entries += [{"name": "root-hardlink", "type": tarfile.LNKTYPE, "target": "./deno.json"},
                    {"name": "legacy-file", "type": tarfile.AREGTYPE}]
        proof = contract.check_tar(tar_entries(headers + entries))
        self.assertEqual(proof["regularFileCount"], 9)
        self.assertEqual(next(link for link in proof["links"] if link["name"] == "root-hardlink")["targetKind"], "file")

    def test_directory_targets_reject_nested_cycles_dangling_chains_and_special_members(self):
        base = [{"name": f"{MIDDLEWARE}.js"}, {"name": "packages/a/index.js"},
                {"name": "packages/b/index.js"},
                {"name": "node_modules/a", "type": tarfile.SYMTYPE, "target": "../packages/a"}]
        cases = [
            [{"name": "packages/a/loop", "type": tarfile.SYMTYPE, "target": "."}],
            [{"name": "packages/a/node_modules/b", "type": tarfile.SYMTYPE, "target": "../../b"},
             {"name": "packages/b/node_modules/a", "type": tarfile.SYMTYPE, "target": "../../a"}],
            [{"name": "packages/a/unknown", "type": tarfile.SYMTYPE, "target": "../missing"}],
            [{"name": "packages/a/alias", "type": tarfile.SYMTYPE, "target": "/etc"}],
            [{"name": "node_modules/chain", "type": tarfile.SYMTYPE, "target": "a"}],
            [{"name": "node_modules/through-alias", "type": tarfile.SYMTYPE, "target": "a/index.js"}],
            [{"name": "hard-directory", "type": tarfile.LNKTYPE, "target": "packages/a"}],
            [{"name": "packages/a/empty", "type": tarfile.DIRTYPE},
             {"name": "packages/a/empty-alias", "type": tarfile.SYMTYPE, "target": "empty"}],
            [{"name": "packages/a/device", "type": tarfile.CHRTYPE}],
            [{"name": "packages/a/pipe", "type": tarfile.FIFOTYPE}],
            [{"name": "node_modules/a/injected.js"}],
            [{"name": "./packages/a", "type": tarfile.DIRTYPE}, {"name": "packages/a/", "type": tarfile.DIRTYPE}],
            [{"name": "packages/a/payload", "type": tarfile.SYMTYPE, "target": "index.js", "size": 1}],
        ]
        for entries in cases:
            with self.subTest(entries=entries):
                with self.assertRaises(ERRORS):
                    contract.check_tar(tar_entries(base + entries))
        # PAX sparse metadata can annotate non-file headers; reject it by policy,
        # rather than relying on a parser error or an unrelated target rejection.
        for member_type, target in ((tarfile.DIRTYPE, ""), (tarfile.SYMTYPE, "index.js"),
                                    (tarfile.LNKTYPE, "packages/a/index.js")):
            with self.subTest(sparse_type=member_type):
                sparse = {"name": "packages/a/sparse", "type": member_type, "target": target,
                          "pax": {"GNU.sparse.map": "0,0"}}
                data = tar_entries(base + [sparse])
                with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as archive:
                    self.assertIsNotNone(archive.getmember(sparse["name"]).sparse)
                with self.assertRaisesRegex(contract.ContractError, "tar sparse members are forbidden"):
                    contract.check_tar(data)

    def test_archive_namespace_manifest_and_logical_bounds_fail_closed(self):
        data = tar_entries(package_directory_entries())
        proof = contract.check_tar(data)
        cases = {"compressed_bytes": len(data) - 1, "expanded_bytes": 511, "members": 1,
                 "namespace": 1, "path_bytes": 1, "depth": 1, "manifest_bytes": 1,
                 "logical_files": 1, "logical_bytes": 1, "logical_depth": 1}
        for field, limit in cases.items():
            with self.subTest(field=field), mock.patch.dict(contract.TAR_LIMITS, {field: limit}):
                with self.assertRaises(contract.ContractError):
                    contract.check_tar(data)
        with mock.patch.dict(contract.TAR_LIMITS, {"manifest_bytes": 1}), \
             mock.patch.object(contract, "deque", side_effect=AssertionError("graph processing reached")):
            with self.assertRaisesRegex(contract.ContractError, "manifest byte bound"):
                contract.check_tar(data)
        with mock.patch.dict(contract.TAR_LIMITS, {"reported_links": 1}):
            bounded = contract.check_tar(data)
            self.assertEqual(bounded["manifestSha256"], proof["manifestSha256"])
            self.assertEqual(bounded["reportedLinkCount"], 1)
            self.assertTrue(bounded["linkProofsTruncated"])
            unsafe = package_directory_entries() + [{"name": "zz-last-link", "type": tarfile.SYMTYPE, "target": "missing"}]
            with self.assertRaises(contract.ContractError):
                contract.check_tar(tar_entries(unsafe))
        # Bound is checked before reading the asset into memory as well.
        tar = self.asset("tar", data)
        self.edge["bundles"].append(tar)
        self.write_json(f"{EDGE}/manifest.json", self.edge)
        with mock.patch.dict(contract.TAR_LIMITS, {"compressed_bytes": len(data) - 1}):
            with self.assertRaisesRegex(contract.ContractError, "compressed byte bound"):
                contract.validate(self.root)

    def test_acyclic_alias_multiplicity_is_bounded_without_virtual_tree_expansion(self):
        entries = [{"name": f"{MIDDLEWARE}.js"}, {"name": "groups/L0/file", "payload": b"x"}]
        for level in range(1, 5):
            entries += [{"name": f"groups/L{level}/{alias}", "type": tarfile.SYMTYPE,
                         "target": f"../L{level - 1}"} for alias in ("a", "b")]
        data = tar_entries(entries)
        proof = contract.check_tar(data)
        self.assertGreater(proof["logicalRegularFileLeaves"], proof["regularFileCount"])
        for field, limit in (("logical_files", 8), ("logical_bytes", 8), ("logical_depth", 3)):
            with self.subTest(field=field), mock.patch.dict(contract.TAR_LIMITS, {field: limit}):
                with self.assertRaises(contract.ContractError):
                    contract.check_tar(data)

    def test_directory_archive_crc_and_complete_asset_hash_are_still_mandatory(self):
        data = tar_entries(package_directory_entries())
        tar = self.asset("tar", data)
        self.edge["bundles"].append(tar)
        self.write_json(f"{EDGE}/manifest.json", self.edge)
        asset = self.root / EDGE / tar["asset"]
        asset.write_bytes(data + b"mutated")
        with self.assertRaisesRegex(contract.ContractError, "edge asset SHA-256 mismatch"):
            contract.validate(self.root)
        corrupt = bytearray(data)
        corrupt[-8] ^= 1
        self.edge["bundles"][-1] = self.asset("tar", bytes(corrupt))
        self.write_json(f"{EDGE}/manifest.json", self.edge)
        self.rejected()

    def test_server_zip_truncation_and_wrong_build(self):
        path = self.root / self.zip_relative
        path.write_bytes(path.read_bytes()[:-8])
        self.rejected()
        self.make_zip("another-build")
        self.rejected()

    def test_existing_source_config_guards(self):
        path = self.root / "netlify.toml"
        original = path.read_text()
        for old, new in (("pnpm build", "echo skipped"), ('publish = ".next"', 'publish = "public"'),
                         ("26.9.0", "20.0.0"), ("10.33.0", "9.0.0"),
                         ('package = "@netlify/plugin-nextjs"', 'package = "other"'),
                         ("https://links.yulalab.com", "*")):
            with self.subTest(setting=old):
                path.write_text(original.replace(old, new))
                self.rejected()
        path.write_text(original)
        self.write_json("package.json", {"devDependencies": {"@netlify/plugin-nextjs": "0.0.0"}})
        self.rejected()

    def test_existing_registry_and_build_identity_guards(self):
        cases = [(".next/BUILD_ID", "short"),
                 (f".netlify/functions-internal/{HANDLER}/.next/BUILD_ID", "other-build"),
                 (".netlify/static/portfolio-registry.json", "different registry")]
        for relative, contents in cases:
            with self.subTest(path=relative):
                path = self.root / relative
                original = path.read_bytes()
                path.write_text(contents)
                self.rejected()
                path.write_bytes(original)

    def test_provider_output_directories_preserve_all_artifact_checks(self):
        # Buildbot packages Functions outside the checkout. Use an owned
        # sibling fixture without relaxing the exact ZIP/manifest relationship.
        external = tempfile.TemporaryDirectory(prefix="yula-provider-outputs-")
        self.addCleanup(external.cleanup)
        outputs = Path(external.name).resolve()
        functions = outputs / "zisi"
        edge = outputs / "edge"
        (self.root / ".netlify/functions").rename(functions)
        (self.root / EDGE).rename(edge)
        manifest = {**self.functions, "functions": [{**self.functions["functions"][0],
                    "path": str(functions / f"{HANDLER}.zip")} ]}
        (functions / "manifest.json").write_text(json.dumps(manifest))
        result = contract.validate(self.root, functions_dist=functions, edge_functions_dist=edge)
        self.assertEqual(result["status"], "PASS")
        self.assertEqual(result["scope"], "provider build artifact; no deployment or runtime execution")
        self.assertEqual(result["buildId"], BUILD_ID)
        self.assertEqual(len(result["files"]), 9)
        self.assertIn(str(functions / f"{HANDLER}.zip"), [file["path"] for file in result["files"]])
        for change in [{"path": str(self.root / self.zip_relative)}, {"runtimeVersion": "nodejs26.x"},
                       {"generator": "other"}]:
            with self.subTest(change=change):
                mutated = {**manifest, "functions": [{**manifest["functions"][0], **change}]}
                (functions / "manifest.json").write_text(json.dumps(mutated))
                with self.assertRaises(ERRORS):
                    contract.validate(self.root, functions_dist=functions, edge_functions_dist=edge)
        (functions / "manifest.json").write_text(json.dumps(manifest))
        asset = edge / self.edge["bundles"][0]["asset"]
        asset.write_bytes(b"corrupted")
        with self.assertRaisesRegex(contract.ContractError, "edge asset SHA-256 mismatch"):
            contract.validate(self.root, functions_dist=functions, edge_functions_dist=edge)

    def test_provider_output_roots_fail_closed(self):
        functions = self.root / ".netlify/functions"
        edge = self.root / EDGE
        cases = [(functions, None), (None, edge), ("relative", edge),
                 (functions, "relative"), (functions / ".." / "functions", edge),
                 (self.root / "missing", edge), (Path(functions.anchor), edge)]
        for function_root, edge_root in cases:
            with self.subTest(functions=function_root, edge=edge_root):
                with self.assertRaises(ERRORS):
                    contract.validate(self.root, functions_dist=function_root, edge_functions_dist=edge_root)
        link = self.root / "function-output-link"
        link.symlink_to(functions, target_is_directory=True)
        with self.assertRaisesRegex(contract.ContractError, "symlink output directory"):
            contract.validate(self.root, functions_dist=link, edge_functions_dist=edge)
        parent_link = self.root / "netlify-output-link"
        parent_link.symlink_to(self.root / ".netlify", target_is_directory=True)
        with self.assertRaisesRegex(contract.ContractError, "symlink output directory"):
            contract.validate(self.root, functions_dist=parent_link / "functions", edge_functions_dist=edge)


if __name__ == "__main__":
    unittest.main(verbosity=2)
