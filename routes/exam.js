const express = require('express');
const models = require('../models');
const { requireLogin } = require('../middleware/auth');
const router = express.Router();

// Dashboard
router.get('/dashboard', requireLogin, (req, res) => {
  const exams = models.getActiveExams.all();
  const attempts = models.getUserAttempts.all(req.session.userId);
  res.render('dashboard', { exams, attempts, user: req.session });
});

// Start exam
router.post('/exam/:id/start', requireLogin, (req, res) => {
  const examId = parseInt(req.params.id);
  const exam = models.getExamById.get(examId);
  if (!exam || !exam.is_active) return res.status(404).send('Exam not found');

  // Select questions
  let selected = [];
  const subjects = models.getSubjectsByExam.all(examId);

  if (subjects.length > 0) {
    subjects.forEach(sub => {
      const qs = models.getQuestionsBySubject.all(examId, sub.id);
      // Shuffle
      for (let i = qs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [qs[i], qs[j]] = [qs[j], qs[i]];
      }
      selected.push(...qs.slice(0, sub.questions_to_select));
    });
  } else {
    const qs = models.getQuestionsByExam.all(examId);
    for (let i = qs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [qs[i], qs[j]] = [qs[j], qs[i]];
    }
    selected = qs.slice(0, exam.total_questions);
  }

  if (selected.length === 0) {
    return res.redirect('/dashboard?error=No questions available');
  }

  // Create attempt
  const result = models.createAttempt.run(
    req.session.userId,
    examId,
    selected.length,
    JSON.stringify({})
  );

  const attemptId = result.lastInsertRowid;

  // Store question order in session
  req.session[`attempt_${attemptId}_questions`] = selected.map(q => q.id);
  req.session[`attempt_${attemptId}_start`] = Date.now();

  res.redirect(`/exam/take/${attemptId}`);
});

// Take exam page
router.get('/exam/take/:id', requireLogin, (req, res) => {
  const attemptId = parseInt(req.params.id);
  const attempt = models.getAttemptById.get(attemptId);

  if (!attempt || attempt.user_id !== req.session.userId) {
    return res.status(403).send('Unauthorized');
  }
  if (attempt.status !== 'in_progress') {
    return res.redirect(`/result/${attemptId}`);
  }

  const exam = models.getExamById.get(attempt.exam_id);
  const questionIds = req.session[`attempt_${attemptId}_questions`] || [];
  
  const questions = questionIds.map(id => models.getQuestionById.get(id));

  const startTime = req.session[`attempt_${attemptId}_start`];
  const durationMs = exam.duration_minutes * 60 * 1000;
  const remainingSeconds = Math.max(0, Math.floor((startTime + durationMs - Date.now()) / 1000));

  res.render('exam', {
    attempt,
    exam,
    questions,
    remainingSeconds,
    user: req.session
  });
});

// Save answer (AJAX)
router.post('/exam/save-answer', requireLogin, express.json(), (req, res) => {
  const { attempt_id, question_id, selected_option } = req.body;
  const attempt = models.getAttemptById.get(attempt_id);

  if (!attempt || attempt.user_id !== req.session.userId || attempt.status !== 'in_progress') {
    return res.status(403).json({ error: 'Invalid attempt' });
  }

  const answers = JSON.parse(attempt.answers || '{}');
  answers[question_id] = selected_option;
  models.updateAttemptAnswers.run(JSON.stringify(answers), attempt_id);

  res.json({ success: true });
});

// Submit exam
router.post('/exam/submit/:id', requireLogin, (req, res) => {
  const attemptId = parseInt(req.params.id);
  const attempt = models.getAttemptById.get(attemptId);

  if (!attempt || attempt.user_id !== req.session.userId) {
    return res.status(403).send('Unauthorized');
  }
  if (attempt.status !== 'in_progress') {
    return res.redirect(`/result/${attemptId}`);
  }

  const exam = models.getExamById.get(attempt.exam_id);
  const answers = JSON.parse(attempt.answers || '{}');

  let correct = 0;
  Object.entries(answers).forEach(([qid, selected]) => {
    const q = models.getQuestionById.get(parseInt(qid));
    if (q && selected === q.correct_option) correct++;
  });

  const total = attempt.total_questions;
  let percentage = total > 0 ? (correct / total) * 100 : 0;

  if (exam.negative_marking > 0) {
    const answered = Object.keys(answers).length;
    const wrong = answered - correct;
    percentage = Math.max(0, ((correct - (wrong * exam.negative_marking)) / total) * 100);
  }

  models.completeAttempt.run(correct, correct, Math.round(percentage * 100) / 100, attemptId);

  // Clean session
  delete req.session[`attempt_${attemptId}_questions`];
  delete req.session[`attempt_${attemptId}_start`];

  res.redirect(`/result/${attemptId}`);
});

// View result
router.get('/result/:id', requireLogin, (req, res) => {
  const attempt = models.getAttemptById.get(parseInt(req.params.id));
  if (!attempt || (attempt.user_id !== req.session.userId && req.session.role !== 'admin')) {
    return res.status(403).send('Unauthorized');
  }

  const exam = models.getExamById.get(attempt.exam_id);
  res.render('result', { attempt, exam, user: req.session });
});

module.exports = router;