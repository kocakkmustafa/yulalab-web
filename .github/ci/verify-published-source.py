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
    "messages/ar.json": "b1094f4a1e8d18db04313c92133b5f196870488ad894f047172bbeb77b28ed1c",
    "messages/content-ar.json": "44584794445dfba64654dcfd77606cd3bfa9f7a4771644081aa55682a7211115",
    "messages/content-de.json": "1d584f0128387e0146263336574475af012de01bc041c7b89ba72ecad2884521",
    "messages/content-es-419.json": "7c9b565ae0a3609a3e1d58e7d7680437dc0ec165980aeb51e176daeab74cde1d",
    "messages/content-fr.json": "810b9e705527b49dd283432830bb601556a8ed1b44d20bd1ebc38140265f8d0d",
    "messages/content-ja.json": "993be880e804bdb20fba31f9ced8677dca6c121e628aa4fb692dfc2e2e60f611",
    "messages/content-pt-BR.json": "c7286d19642d4db10d0aab6cf37a27201be26d0d585919a19af2ce6dbe68d8d3",
    "messages/de.json": "d66c9ae14a2cd8e8a996d13cfa378f654d67523b3ac76feff73add47e099198f",
    "messages/es-419.json": "5104e8ba473e90082519f75c6ef919a27cab47303bcfd396f7e1451c20c26a52",
    "messages/fr.json": "016a58096b120258d5037bcc843ef8670b08e37a75b512d2d16a7927f4d04d93",
    "messages/ja.json": "5b3842ffb85c56ef2cbdbd098aef2754d6a12e6c38e0cbea405ae74fc9cfd5f5",
    "messages/pt-BR.json": "89afd6207a2aa29bfc16de18b3c61ad13e0ca8dcddd39c0924c5f4cd0291a42b",
    "scripts/verify-translations.ts": "fdc76cf42731ab7838deb465823a979e1c7f654b5269ecb45a5b30ed3bbbda12",
    "src/data/privacy-copy.ts": "94c5753e6ae551d939a01b8e57f13ce1cb0abf6b0ea174fa98e1a886a3e409dd",
    "src/i18n/locales.ts": "397228713653ad4a844884d992387267a5a602e9fb6d30aabe36d0f7c7516ff5",
    "src/lib/forms/lead-submission.ts": "19fb481176f13ff446f758afdf36856f5924bcd7efcff1478146c9e642552356",
    "src/lib/localized.ts": "69a179dd2ffa5945f14842fd86924157f49efea2a147c734c3270cae14fb214d",
    "src/lib/site-origin.ts": "eb11a1a5a776609d82332d11868430552f9981775456dddaad96fb46f1c19657",
    "tests/client-forms.test.tsx": "5f59ef47c009d614afe31236b67187f9d912948f84c12d550abdd06e707f9d8e",
    "tests/content-locale-wiring.test.tsx": "a064986d102a46d69b3d958e03416d64074248d0e269275885816137145e26d5",
    "tests/experience-locale-content.test.tsx": "f9061ab0f06d160d06da3dd0a6fc9a5ce386b59df6c4b27a97ddcf6912ee3a52",
    "tests/leads-contract.test.ts": "0a243539b35253a45091645573013e461beb0950e38e2a5bb5a1d1a06d0bcd93",
    "tests/locale-pages.test.tsx": "19e2e854be5bae33a799f2b4e6664c0b643ea1cc87b74d05c1a381b4ff52d87d",
    "tests/locale-routing.test.ts": "d997b9857246ca67c14fde24a53f74fdfa372e1627b615e190d2b1a8507dcd20",
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
    "messages/ar.json": "b1094f4a1e8d18db04313c92133b5f196870488ad894f047172bbeb77b28ed1c",
    "messages/content-ar.json": "44584794445dfba64654dcfd77606cd3bfa9f7a4771644081aa55682a7211115",
    "messages/content-de.json": "1d584f0128387e0146263336574475af012de01bc041c7b89ba72ecad2884521",
    "messages/content-es-419.json": "7c9b565ae0a3609a3e1d58e7d7680437dc0ec165980aeb51e176daeab74cde1d",
    "messages/content-fr.json": "810b9e705527b49dd283432830bb601556a8ed1b44d20bd1ebc38140265f8d0d",
    "messages/content-hi.json": "94e4e8e1f0d3857d4ab2bc731c246bf09b55b6fde3a5e11a0de0d98b8eaabad4",
    "messages/content-id.json": "38da0dea3608df3326e0c05a994302ce15b627aeb58ffa21f03b2a20c0ac1d06",
    "messages/content-it.json": "0be90fbd957f70fbe7790f8ee70a5c040cbd1a4065788da08f40f84d52dd8c50",
    "messages/content-ja.json": "993be880e804bdb20fba31f9ced8677dca6c121e628aa4fb692dfc2e2e60f611",
    "messages/content-ko.json": "820904f3608b05af7ca737a52a02d3214ed03b4dee7681ae1733101830156d23",
    "messages/content-pl.json": "d84bccc12edd34621bd590667664c1a794a41b5fd132950307a5320bfee1186a",
    "messages/content-pt-BR.json": "c7286d19642d4db10d0aab6cf37a27201be26d0d585919a19af2ce6dbe68d8d3",
    "messages/content-zh-Hans.json": "2e7ac4c5c063583ecaa9103e3a39e2a27173b6c412ed170b10a960cf0fb53f32",
    "messages/de.json": "d66c9ae14a2cd8e8a996d13cfa378f654d67523b3ac76feff73add47e099198f",
    "messages/en.json": "2c45075872b1ae5892a38ad7ec844d1f5e43b67c3ee6b51b9759cb3b210d2286",
    "messages/es-419.json": "5104e8ba473e90082519f75c6ef919a27cab47303bcfd396f7e1451c20c26a52",
    "messages/fr.json": "016a58096b120258d5037bcc843ef8670b08e37a75b512d2d16a7927f4d04d93",
    "messages/hi.json": "1d52501752f52c8685325b7d1f97ef4cd93ed988ebd4169f775ed023cb35fba6",
    "messages/id.json": "856e92082789932196a9f6c1214b49237e26599d2befa4f8c484756515d7ece2",
    "messages/it.json": "29fd9540afb795edb20892fc2376dbfaa559d27457ad0612023a23a9981057cc",
    "messages/ja.json": "5b3842ffb85c56ef2cbdbd098aef2754d6a12e6c38e0cbea405ae74fc9cfd5f5",
    "messages/ko.json": "d5fb2bd538c01d23f3805f4ffe5ff79e7a46eb8e23d96c2c4363368328295806",
    "messages/pl.json": "1a1a839acc462537a2614203885980fca7433c5f770c04faa1e0f4f60082c877",
    "messages/pt-BR.json": "89afd6207a2aa29bfc16de18b3c61ad13e0ca8dcddd39c0924c5f4cd0291a42b",
    "messages/tr.json": "8cadc6329b2b21a165b882b554e24fe429690e33731cd6d3b9675b7afa307586",
    "messages/zh-Hans.json": "310e77b618729a74056fa2d95a80da478a5a6dafaf75cb9c8ec754292fde51df",
    "next.config.mjs": "73365bc728c08151b8b36e76ad99515d30d511ea3533fe1838d44449ef455814",
    "scripts/verify-translations.ts": "fdc76cf42731ab7838deb465823a979e1c7f654b5269ecb45a5b30ed3bbbda12",
    "src/app/[locale]/data-request/verify/route.ts": "7bac2c97d53e909d73cc1edd7ac6971ed61cd82b2ed08a0b491941f69fe5b324",
    "src/app/[locale]/layout.tsx": "8ebef2b5b2777c09091af306c483a6d2988ce11fb25ea768ba3f3167a36a4d3a",
    "src/app/[locale]/operating-system/page.tsx": "35d8b05586d8c2854f041dccc85ce6720858ddd85f82d33149b713ee3051e6df",
    "src/app/[locale]/privacy/page.tsx": "181bb45b40ed9905fedc855d12e5d6bb4847d24f77a3d710addca6b2afc961dc",
    "src/app/global-not-found.tsx": "868aaa4a27276f3df13101f0f2d9e57a2b3815a28692a29d46ac6178c26791d7",
    "src/app/globals.css": "8e60a59baf21d91339f38ebaa773be3fc5dc224318626b7b68c1df1fe4ca0ff5",
    "src/components/experience/Experience.module.css": "e923c3d398c223fe6d8192ae2c259377aad389805f232c28a80a8609ecdd3829",
    "src/components/experience/ExperienceCanvas.tsx": "04eca23c83748f72d21e93deb7f7dfa81a7bca9e3b91a7f7c31fc8c640ccb0c6",
    "src/components/experience/ExperienceOverlay.tsx": "d8d6a093376cbb78067d0ce230810fce7a5a0f80ba571b7b0e6c25176b468f93",
    "src/components/experience/ExperienceWorld.tsx": "f965f661ef6873561b6981ddd4ec90b4bd2f0de1049d6231495e57aed1230b5d",
    "src/components/experience/YulaExperience.tsx": "adec6585ea7db08a5cfdeed5af7adcf4662600252f75bd73346097090ca94e6c",
    "src/components/experience/theme.ts": "cee0ad410f3e8bbad90d51603529029b595996a610c12cc115bf602a524e83e9",
    "src/components/layout/Header.tsx": "5e41b685d401b582f89533bef4489b4a217744ae6821ce7672632c317d03ef04",
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
    "src/lib/theme.ts": "15435ec4a63fe78ff0cd3c71fd247dd7daaea05c4e14bafce0dc24e2f68e3115",
    "src/lib/types.ts": "5c5b9923f6ac4753a6e5331340be4345a50ed6b2f2b982b661b9bc0163bae350",
    "src/middleware.ts": "65fb7acb6d1ae1f01eacbd45eaf2e2271145d7e56a28f7e6fae7a44c51872d74",
    "tailwind.config.ts": "82b7a360c9619f27de63b82d62fb7ab754824c5aadd13ebdb118c0ecc31575b3",
    "tests/content-locale-wiring.test.tsx": "a064986d102a46d69b3d958e03416d64074248d0e269275885816137145e26d5",
    "tests/data-request-verification-page.test.tsx": "9b9b55b79fee198e1f56c0d6cf6ed8d25f81b8122a3bbb460b800f42f0c14844",
    "tests/experience-locale-content.test.tsx": "f9061ab0f06d160d06da3dd0a6fc9a5ce386b59df6c4b27a97ddcf6912ee3a52",
    "tests/locale-contract.test.ts": "a0cc5fcd56bde86aac5eea302f7e7090c28cb999db35771e5c62028ebb98682f",
    "tests/locale-pages.test.tsx": "19e2e854be5bae33a799f2b4e6664c0b643ea1cc87b74d05c1a381b4ff52d87d",
    "tests/locale-request.test.ts": "85ab64df6c54bab649ec5de4a135c692bff165f04cafc6cd05e32f6097e7e80c",
    "tests/locale-routing.test.ts": "d997b9857246ca67c14fde24a53f74fdfa372e1627b615e190d2b1a8507dcd20",
    "tests/locale-switcher.test.tsx": "7f02382ba1b685adc83508c026db3265ea7049c47c2bbbd83b8db5099d001b27",
    "tests/privacy-rights-copy.test.tsx": "0fc6bebd2cb228c441edbe79299dfd2e25e2614df0ef70188bbe3b7ba0745fa6",
    "tests/stat-cards.test.tsx": "3d66d952481f35b07fe2f076eacd7d0f05bf7cc3bc48713d05cf27223963d3b1",
    "tests/stat-number-locales.test.tsx": "19d81b2e70dce6325f945a18c821104a49a144e763bad8cdcdef2d5f7bbbd716",
    "tests/theme-boot.test.ts": "170758f19a13b86ea9337d0eb2020febbf7a1b1c2af9fa2fa4c932848e5e16cc",
    "tests/theme.test.tsx": "4086ad19c6e6c46e774b45e1743475d477fe38794cc5fff43aba737a258048fe"
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
