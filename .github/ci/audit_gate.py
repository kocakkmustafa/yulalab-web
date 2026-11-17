"""pnpm audit kapisi siniflandirmasi (ci.yml 'Collect' adimi bunu cagirir).

Kabul edilen riskler (yalniz bunlar; baska her sapma FAIL):

1. GHSA-vfj7-8cjw-p6xm (braces) - eski kabul, mantigi degistirilmedi.
2. GHSA-fc5q-39xc-vjpf (picomatch <=4.0.7 ReDoS, high). Duzeltme surumu YOK
   (npm latest 4.0.7). Gerekce: prod yolu next-intl > @parcel/watcher > picomatch@4.0.4
   derleme/katalog izleyicisidir; kalan yollar yalniz dev (vitest, vite, eslint-config-next).
   SON TARIH 2026-12-18: duzeltme cikinca bu kabulu kaldir; 2026-12-18'de yeniden degerlendir.
"""

BRACES_ID = 'GHSA-vfj7-8cjw-p6xm'
BRACES_PATH = '.>eslint-config-next>@next/eslint-plugin-next>fast-glob>micromatch>braces'

PICOMATCH_ID = 'GHSA-fc5q-39xc-vjpf'
PICOMATCH_PROD_PATHS = frozenset({'.>next-intl>@parcel/watcher>picomatch'})
PICOMATCH_FULL_PATHS = PICOMATCH_PROD_PATHS | frozenset({
    '.>@vitejs/plugin-react>vite>picomatch',
    '.>eslint-config-next>@next/eslint-plugin-next>fast-glob>micromatch>picomatch',
    '.>vitest>picomatch',
})

ACCEPTED_STATES = ('PASS_RAW_AUDIT', 'PASS_KNOWN_CONDITIONALLY_ACCEPTED', 'FAIL_KNOWN_CONDITIONALLY_ACCEPTED')


def _picomatch_exact(advisory, scope):
    findings = advisory.get('findings', [])
    allowed = PICOMATCH_PROD_PATHS if scope == 'audit_prod' else PICOMATCH_FULL_PATHS
    return (advisory.get('github_advisory_id') == PICOMATCH_ID and advisory.get('module_name') == 'picomatch'
            and advisory.get('severity') == 'high' and bool(findings)
            and all(bool(f.get('paths')) and set(f['paths']) <= allowed for f in findings))


def classify(scope, raw, code):
    vuln = raw['metadata']['vulnerabilities']
    advisory_values = list(raw['advisories'].values())
    dangerous = [a for a in advisory_values if a['severity'] in ('high', 'critical')]
    highs = [a for a in dangerous if a['severity'] == 'high']
    # Sayac: advisory basina 1; yalniz kabul edilen picomatch id'si icin ek bulgular da sayilir.
    expected_high = len(highs) + sum(max(len(a.get('findings', [])) - 1, 0) for a in highs if a.get('github_advisory_id') == PICOMATCH_ID)
    valid = raw.get('muted') == [] and code in (0, 1) and int(vuln['critical']) == 0 and int(vuln['high']) == expected_high
    if not valid:
        return 'FAIL_UNKNOWN_OR_INCOMPLETE', dangerous
    if code == 0 and not dangerous:
        return 'PASS_RAW_AUDIT', dangerous
    if code == 1 and len(dangerous) == 1:
        advisory = dangerous[0]
        findings = advisory.get('findings', [])
        if scope == 'audit_full':
            exact = advisory.get('github_advisory_id') == BRACES_ID and advisory.get('module_name') == 'braces' and advisory.get('severity') == 'high' and bool(findings)
            exact = exact and all(f.get('version') == '3.0.3' and bool(f.get('paths')) and set(f['paths']) == {BRACES_PATH} for f in findings)
            if exact:
                return 'FAIL_KNOWN_CONDITIONALLY_ACCEPTED', dangerous
        if _picomatch_exact(advisory, scope):
            return ('PASS_KNOWN_CONDITIONALLY_ACCEPTED' if scope == 'audit_prod' else 'FAIL_KNOWN_CONDITIONALLY_ACCEPTED'), dangerous
    return 'FAIL_OUTSIDE_ACCEPTED_RISK', dangerous
