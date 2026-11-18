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
    "src/components/experience/useShowcaseTextures.ts": "565148572a7b0fae3d9dedfbbad0353c508923a0c429ffde3909a65904654345",
    "src/components/projects/DevelopmentPreviewSection.tsx": "bcf341219391618be4da8cc01dd45a91c594424344a9ca6f3c1347c1be047dae",
    "src/data/product-presentations.ts": "e787eb3d025ea2a0f5c7ae6cf4e9e2231526408a47166e2f2915ebb2ce72f62c"
}
# END APPROVED VISUAL ADDITIONS
# 2026-10-20 user-approved A3 source/test/message candidate snapshot.
# Historical test/visual hashes above remain unchanged. This exact candidate set
# explicitly supersedes only two earlier visual-source hashes; it does not
# establish a publication, provider, device or security acceptance.
# Evidence: workspace/implementation-01-2026-10-19/ci-correctness-source-snapshot.json
# This helper has no self hash in the candidate set.
REVIEWED_A3_SOURCE_HASHES = {
    "messages/ar.json": "88fa1d0058c32c874272100c5fbfca9d0575f0701223033ea7bb3aee327b889c",
    "messages/content-ar.json": "1f9ab41a0e02e90478611d96db8245757279102552bc1b4738f3d7a9b7c718f5",
    "messages/content-de.json": "ad79853b3dcad72167bd5bf5b75538eb4fa6c582659ab28e8e3cb563a5ab6608",
    "messages/content-es-419.json": "5032b9b482e7867de129182afe04df648d42d7454dfec5fbd0703e99c76a4b94",
    "messages/content-fr.json": "faff029a438863c9fa7d604ddb6f943fcca99f5d1e59c0df7aa2facf8a4fb654",
    "messages/content-ja.json": "e734040acb2b9655ab42e792bbb869bd7079a7e4614f5e2d882e01cc9a3b5e9d",
    "messages/content-pt-BR.json": "4c7a21a5a909fd67e0d80454ebab914e64695ba2bf1b2ed064a43d8cbd755d28",
    "messages/de.json": "ab710825cc2190e47cefc080edd7a09327aac3eddfc115f3cb5c4e31f83fe774",
    "messages/es-419.json": "2c6f33373c90378b12076ba6b878d9215ff080a5617c413ae1862303ddb34ad7",
    "messages/fr.json": "cd76d43acbaf85b548c3d843fa781c63ce43841ac5fb9a0a8dfb239246ac2524",
    "messages/ja.json": "77385be94fe38f00d0546dfffe6868d81c9af4706f4e9dbc4c48c3921f9cfd1e",
    "messages/pt-BR.json": "1fe63bfa31158442b340b1689fcb7f45b54bae4aef19ee30a9a1741e79d11e4b",
    "scripts/verify-translations.ts": "f1e393000d88fa890b5658b60213c949d832cbccd680b8b193beb12ad0665f37",
    "src/data/privacy-copy.ts": "94c5753e6ae551d939a01b8e57f13ce1cb0abf6b0ea174fa98e1a886a3e409dd",
    "src/i18n/locales.ts": "397228713653ad4a844884d992387267a5a602e9fb6d30aabe36d0f7c7516ff5",
    "src/lib/forms/lead-submission.ts": "19fb481176f13ff446f758afdf36856f5924bcd7efcff1478146c9e642552356",
    "src/lib/localized.ts": "69a179dd2ffa5945f14842fd86924157f49efea2a147c734c3270cae14fb214d",
    "src/lib/site-origin.ts": "eb11a1a5a776609d82332d11868430552f9981775456dddaad96fb46f1c19657",
    "tests/client-forms.test.tsx": "5f59ef47c009d614afe31236b67187f9d912948f84c12d550abdd06e707f9d8e",
    "tests/content-locale-wiring.test.tsx": "c355a79af8bbd9685069156a814841e841b5024f7474637d999472d39e0f692d",
    "tests/experience-locale-content.test.tsx": "19ba617c8800a40bc062cc7b17230894d756e54de832c03abf9888694b83d6c2",
    "tests/leads-contract.test.ts": "0a243539b35253a45091645573013e461beb0950e38e2a5bb5a1d1a06d0bcd93",
    "tests/locale-pages.test.tsx": "19e2e854be5bae33a799f2b4e6664c0b643ea1cc87b74d05c1a381b4ff52d87d",
    "tests/locale-routing.test.ts": "d997b9857246ca67c14fde24a53f74fdfa372e1627b615e190d2b1a8507dcd20",
    "tests/locale-switcher.test.tsx": "7f02382ba1b685adc83508c026db3265ea7049c47c2bbbd83b8db5099d001b27",
    "tests/mail-budget.test.ts": "bef4a1f7a86c28c4ce048e7b4dd14cd6594793a82de0454e20aefa444074f5a8",
    "tests/privacy-rights-copy.test.tsx": "0fc6bebd2cb228c441edbe79299dfd2e25e2614df0ef70188bbe3b7ba0745fa6",
    "src/components/projects/DevelopmentPreviewSection.tsx": "bcf341219391618be4da8cc01dd45a91c594424344a9ca6f3c1347c1be047dae",
    "src/data/product-presentations.ts": "e787eb3d025ea2a0f5c7ae6cf4e9e2231526408a47166e2f2915ebb2ce72f62c",
    "tests/structured-data-honesty.test.tsx": "61a277923bddb9504a3c481e6a19488107cb92726327bb71d1bdd53b06050840"
}
# BEGIN REVIEWED THEME14 SOURCE HASHES
# Exact candidate bytes; older A3/test/visual maps remain historical.
# Browser/provider/publication acceptance is explicitly open.
REVIEWED_THEME14_SOURCE_HASHES = {
    "BITIRME-PROGRAMI.md": "0598f2749b2603c5afe14cf2e702af418e56b5e8032e83feba9aa41e34eb921e",
    "DEFTER.md": "f4243948026cc152cec4619d4a78c9f80f9491a9b7eb68982d5f20f159d6f289",
    "README.md": "21989e53150b598c65c8477d9c7a5906d20ee17022d7ec6d0d3a24cd052f17dd",
    "messages/ar.json": "88fa1d0058c32c874272100c5fbfca9d0575f0701223033ea7bb3aee327b889c",
    "messages/content-ar.json": "1f9ab41a0e02e90478611d96db8245757279102552bc1b4738f3d7a9b7c718f5",
    "messages/content-de.json": "ad79853b3dcad72167bd5bf5b75538eb4fa6c582659ab28e8e3cb563a5ab6608",
    "messages/content-es-419.json": "5032b9b482e7867de129182afe04df648d42d7454dfec5fbd0703e99c76a4b94",
    "messages/content-fr.json": "faff029a438863c9fa7d604ddb6f943fcca99f5d1e59c0df7aa2facf8a4fb654",
    "messages/content-hi.json": "9f8ae0b03756d44ea0ced86d3f6143f7a4ed82c64f3525cdc60392c11d497594",
    "messages/content-id.json": "641d3747f6f338172fd051bbc407cfdb0cf62bd0b7c99fe4392bffd99ce5fe23",
    "messages/content-it.json": "6f650af8669e9f52693be0baff03cf153c0e6f36e53f0fb282f41d01d52377fa",
    "messages/content-ja.json": "e734040acb2b9655ab42e792bbb869bd7079a7e4614f5e2d882e01cc9a3b5e9d",
    "messages/content-ko.json": "5a743cf1d17c3373af0c0d5a834ac1601755a4cf6985733e17c81a6931e39890",
    "messages/content-pl.json": "db15f8e83b58ebb553d4feed39140602fbe58600a53b5cf843beb10218b88663",
    "messages/content-pt-BR.json": "4c7a21a5a909fd67e0d80454ebab914e64695ba2bf1b2ed064a43d8cbd755d28",
    "messages/content-zh-Hans.json": "88d20a0192b7718c6910135baaf8d74a97fb4efd62c6d7640a0b99191a122631",
    "messages/de.json": "ab710825cc2190e47cefc080edd7a09327aac3eddfc115f3cb5c4e31f83fe774",
    "messages/en.json": "da105eb1102388316def0ecad350aa50d4692f0bb93b2e3782a8cc960f819b39",
    "messages/es-419.json": "2c6f33373c90378b12076ba6b878d9215ff080a5617c413ae1862303ddb34ad7",
    "messages/fr.json": "cd76d43acbaf85b548c3d843fa781c63ce43841ac5fb9a0a8dfb239246ac2524",
    "messages/hi.json": "0b4f8b565165377380974ed9212f2f35d919a8b2b41ab162aaf3461c2b5114fc",
    "messages/id.json": "be082a4198798e62d46e1a7f68d9f64423fb36746fceab9b07ed7579b24942d6",
    "messages/it.json": "6e3bb6d954e38a8817e7d3498f28879d6d30da830a1c49ceddc0e9e40bbc5790",
    "messages/ja.json": "77385be94fe38f00d0546dfffe6868d81c9af4706f4e9dbc4c48c3921f9cfd1e",
    "messages/ko.json": "f9dd05073c8cf1cff0cbe7fcf0a43c73630f11b7fef28f3f41a7e10413c2e166",
    "messages/pl.json": "e94cf9c817c94f1c521e7b61d74bffcd4fdd555a059252866355c2e5ad39aee5",
    "messages/pt-BR.json": "1fe63bfa31158442b340b1689fcb7f45b54bae4aef19ee30a9a1741e79d11e4b",
    "messages/tr.json": "8e29de4647aceefdfbb798ce80deeac7dca05e5b473d869eecdcb89d25d667dc",
    "messages/zh-Hans.json": "9a0c40972a0d65297ed728f2ebf223ba1ff12d0e6162c5c18d36d75f8a444639",
    "next.config.mjs": "f1b38de58f71a327dadfa0076deadfd5b0c94f6e48d59bdfdb46a65ad81b2369",
    "scripts/verify-translations.ts": "f1e393000d88fa890b5658b60213c949d832cbccd680b8b193beb12ad0665f37",
    "src/app/[locale]/data-request/verify/route.ts": "7bac2c97d53e909d73cc1edd7ac6971ed61cd82b2ed08a0b491941f69fe5b324",
    "src/app/[locale]/layout.tsx": "d159532459458e7084556f1530592aa36702199bc4e9348e2fdd67c2193e0c84",
    "src/app/[locale]/operating-system/page.tsx": "35d8b05586d8c2854f041dccc85ce6720858ddd85f82d33149b713ee3051e6df",
    "src/app/[locale]/privacy/page.tsx": "4f0908c07bd18f0e2885441851b6a5fe918d7917dc6b094701b0d36e10126431",
    "src/app/global-not-found.tsx": "161cb35c214fec737e22adad0b3bc091d7af6f2bd7510a60c792cfd21441840f",
    "src/app/globals.css": "7aacd65bc71555d0028a0260b94d4a44128a2b9b617c5b8ca3571eb176284f2d",
    "src/components/experience/Experience.module.css": "e923c3d398c223fe6d8192ae2c259377aad389805f232c28a80a8609ecdd3829",
    "src/components/experience/ExperienceCanvas.tsx": "04eca23c83748f72d21e93deb7f7dfa81a7bca9e3b91a7f7c31fc8c640ccb0c6",
    "src/components/experience/ExperienceOverlay.tsx": "91913558b9837e61afb112dc17b93016896e7793c8e34970a5158b79aa227c68",
    "src/components/experience/ExperienceWorld.tsx": "f965f661ef6873561b6981ddd4ec90b4bd2f0de1049d6231495e57aed1230b5d",
    "src/components/experience/YulaExperience.tsx": "5d571bb68d67e13d8a6cafa5470c15b536fee32974c46b178da46bf9c6b1f134",
    "src/components/experience/theme.ts": "cee0ad410f3e8bbad90d51603529029b595996a610c12cc115bf602a524e83e9",
    "src/components/layout/Header.tsx": "7219167b2a8853c8a5ebf0722946a5d97e9d1bab445de2f5b0442feb33c6848a",
    "src/components/projects/StatCards.tsx": "1f0443477dc044e9dfce0bfe5406fbaf4b69550e4ea98e53f9ca4c226ff678cb",
    "src/components/theme/ThemeControl.tsx": "f587b1393b2484d5b36d0a8482dd3ce4a4e02b36d9bdb5c412144f20d8bcfc73",
    "src/components/theme/ThemeProvider.tsx": "60ff212e2d0140f5243a2060bcf63ff8f71f117afba88518d7f174215e4fd06e",
    "src/components/theme/theme-copy.ts": "d614e9655f272a2b0e0fe86f3cf0bd7b001762f3db9c3b1f6e4c8ae581fa7d7c",
    "src/data/privacy-copy.ts": "94c5753e6ae551d939a01b8e57f13ce1cb0abf6b0ea174fa98e1a886a3e409dd",
    "src/data/projects/burunfarki.ts": "805a4d355e6f4057cb62adf233cecf6bde7f17a3a0635a718ec12df9286b6e46",
    "src/data/verification-copy.ts": "70c16bdcabedf7033449c54d9986323312ead5fb3c46c971c11aec9f17dbe8bc",
    "src/i18n/locales.ts": "397228713653ad4a844884d992387267a5a602e9fb6d30aabe36d0f7c7516ff5",
    "src/i18n/request.ts": "98f4c0fd5758e1b6dd3f0d1516ddebaeaf41f72cfb25b0d868033dcf1c3c8db8",
    "src/lib/localized.ts": "69a179dd2ffa5945f14842fd86924157f49efea2a147c734c3270cae14fb214d",
    "src/lib/theme.ts": "15435ec4a63fe78ff0cd3c71fd247dd7daaea05c4e14bafce0dc24e2f68e3115",
    "src/lib/types.ts": "8f074bb0e051743a474aef8284c4c4960ad2ac93a2ae47370d7631b985e0a383",
    "src/middleware.ts": "65fb7acb6d1ae1f01eacbd45eaf2e2271145d7e56a28f7e6fae7a44c51872d74",
    "tailwind.config.ts": "82b7a360c9619f27de63b82d62fb7ab754824c5aadd13ebdb118c0ecc31575b3",
    "tests/content-locale-wiring.test.tsx": "c355a79af8bbd9685069156a814841e841b5024f7474637d999472d39e0f692d",
    "tests/data-request-verification-page.test.tsx": "9b9b55b79fee198e1f56c0d6cf6ed8d25f81b8122a3bbb460b800f42f0c14844",
    "tests/experience-locale-content.test.tsx": "19ba617c8800a40bc062cc7b17230894d756e54de832c03abf9888694b83d6c2",
    "tests/locale-contract.test.ts": "a0cc5fcd56bde86aac5eea302f7e7090c28cb999db35771e5c62028ebb98682f",
    "tests/locale-pages.test.tsx": "19e2e854be5bae33a799f2b4e6664c0b643ea1cc87b74d05c1a381b4ff52d87d",
    "tests/locale-request.test.ts": "85ab64df6c54bab649ec5de4a135c692bff165f04cafc6cd05e32f6097e7e80c",
    "tests/locale-routing.test.ts": "d997b9857246ca67c14fde24a53f74fdfa372e1627b615e190d2b1a8507dcd20",
    "tests/locale-switcher.test.tsx": "7f02382ba1b685adc83508c026db3265ea7049c47c2bbbd83b8db5099d001b27",
    "tests/privacy-rights-copy.test.tsx": "0fc6bebd2cb228c441edbe79299dfd2e25e2614df0ef70188bbe3b7ba0745fa6",
    "tests/stat-cards.test.tsx": "e31224fe40a418b19cc76721bd7aef873505a9551abd55b27c8fef9a1c17abee",
    "tests/stat-number-locales.test.tsx": "67910406e9816a48a035dc6a069a135546607c9c13a0a38cda59341fbf748f94",
    "tests/theme-boot.test.ts": "170758f19a13b86ea9337d0eb2020febbf7a1b1c2af9fa2fa4c932848e5e16cc",
    "tests/theme.test.tsx": "12f859d49202e5c0c305b1ababc81431ad688b59902e2e475b9f29ca96e8efca"
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
