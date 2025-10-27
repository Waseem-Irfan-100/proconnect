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
from werkzeug.utils import secure_filename
import docx


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
        password="irfan"      # your postgres password
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


# ------------------ QUIZ FEATURE ------------------
@app.route('/quiz/<skill>')
def start_quiz(skill):
    """Serve quiz questions for a specific skill from JSON file"""
    if 'user_id' not in session:
        flash("Please login first.", "warning")
        return redirect(url_for('login'))

    # Use full path
    json_path = os.path.join(app.root_path, 'static', 'quiz_data.json')

    # Load quiz data
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        flash(f"Error loading quiz file: {e}", "danger")
        return redirect(url_for('dashboard'))

    # Normalize skill key (in case of underscores)
    skill_key = skill.replace("_", " ")
    if skill_key not in data:
        flash(f"No quiz found for '{skill_key}'.", "warning")
        return redirect(url_for('dashboard'))

    all_questions = data[skill_key]
    if not isinstance(all_questions, list) or len(all_questions) == 0:
        flash(f"No questions available for '{skill_key}'.", "warning")
        return redirect(url_for('dashboard'))

    # Pick up to 15 random questions
    sample_count = min(15, len(all_questions))
    selected_raw = random.sample(all_questions, sample_count)

    selected = []
    for i, q in enumerate(selected_raw, start=1):
        question_text = q.get('question') or q.get('question_text') or str(q)
        options = q.get('options', [])
        correct_option = q.get('answer') or q.get('correct_option') or q.get('correct')
        selected.append({
            "id": i,
            "question_text": question_text,
            "options": options,
            "correct_option": correct_option
        })

    # Debug print
    print(f"Loaded {len(selected)} questions for {skill_key}")
    print(json.dumps(selected, indent=2))

    # ✅ IMPORTANT: pass as normal list, not JSON string
    return render_template('quiz.html', skill=skill_key, questions=selected)

@app.route('/api/submit_quiz', methods=['POST'])
def submit_quiz_api():
    if 'user_id' not in session:
        return jsonify({"error": "Not logged in"}), 401

    data = request.get_json()
    skill = data.get("skill")
    score = data.get("score", 0)
    total = data.get("total", 1)  # avoid division by zero

    pass_threshold = 0.7  # 70% passing
    passed = (score / total) >= pass_threshold

    if passed:
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            # Update skill to verified if passed
            cur.execute("""
                UPDATE user_skills
                SET status = 'verified'
                WHERE user_id = %s AND skill = %s
            """, (session['user_id'], skill))
            conn.commit()
            cur.close()
            conn.close()
        except Exception as e:
            return jsonify({"error": f"Database error: {e}"}), 500

    return jsonify({"passed": passed, "score": score, "total": total})


# ----------------- RESUME -----------------
@app.route('/resume', methods=['GET', 'POST'])
def upload_resume():
    if 'user_id' not in session:
        flash("Please login first.", "warning")
        return redirect(url_for("login"))

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # Step 1: Handle resume upload
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

        # Extract skills from new resume
        new_skills_found = extract_skills(text, skills_list)  # dict: {skill: status}

        try:
            # Step 2: Fetch existing skills from DB
            cur.execute("SELECT skill, status FROM user_skills WHERE user_id = %s", (session['user_id'],))
            existing_skills = {row['skill']: row['status'] for row in cur.fetchall()}

            # Step 3: Merge skills
            for skill, status in new_skills_found.items():
                if skill in existing_skills:
                    # If already verified, keep verified
                    if existing_skills[skill] == 'verified':
                        continue
                    # else keep as unverified
                    else:
                        continue  # unverified already exists, no action
                else:
                    # Insert new unverified skill
                    cur.execute("""
                        INSERT INTO user_skills (user_id, skill, status)
                        VALUES (%s, %s, %s)
                    """, (session['user_id'], skill, status))
            conn.commit()
            flash(f"Extracted {len(new_skills_found)} skills from resume.", "success")
        except Exception as e:
            conn.rollback()
            flash(f"Database error while inserting skills: {e}", "danger")

    # Step 4: Fetch merged skills for display
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
