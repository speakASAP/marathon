#!/usr/bin/env python3
"""
Load marathon_export.json into marathon PostgreSQL DB (OS-level, direct connection).
Streams the JSON and uses batch INSERTs. Writes marathon_id_mapping.json.
Faster than Node/Prisma for large exports when run where the DB is reachable.

Requires: psycopg2-binary, ijson
  pip install -r scripts/requirements-load.txt
  # or: pip install psycopg2-binary ijson
Uses DATABASE_URL from env, or DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME.

Run where the marathon DB is reachable (e.g. host with port-forward to postgres,
or same network as db-server). If on dev host, use localhost if postgres is published:
  export DATABASE_URL="postgresql://USER:PASS@localhost:5432/DBNAME"

Usage:
  python3 scripts/load_marathon_export.py [path/to/marathon_export.json]
"""
import json
import os
import sys
import uuid
from datetime import datetime

try:
    import psycopg2
    from psycopg2.extras import execute_batch, Json
except ImportError:
    print("pip install psycopg2-binary", file=sys.stderr)
    sys.exit(1)
try:
    import ijson
except ImportError:
    print("pip install ijson", file=sys.stderr)
    sys.exit(1)


def parse_dt(s):
    if s is None or s == "":
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None


def parse_time_on_date(time_str, base_dt):
    if not time_str or not base_dt:
        return base_dt or datetime.utcnow()
    parts = time_str.split(":")
    h, m, s = int(parts[0] or 0), int(parts[1] or 0), int(parts[2] or 0)
    return base_dt.replace(hour=h, minute=m, second=s, microsecond=0)


def sanitize(val):
    if val is None:
        return None
    if isinstance(val, str):
        return val.replace("\u0000", "")
    if isinstance(val, dict):
        return {k: sanitize(v) for k, v in val.items()}
    if isinstance(val, list):
        return [sanitize(v) for v in val]
    return val


def get_conn():
    url = os.environ.get("DATABASE_URL")
    if url:
        return psycopg2.connect(url)
    return psycopg2.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        port=os.environ.get("DB_PORT", "5432"),
        user=os.environ.get("DB_USER", "marathon"),
        password=os.environ.get("DB_PASSWORD", ""),
        dbname=os.environ.get("DB_NAME", "marathon"),
    )


def main():
    export_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), "..", "marathon_export.json"
    )
    if not os.path.isfile(export_path):
        print("Export file not found:", export_path, file=sys.stderr)
        sys.exit(1)

    conn = get_conn()
    conn.autocommit = False
    cur = conn.cursor()

    marathon_id_to_uuid = {}
    step_id_to_uuid = {}
    marathoner_id_to_uuid = {}
    id_mapping = {"marathon": [], "step": [], "marathoner": [], "winner": []}
    BATCH = 500

    base_dir = os.path.dirname(export_path)
    mapping_path = os.path.join(base_dir, "marathon_id_mapping.json")

    # 1. Marathons
    batch_rows = []
    with open(export_path, "rb") as f:
        for m in ijson.items(f, "marathons.item"):
            id_ = str(uuid.uuid4())
            marathon_id_to_uuid[m["id"]] = id_
            id_mapping["marathon"].append({"legacy_id": m["id"], "new_uuid": id_})
            slug = f"{m.get('folder') or 'marathon'}-{m['id']}"
            batch_rows.append((
                id_, m.get("language_code") or "en", m.get("title") or "",
                slug, m.get("rules_template") or None, bool(m.get("active", False)),
                m.get("landing_video") or None, parse_dt(m.get("vip_since")),
                parse_dt(m.get("discount_till")), m.get("image"),
            ))
            if len(batch_rows) >= BATCH:
                execute_batch(cur, """
                    INSERT INTO "Marathon" (id, "languageCode", title, slug, "rulesTemplate", active,
                        "landingVideoUrl", "vipGateDate", "discountEndsAt", "coverImageUrl", "createdAt", "updatedAt")
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),NOW())
                """, batch_rows)
                batch_rows = []
    if batch_rows:
        execute_batch(cur, """
            INSERT INTO "Marathon" (id, "languageCode", title, slug, "rulesTemplate", active,
                "landingVideoUrl", "vipGateDate", "discountEndsAt", "coverImageUrl", "createdAt", "updatedAt")
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),NOW())
        """, batch_rows)
    print("Marathons:", len(id_mapping["marathon"]))

    # 2. Steps
    batch_rows = []
    with open(export_path, "rb") as f:
        for s in ijson.items(f, "steps.item"):
            marathon_uuid = marathon_id_to_uuid.get(s["marathon_id"])
            if not marathon_uuid:
                continue
            id_ = str(uuid.uuid4())
            step_id_to_uuid[s["id"]] = id_
            id_mapping["step"].append({"legacy_id": s["id"], "new_uuid": id_})
            batch_rows.append((
                id_, marathon_uuid, s.get("title") or "", s.get("order", 0),
                bool(s.get("penalize", True)), s.get("form_class") or None,
                s.get("sn_link") or None, bool(s.get("trial", False)),
            ))
            if len(batch_rows) >= BATCH:
                execute_batch(cur, """
                    INSERT INTO "MarathonStep" (id, "marathonId", title, sequence, "isPenalized", "formKey", "socialLink", "isTrialStep", "createdAt", "updatedAt")
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,NOW(),NOW())
                """, batch_rows)
                batch_rows = []
    if batch_rows:
        execute_batch(cur, """
            INSERT INTO "MarathonStep" (id, "marathonId", title, sequence, "isPenalized", "formKey", "socialLink", "isTrialStep", "createdAt", "updatedAt")
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,NOW(),NOW())
        """, batch_rows)
    print("Steps:", len(id_mapping["step"]))

    # 3. Marathoners (participants)
    batch_rows = []
    with open(export_path, "rb") as f:
        for r in ijson.items(f, "marathoners.item"):
            marathon_uuid = marathon_id_to_uuid.get(r["marathon_id"])
            if not marathon_uuid:
                continue
            id_ = str(uuid.uuid4())
            marathoner_id_to_uuid[r["id"]] = id_
            id_mapping["marathoner"].append({"legacy_id": r["id"], "new_uuid": id_})
            created = parse_dt(r.get("created")) or datetime.utcnow()
            report_hour = parse_time_on_date(r.get("report_hour"), created)
            batch_rows.append((
                id_, str(r["user_id"]) if r.get("user_id") is not None else None, marathon_uuid,
                r.get("email") or None, r.get("name") or None, bool(r.get("is_free", True)),
                bool(r.get("vip_required", False)), bool(r.get("payment_reported", False)),
                r.get("days", 7), r.get("can_use_penalty", True) != False,
                bool(r.get("active", True)), report_hour, bool(r.get("has_warning", False)),
                created, parse_dt(r.get("finish_date")),
            ))
            if len(batch_rows) >= BATCH:
                execute_batch(cur, """
                    INSERT INTO "MarathonParticipant" (id, "userId", "marathonId", email, name, "isFree",
                        "vipRequired", "paymentReported", "bonusDaysLeft", "canUsePenalty", active,
                        "reportHour", "hasWarning", "createdAt", "finishedAt")
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """, batch_rows)
                batch_rows = []
    if batch_rows:
        execute_batch(cur, """
            INSERT INTO "MarathonParticipant" (id, "userId", "marathonId", email, name, "isFree",
                "vipRequired", "paymentReported", "bonusDaysLeft", "canUsePenalty", active,
                "reportHour", "hasWarning", "createdAt", "finishedAt")
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, batch_rows)
    print("Participants:", len(id_mapping["marathoner"]))

    # 4. Answers (step submissions)
    batch_rows = []
    with open(export_path, "rb") as f:
        for a in ijson.items(f, "answers.item"):
            part_uuid = marathoner_id_to_uuid.get(a["marathoner_id"])
            step_uuid = step_id_to_uuid.get(a["step_id"])
            if not part_uuid or not step_uuid:
                continue
            id_ = str(uuid.uuid4())
            start = parse_dt(a.get("start")) or datetime.utcnow()
            stop = parse_dt(a.get("stop")) or start
            val = a.get("value")
            if val is not None:
                val = sanitize(val) if isinstance(val, (dict, list)) else {"_raw": str(val)[:500]}
            else:
                val = None
            batch_rows.append((
                id_, part_uuid, step_uuid, start, stop,
                bool(a.get("completed", False)), bool(a.get("checked", False)),
                int(a.get("rating") or 0), Json(val) if val is not None else None,
            ))
            if len(batch_rows) >= BATCH:
                execute_batch(cur, """
                    INSERT INTO "StepSubmission" (id, "participantId", "stepId", "startAt", "endAt",
                        "isCompleted", "isChecked", rating, "payloadJson", "createdAt", "updatedAt")
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),NOW())
                """, batch_rows)
                batch_rows = []
    if batch_rows:
        execute_batch(cur, """
            INSERT INTO "StepSubmission" (id, "participantId", "stepId", "startAt", "endAt",
                "isCompleted", "isChecked", rating, "payloadJson", "createdAt", "updatedAt")
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),NOW())
        """, batch_rows)
    print("Submissions: done")

    # 5. Winners
    batch_rows = []
    with open(export_path, "rb") as f:
        for w in ijson.items(f, "winners.item"):
            id_ = str(uuid.uuid4())
            id_mapping["winner"].append({"legacy_id": w["id"], "new_uuid": id_})
            batch_rows.append((
                id_, str(w["user_id"]), int(w.get("gold") or 0),
                int(w.get("silver") or 0), int(w.get("bronze") or 0),
            ))
            if len(batch_rows) >= BATCH:
                execute_batch(cur, """
                    INSERT INTO "MarathonWinner" (id, "userId", "goldCount", "silverCount", "bronzeCount")
                    VALUES (%s,%s,%s,%s,%s)
                """, batch_rows)
                batch_rows = []
    if batch_rows:
        execute_batch(cur, """
            INSERT INTO "MarathonWinner" (id, "userId", "goldCount", "silverCount", "bronzeCount")
            VALUES (%s,%s,%s,%s,%s)
        """, batch_rows)
    print("Winners:", len(id_mapping["winner"]))

    conn.commit()
    cur.close()
    conn.close()

    with open(mapping_path, "w", encoding="utf-8") as f:
        json.dump(id_mapping, f, ensure_ascii=False, indent=2)
    print("ID mapping written to", mapping_path)


if __name__ == "__main__":
    main()
