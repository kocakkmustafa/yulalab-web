from pathlib import Path, PurePosixPath
import hashlib
import json
import re
import subprocess

root = Path(__file__).resolve().parents[2]
manifest = json.loads((root / ".github/ci/published-files.json").read_text())


def require(condition, message):
    if not condition:
        raise SystemExit(message)


baseline = {item["path"]: item["sha256"] for item in manifest["files"]}
# Only these exact two candidate tests are added to the immutable baseline.
# Source/focus acceptance: db6579bd20899b4a76f1b3dacea2f4aaef8353d7;
# INDEPENDENT-CLOSEOUT.json SHA256 c1e223834e57c1380b54e83350083b18e17e492806c5d6fbc78947f4fdba3aa7,
# sealed focus RESULT SHA256 21014c14dcd9cc25710fb5713f8d5a12c38c47b85341e4d82a75eb420b6e016e (70 PASS).
# This is candidate source acceptance, not publication or provider acceptance.
REVIEWED_TEST_ADDITIONS = {
    "tests/status-pill.test.tsx": "e871e675f4de4b024e05e67f07884f6983cf6939aebe70e8a9df4e38cc467d2a",
    "tests/support-feedback.test.tsx": "a5319babc9c69b7ff1b736602cb5ac8f576f934f1751b08be416b7540136738a",
}
# 2026-10-16 approved identity / dated normal-app preview candidate additions.
REVIEWED_VISUAL_ADDITIONS = {
    "public/projects/choreia/icon.png": "51148ac9504aed95bb952d3b1c67d6234708960ae2d667a8a4864218135659b4",
    "public/projects/choreia/preview-native-20261016.png": "15b494d95a3cdd77ec7cc1a2b0d789c77d2a0e9b3035bec18fe2cf2eec1cf239",
    "public/projects/gravita/icon.png": "d46a534d11c1c45dd5fde8c85bd8c02ab5d5cc205e502669d66a37c9d6190229",
    "public/projects/gravita/preview-native-20261016.png": "417e77ab63ab6057857a92c8b345083d10f03d3cd869d57a05096f0020abb536",
    "public/projects/jablab/icon.png": "94e23e1069f0f5f78c6503b12fc2e8e6edab340cfecb3b301bf5976188f7d8c2",
    "public/projects/jablab/preview-native-20261016.png": "5f6e6ffe9d7da3756f5c811e5f1b1dcc396179e58fa4af699559d820ae1bef45",
    "public/projects/lifeos/preview-onboarding-20261016.png": "20fb36a1a27f80d097ef9bf1881040971cbe6819924014e13344f70664771b85",
    "public/projects/lissom/icon.png": "0d6f1fb86078b14edf3e3bcd65deef5a2c35d3c98fd5865c20932ca5d5c4a242",
    "public/projects/lissom/preview-native-20261016.png": "14ff246c1fd4d366a491e0ff50ef14ba5ca7743d1b8e79cd4be326a0e92f788f",
    "public/projects/ostinato/icon.png": "6db03e9cdc6da965fc88ed28e6fd7f78aedf02a5d3fe4927bacffdd6b6a57b73",
    "public/projects/ostinato/preview-course-20261016.png": "eb0084ab724970d20101d0d82da2bc861ad161dcf6cfc64a0489262a1ede251a",
    "public/projects/ostinato/preview-native-20261016.png": "3c09f2db71e40128a659a028ded727c0a1c5c820fb572e3a00a1325ec22ce89f",
    "public/projects/ostinato/preview-written-lesson-20261016.png": "745e683b1b490258e99a1fb8a798e198e4b05c17e11386eb42743b259168e377",
    "src/components/experience/presentation-canvas.ts": "263df36aca5b6dc08d02e09208d6c37e53d58669301890c67ae6aa187ace4110",
    "src/components/experience/storyboard.ts": "91865ba673e2dc3500792e3ce06fa58261bbf747e8c9b368308efb6eebf4c193",
    "src/components/experience/useShowcaseTextures.ts": "bde62c5f645eaf8b708993d76f9903363457a48bdb43c34d7f38fba1fb6e728d",
    "src/components/projects/DevelopmentPreviewSection.tsx": "bcf341219391618be4da8cc01dd45a91c594424344a9ca6f3c1347c1be047dae",
    "src/data/product-presentations.ts": "992ee1fb79a86d96219b8a7fbefb67dbfa85515a7f91bb4138a5a4c5b9283178"
}
# END APPROVED VISUAL ADDITIONS
# 2026-10-20 user-approved A3 source/test/message candidate snapshot.
# Historical test/visual hashes above remain unchanged. This exact candidate set
# explicitly supersedes only two earlier visual-source hashes; it does not
# establish a publication, provider, device or security acceptance.
# Evidence: workspace/implementation-01-2026-10-19/ci-correctness-source-snapshot.json
# This helper has no self hash in the candidate set.
REVIEWED_A3_SOURCE_HASHES = {
    "messages/ar.json": "968f32623e1eb5e56e3e2a10780eb65d913368471113e529c200b9dcb29da48a",
    "messages/content-ar.json": "320ed0f20a853b24fc3abb4147e59abc31e2aa0126d8834599085d871cb7edb7",
    "messages/content-de.json": "178f19185d21a1827acff17ee8175ba7033039e9df12dd9da7ad070f2bf656e0",
    "messages/content-es-419.json": "6053109f2169f68434089271095099cfd081adfd44f2fba05289df83cc1180a0",
    "messages/content-fr.json": "1a4da987719802c8f899625688db56aff0f7579131e16c454d6d1e795e303334",
    "messages/content-ja.json": "3ffd43e1a19589927b62d2ae1fea6e9c84f21b37ff3e47f227fbba6cd1f5f88e",
    "messages/content-pt-BR.json": "dab9b095b73432795e02075322aa7bd51507ae73e399ab625f1da8a124be43a3",
    "messages/de.json": "416cd3753e6787a81e80fd18397cd697093e35e91e4f400acd445c2b1e7bd18b",
    "messages/es-419.json": "cd3dbb2f6815f60518d3678f26dbcef223be2ca555397749b6def830399b285f",
    "messages/fr.json": "b966dc925ac7a1c9626e65ee17cb17e25b027b4865e973218e16fe46c1b9b510",
    "messages/ja.json": "00f9489b4d73899fd9ae84e3b62c6b9d3e1caa87e61d9eba1ebb54980f419242",
    "messages/pt-BR.json": "b5bd95e46ecf73c9ebe8d5646161de3c70de872f8175ce3cfeb073852211de36",
    "scripts/verify-translations.ts": "fdc76cf42731ab7838deb465823a979e1c7f654b5269ecb45a5b30ed3bbbda12",
    "src/data/privacy-copy.ts": "94c5753e6ae551d939a01b8e57f13ce1cb0abf6b0ea174fa98e1a886a3e409dd",
    "src/i18n/locales.ts": "397228713653ad4a844884d992387267a5a602e9fb6d30aabe36d0f7c7516ff5",
    "src/lib/forms/lead-submission.ts": "19fb481176f13ff446f758afdf36856f5924bcd7efcff1478146c9e642552356",
    "src/lib/localized.ts": "69a179dd2ffa5945f14842fd86924157f49efea2a147c734c3270cae14fb214d",
    "src/lib/site-origin.ts": "eb11a1a5a776609d82332d11868430552f9981775456dddaad96fb46f1c19657",
    "tests/client-forms.test.tsx": "5f59ef47c009d614afe31236b67187f9d912948f84c12d550abdd06e707f9d8e",
    "tests/content-locale-wiring.test.tsx": "909e7201585b771d4bff3c9fe7708acd7ff41f1564c14de0b490f59e16f66274",
    "tests/experience-locale-content.test.tsx": "13408ffaf31f585bad0da6764f59f758f82fab3d7aa291d8fa416570d5782917",
    "tests/leads-contract.test.ts": "0a243539b35253a45091645573013e461beb0950e38e2a5bb5a1d1a06d0bcd93",
    "tests/locale-pages.test.tsx": "19e2e854be5bae33a799f2b4e6664c0b643ea1cc87b74d05c1a381b4ff52d87d",
    "tests/locale-routing.test.ts": "30e9a6dd0fec37ba37f995e74d6521c2b35116571734b04dbcf49691261e9a8a",
    "tests/locale-switcher.test.tsx": "7f02382ba1b685adc83508c026db3265ea7049c47c2bbbd83b8db5099d001b27",
    "tests/mail-budget.test.ts": "bef4a1f7a86c28c4ce048e7b4dd14cd6594793a82de0454e20aefa444074f5a8",
    "tests/privacy-rights-copy.test.tsx": "0fc6bebd2cb228c441edbe79299dfd2e25e2614df0ef70188bbe3b7ba0745fa6",
    "src/components/projects/DevelopmentPreviewSection.tsx": "bcf341219391618be4da8cc01dd45a91c594424344a9ca6f3c1347c1be047dae",
    "src/data/product-presentations.ts": "992ee1fb79a86d96219b8a7fbefb67dbfa85515a7f91bb4138a5a4c5b9283178",
    "tests/structured-data-honesty.test.tsx": "61a277923bddb9504a3c481e6a19488107cb92726327bb71d1bdd53b06050840"
}
# BEGIN REVIEWED THEME14 SOURCE HASHES
# Exact candidate bytes; older A3/test/visual maps remain historical.
# Browser/provider/publication acceptance is explicitly open.
REVIEWED_THEME14_SOURCE_HASHES = {
    "BITIRME-PROGRAMI.md": "0598f2749b2603c5afe14cf2e702af418e56b5e8032e83feba9aa41e34eb921e",
    "DEFTER.md": "f4243948026cc152cec4619d4a78c9f80f9491a9b7eb68982d5f20f159d6f289",
    "README.md": "48419ff9c981e06ee06231b072522455d61c814cbf7ac479e5e80dbeb4a42d6f",
    "messages/ar.json": "968f32623e1eb5e56e3e2a10780eb65d913368471113e529c200b9dcb29da48a",
    "messages/content-ar.json": "320ed0f20a853b24fc3abb4147e59abc31e2aa0126d8834599085d871cb7edb7",
    "messages/content-de.json": "178f19185d21a1827acff17ee8175ba7033039e9df12dd9da7ad070f2bf656e0",
    "messages/content-es-419.json": "6053109f2169f68434089271095099cfd081adfd44f2fba05289df83cc1180a0",
    "messages/content-fr.json": "1a4da987719802c8f899625688db56aff0f7579131e16c454d6d1e795e303334",
    "messages/content-hi.json": "edc6fa9d79185a820b4cbe87c4ad1eddb516d4e08a0bf7e07090c40c282ee339",
    "messages/content-id.json": "4f27bd2af184eb6c039d63df43139542d815f5cba97b5d92d3f2ac93669428f4",
    "messages/content-it.json": "db4793a683f5bd40df156eb567f137856acc27a2971d3cd46087b393623e26ea",
    "messages/content-ja.json": "3ffd43e1a19589927b62d2ae1fea6e9c84f21b37ff3e47f227fbba6cd1f5f88e",
    "messages/content-ko.json": "b210c906b2fc484eb1aefa2608903cd1a5cc1c4150ca16f8724aaf01050b9972",
    "messages/content-pl.json": "2ac203b32b397e6a64914e7609230aedbaebf62a514bc7ad38991f6681d736d6",
    "messages/content-pt-BR.json": "dab9b095b73432795e02075322aa7bd51507ae73e399ab625f1da8a124be43a3",
    "messages/content-zh-Hans.json": "eecd6fd1e923c4790d67af7c24ce851b65bcdf5358578201a6dda5f78f75dc47",
    "messages/de.json": "416cd3753e6787a81e80fd18397cd697093e35e91e4f400acd445c2b1e7bd18b",
    "messages/en.json": "dc877b65be7fbd0be514133345de87aac19794a212ce6b8ae9568e60a289a42f",
    "messages/es-419.json": "cd3dbb2f6815f60518d3678f26dbcef223be2ca555397749b6def830399b285f",
    "messages/fr.json": "b966dc925ac7a1c9626e65ee17cb17e25b027b4865e973218e16fe46c1b9b510",
    "messages/hi.json": "2d7fa7e7a72c8ffb3aa5289d48a67c7132dc74adcc9b4836e8736b54fbff7324",
    "messages/id.json": "9d0ffae23fa8e83603bdce89e80c8e6abb16842316dbdda655d9eb2b70f0e073",
    "messages/it.json": "0e7655a28b38a65045ae91e3ab7e1c3d85b84df6a65973526de38bc9e5e2aef6",
    "messages/ja.json": "00f9489b4d73899fd9ae84e3b62c6b9d3e1caa87e61d9eba1ebb54980f419242",
    "messages/ko.json": "b1a92cb81becdc8111d33c1bacdb65001d1f1b8d3cbfd41f2eea089d16607765",
    "messages/pl.json": "cf412c871ae82dec60dacc82719187457e541a85b1062b4588ef1ea49b55b787",
    "messages/pt-BR.json": "b5bd95e46ecf73c9ebe8d5646161de3c70de872f8175ce3cfeb073852211de36",
    "messages/tr.json": "64fcc63c617ddf2a18fc1e29bf0d997bbab142ac6176c180128f7bd4959da510",
    "messages/zh-Hans.json": "17d3070d4c5c8b01084bba7fd3139a48e5f0b5c349524f60b3cce3f2dbf58882",
    "next.config.mjs": "73365bc728c08151b8b36e76ad99515d30d511ea3533fe1838d44449ef455814",
    "scripts/verify-translations.ts": "fdc76cf42731ab7838deb465823a979e1c7f654b5269ecb45a5b30ed3bbbda12",
    "src/app/[locale]/data-request/verify/route.ts": "7bac2c97d53e909d73cc1edd7ac6971ed61cd82b2ed08a0b491941f69fe5b324",
    "src/app/[locale]/layout.tsx": "56e370ca36920dd107b96551b007f5b7fb10b5de2711204d2fb273ae731183cd",
    "src/app/[locale]/operating-system/page.tsx": "35d8b05586d8c2854f041dccc85ce6720858ddd85f82d33149b713ee3051e6df",
    "src/app/[locale]/privacy/page.tsx": "94fc4c2c47aa1a9d2961ad10318c2d30d19bf701804876d233637eb1f423e479",
    "src/app/global-not-found.tsx": "868aaa4a27276f3df13101f0f2d9e57a2b3815a28692a29d46ac6178c26791d7",
    "src/app/globals.css": "fd8c9ef4b3111dcd105aed49eef581859d0c706102801b7a06f495a11601339a",
    "src/components/experience/Experience.module.css": "8abda61850aecdab3fabcc17e0944805f5cf01baf54cdfdf3c137b1e0bb8f472",
    "src/components/experience/ExperienceCanvas.tsx": "04eca23c83748f72d21e93deb7f7dfa81a7bca9e3b91a7f7c31fc8c640ccb0c6",
    "src/components/experience/ExperienceOverlay.tsx": "d8d6a093376cbb78067d0ce230810fce7a5a0f80ba571b7b0e6c25176b468f93",
    "src/components/experience/ExperienceWorld.tsx": "f965f661ef6873561b6981ddd4ec90b4bd2f0de1049d6231495e57aed1230b5d",
    "src/components/experience/YulaExperience.tsx": "6507be8abf25bf139d92a500ac7b101ee3b696653ccf311fe4f8251de4acb67e",
    "src/components/experience/theme.ts": "cee0ad410f3e8bbad90d51603529029b595996a610c12cc115bf602a524e83e9",
    "src/components/layout/Header.tsx": "dd63e7dd3b37f658eca820776bf168f60dafd3dcacbc174c4aef7c9a54a2d3b9",
    "src/components/projects/StatCards.tsx": "2a0a16cf3e3b3eedbfc9116a7b3843db85e117eb6da7f33703a4b34628e4c653",
    "src/components/theme/ThemeControl.tsx": "f587b1393b2484d5b36d0a8482dd3ce4a4e02b36d9bdb5c412144f20d8bcfc73",
    "src/components/theme/ThemeProvider.tsx": "60ff212e2d0140f5243a2060bcf63ff8f71f117afba88518d7f174215e4fd06e",
    "src/components/theme/theme-copy.ts": "d614e9655f272a2b0e0fe86f3cf0bd7b001762f3db9c3b1f6e4c8ae581fa7d7c",
    "src/data/privacy-copy.ts": "94c5753e6ae551d939a01b8e57f13ce1cb0abf6b0ea174fa98e1a886a3e409dd",
    "src/data/projects/burunfarki.ts": "de07dca7d3f746eb8357fe3d942fac5b422785635003c21aaedfcabe8d6b0d12",
    "src/data/verification-copy.ts": "04a04e2157c30af20cc1c58da208328d9d48ac3cbb6029783be7f0e930d7cf02",
    "src/i18n/locales.ts": "397228713653ad4a844884d992387267a5a602e9fb6d30aabe36d0f7c7516ff5",
    "src/i18n/request.ts": "98f4c0fd5758e1b6dd3f0d1516ddebaeaf41f72cfb25b0d868033dcf1c3c8db8",
    "src/lib/localized.ts": "69a179dd2ffa5945f14842fd86924157f49efea2a147c734c3270cae14fb214d",
    "src/lib/theme.ts": "9a9849555fdf19db28fabbcd26287718864abc4b4c47008c44bccfc5385bdbc6",
    "src/lib/types.ts": "5c5b9923f6ac4753a6e5331340be4345a50ed6b2f2b982b661b9bc0163bae350",
    "src/middleware.ts": "7e2bd005da37817cf797d2862b33b081d7b6810709bcc58daf2b279235e77380",
    "tailwind.config.ts": "17b4f0065f952e32091828579003756effde1810ea864011e260b437380d53aa",
    "tests/content-locale-wiring.test.tsx": "909e7201585b771d4bff3c9fe7708acd7ff41f1564c14de0b490f59e16f66274",
    "tests/data-request-verification-page.test.tsx": "9b9b55b79fee198e1f56c0d6cf6ed8d25f81b8122a3bbb460b800f42f0c14844",
    "tests/experience-locale-content.test.tsx": "13408ffaf31f585bad0da6764f59f758f82fab3d7aa291d8fa416570d5782917",
    "tests/locale-contract.test.ts": "a0cc5fcd56bde86aac5eea302f7e7090c28cb999db35771e5c62028ebb98682f",
    "tests/locale-pages.test.tsx": "19e2e854be5bae33a799f2b4e6664c0b643ea1cc87b74d05c1a381b4ff52d87d",
    "tests/locale-request.test.ts": "85ab64df6c54bab649ec5de4a135c692bff165f04cafc6cd05e32f6097e7e80c",
    "tests/locale-routing.test.ts": "30e9a6dd0fec37ba37f995e74d6521c2b35116571734b04dbcf49691261e9a8a",
    "tests/locale-switcher.test.tsx": "7f02382ba1b685adc83508c026db3265ea7049c47c2bbbd83b8db5099d001b27",
    "tests/privacy-rights-copy.test.tsx": "0fc6bebd2cb228c441edbe79299dfd2e25e2614df0ef70188bbe3b7ba0745fa6",
    "tests/stat-cards.test.tsx": "3d66d952481f35b07fe2f076eacd7d0f05bf7cc3bc48713d05cf27223963d3b1",
    "tests/stat-number-locales.test.tsx": "19d81b2e70dce6325f945a18c821104a49a144e763bad8cdcdef2d5f7bbbd716",
    "tests/theme-boot.test.ts": "df3d8960b41ec2fa2dd790ecd49eff56d4db6bd4fa8c68514c3a2ffc0753e58e",
    "tests/theme.test.tsx": "d66c2c066a5560805bb32fea6224eb8dc95750cab583ca4d891b12f407a51164"
}
# END REVIEWED THEME14 SOURCE HASHES
EXPECTED_REVIEWED_HASHES = {
    **REVIEWED_TEST_ADDITIONS,
    **REVIEWED_VISUAL_ADDITIONS,
    **REVIEWED_A3_SOURCE_HASHES,
    **REVIEWED_THEME14_SOURCE_HASHES,
}
require(len(baseline) == len(manifest["files"]), "duplicate publication baseline path")
reviewed_path = root / ".github/ci/reviewed-source-changes.json"
reviewed = {}
reviewed_additions = {}
if reviewed_path.exists():
    require(not reviewed_path.is_symlink(), "reviewed source changes must be a regular file")
    receipt = json.loads(reviewed_path.read_text())
    require(receipt.get("schemaVersion") == 1, "unsupported reviewed source changes schema")
    require(
        receipt.get("publicationBaselineManifestSha256") == manifest["publishedSourceManifestSha256"],
        "reviewed source changes refer to a different publication baseline",
    )
    require(isinstance(receipt.get("changes"), list), "reviewed source changes must be a list")
    for change in receipt["changes"]:
        require(isinstance(change, dict), "reviewed source change must be an object")
        relative = change.get("path")
        require(isinstance(relative, str), "reviewed path must be a string")
        path = PurePosixPath(relative)
        require(
            not path.is_absolute() and ".." not in path.parts and str(path) == relative,
            f"unsafe reviewed path: {relative}",
        )
        require(relative not in reviewed and relative not in reviewed_additions, f"duplicate reviewed path: {relative}")
        if relative in baseline:
            require(change.get("publishedSha256") == baseline[relative], f"published hash mismatch: {relative}")
        else:
            require(
                (relative.startswith("src/app/") and path.suffix in {".ts", ".tsx"}
                 or relative in EXPECTED_REVIEWED_HASHES)
                and change.get("publishedSha256") is None,
                f"unreviewed source addition: {relative}",
            )
        candidate_hash = change.get("candidateSha256")
        if relative in EXPECTED_REVIEWED_HASHES:
            require(
                candidate_hash == EXPECTED_REVIEWED_HASHES[relative],
                f"reviewed candidate addition hash mismatch: {relative}",
            )
        require(
            isinstance(candidate_hash, str) and re.fullmatch(r"[0-9a-f]{64}", candidate_hash),
            f"invalid candidate SHA-256: {relative}",
        )
        if relative in baseline:
            require(candidate_hash != baseline[relative], f"reviewed path has no candidate delta: {relative}")
        require(change.get("evidenceClass") == "CANDIDATE_ONLY_NOT_PUBLICATION_EVIDENCE", f"candidate is not publication evidence: {relative}")
        require(isinstance(change.get("reason"), str) and change["reason"].strip(), f"missing review reason: {relative}")
        if relative in baseline:
            reviewed[relative] = candidate_hash
        else:
            reviewed_additions[relative] = candidate_hash

require(
    REVIEWED_TEST_ADDITIONS.keys() | REVIEWED_VISUAL_ADDITIONS.keys() <= reviewed_additions.keys(),
    f"missing reviewed test additions: {sorted(REVIEWED_TEST_ADDITIONS.keys() - reviewed_additions.keys())}",
)
require(
    REVIEWED_A3_SOURCE_HASHES.keys() <= reviewed.keys() | reviewed_additions.keys(),
    f"missing reviewed A3 candidate sources: {sorted(REVIEWED_A3_SOURCE_HASHES.keys() - reviewed.keys() - reviewed_additions.keys())}",
)

require(
    REVIEWED_THEME14_SOURCE_HASHES.keys() <= reviewed.keys() | reviewed_additions.keys(),
    "missing reviewed theme/14-language candidate sources",
)

for item in manifest["files"]:
    path = root / item["path"]
    require(path.is_file() and not path.is_symlink(), f"missing or symlink source: {item['path']}")
    expected = reviewed.get(item["path"], item["sha256"])
    require(hashlib.sha256(path.read_bytes()).hexdigest() == expected, f"source hash mismatch: {item['path']}")
for relative, expected in reviewed_additions.items():
    path = root / relative
    require(path.is_file() and not path.is_symlink(), f"missing or symlink added source: {relative}")
    require(hashlib.sha256(path.read_bytes()).hexdigest() == expected, f"added source hash mismatch: {relative}")

# Every tracked app route must be covered by the immutable baseline or by an
# explicitly reviewed addition. An unlisted route would otherwise enter the
# deploy artifact without this source receipt knowing it exists.
tracked_routes = set(subprocess.check_output(
    ["git", "ls-files", "--", "src/app"], cwd=root, text=True,
).splitlines())
require(
    tracked_routes <= baseline.keys() | reviewed_additions.keys(),
    f"unreviewed tracked app routes: {sorted(tracked_routes - baseline.keys() - reviewed_additions.keys())}",
)
print(
    f"publication baseline + reviewed candidate delta: PASS "
    f"({len(baseline) - len(reviewed)} baseline files unchanged; {len(reviewed)} reviewed candidate changes, "
    f"{len(reviewed_additions)} reviewed source additions, "
    f"CANDIDATE_ONLY_NOT_PUBLICATION_EVIDENCE; explicit harness exceptions: {manifest['allowedHarnessChanges']})"
)
