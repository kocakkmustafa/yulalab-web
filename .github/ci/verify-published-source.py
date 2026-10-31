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
    "tests/status-pill.test.tsx": "f8c8b6bef8c9de494427ed1ee3fc9aa60b3746b0e818f327319ee2289aebb6a5",
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
    "src/components/projects/DevelopmentPreviewSection.tsx": "efeaf9104b520db295520f2f0138077c8948417a1bc1e4acda8400c92f2d5178",
    "src/data/product-presentations.ts": "a3e26a90c4ccce59583277cd719eba27e5f971b78527533d63a7a16ee5d1c6ec"
}
# END APPROVED VISUAL ADDITIONS
# 2026-10-20 user-approved A3 source/test/message candidate snapshot.
# Historical test/visual hashes above remain unchanged. This exact candidate set
# explicitly supersedes only two earlier visual-source hashes; it does not
# establish a publication, provider, device or security acceptance.
# Evidence: workspace/implementation-01-2026-10-19/ci-correctness-source-snapshot.json
# This helper has no self hash in the candidate set.
REVIEWED_A3_SOURCE_HASHES = {
    "messages/ar.json": "c4ee1cb7eca6b829c11eacbdd44cb703cbfaef2bf535dd6babe23c43020cca0f",
    "messages/content-ar.json": "880b3415812f4b2472d7b7e48322449e0cce7cac52497d788957456cb071246b",
    "messages/content-de.json": "58e6fd76f40049feca3593e5e6c30b771b210681f0e97619c5cda37a90fc4f5d",
    "messages/content-es-419.json": "ef2d31760504d236b87318b42a5ea5788ceb9ef313a43098662b2d77a69d73b6",
    "messages/content-fr.json": "af243dea4a8a0d9b9ba90767d735f6232d371e7d47e83ee519502a9a7361924f",
    "messages/content-ja.json": "920462e126e904b66f65a4e8a46d8b87596a943ac4cf581039ef6c8527ede8f0",
    "messages/content-pt-BR.json": "f0975c9bf8d24e406da92207395122fe075840219acb6453a023615d464565de",
    "messages/de.json": "b075ecc631e25f565bdab4aa9862525e38470438d8b8e674b4366ff1e8c1b5b8",
    "messages/es-419.json": "d6d377b1774421ecb1bbd806acba83a93edb2b2e98a8795ffae7c33889f6250b",
    "messages/fr.json": "977f7907da8068cf7d1abe22ba15126edba15aa2166aea797bc424d0e7724855",
    "messages/ja.json": "3c0b1b8bdd2b5e1b3b758dff454d37f93256a0aca79bb257e0fa4e3a15ce0748",
    "messages/pt-BR.json": "88a7f9490f7be6473910434776938423af73e9154f68eeb919b443d6a1073ae6",
    "scripts/verify-translations.ts": "615a5cebda801876cf5e5db702f1c74912b42a729b4209545ee845705f13b8c6",
    "src/data/privacy-copy.ts": "3472ba7a84bd419575d31c7e7e508722466e146e537b74b6725e594786c85e43",
    "src/i18n/locales.ts": "97c8e19bf9e8bf033ffd4f7f666f952db4a5fd32923e74ebb9faf09dae5b29b9",
    "src/lib/forms/lead-submission.ts": "19fb481176f13ff446f758afdf36856f5924bcd7efcff1478146c9e642552356",
    "src/lib/localized.ts": "5118cf3b4a79e6814cb98ede8330db6ea1b49bedcf27a9281e0a1bd477ad71e8",
    "src/lib/site-origin.ts": "eb11a1a5a776609d82332d11868430552f9981775456dddaad96fb46f1c19657",
    "tests/client-forms.test.tsx": "5f59ef47c009d614afe31236b67187f9d912948f84c12d550abdd06e707f9d8e",
    "tests/content-locale-wiring.test.tsx": "bcebf074d3721383b1f6335163cfc9e0aa12bc74d782bdcaad5f65fb34bdd6b0",
    "tests/experience-locale-content.test.tsx": "4dfe2b02a52943e98969e274c6df4a7d9f4428834934d9878502ca0115ea0645",
    "tests/leads-contract.test.ts": "0a243539b35253a45091645573013e461beb0950e38e2a5bb5a1d1a06d0bcd93",
    "tests/locale-pages.test.tsx": "76737ca816c60796b328dec02270f489b47e17fc7309e1f501db9ce393cb14f9",
    "tests/locale-routing.test.ts": "0941c8dd5914894041791b111a0ce3c4b39ab95cb849740e2eefcab48a62a006",
    "tests/locale-switcher.test.tsx": "2e9b82eace261f4f664d93bf467f4e242ddd436497d4724b1d1ac4cffd41b812",
    "tests/mail-budget.test.ts": "bef4a1f7a86c28c4ce048e7b4dd14cd6594793a82de0454e20aefa444074f5a8",
    "tests/privacy-rights-copy.test.tsx": "f1e1a25f3c65857d4661accd04092edc3eaab1094a8f138b71292de95f43e0f1",
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
    "messages/ar.json": "4d6996e880da7b5414668d6c34d9c5fdb20af83414e1507519b0c4e9edb04bef",
    "messages/content-ar.json": "715d1a651b838ca888805a3ac51cb4e5bbbae7fa474e46da5c88d333554170d2",
    "messages/content-de.json": "25ee586dedc26c4b1a3de613916be8adf627f60dbc66cd934df365f26c0c3186",
    "messages/content-es-419.json": "73846bb86e9cc0bd17439e124d53f7a7e8c036f2ad41e34a0dd85dd628b647e2",
    "messages/content-fr.json": "f3bcdc583faec649310c14be63324bd74791f66e3bb389cf9d94b7ac0b442786",
    "messages/content-hi.json": "9ed676a1b0c84f95217e646c8cee6cf105f50bd9e696ead813e578d70b52ebfd",
    "messages/content-id.json": "bad2f8b224839c17f8880ef66fb00db9dce9f56db988bc84ed099794b60a4a89",
    "messages/content-it.json": "11497a38c2b642f2ed1355178ac18004bf1b9055fb511edf8edf11e0d1ac618b",
    "messages/content-ja.json": "030bcc9bf018a5e71565d94d9c8bd269da13e40d5082c9ee1860df5d41f8106a",
    "messages/content-ko.json": "a0c8942b650f42816a096645db8105624adae8026d47fd055ef8d38160cab574",
    "messages/content-pl.json": "3526481575ee6cdca09ddf993dbd706ba6c4186da7cb01bc514de1e5268e45a0",
    "messages/content-pt-BR.json": "799561f1beb7d7aff5e42587fa90d71f933a296fe466f5fe4a3aa60cdfa043bc",
    "messages/content-zh-Hans.json": "4803eaec2021367ee739d5007a94de815e14bffc119b29eca682aa1f6701dee2",
    "messages/de.json": "1a284ab33e716d18fc9f27aecbb7869b973d02e57efe41ac8104a6f377966920",
    "messages/en.json": "5db5bd5e157defb4c9b9ef31d874963ac6671d70706312286d03d0ec9961d1b2",
    "messages/es-419.json": "0501a447312befe01604441db4ec8bcba4d5aeffbc23ab0b8ede684647c17d73",
    "messages/fr.json": "df3380ea97a7bfa6ec4d2e98eab31b3b2c5fa70e3ffaeff8495b703d0460a078",
    "messages/hi.json": "fe3de136086d3d90184532637a8328b7cd1392c7aa568452372a2303f134f8f2",
    "messages/id.json": "27a9cc011256b11f6a06def8863f90abab86f0589644e228394990a92708eaba",
    "messages/it.json": "20956d4dcfd20e0b44b9ac36c0240f52829fea7cf4e90c0062fe41a2b95d4c88",
    "messages/ja.json": "908f6723c07c0f04ed5515b481a9cdb41537378e82e1f8e1f9109633266c3898",
    "messages/ko.json": "a57cc4e3b531ca9f13607f6ba5bcfeb6e72982c72f28cb16f6b2ac215e31b263",
    "messages/pl.json": "f1f518341f6938f11d5a01ae1dcd99b572ee9b1af136ac876f5838df3eac863d",
    "messages/pt-BR.json": "398c66f652967fa7070fb76932e5410f8cd0857bbeaf3a042f8879f2b2bc1de0",
    "messages/tr.json": "a06cef2dd8d05636b6905fc1b75e647857e7c24fa5aa3306572062976b43284b",
    "messages/zh-Hans.json": "0786293c124311024b749056050b1bc8551dc76522955739e3af23a87356a866",
    "next.config.mjs": "73365bc728c08151b8b36e76ad99515d30d511ea3533fe1838d44449ef455814",
    "scripts/verify-translations.ts": "fdc76cf42731ab7838deb465823a979e1c7f654b5269ecb45a5b30ed3bbbda12",
    "src/app/[locale]/data-request/verify/route.ts": "7bac2c97d53e909d73cc1edd7ac6971ed61cd82b2ed08a0b491941f69fe5b324",
    "src/app/[locale]/layout.tsx": "e768baf0be7c015dc949447f7e24c31d5b4aa5d5bfd95a4b3daed6ac67217520",
    "src/app/[locale]/operating-system/page.tsx": "35d8b05586d8c2854f041dccc85ce6720858ddd85f82d33149b713ee3051e6df",
    "src/app/[locale]/privacy/page.tsx": "94fc4c2c47aa1a9d2961ad10318c2d30d19bf701804876d233637eb1f423e479",
    "src/app/global-not-found.tsx": "868aaa4a27276f3df13101f0f2d9e57a2b3815a28692a29d46ac6178c26791d7",
    "src/app/globals.css": "3781b492be3fa248d9bd76425ff647e9facdf420724a9a483ef3c8e6c12138d2",
    "src/components/experience/Experience.module.css": "2ea092366eead5233c6a1dda51ea0bb84e9562ebf77bdda02b6d635e4dfd8f26",
    "src/components/experience/ExperienceCanvas.tsx": "ce6d293f53af614c05d7238a2b8945391927eb3737aa1a39f44fb173e1bd5386",
    "src/components/experience/ExperienceOverlay.tsx": "ef1cd0724ff1154929ae62d71b1e0f6e21d5afb2d3bcc7a726e2f1d1c899e682",
    "src/components/experience/ExperienceWorld.tsx": "7d467078b542ff14c51289341f85ae32508d6886d352e96439c53bfeff225db7",
    "src/components/experience/YulaExperience.tsx": "b9e229716bc135a74d45b9b90383c990ae6b100131da278dcfc906336013e20e",
    "src/components/experience/theme.ts": "547aeeb0e856dbd66503f356063d639f4f724a0c5826b0ac71de5a58d960ad1d",
    "src/components/layout/Header.tsx": "37a4f5010d25a3f99e731cc54e875e703b0a02b5e605a801d9b70c070c40bf97",
    "src/components/projects/StatCards.tsx": "2a0a16cf3e3b3eedbfc9116a7b3843db85e117eb6da7f33703a4b34628e4c653",
    "src/components/theme/ThemeControl.tsx": "f587b1393b2484d5b36d0a8482dd3ce4a4e02b36d9bdb5c412144f20d8bcfc73",
    "src/components/theme/ThemeProvider.tsx": "60ff212e2d0140f5243a2060bcf63ff8f71f117afba88518d7f174215e4fd06e",
    "src/components/theme/theme-copy.ts": "d614e9655f272a2b0e0fe86f3cf0bd7b001762f3db9c3b1f6e4c8ae581fa7d7c",
    "src/data/privacy-copy.ts": "94c5753e6ae551d939a01b8e57f13ce1cb0abf6b0ea174fa98e1a886a3e409dd",
    "src/data/projects/burunfarki.ts": "ead85cd1f4e9818d14b206b8a42c7792591478e2159de07463d0227aac3fcfb2",
    "src/data/verification-copy.ts": "04a04e2157c30af20cc1c58da208328d9d48ac3cbb6029783be7f0e930d7cf02",
    "src/i18n/locales.ts": "397228713653ad4a844884d992387267a5a602e9fb6d30aabe36d0f7c7516ff5",
    "src/i18n/request.ts": "98f4c0fd5758e1b6dd3f0d1516ddebaeaf41f72cfb25b0d868033dcf1c3c8db8",
    "src/lib/localized.ts": "69a179dd2ffa5945f14842fd86924157f49efea2a147c734c3270cae14fb214d",
    "src/lib/theme.ts": "9a9849555fdf19db28fabbcd26287718864abc4b4c47008c44bccfc5385bdbc6",
    "src/lib/types.ts": "0c1e46e68edbd1ae135e6b30b35a5f6410b159d26fc2de5726d6663fc39a44f0",
    "src/middleware.ts": "d7cf2e17e6c2f70e58aac46c0491b6cffa609979230b543fae3994a604e60041",
    "tailwind.config.ts": "17b4f0065f952e32091828579003756effde1810ea864011e260b437380d53aa",
    "tests/content-locale-wiring.test.tsx": "9138caf62cdc12bf7e4fbacc2672263caad3bca384c647310d79f21ecec90715",
    "tests/data-request-verification-page.test.tsx": "9b9b55b79fee198e1f56c0d6cf6ed8d25f81b8122a3bbb460b800f42f0c14844",
    "tests/experience-locale-content.test.tsx": "df60ff5d3e2ae986df2c3f88fefa6ab3718029d19f319e1e5fb691d4bdc4cffb",
    "tests/locale-contract.test.ts": "a0cc5fcd56bde86aac5eea302f7e7090c28cb999db35771e5c62028ebb98682f",
    "tests/locale-pages.test.tsx": "19e2e854be5bae33a799f2b4e6664c0b643ea1cc87b74d05c1a381b4ff52d87d",
    "tests/locale-request.test.ts": "85ab64df6c54bab649ec5de4a135c692bff165f04cafc6cd05e32f6097e7e80c",
    "tests/locale-routing.test.ts": "6aa446c9ed1d67ffc6e5f76526cf54950d3e3ef47e3e6a3e7d1e28cd71b46650",
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
