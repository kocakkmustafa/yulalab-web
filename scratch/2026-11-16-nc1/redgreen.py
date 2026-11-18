import re, subprocess, sys
ROOT = "/Users/mustafakaankocak/Developer/YULAlab-AI/ventures/yulalab-com/wt-web-nc1"
C = ".github/ci/netlify-contract.py"
T = ".github/ci/test-netlify-contract.py"
# (grup, hedef test(ler), kontrol satiri alt dizgesi (sozlesmede tek bir satirda aranir))
G = [
 ("cjs-varlik", ["test_scheduled_zip_missing_cjs_entry_fails"], 'in members, "scheduled zip entry missing"'),
 ("zip-uye-yineleme", ["test_scheduled_zip_duplicate_member_fails"], '"duplicate scheduled zip member"'),
 ("guvensiz-uye", ["test_scheduled_zip_unsafe_member_name_fails"], '"unsafe scheduled zip member path"'),
 ("crc-testzip", ["test_scheduled_zip_crc_corruption_fails"], '"scheduled zip CRC mismatch"'),
 ("bos-zip", ["test_scheduled_zip_empty_or_truncated_fails"], '"empty server function zip"'),
 ("schedule", ["test_scheduled_manifest_fields_fail_on_their_own_check"], '"scheduled function schedule mismatch"'),
 ("runtime", ["test_scheduled_manifest_fields_fail_on_their_own_check"], '"scheduled function runtime mismatch"'),
 ("generator-yok", ["test_scheduled_manifest_fields_fail_on_their_own_check"], '"scheduled function must not carry a generator"'),
 ("runtimeVersion", ["test_scheduled_manifest_fields_fail_on_their_own_check"], 'runtime must be explicitly nodejs24.x")\n        require(isinstance'),
 ("mainFile", ["test_scheduled_manifest_fields_fail_on_their_own_check"], 'Path(entry["mainFile"]).parts[-3:]'),
 ("kaynak-ts", ["test_scheduled_function_missing_source_ts_fails"], 'regular_file(root, f"netlify/functions/{name}.ts")'),
 ("handler-path", ["test_provider_output_directories_preserve_all_artifact_checks"], '"server function package path mismatch"'),
 ("handler-runtime", ["test_provider_output_directories_preserve_all_artifact_checks"], '"server function runtime must be explicitly nodejs24.x"'),
 ("handler-generator", ["test_provider_output_directories_preserve_all_artifact_checks"], '"server function generator mismatch"'),
]
def sh(*a):
    return subprocess.run(a, cwd=ROOT, capture_output=True, text=True)
def run(tests):
    args = ["python3", "-B", "-O", T] + [f"ArtifactContractTests.{t}" for t in tests]
    r = sh(*args)
    last = [l for l in (r.stderr + r.stdout).strip().splitlines() if l][-1]
    return r.returncode, last
src = open(f"{ROOT}/{C}").read()
lines = src.split("\n")
out = []
for name, tests, needle in G:
    # satiri bul: needle tek satirda ya da \n iceriyorsa iki satir birlesimi
    idx = None
    for i, l in enumerate(lines):
        joined = l + "\n" + (lines[i + 1] if i + 1 < len(lines) else "")
        if (needle in l) or ("\n" in needle and needle in joined):
            if "require(" in l or "regular_file(" in l or "Path(entry" in l:
                idx = i
                break
    if "runtimeVersion" == name:
        # handler satiri degil, zamanlayici runtimeVersion: ilk eslesen handler olabilir; zamanlayici blogundaki satiri sec
        idx = next(i for i, l in enumerate(lines) if 'scheduled function runtime must be explicitly nodejs24.x' in l)
    if name.startswith("handler-"):
        idx = next(i for i, l in enumerate(lines) if needle in l)
    assert idx is not None, name
    mutated = list(lines)
    l = mutated[idx]
    ind = re.match(r"\s*", l).group()
    if "Path(entry" in l:
        # mainFile: 2 satirlik require'in ikinci satiri; ilk satirin onune if False ekle
        idx -= 1
        l = mutated[idx]
        ind = re.match(r"\s*", l).group()
    mutated[idx] = ind + "if False: " + l.lstrip()
    open(f"{ROOT}/{C}", "w").write("\n".join(mutated))
    red = run(tests)
    sh("git", "checkout", "--", C)
    green = run(tests)
    out.append(f"[{name}] bozulan kontrol satiri {idx+1}: {lines[idx].strip()[:70]}\n  KIRMIZI (kontrol devre disi) -> exit={red[0]} {red[1]}\n  YESIL (git checkout sonrasi) -> exit={green[0]} {green[1]}")
open(f"{ROOT}/scratch/2026-11-16-nc1/kanit.txt", "w").write("\n".join(out) + "\n")
print("\n".join(out))
