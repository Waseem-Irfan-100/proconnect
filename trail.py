import os
import re
import pdfplumber
import docx
from flask import Flask, render_template, request, redirect, url_for, jsonify
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = "uploads"
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

# ------------ STEP 1: Resume Parsing ------------ #
def extract_text_from_pdf(file_path):
    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + " "
    return text.lower()

def extract_text_from_docx(file_path):
    doc = docx.Document(file_path)
    text = " ".join([para.text for para in doc.paragraphs])
    return text.lower()

def extract_resume_text(file_path):
    if file_path.endswith(".pdf"):
        return extract_text_from_pdf(file_path)
    elif file_path.endswith(".docx"):
        return extract_text_from_docx(file_path)
    else:
        raise ValueError("Unsupported file format. Use PDF or DOCX.")

# ------------ STEP 2: Predefined Skills ------------ #
skills_list = [
    "Python", "Machine Learning", "Deep Learning", "SQL", "Java",
    "C++", "Docker", "AWS", "TensorFlow", "PyTorch", "Data Science",
    "NLP", "Computer Vision", "Git", "Kubernetes"
]

def extract_skills(text, skills_list):
    skills_dict = {}
    for skill in skills_list:
        if re.search(rf"\b{skill.lower()}\b", text):
            skills_dict[skill] = "unverified"
    return skills_dict


# ------------ ROUTES: Resume ------------ #
@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        if "resume" not in request.files:
            return redirect(request.url)
        
        file = request.files["resume"]
        if file.filename == "":
            return redirect(request.url)

        if file:
            filepath = os.path.join(app.config["UPLOAD_FOLDER"], file.filename)
            file.save(filepath)

            resume_text = extract_resume_text(filepath)
            skills_found = extract_skills(resume_text, skills_list)

            return render_template("dashboard.html", skills=skills_found)

    return render_template("index.html")

@app.route("/resume", methods=["GET", "POST"])
def resume():
    if request.method == "POST":
        file = request.files["file"]
        if file:
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
            file.save(filepath)

            resume_text = extract_resume_text(filepath)
            skills_found = extract_skills(resume_text, skills_list)

            return render_template("dashboard.html", skills=skills_found)

    return render_template("resume.html")


# ------------ STEP 3: Quiz System ------------ #
def extract_mcq_from_pdf(pdf_path):
    questions = []
    text_data = ""

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text_data += page.extract_text() + "\n"

    raw_questions = re.split(r'\n?\d+\.\s', text_data)

    for block in raw_questions[1:]:
        lines = block.strip().split("\n")
        if not lines:
            continue

        question = lines[0].strip()

        # join remaining lines and split by option markers
        rest = " ".join(lines[1:])
        options = re.findall(r"[a-d]\)\s*[^a-d]+", rest)

        answer_match = re.search(r"Ans\.\s*([a-dA-D])", block)
        answer = answer_match.group(1) if answer_match else None

        explanation = None
        if "Explanation" in block:
            explanation = block.split("Explanation:")[-1].strip()

        if options and answer:
            questions.append({
                "question": question,
                "options": options,
                "answer": answer,
                "explanation": explanation
            })
    return questions


@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html", skills={})


@app.route("/quiz")
def quiz():
    return render_template("quiz.html")

@app.route("/get_questions")
def get_questions():
    pdf_path = os.path.join(app.config["UPLOAD_FOLDER"], "Python_MCQ.pdf")  # keep quiz PDF in uploads
    questions = extract_mcq_from_pdf(pdf_path)
    return jsonify(questions)


if __name__ == "__main__":
    app.run(debug=True)
