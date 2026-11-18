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
    "src/components/experience/useShowcaseTextures.ts": "b9cda4bfabda08c0a93fe5d201fe63a7e8ef917c3ef5f26046e58d3b3755303a",
    "src/components/projects/DevelopmentPreviewSection.tsx": "bcf341219391618be4da8cc01dd45a91c594424344a9ca6f3c1347c1be047dae",
    "src/data/product-presentations.ts": "3afc2bee62a05257c3b9eae622d090ebb9b9b1d430f46ff62cd895995041819c"
}
# END APPROVED VISUAL ADDITIONS
# 2026-10-20 user-approved A3 source/test/message candidate snapshot.
# Historical test/visual hashes above remain unchanged. This exact candidate set
# explicitly supersedes only two earlier visual-source hashes; it does not
# establish a publication, provider, device or security acceptance.
# Evidence: workspace/implementation-01-2026-10-19/ci-correctness-source-snapshot.json
# This helper has no self hash in the candidate set.
REVIEWED_A3_SOURCE_HASHES = {
    "messages/ar.json": "56707793c3972efc612330cfd4ec1129affaf9e7265c1cd2181465ce64342422",
    "messages/content-ar.json": "dac755001196708e9902fe4ab71aaeeb3f13a1b6ef0d58f2c67bcef4a20d81e5",
    "messages/content-de.json": "058046cf45859259d4b4700ed5f3e868c5fb01c924368afb0244cc4b48e4d15e",
    "messages/content-es-419.json": "3fb6b357c7d3d7f8d8c7393e583321fc75729d2a5d66e79e5cef2b1458fb78eb",
    "messages/content-fr.json": "b4369c923d98f464f6b0d75ca5bd552c73a44bfdac56dd5c217e5ea9b6b74116",
    "messages/content-ja.json": "6de1d70f148a8a44071243eb57dca0a22a779ee76d007895b7753d44489db4ae",
    "messages/content-pt-BR.json": "fd8af9afcdf3df10d98325b22a1e516b79ff59d4b1d76e23f339a77b1c96534e",
    "messages/de.json": "4e61736b774eafc630ffd227f182422d9e37b231b4001df34c98c98209e7ceb5",
    "messages/es-419.json": "b1bb0c5ec745b320324a7597b0350e333f69588e452e04989c44bcdbf4ad1368",
    "messages/fr.json": "29fdfab70e8a694efb27775a0d7ed2d916c694b846d20f0089ab557aa24a2d02",
    "messages/ja.json": "f0b045608aca958866cfa289a6ee508548f35ec791d4f0d1f6374f596c698518",
    "messages/pt-BR.json": "f8517b229fc4589fac97c63a15d4688d71e318e4677c979b067b20ad95c2437a",
    "scripts/verify-translations.ts": "f1e393000d88fa890b5658b60213c949d832cbccd680b8b193beb12ad0665f37",
    "src/data/privacy-copy.ts": "94c5753e6ae551d939a01b8e57f13ce1cb0abf6b0ea174fa98e1a886a3e409dd",
    "src/i18n/locales.ts": "397228713653ad4a844884d992387267a5a602e9fb6d30aabe36d0f7c7516ff5",
    "src/lib/forms/lead-submission.ts": "19fb481176f13ff446f758afdf36856f5924bcd7efcff1478146c9e642552356",
    "src/lib/localized.ts": "69a179dd2ffa5945f14842fd86924157f49efea2a147c734c3270cae14fb214d",
    "src/lib/site-origin.ts": "eb11a1a5a776609d82332d11868430552f9981775456dddaad96fb46f1c19657",
    "tests/client-forms.test.tsx": "5f59ef47c009d614afe31236b67187f9d912948f84c12d550abdd06e707f9d8e",
    "tests/content-locale-wiring.test.tsx": "c355a79af8bbd9685069156a814841e841b5024f7474637d999472d39e0f692d",
    "tests/experience-locale-content.test.tsx": "3e2cd10e52702c6fb48fa010d665f1098e619aab9158cf4f8e98be75f0935043",
    "tests/leads-contract.test.ts": "0a243539b35253a45091645573013e461beb0950e38e2a5bb5a1d1a06d0bcd93",
    "tests/locale-pages.test.tsx": "19e2e854be5bae33a799f2b4e6664c0b643ea1cc87b74d05c1a381b4ff52d87d",
    "tests/locale-routing.test.ts": "641ad8764ad75667bb481a5114c9e5f1272c01eebbbecaccfb45bacca54aba7e",
    "tests/locale-switcher.test.tsx": "7f02382ba1b685adc83508c026db3265ea7049c47c2bbbd83b8db5099d001b27",
    "tests/mail-budget.test.ts": "bef4a1f7a86c28c4ce048e7b4dd14cd6594793a82de0454e20aefa444074f5a8",
    "tests/privacy-rights-copy.test.tsx": "0fc6bebd2cb228c441edbe79299dfd2e25e2614df0ef70188bbe3b7ba0745fa6",
    "src/components/projects/DevelopmentPreviewSection.tsx": "bcf341219391618be4da8cc01dd45a91c594424344a9ca6f3c1347c1be047dae",
    "src/data/product-presentations.ts": "3afc2bee62a05257c3b9eae622d090ebb9b9b1d430f46ff62cd895995041819c",
    "tests/structured-data-honesty.test.tsx": "61a277923bddb9504a3c481e6a19488107cb92726327bb71d1bdd53b06050840"
}
# BEGIN REVIEWED THEME14 SOURCE HASHES
# Exact candidate bytes; older A3/test/visual maps remain historical.
# Browser/provider/publication acceptance is explicitly open.
REVIEWED_THEME14_SOURCE_HASHES = {
    "BITIRME-PROGRAMI.md": "0598f2749b2603c5afe14cf2e702af418e56b5e8032e83feba9aa41e34eb921e",
    "DEFTER.md": "f4243948026cc152cec4619d4a78c9f80f9491a9b7eb68982d5f20f159d6f289",
    "README.md": "21989e53150b598c65c8477d9c7a5906d20ee17022d7ec6d0d3a24cd052f17dd",
    "messages/ar.json": "56707793c3972efc612330cfd4ec1129affaf9e7265c1cd2181465ce64342422",
    "messages/content-ar.json": "dac755001196708e9902fe4ab71aaeeb3f13a1b6ef0d58f2c67bcef4a20d81e5",
    "messages/content-de.json": "058046cf45859259d4b4700ed5f3e868c5fb01c924368afb0244cc4b48e4d15e",
    "messages/content-es-419.json": "3fb6b357c7d3d7f8d8c7393e583321fc75729d2a5d66e79e5cef2b1458fb78eb",
    "messages/content-fr.json": "b4369c923d98f464f6b0d75ca5bd552c73a44bfdac56dd5c217e5ea9b6b74116",
    "messages/content-hi.json": "516c0c7e11b17cfc2be6de6ca651060ea97e766dcbd8355d56c6a341552ae6a5",
    "messages/content-id.json": "e97a7e55528d49b272a700da62651d9b5e882e63235417a83b944eda681cd915",
    "messages/content-it.json": "c94193e87940ad1f332a2b41ba81139a3a2b60618da7b66d09c64e0df1cb815e",
    "messages/content-ja.json": "6de1d70f148a8a44071243eb57dca0a22a779ee76d007895b7753d44489db4ae",
    "messages/content-ko.json": "8bfb56f5371cec4514a8312794fb6908704b73090881a07dfc8b82c0c9d85f19",
    "messages/content-pl.json": "50e05e877c41e22ed531ee7b051dae2b6777e6b042df6788072c95af4282360d",
    "messages/content-pt-BR.json": "fd8af9afcdf3df10d98325b22a1e516b79ff59d4b1d76e23f339a77b1c96534e",
    "messages/content-zh-Hans.json": "24dd3a6c8b2957a507eae98684e7a2c02c3e865394b771cd2be7207ac848f3f8",
    "messages/de.json": "4e61736b774eafc630ffd227f182422d9e37b231b4001df34c98c98209e7ceb5",
    "messages/en.json": "218a554765bdff05a95efdd98bbd2bb72363fbf1314d5c3eae03199809792c46",
    "messages/es-419.json": "b1bb0c5ec745b320324a7597b0350e333f69588e452e04989c44bcdbf4ad1368",
    "messages/fr.json": "29fdfab70e8a694efb27775a0d7ed2d916c694b846d20f0089ab557aa24a2d02",
    "messages/hi.json": "d908a11e6ebe4a643fffb2681dff1fc5c9ab7b25dc31a8ca04f936b158c4da2c",
    "messages/id.json": "0895309b2717b16155b37fdfb009fb131fab753ac7d3c3f588ad956f67dd4ede",
    "messages/it.json": "b0d8d51eebdc8ddf01ab669b99a9397fd55f805f3218a5dc842e81780a495619",
    "messages/ja.json": "f0b045608aca958866cfa289a6ee508548f35ec791d4f0d1f6374f596c698518",
    "messages/ko.json": "13a4d01b565f586f857bd878747af09f2ef8cbd57b2eca747a93278b2f005a79",
    "messages/pl.json": "d0920b4819fd0d4fbf83723504d0d47e48f9d16d2539745e7fa3acb1e1952cf6",
    "messages/pt-BR.json": "f8517b229fc4589fac97c63a15d4688d71e318e4677c979b067b20ad95c2437a",
    "messages/tr.json": "738a663f20384a88b9bbc9747f240316b95cc569ab280d31e35f8c4043627c1d",
    "messages/zh-Hans.json": "4132ad9c73763abd8d382573461a0a26017bc1b2f3818aad8f3492fd79082a13",
    "next.config.mjs": "6cf56f217480b6babef04e61d607b525484c9cb607a0e47eb9756518b1307797",
    "scripts/verify-translations.ts": "f1e393000d88fa890b5658b60213c949d832cbccd680b8b193beb12ad0665f37",
    "src/app/[locale]/data-request/verify/route.ts": "312835acbdd9ad77356785fefa3f6c7c652e3efafc1832a0de88d7a4958c9c2f",
    "src/app/[locale]/layout.tsx": "5c7df91ab67f87d3199986b3f2f6fe1b0bf63fe99d926e637bd1ea8af9d6abbd",
    "src/app/[locale]/operating-system/page.tsx": "35d8b05586d8c2854f041dccc85ce6720858ddd85f82d33149b713ee3051e6df",
    "src/app/[locale]/privacy/page.tsx": "4f0908c07bd18f0e2885441851b6a5fe918d7917dc6b094701b0d36e10126431",
    "src/app/global-not-found.tsx": "161cb35c214fec737e22adad0b3bc091d7af6f2bd7510a60c792cfd21441840f",
    "src/app/globals.css": "c449a8de7bde602f04f3d8f661a7dfa0d35c0b18d8196e9e1ef03dc78ed1cebc",
    "src/components/experience/Experience.module.css": "0a9713542d1e609df125b35162ac69cb07ec24825fded8b55128347c3588e393",
    "src/components/experience/ExperienceCanvas.tsx": "04eca23c83748f72d21e93deb7f7dfa81a7bca9e3b91a7f7c31fc8c640ccb0c6",
    "src/components/experience/ExperienceOverlay.tsx": "91913558b9837e61afb112dc17b93016896e7793c8e34970a5158b79aa227c68",
    "src/components/experience/ExperienceWorld.tsx": "f965f661ef6873561b6981ddd4ec90b4bd2f0de1049d6231495e57aed1230b5d",
    "src/components/experience/YulaExperience.tsx": "5d571bb68d67e13d8a6cafa5470c15b536fee32974c46b178da46bf9c6b1f134",
    "src/components/experience/theme.ts": "cee0ad410f3e8bbad90d51603529029b595996a610c12cc115bf602a524e83e9",
    "src/components/layout/Header.tsx": "1c2493cffd224a888416fa8627ac774da6d49d1ffd23dcef80a9254dd3535395",
    "src/components/projects/StatCards.tsx": "1f0443477dc044e9dfce0bfe5406fbaf4b69550e4ea98e53f9ca4c226ff678cb",
    "src/components/theme/ThemeControl.tsx": "f587b1393b2484d5b36d0a8482dd3ce4a4e02b36d9bdb5c412144f20d8bcfc73",
    "src/components/theme/ThemeProvider.tsx": "474ae6ca7838c87ebc1d5693e02e55978aeb5348de31d7b30002755066decb09",
    "src/components/theme/theme-copy.ts": "d614e9655f272a2b0e0fe86f3cf0bd7b001762f3db9c3b1f6e4c8ae581fa7d7c",
    "src/data/privacy-copy.ts": "94c5753e6ae551d939a01b8e57f13ce1cb0abf6b0ea174fa98e1a886a3e409dd",
    "src/data/projects/burunfarki.ts": "805a4d355e6f4057cb62adf233cecf6bde7f17a3a0635a718ec12df9286b6e46",
    "src/data/verification-copy.ts": "70c16bdcabedf7033449c54d9986323312ead5fb3c46c971c11aec9f17dbe8bc",
    "src/i18n/locales.ts": "397228713653ad4a844884d992387267a5a602e9fb6d30aabe36d0f7c7516ff5",
    "src/i18n/request.ts": "98f4c0fd5758e1b6dd3f0d1516ddebaeaf41f72cfb25b0d868033dcf1c3c8db8",
    "src/lib/localized.ts": "69a179dd2ffa5945f14842fd86924157f49efea2a147c734c3270cae14fb214d",
    "src/lib/theme.ts": "1b938837b6942c39b918bce0d1c8a8e063f5439c8c4c773958e28f2c76378095",
    "src/lib/types.ts": "8f074bb0e051743a474aef8284c4c4960ad2ac93a2ae47370d7631b985e0a383",
    "src/middleware.ts": "65fb7acb6d1ae1f01eacbd45eaf2e2271145d7e56a28f7e6fae7a44c51872d74",
    "tailwind.config.ts": "786bf138ffbde52a6b3c184095716a0cb086cac7675529a6abbd15890f7d5eba",
    "tests/content-locale-wiring.test.tsx": "c355a79af8bbd9685069156a814841e841b5024f7474637d999472d39e0f692d",
    "tests/data-request-verification-page.test.tsx": "5bd26431e0d9d361e421161029c11df24cdafa9339620d66d37ad8d876d56bc3",
    "tests/experience-locale-content.test.tsx": "3e2cd10e52702c6fb48fa010d665f1098e619aab9158cf4f8e98be75f0935043",
    "tests/locale-contract.test.ts": "a0cc5fcd56bde86aac5eea302f7e7090c28cb999db35771e5c62028ebb98682f",
    "tests/locale-pages.test.tsx": "19e2e854be5bae33a799f2b4e6664c0b643ea1cc87b74d05c1a381b4ff52d87d",
    "tests/locale-request.test.ts": "85ab64df6c54bab649ec5de4a135c692bff165f04cafc6cd05e32f6097e7e80c",
    "tests/locale-routing.test.ts": "641ad8764ad75667bb481a5114c9e5f1272c01eebbbecaccfb45bacca54aba7e",
    "tests/locale-switcher.test.tsx": "7f02382ba1b685adc83508c026db3265ea7049c47c2bbbd83b8db5099d001b27",
    "tests/privacy-rights-copy.test.tsx": "0fc6bebd2cb228c441edbe79299dfd2e25e2614df0ef70188bbe3b7ba0745fa6",
    "tests/stat-cards.test.tsx": "21bb058cb60440a6f27fd452a522242c37ad3ad8d26acc15842f7f5ccbc3f228",
    "tests/stat-number-locales.test.tsx": "792c437e28291321bcfa7d53e0d14b4d1c96cace7d228ca22c3f0debc9f73248",
    "tests/theme-boot.test.ts": "bf9704733cc16e485742f5ea62975954beea3b8be4ad31160564000dc1a8e606",
    "tests/theme.test.tsx": "743bda43a4e8df30645dd235d0c4d9040bf6ac50214e00b4f2aedc0f34a13090"
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
