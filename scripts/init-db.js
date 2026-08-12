const bcrypt = require('bcrypt');
const models = require('../models');

async function init() {
  // Admin
  const adminHash = await bcrypt.hash('admin123', 10);
  try {
    models.createUser.run('admin', 'admin@cbt.local', adminHash, 'System Admin', 'admin');
    console.log('Admin created: admin / admin123');
  } catch (e) { console.log('Admin already exists'); }

  // Candidate
  const candHash = await bcrypt.hash('candidate123', 10);
  try {
    models.createUser.run('candidate', 'cand@cbt.local', candHash, 'Test Candidate', 'candidate');
    console.log('Candidate created: candidate / candidate123');
  } catch (e) { console.log('Candidate already exists'); }

  // Sample NMCN-style exam
  try {
    const result = models.createExam.run(
      'NMCN Professional Qualifying Examination (Sample)',
      'NMCN',
      'Sample CBT for Nursing & Midwifery Council of Nigeria',
      150,   // 2.5 hours
      100,
      50.0,
      0
    );
    console.log('Sample NMCN exam created with ID:', result.lastInsertRowid);
  } catch (e) {}

  console.log('Database ready.');
}

init();