# Marathon export load scripts

Load `marathon_export.json` (from speakasap-portal `export_marathon_data`) into the marathon PostgreSQL DB and produce `marathon_id_mapping.json` for the portal.

## Option 1: Python (OS-level, direct DB connection) — recommended when DB is reachable

Faster for large files; no Docker/Node required. Run on any host that can reach the marathon DB.

```bash
pip install -r scripts/requirements-load.txt
# Set DATABASE_URL to a reachable postgres (e.g. postgresql://user:pass@localhost:5432/marathon)
export DATABASE_URL="..."
python3 scripts/load_marathon_export.py marathon_export.json
```

Output: `marathon_id_mapping.json` next to the export file.

## Option 2: Node (streaming, Prisma)

Use when running inside the marathon Docker network (so `db-server-postgres` is reachable). The image does not include the script; run from the host with the export mounted, or add the script to the image.

```bash
node scripts/load-marathon-export.js marathon_export.json
```

Requires `stream-chain`, `stream-json` in package.json (already added).

## After loading

Copy `marathon_id_mapping.json` to the portal and run:

```bash
python manage.py load_marathon_id_mapping path/to/marathon_id_mapping.json
```
