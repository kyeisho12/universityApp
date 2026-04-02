"""
One-time backfill script: extracts text and skills from all existing resume files
in Supabase Storage and updates the resumes table with resume_text and skills.

Run from the backend directory:
    python backfill_resume_text.py

Requires the .env file to be present with SUPABASE_URL and SUPABASE_KEY.
"""

import os
import io
import re
import requests
import pdfplumber
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
BUCKET = "resumes"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

SKILL_KEYWORDS = [
    'python', 'java', 'javascript', 'typescript', 'react', 'angular', 'vue',
    'node', 'html', 'css', 'sql', 'mysql', 'postgresql', 'mongodb', 'git',
    'docker', 'kubernetes', 'aws', 'azure', 'linux', 'c++', 'c#', 'php',
    'rest api', 'machine learning', 'data analysis', 'figma', 'photoshop',
    'excel', 'powerpoint', 'word', 'microsoft office', 'agile', 'scrum',
    'communication', 'leadership', 'teamwork', 'problem solving',
    'project management', 'teaching', 'curriculum', 'child development',
    'github', 'notion',
]


def extract_text_from_bytes(file_bytes: bytes, filename: str) -> str:
    filename_lower = filename.lower()
    if filename_lower.endswith('.pdf'):
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            return '\n'.join(page.extract_text() or '' for page in pdf.pages)
    if filename_lower.endswith('.docx'):
        import docx
        doc = docx.Document(io.BytesIO(file_bytes))
        return '\n'.join(para.text for para in doc.paragraphs)
    return file_bytes.decode('utf-8', errors='ignore')


def extract_skills(text: str) -> list:
    text_lower = text.lower()
    return [skill for skill in SKILL_KEYWORDS if skill in text_lower]


def extract_ratings(text: str) -> dict:
    ratings = {}
    for match in re.finditer(r'([\w ]+?)\s*[:\-]\s*(\d+)\s*/\s*(\d+)', text):
        key = match.group(1).strip().lower()
        ratings[key] = f'{match.group(2)}/{match.group(3)}'
    for match in re.finditer(r'([\w ]+?)\s*[:\-]\s*(\d+)\s*%', text):
        key = match.group(1).strip().lower()
        ratings.setdefault(key, match.group(2))
    return ratings


def get_all_resumes():
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/resumes",
        headers=HEADERS,
        params={"select": "id,file_path,file_name,resume_text"}
    )
    resp.raise_for_status()
    return resp.json()


def get_signed_url(file_path: str) -> str:
    resp = requests.post(
        f"{SUPABASE_URL}/storage/v1/object/sign/{BUCKET}/{file_path}",
        headers=HEADERS,
        json={"expiresIn": 300}
    )
    resp.raise_for_status()
    return resp.json()["signedURL"]


def update_resume(resume_id: str, resume_text: str, skills: list, ratings: dict):
    # Try with all fields first; fall back to resume_text only if skills/ratings columns don't exist
    for payload in [
        {"resume_text": resume_text, "skills": skills, "ratings": ratings},
        {"resume_text": resume_text},
    ]:
        resp = requests.patch(
            f"{SUPABASE_URL}/rest/v1/resumes",
            headers={**HEADERS, "Prefer": "return=minimal"},
            params={"id": f"eq.{resume_id}"},
            json=payload,
        )
        if resp.status_code == 400 and ("skills" in resp.text or "ratings" in resp.text):
            continue  # column missing, retry with fewer fields
        resp.raise_for_status()
        return
    resp.raise_for_status()


def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: SUPABASE_URL and SUPABASE_KEY must be set in .env")
        return

    print("Fetching all resumes from database...")
    resumes = get_all_resumes()
    print(f"Found {len(resumes)} resume(s).\n")

    skipped = 0
    updated = 0
    failed = 0

    for resume in resumes:
        rid = resume['id']
        file_path = resume.get('file_path', '')
        file_name = resume.get('file_name', file_path)
        already_has_text = resume.get('resume_text')

        if already_has_text:
            print(f"  SKIP  {file_name} (already has resume_text)")
            skipped += 1
            continue

        print(f"  PARSE {file_name} ...", end=" ", flush=True)
        try:
            signed_url = get_signed_url(file_path)
            file_resp = requests.get(f"{SUPABASE_URL}/storage/v1{signed_url}")
            file_resp.raise_for_status()

            resume_text = extract_text_from_bytes(file_resp.content, file_name)
            skills = extract_skills(resume_text)
            ratings = extract_ratings(resume_text)

            update_resume(rid, resume_text, skills, ratings)
            print(f"OK  ({len(skills)} skills found: {', '.join(skills[:5])}{'...' if len(skills) > 5 else ''})")
            updated += 1

        except Exception as e:
            print(f"FAILED ({e})")
            failed += 1

    print(f"\nDone. Updated: {updated} | Skipped: {skipped} | Failed: {failed}")


if __name__ == "__main__":
    main()
