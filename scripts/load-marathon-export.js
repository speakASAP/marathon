#!/usr/bin/env node
/**
 * Legacy full-export import is intentionally disabled.
 *
 * Historical marathon_export.json files contain participant progress such as
 * marathoners, answers/submissions, and winners. Production launch work must
 * load only human-approved catalog rows through load-marathon-catalog.js.
 */

const message = [
  'Refusing to run legacy full Marathon export import.',
  '',
  'This script previously imported participant/progress data:',
  '- marathoners / participants',
  '- answers / step submissions',
  '- winners',
  '',
  'Use the catalog-only loader instead:',
  '  npm run load:catalog -- /path/to/marathon-catalog.json',
  '  npm run load:catalog -- /path/to/marathon-catalog.json --apply',
  '',
  'See docs/marathon-catalog-import.md.',
].join('\n');

process.stderr.write(`${message}\n`);
process.exit(1);
