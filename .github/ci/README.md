# Published-source normal CI

The release snapshot commit `345bd36c42074e926c1c788baf43300c1f86e561`
contains all 257 files from the published web source manifest. The CI change
preserves 251 files verbatim. The six exceptions in `published-files.json`
are the workflow and Playwright harness: configurable local port and denial of
external browser DNS. The public application, hosting configuration, runtime
dependencies, lockfile, translations, assets, and database code are unchanged.

The Links sibling is pinned to
`1c307de4a3e6ce5a017692509ac14e479528faf5`. Push that existing commit to its
repository before the web workflow is run remotely. Its source parent
`9150a7f75d470594b3c31bba9c46d761c3f169b5` reproduces all ten publication
manifest files; only its CI workflow and new CI helpers differ.

The workflow runs all existing unit tests with disposable PostgreSQL 17,
lint, typecheck, content and URL-shape checks, offline Next/Netlify build,
artifact checks, and all existing Playwright tests. Local E2E uses port 4189;
`YULA_E2E_PORT` may select another isolated local port. Public URL reachability
is intentionally not requested. Every assertion remains in the baseline
test suites; local/browser results do not establish canonical hostname or
provider behavior.

`netlify/package-lock.json` freezes the build CLI dependency tree independently
of the product lockfile. Netlify CLI remains pinned to 27.5.0; only the CI
package overrides TOML to 4.2.0 and IPX sharp to 0.35.4 for the published
advisories GHSA-82x6-q7mm-w9cf, GHSA-v5mp-jgw5-2x6j, and
GHSA-f88m-g3jw-g9cj. The compatibility check parses local Netlify/Cargo
configuration and performs an IPX resize/WebP conversion with local fixtures.
The product dependency graph is unchanged. The Netlify step builds locally with `--offline` and
contains no deployment command. The artifact check distinguishes the host
platform and architecture, validates the adapter function/edge bundles and
the registry bytes, and records their hashes. It does not execute those
bundles in a production provider runtime.

The two existing package-manager dependency audit gates remain mandatory:
`pnpm audit --prod --audit-level high` and `pnpm audit --audit-level high`.
The independently locked Netlify CLI tree is also checked with
`npm audit --prefix .github/ci/netlify --audit-level high`. All three retain
normal failure behavior; no audit result is suppressed. These dependency
advisory checks are separate from native security validation. Ordinary tests,
dependency audits, and artifact hashes do not replace that validation or close
its findings. The original full workflow is retained in the immutable source
snapshot commit.

Before a remote push/PR, inspect provider Git integrations, production
branches, automatic preview behavior, and available free Actions capacity.
There is no deploy or merge step in these workflows. A successful local run
is not a GitHub runner receipt. Review the actual run's checkout SHA, sibling
SHA, job/step results, and artifacts before recording useful CI acceptance.

Future intentional product changes require an updated source manifest and
an explicit review of the publication relationship; the current manifest is
a release snapshot assertion, not a claim that future source is unchanged.
