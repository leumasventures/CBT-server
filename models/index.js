const db = require('../config/database');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'candidate',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    exam_type TEXT NOT NULL,          -- NMCN, JAMB, WAEC, NECO, CUSTOM
    description TEXT,
    duration_minutes INTEGER DEFAULT 120,
    total_questions INTEGER DEFAULT 100,
    pass_mark REAL DEFAULT 50.0,
    negative_marking REAL DEFAULT 0.0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    questions_to_select INTEGER DEFAULT 50,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER NOT NULL,
    subject_id INTEGER,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option TEXT NOT NULL CHECK(correct_option IN ('A','B','C','D')),
    explanation TEXT,
    difficulty TEXT DEFAULT 'medium',
    year INTEGER,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    exam_id INTEGER NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    submitted_at DATETIME,
    score REAL,
    total_questions INTEGER,
    correct_answers INTEGER,
    percentage REAL,
    status TEXT DEFAULT 'in_progress',
    answers TEXT,                       -- JSON string
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (exam_id) REFERENCES exams(id)
  );
`);

module.exports = {
  // Users
  createUser: db.prepare(`
    INSERT INTO users (username, email, password_hash, full_name, role)
    VALUES (?, ?, ?, ?, ?)
  `),
  findUserByUsername: db.prepare(`SELECT * FROM users WHERE username = ?`),
  findUserById: db.prepare(`SELECT * FROM users WHERE id = ?`),

  // Exams
  getActiveExams: db.prepare(`SELECT * FROM exams WHERE is_active = 1 ORDER BY name`),
  getExamById: db.prepare(`SELECT * FROM exams WHERE id = ?`),
  createExam: db.prepare(`
    INSERT INTO exams (name, exam_type, description, duration_minutes, total_questions, pass_mark, negative_marking)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),

  // Subjects
  getSubjectsByExam: db.prepare(`SELECT * FROM subjects WHERE exam_id = ?`),
  createSubject: db.prepare(`
    INSERT INTO subjects (exam_id, name, code, questions_to_select)
    VALUES (?, ?, ?, ?)
  `),

  // Questions
  getQuestionsByExam: db.prepare(`SELECT * FROM questions WHERE exam_id = ? AND is_active = 1`),
  getQuestionsBySubject: db.prepare(`
    SELECT * FROM questions WHERE exam_id = ? AND subject_id = ? AND is_active = 1
  `),
  createQuestion: db.prepare(`
    INSERT INTO questions 
    (exam_id, subject_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, year)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  getQuestionById: db.prepare(`SELECT * FROM questions WHERE id = ?`),

  // Attempts
  createAttempt: db.prepare(`
    INSERT INTO attempts (user_id, exam_id, total_questions, answers, status)
    VALUES (?, ?, ?, ?, 'in_progress')
  `),
  getAttemptById: db.prepare(`SELECT * FROM attempts WHERE id = ?`),
  updateAttemptAnswers: db.prepare(`UPDATE attempts SET answers = ? WHERE id = ?`),
  completeAttempt: db.prepare(`
    UPDATE attempts 
    SET score = ?, correct_answers = ?, percentage = ?, submitted_at = CURRENT_TIMESTAMP, status = 'completed'
    WHERE id = ?
  `),
  getUserAttempts: db.prepare(`
    SELECT a.*, e.name as exam_name, e.exam_type 
    FROM attempts a 
    JOIN exams e ON a.exam_id = e.id 
    WHERE a.user_id = ? 
    ORDER BY a.started_at DESC LIMIT 20
  `),
};