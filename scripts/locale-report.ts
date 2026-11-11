/**
 * Locale maintenance report (informational). The CI gate remains verify-translations.
 * Usage: pnpm locale:report [--list] [--max <n>] [--locale <code>] [--markdown|--json] [--strict]
 */
import { runLocaleReport } from "./lib/locale-report-cli";

const result = runLocaleReport(process.argv.slice(2), process.cwd());
if (result.error) console.error(result.error);
process.stdout.write(result.output);
process.exitCode = result.exitCode;
