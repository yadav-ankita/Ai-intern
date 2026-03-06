from flask import Flask, request, jsonify
import os
import re
import pdfplumber
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = Flask(__name__)

SKILL_PATTERNS = {
    "python": [r"(?<![a-z0-9])python(?![a-z0-9])"],
    "java": [r"(?<![a-z0-9])java(?![a-z0-9])"],
    "c": [r"(?<![a-z0-9])c(?![a-z0-9\+])"],
    "c++": [r"(?<![a-z0-9])c\+\+(?![a-z0-9])"],
    "javascript": [r"(?<![a-z0-9])(javascript|js)(?![a-z0-9])"],
    "react": [r"(?<![a-z0-9])react(?:\.js)?(?![a-z0-9])"],
    "node": [r"(?<![a-z0-9])node(?:\.js)?(?![a-z0-9])"],
    "express": [r"(?<![a-z0-9])express(?:\.js)?(?![a-z0-9])"],
    "html": [r"(?<![a-z0-9])html(?:5)?(?![a-z0-9])"],
    "css": [r"(?<![a-z0-9])css(?:3)?(?![a-z0-9])"],
    "mongodb": [r"(?<![a-z0-9])mongodb(?![a-z0-9])"],
    "mysql": [r"(?<![a-z0-9])mysql(?![a-z0-9])"],
    "postgresql": [r"(?<![a-z0-9])postgres(?:ql)?(?![a-z0-9])"],
    "sql": [r"(?<![a-z0-9])sql(?![a-z0-9])"],
    "machine learning": [r"machine\s+learning"],
    "artificial intelligence": [r"artificial\s+intelligence"],
    "data science": [r"data\s+science"],
    "tensorflow": [r"(?<![a-z0-9])tensorflow(?![a-z0-9])"],
    "flask": [r"(?<![a-z0-9])flask(?![a-z0-9])"],
    "django": [r"(?<![a-z0-9])django(?![a-z0-9])"],
    "bootstrap": [r"(?<![a-z0-9])bootstrap(?![a-z0-9])"],
    "tailwind": [r"(?<![a-z0-9])tailwind(?![a-z0-9])"],
    "php": [r"(?<![a-z0-9])php(?![a-z0-9])"],
    "git": [r"(?<![a-z0-9])git(?![a-z0-9])"],
    "github": [r"(?<![a-z0-9])github(?![a-z0-9])"],
    "linux": [r"(?<![a-z0-9])linux(?![a-z0-9])"],
    "aws": [r"(?<![a-z0-9])aws(?![a-z0-9])"],
    "docker": [r"(?<![a-z0-9])docker(?![a-z0-9])"],
    "pandas": [r"(?<![a-z0-9])pandas(?![a-z0-9])"],
    "numpy": [r"(?<![a-z0-9])numpy(?![a-z0-9])"],
    "scikit-learn": [r"(?<![a-z0-9])scikit[\-\s]?learn(?![a-z0-9])"],
    "nlp": [r"(?<![a-z0-9])nlp(?![a-z0-9])"],
}

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOADS_DIR = os.path.join(BASE_DIR, "backend", "uploads")


def read_pdf_text(full_path):
    text = ""
    with pdfplumber.open(full_path) as pdf:
        for page in pdf.pages:
            text += (page.extract_text() or "") + " "
    return text.lower().strip()


def extract_text_from_pdf(file_path):
    candidate = file_path if os.path.isabs(file_path) else os.path.join(BASE_DIR, file_path)
    if not os.path.exists(candidate):
        candidate = os.path.join(UPLOADS_DIR, os.path.basename(file_path))
    if not os.path.exists(candidate):
        raise FileNotFoundError(f"Resume file not found: {file_path}")
    return read_pdf_text(candidate)


def extract_skills(text):
    found = []
    normalized_text = text.lower()

    for skill, patterns in SKILL_PATTERNS.items():
        if any(re.search(pattern, normalized_text) for pattern in patterns):
            found.append(skill)

    return found


def infer_domain(skills, text):
    domain_map = {
        "Data Science": {"python", "pandas", "numpy", "scikit-learn", "machine learning", "artificial intelligence", "nlp"},
        "Web Development": {"javascript", "react", "node", "express", "html", "css", "php"},
        "Backend Development": {"node", "express", "sql", "mysql", "postgresql", "mongodb"},
        "Cloud/DevOps": {"aws", "docker", "linux", "git", "github"},
    }

    skill_set = set(skills)
    best_domain = ""
    best_score = 0

    for domain, required_skills in domain_map.items():
        score = len(skill_set.intersection(required_skills))
        if score > best_score:
            best_score = score
            best_domain = domain

    if best_domain:
        return best_domain

    if "data science" in text or "machine learning" in text or "artificial intelligence" in text:
        return "Data Science"
    if "frontend" in text or "web" in text:
        return "Web Development"
    return ""


def infer_experience_level(text):
    patterns = [
        r"(\d+)\+?\s+years?\s+of\s+experience",
        r"experience\s*[:\-]?\s*(\d+)\+?\s+years?",
    ]

    years = 0
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            years = max(years, int(match.group(1)))

    if years >= 3:
        return "Advanced"
    if years >= 1:
        return "Intermediate"
    return "Beginner"


def infer_location(text):
    cities = [
        "bangalore", "bengaluru", "hyderabad", "pune", "mumbai", "delhi",
        "noida", "gurgaon", "chennai", "kolkata", "ahmedabad", "remote"
    ]
    for city in cities:
        if city in text:
            return city.title()
    return ""


def infer_duration_months(text):
    match = re.search(r"(\d{1,2})\s*(?:\+?\s*)?(?:months|month|mo)\b", text)
    if not match:
        return ""
    value = int(match.group(1))
    if 1 <= value <= 24:
        return str(value)
    return ""


def internship_to_document(internship):
    return " ".join([
        str(internship.get("title", "")),
        str(internship.get("skills", "")),
        str(internship.get("domain", "")),
        str(internship.get("location", "")),
        str(internship.get("experience_level", "")),
    ]).lower().strip()


@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json(force=True) or {}
    file_path = data.get("file")
    if not file_path:
        return jsonify({"error": "file is required"}), 400

    text = extract_text_from_pdf(file_path)
    skills = extract_skills(text)

    return jsonify({
        "extracted_skills": skills,
        "resume_text": text,
        "message": "Resume analyzed successfully"
    })


@app.route("/tfidf-match", methods=["POST"])
def tfidf_match():
    data = request.get_json(force=True) or {}
    file_path = data.get("file")
    internships = data.get("internships", [])

    if not file_path:
        return jsonify({"error": "file is required"}), 400
    if not isinstance(internships, list) or len(internships) == 0:
        return jsonify({"error": "internships must be a non-empty list"}), 400

    resume_text = extract_text_from_pdf(file_path)
    resume_skills = extract_skills(resume_text)

    internship_docs = [internship_to_document(item) for item in internships]
    corpus = [resume_text] + internship_docs

    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), min_df=1)
    matrix = vectorizer.fit_transform(corpus)

    resume_vector = matrix[0:1]
    internship_vectors = matrix[1:]
    scores = cosine_similarity(resume_vector, internship_vectors).flatten()

    ranked = []
    for idx, internship in enumerate(internships):
        match_percent = int(round(float(scores[idx]) * 100))
        ranked.append({**internship, "match_percent": max(0, min(100, match_percent))})

    ranked.sort(key=lambda item: item["match_percent"], reverse=True)

    return jsonify({
        "extracted_skills": resume_skills,
        "matches": ranked
    })


@app.route("/extract-profile", methods=["POST"])
def extract_profile():
    data = request.get_json(force=True) or {}
    file_path = data.get("file")

    if not file_path:
        return jsonify({"error": "file is required"}), 400

    resume_text = extract_text_from_pdf(file_path)
    skills = extract_skills(resume_text)

    response = {
        "skills": ", ".join(skills),
        "preferredDomain": infer_domain(skills, resume_text),
        "preferredLocation": infer_location(resume_text),
        "durationMonths": infer_duration_months(resume_text),
        "experienceLevel": infer_experience_level(resume_text),
        "expectedStipend": "",
        "extracted_skills": skills,
    }
    return jsonify(response)


if __name__ == "__main__":
    app.run(port=5001)
