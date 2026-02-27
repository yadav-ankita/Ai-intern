from flask import Flask, request, jsonify
import pdfplumber
import nltk
from sklearn.feature_extraction.text import TfidfVectorizer

app = Flask(__name__)

# Simple skill list (expand later)
skill_keywords = [
"python","java","c","c++","javascript","react","node","express",
"html","css","mongodb","mysql","postgresql","sql",
"machine learning","ai","data science","tensorflow",
"flask","django","bootstrap","tailwind","php",
"git","github","linux","aws","docker"
]

import os

def extract_text_from_pdf(file_path):
    # Go to project root then backend/uploads
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    full_path = os.path.join(base_dir, "backend", file_path)

    print("FULL PATH:", full_path)

    text = ""
    with pdfplumber.open(full_path) as pdf:
        for page in pdf.pages:
            text += page.extract_text() or ""
    return text.lower()

def extract_skills(text):
    found = []
    for skill in skill_keywords:
        if skill in text:
            found.append(skill)
    return found

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.json
    file_path = data["file"]

    text = extract_text_from_pdf(file_path)
    skills = extract_skills(text)

    return jsonify({
        "extracted_skills": skills,
        "message": "Resume analyzed successfully"
    })

if __name__ == "__main__":
    app.run(port=5001)