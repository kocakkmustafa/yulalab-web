"""audit_gate.classify kabul/red senaryolari; ag, build ve canli istek yok."""
import copy
import importlib.util
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location("audit_gate", Path(__file__).with_name("audit_gate.py"))
gate = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(gate)

NEXT_INTL = '.>next-intl>@parcel/watcher>picomatch'
DEV = ['.>@vitejs/plugin-react>vite>picomatch', '.>eslint-config-next>@next/eslint-plugin-next>fast-glob>micromatch>picomatch', '.>vitest>picomatch']


def adv(id_='GHSA-fc5q-39xc-vjpf', module='picomatch', severity='high', paths=(NEXT_INTL,)):
    return {'github_advisory_id': id_, 'module_name': module, 'severity': severity,
            'findings': [{'version': '4.0.4', 'paths': [p]} for p in paths]}


def audit(advisories, high, critical=0, muted=None):
    return {'metadata': {'vulnerabilities': {'high': high, 'critical': critical}},
            'advisories': {str(i): a for i, a in enumerate(advisories)}, 'muted': [] if muted is None else muted}


class AuditGate(unittest.TestCase):
    def test_prod_accepted(self):
        self.assertEqual(gate.classify('audit_prod', audit([adv()], 1), 1)[0], 'PASS_KNOWN_CONDITIONALLY_ACCEPTED')

    def test_full_accepted_four_paths(self):
        self.assertEqual(gate.classify('audit_full', audit([adv(paths=[NEXT_INTL] + DEV)], 4), 1)[0], 'FAIL_KNOWN_CONDITIONALLY_ACCEPTED')

    def test_full_accepted_three_findings_counter(self):
        self.assertEqual(gate.classify('audit_full', audit([adv(paths=DEV)], 3), 1)[0], 'FAIL_KNOWN_CONDITIONALLY_ACCEPTED')

    def test_prod_dev_path_rejected(self):
        self.assertEqual(gate.classify('audit_prod', audit([adv(paths=[DEV[2]])], 1), 1)[0], 'FAIL_OUTSIDE_ACCEPTED_RISK')

    def test_same_id_unknown_path_rejected(self):
        self.assertEqual(gate.classify('audit_full', audit([adv(paths=['.>other>picomatch'])], 1), 1)[0], 'FAIL_OUTSIDE_ACCEPTED_RISK')
        self.assertEqual(gate.classify('audit_full', audit([adv(paths=[NEXT_INTL, '.>other>picomatch'])], 2), 1)[0], 'FAIL_OUTSIDE_ACCEPTED_RISK')

    def test_wrong_module_or_other_id_rejected(self):
        self.assertEqual(gate.classify('audit_full', audit([adv(module='braces')], 1), 1)[0], 'FAIL_OUTSIDE_ACCEPTED_RISK')
        self.assertEqual(gate.classify('audit_full', audit([adv(id_='GHSA-xxxx-xxxx-xxxx')], 1), 1)[0], 'FAIL_OUTSIDE_ACCEPTED_RISK')

    def test_extra_high_advisory_rejected(self):
        self.assertEqual(gate.classify('audit_full', audit([adv(), adv(id_='GHSA-aaaa-bbbb-cccc', module='foo')], 2), 1)[0], 'FAIL_OUTSIDE_ACCEPTED_RISK')

    def test_critical_rejected(self):
        self.assertEqual(gate.classify('audit_prod', audit([adv(), adv(id_='GHSA-aaaa-bbbb-cccc', module='foo', severity='critical')], 1, critical=1), 1)[0], 'FAIL_UNKNOWN_OR_INCOMPLETE')

    def test_counter_mismatch_rejected(self):
        self.assertEqual(gate.classify('audit_full', audit([adv(paths=DEV)], 5), 1)[0], 'FAIL_UNKNOWN_OR_INCOMPLETE')

    def test_muted_and_exit_code_rejected(self):
        self.assertEqual(gate.classify('audit_prod', audit([adv()], 1, muted=['x']), 1)[0], 'FAIL_UNKNOWN_OR_INCOMPLETE')
        self.assertEqual(gate.classify('audit_prod', audit([adv()], 1), 2)[0], 'FAIL_UNKNOWN_OR_INCOMPLETE')

    def test_clean_and_exit0_with_findings(self):
        self.assertEqual(gate.classify('audit_prod', audit([], 0), 0)[0], 'PASS_RAW_AUDIT')
        self.assertEqual(gate.classify('audit_prod', audit([adv()], 1), 0)[0], 'FAIL_OUTSIDE_ACCEPTED_RISK')

    def test_braces_legacy_unchanged(self):
        b = {'github_advisory_id': gate.BRACES_ID, 'module_name': 'braces', 'severity': 'high',
             'findings': [{'version': '3.0.3', 'paths': [gate.BRACES_PATH]}]}
        self.assertEqual(gate.classify('audit_full', audit([b], 1), 1)[0], 'FAIL_KNOWN_CONDITIONALLY_ACCEPTED')
        self.assertEqual(gate.classify('audit_prod', audit([b], 1), 1)[0], 'FAIL_OUTSIDE_ACCEPTED_RISK')


if __name__ == '__main__':
    unittest.main()
