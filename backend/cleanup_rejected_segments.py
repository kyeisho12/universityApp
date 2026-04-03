"""
One-time cleanup script: deletes rejected (non-final) recording segments from
Supabase Storage and the interview_recording_segments table.

When a user restarts their answer during a mock interview, the old recording was
saved but never cleaned up. This script keeps only the LAST segment per question
per session (the final answer) and deletes the rest.

Run from the backend directory:
    python cleanup_rejected_segments.py

Requires the .env file to be present with SUPABASE_URL and SUPABASE_KEY.
"""

import os
import requests
from collections import defaultdict
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
BUCKET = "interview-recordings"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}


def fetch_all_segments():
    """Fetch all recording segments ordered by session, question, segment order."""
    url = f"{SUPABASE_URL}/rest/v1/interview_recording_segments"
    params = {
        "select": "id,session_id,question_index,segment_order,storage_path",
        "order": "session_id.asc,question_index.asc,segment_order.asc",
        "limit": 10000,
    }
    resp = requests.get(url, headers=HEADERS, params=params)
    resp.raise_for_status()
    return resp.json()


def delete_storage_files(paths):
    """Delete files from Supabase Storage. Returns (deleted_count, errors)."""
    if not paths:
        return 0, []

    url = f"{SUPABASE_URL}/storage/v1/object/bulk"
    # Supabase storage bulk delete
    resp = requests.delete(
        f"{SUPABASE_URL}/storage/v1/object/bulk",
        headers={**HEADERS, "Content-Type": "application/json"},
        json={"prefixes": paths},
    )
    if resp.status_code in (200, 204):
        return len(paths), []
    else:
        return 0, [resp.text]


def delete_segment_rows(ids):
    """Delete segment DB rows by ID list."""
    if not ids:
        return True

    # Supabase REST supports ?id=in.(id1,id2,...)
    id_list = ",".join(ids)
    url = f"{SUPABASE_URL}/rest/v1/interview_recording_segments"
    params = {"id": f"in.({id_list})"}
    resp = requests.delete(url, headers={**HEADERS, "Prefer": "return=minimal"}, params=params)
    return resp.status_code in (200, 204)


def main():
    print("Fetching all recording segments...")
    segments = fetch_all_segments()
    print(f"  Total segments in DB: {len(segments)}")

    # Group by (session_id, question_index)
    groups = defaultdict(list)
    for seg in segments:
        key = (seg["session_id"], seg["question_index"])
        groups[key].append(seg)

    # Identify rejected segments (all but the last per group)
    rejected = []
    for (session_id, question_index), segs in groups.items():
        # Already ordered ASC by segment_order — last one is the final answer
        if len(segs) > 1:
            rejected.extend(segs[:-1])  # all except the last

    print(f"  Questions with multiple segments (restarts): {sum(1 for segs in groups.values() if len(segs) > 1)}")
    print(f"  Rejected segments to clean up: {len(rejected)}")

    if not rejected:
        print("Nothing to clean up.")
        return

    # Show a preview
    print("\nPreview of rejected segments:")
    for seg in rejected[:10]:
        print(f"  Session {seg['session_id'][:8]}... | Q{seg['question_index']} | "
              f"seg_order={seg['segment_order']} | path={seg['storage_path']}")
    if len(rejected) > 10:
        print(f"  ... and {len(rejected) - 10} more")

    confirm = input(f"\nDelete {len(rejected)} rejected segments from storage + DB? (yes/no): ").strip().lower()
    if confirm != "yes":
        print("Aborted.")
        return

    # Step 1: Delete storage files
    storage_paths = [seg["storage_path"] for seg in rejected if seg.get("storage_path")]
    print(f"\nDeleting {len(storage_paths)} files from Supabase Storage...")
    deleted_count, errors = delete_storage_files(storage_paths)
    if errors:
        print(f"  Storage deletion errors: {errors}")
    else:
        print(f"  Storage: {len(storage_paths)} files removed.")

    # Step 2: Delete DB rows in batches of 100
    ids = [seg["id"] for seg in rejected]
    print(f"Deleting {len(ids)} rows from interview_recording_segments...")
    batch_size = 100
    db_ok = True
    for i in range(0, len(ids), batch_size):
        batch = ids[i:i + batch_size]
        ok = delete_segment_rows(batch)
        if not ok:
            print(f"  Warning: batch {i // batch_size + 1} deletion may have failed")
            db_ok = False

    if db_ok:
        print(f"  DB: {len(ids)} rows deleted.")

    print("\nDone! Summary:")
    print(f"  Storage files deleted: {len(storage_paths)}")
    print(f"  DB rows deleted: {len(ids)}")


if __name__ == "__main__":
    main()
