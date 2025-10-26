from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
import psycopg2
from psycopg2.extras import RealDictCursor
from flask_bcrypt import Bcrypt
import random
import re
import pdfplumber
import json
import os
import unicodedata

app = Flask(__name__)
app.secret_key = "supersecretkey"   # change in production
bcrypt = Bcrypt(app)

# Ensure uploads folder exists
os.makedirs("uploads", exist_ok=True)

# ----------------- DB CONNECTION -----------------
def get_db_connection():
    conn = psycopg2.connect(
        host="localhost",
        database="Proconnect",
        user="postgres",      # your postgres username
        password="mahhen"      # your postgres password
    )
    return conn

from rapidfuzz import fuzz

# Predefined skills
skills_list = [
    "Python", "Machine Learning", "Deep Learning", "SQL", "Java",
    "C++", "Docker", "AWS", "TensorFlow", "PyTorch", "Data Science",
    "NLP", "Computer Vision", "Git", "Kubernetes"
]

# ----------------- Normalization Helpers -----------------
def normalize_text(text):
    """Lowercase, remove accents, normalize spaces"""
    text = text.lower()
    text = unicodedata.normalize("NFKD", text)
    text = re.sub(r'[^a-z0-9\+\s]', ' ', text)  # keep letters, digits, +, spaces
    text = re.sub(r'\s+', ' ', text)  # collapse multiple spaces
    return text.strip()

def normalize_skill(skill):
    """Regex-friendly normalized skill"""
    s = skill.lower()
    s = s.replace("++", r"\+\+")  # escape C++
    s = s.replace("+", r"\+")     # escape +
    s = s.replace(" ", r"\s+")   # flexible spacing
    return s

# ----------------- File Text Extraction -----------------
def extract_text_from_pdf(file_path):
    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + " "
    return text

def extract_text_from_docx(file_path):
    doc = docx.Document(file_path)
    text = " ".join([para.text for para in doc.paragraphs])
    return text

def extract_resume_text(file_path):
    if file_path.endswith(".pdf"):
        return extract_text_from_pdf(file_path)
    elif file_path.endswith(".docx"):
        return extract_text_from_docx(file_path)
    else:
        raise ValueError("Unsupported file format (use PDF or DOCX)")

# ----------------- Skill Extraction -----------------
def extract_skills(text, skills_list, threshold=85):
    """Extract skills from resume using regex + fuzzy matching"""
    text_norm = normalize_text(text)
    skills_dict = {}

    for skill in skills_list:
        # Regex exact-ish match
        pattern = rf"\b{normalize_skill(skill)}\b"
        if re.search(pattern, text_norm):
            skills_dict[skill] = "unverified"
        else:
            # Fuzzy match fallback
            for word in text_norm.split():
                if fuzz.ratio(skill.lower(), word) >= threshold:
                    skills_dict[skill] = "unverified"
                    break
    return skills_dict

# ----------------- PARSING FUNCTION -----------------
def extract_questions_from_pdf(pdf_path):
    questions = []

    with pdfplumber.open(pdf_path) as pdf:
        text = ""
        for page in pdf.pages:
            if page.extract_text():
                text += page.extract_text() + "\n"

    # Split by question number like "1. " "2. "
    blocks = re.split(r'\n?\d+\.\s', text)
    for block in blocks[1:]:
        lines = block.strip().split("\n")
        if not lines:
            continue

        q_text = lines[0].strip()
        options = []
        correct = None

        for line in lines[1:]:
            line = line.strip()

            # Handle inline options (a) ... b) ... c) ... d) ...
            if re.search(r'[a-d]\)', line) and "Ans." not in line:
                parts = re.split(r'(?=[a-d]\))', line)
                opts = [p.strip() for p in parts if p.strip()]
                options.extend(opts)

            # Handle separate-line options
            elif re.match(r'^[a-d][\).]', line):
                options.append(line)

            # Extract correct answer
            elif line.startswith("Ans."):
                correct = line.split("Ans.")[1].strip()[0].lower()

        if q_text and options and correct:
            questions.append({
                "question": q_text,
                "options": options,
                "answer": correct
            })

    return questions


# ----------------- MAIN PAGES -----------------
@app.route('/')
def index():
    return render_template('dashboard1.html')


@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        flash("Please login first.", "warning")
        return redirect(url_for('login'))
    return render_template('dashboard.html', username=session['username'], user_type=session['user_type'])


# ----------------- SIGNUP -----------------
@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        user_type = request.form.get('user_type', 'student')  # default role

        hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')

        conn = get_db_connection()
        cur = conn.cursor()
        try:
            cur.execute("""
                INSERT INTO users (username, email, password, user_type)
                VALUES (%s, %s, %s, %s)
            """, (username, email, hashed_pw, user_type))
            conn.commit()
            flash("Signup successful! Please login.", "success")
            return redirect(url_for('login'))
        except Exception as e:
            conn.rollback()
            flash("Error: Email already exists or invalid data.", "danger")
        finally:
            cur.close()
            conn.close()

    return render_template('signup.html')


# ----------------- LOGIN -----------------
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cur.fetchone()
        cur.close()
        conn.close()

        if user and bcrypt.check_password_hash(user['password'], password):
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['email'] = user['email']
            session['user_type'] = user['user_type']
            flash("Login successful!", "success")
            return redirect(url_for('dashboard'))
        else:
            flash("Invalid email or password.", "danger")

    return render_template('login.html')


# ----------------- LOGOUT -----------------
@app.route('/logout')
def logout():
    session.clear()
    flash("Logged out successfully.", "info")
    return redirect(url_for('login'))

@app.route('/resume')
def resume():
    return render_template('resume.html')

@app.route('/jobs')
def jobs():
    return render_template('jobs.html')  # create jobs.html

@app.route('/messaging')
def messaging():
    return render_template('messaging.html')  # create messaging.html

@app.route('/notifications')
def notifications():
    return render_template('notifications.html')  # create notifications.html

# ----------------- QUIZ FEATURE -----------------

# Upload extracted questions into DB (admin only)
@app.route('/admin/upload_pdf', methods=['POST'])
def upload_pdf():
    if 'user_id' not in session or session.get('user_type') != 'admin':
        flash("Unauthorized access!", "danger")
        return redirect(url_for("dashboard"))

    if 'pdf' not in request.files:
        return "No file", 400
    file = request.files['pdf']
    pdf_path = f"uploads/{file.filename}"
    file.save(pdf_path)

    questions = extract_questions_from_pdf(pdf_path)

    conn = get_db_connection()
    cur = conn.cursor()
    for q in questions:
        cur.execute("""
            INSERT INTO questions (skill, question_text, options, correct_option)
            VALUES (%s, %s, %s, %s)
        """, (
            "Python",  # 🔑 you can make this dynamic later
            q['question'],
            json.dumps(q['options']),
            q['answer']
        ))
    conn.commit()
    cur.close()
    conn.close()

    flash(f"Uploaded {len(questions)} questions successfully!", "success")
    return redirect(url_for("dashboard"))


# Serve quiz for a skill
@app.route('/quiz/<skill>')
def start_quiz(skill):
    if 'user_id' not in session:
        flash("Please login first.", "warning")
        return redirect(url_for('login'))

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM questions WHERE skill = %s", (skill,))
    all_questions = cur.fetchall()
    cur.close()
    conn.close()

    # Convert JSON options back to list
    for q in all_questions:
        q['options'] = json.loads(q['options'])

    # Pick max 15 random questions
    selected = random.sample(all_questions, min(15, len(all_questions)))

    return render_template("quiz.html", questions=selected, skill=skill)


# Save quiz result
@app.route('/api/submit_quiz', methods=['POST'])
def submit_quiz():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    score = data.get("score", 0)
    skill = data.get("skill", "General")

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO quiz_results (user_id, skill, score)
        VALUES (%s, %s, %s)
    """, (session['user_id'], skill, score))
    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"message": "Quiz result stored!", "score": score})


# ----------------- RESUME -----------------
@app.route('/resume', methods=['GET', 'POST'])
def upload_resume():
    if 'user_id' not in session:
        flash("Please login first.", "warning")
        return redirect(url_for("login"))

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    if request.method == 'POST':
        if 'resume' not in request.files:
            flash("No file uploaded.", "danger")
            return redirect(url_for("upload_resume"))

        file = request.files['resume']
        if file.filename == "":
            flash("No selected file.", "danger")
            return redirect(url_for("upload_resume"))

        # Save file
        filename = secure_filename(file.filename)
        filepath = os.path.join("uploads", filename)
        file.save(filepath)

        # Extract text from resume
        try:
            text = extract_resume_text(filepath)
        except Exception as e:
            flash(f"Error reading resume: {e}", "danger")
            return redirect(url_for("upload_resume"))

        # Extract skills
        skills_found = extract_skills(text, skills_list)

        try:
            for skill, status in skills_found.items():
                cur.execute("""
                    INSERT INTO user_skills (user_id, skill, status)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (user_id, skill) DO NOTHING
                """, (session['user_id'], skill, status))
            conn.commit()
            flash(f"Extracted {len(skills_found)} skills from resume.", "success")
        except Exception as e:
            conn.rollback()
            flash(f"Database error while inserting skills: {e}", "danger")

    # Fetch skills to show on the page
    cur.execute("SELECT * FROM user_skills WHERE user_id = %s", (session['user_id'],))
    user_skills = cur.fetchall()
    cur.close()
    conn.close()

    return render_template("resume.html", user_skills=user_skills)



@app.route('/resume/remove_skill/<int:skill_id>', methods=['POST'])
def remove_skill(skill_id):
    if 'user_id' not in session:
        flash("Please login first.", "warning")
        return redirect(url_for("login"))

    conn = get_db_connection()
    cur = conn.cursor()
    # Delete only if this skill belongs to the logged-in user
    cur.execute("DELETE FROM user_skills WHERE id = %s AND user_id = %s", (skill_id, session['user_id']))
    conn.commit()
    cur.close()
    conn.close()

    flash("Skill removed successfully!", "success")
    return redirect(url_for('upload_resume'))
@app.route('/profile')
def profile():
    return render_template('profile.html')



if __name__ == '__main__':
    app.run(debug=True)
