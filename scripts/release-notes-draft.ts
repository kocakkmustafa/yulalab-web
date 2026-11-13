/**
 * Release-note draft (never published). Usage:
 *   pnpm notes:draft --input prs.json [--out file.md]
 *   pnpm notes:draft --since YYYY-MM-DD [--out file.md]   (needs the GitHub CLI)
 */
import { runReleaseNotesDraft } from "./lib/release-notes-cli";

const result = runReleaseNotesDraft(process.argv.slice(2), process.cwd());
if (result.error) console.error(result.error);
process.stdout.write(result.message);
process.exitCode = result.exitCode;
