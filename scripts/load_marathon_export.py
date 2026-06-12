#!/usr/bin/env python3
"""
Legacy full-export import is intentionally disabled.

Historical marathon_export.json files contain participant progress such as
marathoners, answers/submissions, and winners. Production launch work must load
only human-approved catalog rows through scripts/load-marathon-catalog.js.
"""

import sys


MESSAGE = """Refusing to run legacy full Marathon export import.

This script previously imported participant/progress data:
- marathoners / participants
- answers / step submissions
- winners

Use the catalog-only loader instead:
  npm run load:catalog -- /path/to/marathon-catalog.json
  npm run load:catalog -- /path/to/marathon-catalog.json --apply

See docs/marathon-catalog-import.md.
"""


def main() -> int:
    sys.stderr.write(MESSAGE)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
