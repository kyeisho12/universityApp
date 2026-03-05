from fastapi import APIRouter, File, UploadFile, HTTPException
from typing import List, Dict, Any
import io
import re

router = APIRouter()

# Example skill extraction from text
SKILL_KEYWORDS = [
    'python', 'java', 'c++', 'javascript', 'react', 'node', 'sql', 'excel', 'communication',
    'leadership', 'teamwork', 'problem solving', 'project management', 'data analysis',
    'machine learning', 'marketing', 'finance', 'design', 'writing', 'public speaking',
]

# Dummy PDF/DOCX text extraction (replace with pdfminer, python-docx, textract, etc.)
def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    # TODO: Use real parsing for PDF/DOCX
    # For now, just decode as utf-8 if possible
    try:
        return file_bytes.decode('utf-8', errors='ignore')
    except Exception:
        return ''

# Extract skills from text
def extract_skills(text: str) -> List[str]:
    text_lower = text.lower()
    found = set()
    for skill in SKILL_KEYWORDS:
        if skill in text_lower:
            found.add(skill)
    # Also extract capitalized words as possible skills
    found.update(re.findall(r'\b([A-Z][a-zA-Z]+)\b', text))
    return list(found)

# Extract ratings (dummy: look for lines like "Rating: 4/5" or "Score: 90")
def extract_ratings(text: str) -> Dict[str, Any]:
    ratings = {}
    for match in re.findall(r'(\w+):\s*(\d{1,2}(?:/\d{1,2})?)', text):
        key, value = match
        ratings[key] = value
    return ratings

@router.post('/api/resume/parse')
async def parse_resume(file: UploadFile = File(...)):
    try:
        file_bytes = await file.read()
        text = extract_text_from_file(file_bytes, file.filename)
        skills = extract_skills(text)
        ratings = extract_ratings(text)
        return {'skills': skills, 'ratings': ratings}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f'Failed to parse resume: {str(e)}')
