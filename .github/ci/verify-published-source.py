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
    "messages/ar.json": "fff74dbd9dce053f08d9a9256c9bc1ee3f3bd60039bb8606ca072e332645b801",
    "messages/content-ar.json": "72cea25d4a36e1c0bd8dfc8cf01ff119215fc4a9cdc9dd5115c524e474fc1e96",
    "messages/content-de.json": "dbf9688343e2d7749f471c52d304b07787f5b4b6485d46fcabeeef4d85c83d1a",
    "messages/content-es-419.json": "65b87e0a8fd345987127077a0b925eeeeb4b4a439caaf91f1dfbefdaec8cbee6",
    "messages/content-fr.json": "2fc0dc1fc614b7a676e916d46eb7e95fd02625348cc94c454892d7d63a355580",
    "messages/content-ja.json": "661dbdadb24188cf907b7391eb753a8478cc817f7b6d1d1470dcf26c2ca08c85",
    "messages/content-pt-BR.json": "cd2148b5070a44f3ad19185d1869643f430e30c92f3eb869f56e1aa304fe54fa",
    "messages/de.json": "4da7a03f34408c511a6b77c8dcc62ecad0fa886e878aeaa3191cc3d19124ab3d",
    "messages/es-419.json": "dc8fd755a0f5c08691faf783f18dd836b6982439fb675082c5d100638f90a804",
    "messages/fr.json": "02d0743815e6bd9d92b2c8209fe3495651c1a7dd31cd3755bb3ed87ff0dbb43d",
    "messages/ja.json": "5b21a5b45febf71c2e5f9b5edda03712f812f53ae6695ff019d7ab2dad00f21a",
    "messages/pt-BR.json": "4fbd1983d6d04b46b0b3fc36fa60809b13e741e74971ecf58254b2c773fd5ae6",
    "scripts/verify-translations.ts": "217153913dcde8677308c7eee81424eaf45fd1991d688ba3d05aca39544c86e2",
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
    "messages/ar.json": "fff74dbd9dce053f08d9a9256c9bc1ee3f3bd60039bb8606ca072e332645b801",
    "messages/content-ar.json": "72cea25d4a36e1c0bd8dfc8cf01ff119215fc4a9cdc9dd5115c524e474fc1e96",
    "messages/content-de.json": "dbf9688343e2d7749f471c52d304b07787f5b4b6485d46fcabeeef4d85c83d1a",
    "messages/content-es-419.json": "65b87e0a8fd345987127077a0b925eeeeb4b4a439caaf91f1dfbefdaec8cbee6",
    "messages/content-fr.json": "2fc0dc1fc614b7a676e916d46eb7e95fd02625348cc94c454892d7d63a355580",
    "messages/content-hi.json": "61a8b6feed788b43ccc0a9d586707a047e92d94e1ef71e98c8543c9d75bdb4a5",
    "messages/content-id.json": "f45c883e2fecb26c46b5386abeb313619c1079d71ec82f3bcca957e8e48370ff",
    "messages/content-it.json": "4cf9f3b9ad2eec65970e95de22370de4dea5c5a4e35c83d83ed83993faaa05a6",
    "messages/content-ja.json": "661dbdadb24188cf907b7391eb753a8478cc817f7b6d1d1470dcf26c2ca08c85",
    "messages/content-ko.json": "7aa65162b28280db8421e3c75fdb68f7da9cecc8abfd155b3a51fb04eb92cd98",
    "messages/content-pl.json": "8ab6ea56a2fa3febe89d1337c5f78b38c8d1acdce413d8eb44a75713e1e873fd",
    "messages/content-pt-BR.json": "cd2148b5070a44f3ad19185d1869643f430e30c92f3eb869f56e1aa304fe54fa",
    "messages/content-zh-Hans.json": "d6996b09b81aee101a35a9db2e4a98809332b7fe79927ffabd1f7fca67e75dde",
    "messages/de.json": "4da7a03f34408c511a6b77c8dcc62ecad0fa886e878aeaa3191cc3d19124ab3d",
    "messages/en.json": "cda9b9972115ef9b1bdf3270b4798b52fa4c81ff0986bb4e5ca35d8f2568833b",
    "messages/es-419.json": "dc8fd755a0f5c08691faf783f18dd836b6982439fb675082c5d100638f90a804",
    "messages/fr.json": "02d0743815e6bd9d92b2c8209fe3495651c1a7dd31cd3755bb3ed87ff0dbb43d",
    "messages/hi.json": "bdf083a54380437218817e986f0fd7bdcce2cc39bed33fa29e5aea9253162a3e",
    "messages/id.json": "cf4f29786fa94be001adca9c521dde746029a42681a878cd990ebd8cf24ad0b9",
    "messages/it.json": "bf29274cb2340fba19b08d7774294ec0831fb91fa7d1d7fad1a24a40b54a66f6",
    "messages/ja.json": "5b21a5b45febf71c2e5f9b5edda03712f812f53ae6695ff019d7ab2dad00f21a",
    "messages/ko.json": "209dbe2301bf3b558d01086beab343861b35a17defa72b562215b10f9820ce92",
    "messages/pl.json": "011f0e38a94aa74208cc7d320f920381a5bccd3e02edb73699ea84738f8b09bb",
    "messages/pt-BR.json": "4fbd1983d6d04b46b0b3fc36fa60809b13e741e74971ecf58254b2c773fd5ae6",
    "messages/tr.json": "2e91bfbd95f0369a33eab2e19f259a222ee8f7ee44d6b0ddb4238442a00e0e47",
    "messages/zh-Hans.json": "3a6b49f7310eb1250c0f1168bd2ffeef224e756002bfc8830a2a414f2e179a60",
    "next.config.mjs": "73365bc728c08151b8b36e76ad99515d30d511ea3533fe1838d44449ef455814",
    "scripts/verify-translations.ts": "217153913dcde8677308c7eee81424eaf45fd1991d688ba3d05aca39544c86e2",
    "src/app/[locale]/data-request/verify/route.ts": "7bac2c97d53e909d73cc1edd7ac6971ed61cd82b2ed08a0b491941f69fe5b324",
    "src/app/[locale]/layout.tsx": "d159532459458e7084556f1530592aa36702199bc4e9348e2fdd67c2193e0c84",
    "src/app/[locale]/operating-system/page.tsx": "35d8b05586d8c2854f041dccc85ce6720858ddd85f82d33149b713ee3051e6df",
    "src/app/[locale]/privacy/page.tsx": "4f0908c07bd18f0e2885441851b6a5fe918d7917dc6b094701b0d36e10126431",
    "src/app/global-not-found.tsx": "161cb35c214fec737e22adad0b3bc091d7af6f2bd7510a60c792cfd21441840f",
    "src/app/globals.css": "b1d33313425f232972d353d51915c0517ead9f12866b94da4c7da6e317b59091",
    "src/components/experience/Experience.module.css": "e923c3d398c223fe6d8192ae2c259377aad389805f232c28a80a8609ecdd3829",
    "src/components/experience/ExperienceCanvas.tsx": "04eca23c83748f72d21e93deb7f7dfa81a7bca9e3b91a7f7c31fc8c640ccb0c6",
    "src/components/experience/ExperienceOverlay.tsx": "91913558b9837e61afb112dc17b93016896e7793c8e34970a5158b79aa227c68",
    "src/components/experience/ExperienceWorld.tsx": "f965f661ef6873561b6981ddd4ec90b4bd2f0de1049d6231495e57aed1230b5d",
    "src/components/experience/YulaExperience.tsx": "adec6585ea7db08a5cfdeed5af7adcf4662600252f75bd73346097090ca94e6c",
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
