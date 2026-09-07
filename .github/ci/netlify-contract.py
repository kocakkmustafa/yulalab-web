"""Check generated local artifacts; this is not provider/runtime acceptance."""
import hashlib
import json
import tomllib
from pathlib import Path

root = Path(__file__).resolve().parents[2]
config = tomllib.loads((root / "netlify.toml").read_text())
assert config["build"]["command"] == "pnpm build"
assert config["build"]["publish"] == ".next"
assert config["build"]["environment"] == {"NODE_VERSION": "22.23.2", "PNPM_VERSION": "10.33.0"}
assert config["plugins"] == [{"package": "@netlify/plugin-nextjs"}]
package = json.loads((root / "package.json").read_text())
assert package["devDependencies"]["@netlify/plugin-nextjs"] == "5.15.13"
assert config["headers"] == [{"for": "/portfolio-registry.json", "values": {
    "Access-Control-Allow-Origin": "https://links.yulalab.com",
    "Access-Control-Allow-Methods": "GET",
    "Cache-Control": "public, max-age=300, must-revalidate",
}}]

build_id = (root / ".next/BUILD_ID").read_text().strip()
assert len(build_id) > 5
handler_root = root / ".netlify/functions-internal/___netlify-server-handler"
assert (handler_root / ".next/BUILD_ID").read_text().strip() == build_id
assert (root / "public/portfolio-registry.json").read_bytes() == (
    root / ".netlify/static/portfolio-registry.json").read_bytes()
functions = json.loads((root / ".netlify/functions/manifest.json").read_text())
assert len(functions["functions"]) == 1
handler = functions["functions"][0]
assert handler["name"] == "___netlify-server-handler"
assert handler["generator"] == "@netlify/plugin-nextjs@5.15.13"
assert handler["runtimeVersion"] == "nodejs22.x"
zip_path = root / ".netlify/functions/___netlify-server-handler.zip"
assert zip_path.is_file() and zip_path.stat().st_size > 0
edge = json.loads((root / ".netlify/edge-functions-dist/manifest.json").read_text())
assert len(edge["bundles"]) == len(edge["routes"]) == 1
assert edge["routes"][0]["function"] == "___netlify-edge-handler-src-middleware"
edge_bundle = root / ".netlify/edge-functions-dist" / edge["bundles"][0]["asset"]
assert edge_bundle.is_file() and edge_bundle.stat().st_size > 0

paths = [root / "netlify.toml", root / "pnpm-lock.yaml", root / ".next/BUILD_ID",
         root / ".next/prerender-manifest.json", root / ".netlify/static/portfolio-registry.json",
         root / ".netlify/functions/manifest.json", zip_path,
         root / ".netlify/edge-functions-dist/manifest.json", edge_bundle]
files = [{"path": str(path.relative_to(root)), "bytes": path.stat().st_size,
          "sha256": hashlib.sha256(path.read_bytes()).hexdigest()} for path in paths]
print(json.dumps({"status": "PASS", "scope": "offline local build artifact; no provider execution",
                  "buildId": build_id, "functionSystem": functions["system"],
                  "registryByteParity": True, "files": files}, indent=2))
