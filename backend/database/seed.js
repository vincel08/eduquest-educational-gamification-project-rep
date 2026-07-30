import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function insertQuiz(connection, {
  courseId, lessonId, title, description, teacherId, questions,
}) {
  const [quizResult] = await connection.execute(
    `INSERT INTO quizzes
     (course_id, lesson_id, title, description, time_limit_minutes, passing_score, xp_reward, is_published, created_by)
     VALUES (?, ?, ?, ?, 15, 70, 50, 1, ?)`,
    [courseId, lessonId, title, description, teacherId]
  );
  const quizId = quizResult.insertId;

  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    const [qRow] = await connection.execute(
      `INSERT INTO quiz_questions (quiz_id, question_text, question_type, points, explanation, order_index)
       VALUES (?, ?, ?, 1, ?, ?)`,
      [quizId, q.text, q.type || 'multiple_choice', q.explanation || null, i + 1]
    );
    for (let o = 0; o < q.options.length; o += 1) {
      const opt = q.options[o];
      await connection.execute(
        `INSERT INTO quiz_options (question_id, option_text, is_correct, order_index)
         VALUES (?, ?, ?, ?)`,
        [qRow.insertId, opt.text, opt.correct ? 1 : 0, o + 1]
      );
    }
  }
  return quizId;
}

async function seedModule(connection, {
  teacherId, adminId, studentId, student2Id, module,
}) {
  const [courseResult] = await connection.execute(
    `INSERT INTO courses (title, description, subject, grade_level, teacher_id, is_published)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [module.title, module.description, module.subject, module.grade, teacherId]
  );
  const courseId = courseResult.insertId;

  await connection.execute(
    `INSERT INTO course_enrollments (course_id, student_id, progress_percent)
     VALUES (?, ?, 0.00), (?, ?, 0.00)`,
    [courseId, studentId, courseId, student2Id]
  );

  const lessonIds = [];
  for (let i = 0; i < module.lessons.length; i += 1) {
    const lesson = module.lessons[i];
    const [row] = await connection.execute(
      `INSERT INTO lessons (course_id, title, content, summary, learning_objectives, order_index, xp_reward, estimated_minutes)
       VALUES (?, ?, ?, ?, ?, ?, 30, 20)`,
      [
        courseId,
        lesson.title,
        lesson.content,
        lesson.summary,
        lesson.objectives,
        i + 1,
      ]
    );
    lessonIds.push(row.insertId);
  }

  await insertQuiz(connection, {
    courseId,
    lessonId: lessonIds[0],
    title: `${module.shortName} Knowledge Check`,
    description: `Assess understanding of ${module.title}.`,
    teacherId,
    questions: module.quizQuestions,
  });

  await connection.execute(
    `INSERT INTO educational_games
     (course_id, lesson_id, title, description, game_type, difficulty, estimated_time, game_data, xp_reward, is_published, created_by)
     VALUES (?, ?, ?, ?, ?, 'medium', 10, ?, 40, 1, ?)`,
    [
      courseId,
      lessonIds[0],
      module.game.title,
      module.game.description,
      module.game.type,
      JSON.stringify(module.game.data),
      teacherId,
    ]
  );

  await connection.execute(
    `INSERT INTO certificates (title, description, course_id, template_style, created_by)
     VALUES (?, ?, ?, 'classic', ?)`,
    [
      `${module.shortName} Certificate`,
      `Awarded for completing ${module.title}.`,
      courseId,
      adminId,
    ]
  );

  return courseId;
}

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await connection.query(schema);
  await connection.changeUser({ database: process.env.DB_NAME || 'eduquest' });

  // Upgrade existing databases with new columns/tables
  const upgrades = [
    `ALTER TABLE users ADD COLUMN google_id VARCHAR(255) NULL UNIQUE AFTER email`,
    `ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NULL`,
    `ALTER TABLE student_profiles ADD COLUMN current_streak INT UNSIGNED NOT NULL DEFAULT 0`,
    `ALTER TABLE student_profiles ADD COLUMN longest_streak INT UNSIGNED NOT NULL DEFAULT 0`,
    `ALTER TABLE student_profiles ADD COLUMN last_activity_date DATE NULL`,
    `ALTER TABLE medals MODIFY COLUMN tier ENUM('bronze', 'silver', 'gold', 'platinum', 'diamond', 'legendary') NOT NULL DEFAULT 'bronze'`,
    `ALTER TABLE educational_games MODIFY COLUMN game_type ENUM(
      'flashcards','memory_match','crossword','word_search','quiz_show','jeopardy','drag_drop','spin_wheel',
      'millionaire','escape_room','mission_adventure','puzzle_challenge','quiz_rush','word_scramble','true_false_blitz'
    ) NOT NULL`,
    `CREATE TABLE IF NOT EXISTS ai_review_drafts (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      teacher_id INT UNSIGNED NOT NULL,
      course_id INT UNSIGNED NOT NULL,
      lesson_id INT UNSIGNED NULL,
      source_type ENUM('ai_quiz', 'ai_game', 'ai_content', 'lesson_extras', 'manual') NOT NULL DEFAULT 'manual',
      status ENUM('draft', 'published', 'archived', 'discarded') NOT NULL DEFAULT 'draft',
      title VARCHAR(255) NULL,
      source_text MEDIUMTEXT NULL,
      quiz_json JSON NULL,
      game_json JSON NULL,
      learning_objectives_json JSON NULL,
      lesson_summary_json JSON NULL,
      generation_meta JSON NULL,
      quiz_id INT UNSIGNED NULL,
      game_id INT UNSIGNED NULL,
      ai_generated TINYINT(1) NOT NULL DEFAULT 1,
      teacher_edited TINYINT(1) NOT NULL DEFAULT 0,
      generated_by INT UNSIGNED NULL,
      updated_by INT UNSIGNED NULL,
      published_by INT UNSIGNED NULL,
      published_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_ai_review_teacher_status (teacher_id, status),
      INDEX idx_ai_review_course (course_id)
    ) ENGINE=InnoDB`,
    `ALTER TABLE courses ADD COLUMN updated_by INT UNSIGNED NULL AFTER teacher_id`,
    `ALTER TABLE lessons ADD COLUMN created_by INT UNSIGNED NULL AFTER is_published`,
    `ALTER TABLE lessons ADD COLUMN updated_by INT UNSIGNED NULL AFTER created_by`,
    `ALTER TABLE quizzes ADD COLUMN updated_by INT UNSIGNED NULL AFTER created_by`,
    `ALTER TABLE educational_games ADD COLUMN updated_by INT UNSIGNED NULL AFTER created_by`,
    `ALTER TABLE ai_review_drafts ADD COLUMN updated_by INT UNSIGNED NULL AFTER generated_by`,
  ];

  for (const sql of upgrades) {
    try {
      await connection.query(sql);
    } catch {
      // Column/table already upgraded
    }
  }

  console.log('Schema applied.');

  await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  const tables = [
    'password_reset_tokens',
    'ai_review_drafts',
    'ai_content_generations',
    'xp_transactions',
    'notifications',
    'game_scores',
    'educational_games',
    'student_certificates',
    'certificates',
    'student_medals',
    'medals',
    'student_badges',
    'badges',
    'quiz_answers',
    'quiz_attempts',
    'quiz_options',
    'quiz_questions',
    'quizzes',
    'lesson_progress',
    'lesson_materials',
    'lessons',
    'course_enrollments',
    'courses',
    'student_profiles',
    'users',
  ];

  for (const table of tables) {
    try {
      await connection.query(`TRUNCATE TABLE ${table}`);
    } catch {
      // Table may not exist yet on first run before schema create
    }
  }
  await connection.query('SET FOREIGN_KEY_CHECKS = 1');

  const passwordHash = await bcrypt.hash('Password123!', 12);

  const [adminResult] = await connection.execute(
    `INSERT INTO users (email, password_hash, first_name, last_name, role)
     VALUES (?, ?, ?, ?, ?)`,
    ['admin@eduquest.local', passwordHash, 'Alex', 'Admin', 'administrator']
  );

  const [teacherResult] = await connection.execute(
    `INSERT INTO users (email, password_hash, first_name, last_name, role)
     VALUES (?, ?, ?, ?, ?)`,
    ['teacher@eduquest.local', passwordHash, 'Taylor', 'Teacher', 'teacher']
  );

  const [studentResult] = await connection.execute(
    `INSERT INTO users (email, password_hash, first_name, last_name, role)
     VALUES (?, ?, ?, ?, ?)`,
    ['student@eduquest.local', passwordHash, 'Sam', 'Student', 'student']
  );

  const [student2Result] = await connection.execute(
    `INSERT INTO users (email, password_hash, first_name, last_name, role)
     VALUES (?, ?, ?, ?, ?)`,
    ['student2@eduquest.local', passwordHash, 'Jamie', 'Learner', 'student']
  );

  const adminId = adminResult.insertId;
  const teacherId = teacherResult.insertId;
  const studentId = studentResult.insertId;
  const student2Id = student2Result.insertId;

  await connection.execute(
    `INSERT INTO student_profiles (user_id, xp, level, grade_level, school_name, current_streak, longest_streak, last_activity_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE()), (?, ?, ?, ?, ?, ?, ?, NULL)`,
    [
      studentId, 120, 2, 'Grade 10', 'EduQuest High', 2, 5,
      student2Id, 40, 1, 'Grade 11', 'EduQuest High', 0, 0,
    ]
  );

  const modules = [
    {
      shortName: 'Disaster Preparedness',
      title: 'Disaster Preparedness',
      description: 'Learn how to prepare for, respond to, and recover from natural and man-made disasters.',
      subject: 'Safety Education',
      grade: 'Grade 9',
      lessons: [
        {
          title: 'Understanding Hazards',
          content: 'Disasters can be natural (earthquakes, floods, typhoons) or human-caused (fires, chemical spills). Hazard awareness helps families identify risks in their community and reduce vulnerability through planning.',
          summary: 'Identify common hazards and why preparedness matters.',
          objectives: 'Define disaster and hazard\nList common local hazards\nExplain risk reduction',
        },
        {
          title: 'Emergency Kits and Family Plans',
          content: 'A family emergency plan includes meeting points, contact numbers, evacuation routes, and assigned roles. An emergency kit should contain water, non-perishable food, flashlight, first-aid supplies, whistle, copies of IDs, and medications for at least 72 hours.',
          summary: 'Build a family emergency plan and go-bag.',
          objectives: 'List emergency kit items\nCreate a family communication plan\nPractice evacuation routes',
        },
        {
          title: 'Response and Recovery',
          content: 'During an emergency, follow Drop, Cover, and Hold for earthquakes, move to higher ground for floods, and obey official alerts. After disasters, check for injuries, avoid damaged structures, and support community recovery while managing stress and misinformation.',
          summary: 'Respond safely and support recovery.',
          objectives: 'Apply safety actions by hazard type\nRecognize reliable alerts\nSupport recovery and wellbeing',
        },
      ],
      quizQuestions: [
        {
          text: 'How many hours of supplies should a basic emergency kit cover?',
          explanation: 'Preparedness guidelines recommend at least 72 hours of supplies.',
          options: [
            { text: '24 hours', correct: false },
            { text: '72 hours', correct: true },
            { text: '12 hours', correct: false },
            { text: '1 week only for food', correct: false },
          ],
        },
        {
          text: 'Drop, Cover, and Hold is recommended during an earthquake.',
          type: 'true_false',
          explanation: 'This action protects the head and body from falling objects.',
          options: [
            { text: 'True', correct: true },
            { text: 'False', correct: false },
          ],
        },
      ],
      game: {
        title: 'Hazard Memory Match',
        description: 'Match disaster terms with their meanings.',
        type: 'memory_match',
        data: {
          items: [
            { term: 'Evacuation', definition: 'Leaving a dangerous area for safety' },
            { term: 'Go-bag', definition: 'Portable emergency supply kit' },
            { term: 'Hazard', definition: 'A source of potential harm' },
            { term: 'Alert', definition: 'Official warning about a threat' },
          ],
        },
      },
    },
    {
      shortName: 'Cyberbullying Awareness',
      title: 'Cyberbullying Awareness',
      description: 'Recognize, prevent, and respond to online harassment and digital abuse.',
      subject: 'Digital Citizenship',
      grade: 'Grade 8',
      lessons: [
        {
          title: 'What Is Cyberbullying?',
          content: 'Cyberbullying is using digital technology to harass, threaten, humiliate, or exclude someone. It can happen through social media, messaging apps, games, and emails, and may continue 24/7 beyond school grounds.',
          summary: 'Define cyberbullying and where it happens.',
          objectives: 'Define cyberbullying\nIdentify common platforms\nDistinguish jokes from harassment',
        },
        {
          title: 'Digital Footprints and Privacy',
          content: 'Everything posted online can be copied and shared. Protect passwords, avoid sharing personal details with strangers, use privacy settings, and think before posting. Screenshots and group chats can escalate harm quickly.',
          summary: 'Protect privacy and manage your digital footprint.',
          objectives: 'Explain digital footprint\nApply privacy settings\nPractice safe sharing habits',
        },
        {
          title: 'Upstanding and Reporting',
          content: 'Bystanders can become upstanders by supporting targets, reporting abusive content, and telling a trusted adult. Keep evidence, block harassers, and use school or platform reporting tools. Empathy and clear policies reduce harm.',
          summary: 'Respond safely and support peers.',
          objectives: 'List reporting steps\nPractice upstander actions\nSeek trusted adult help',
        },
      ],
      quizQuestions: [
        {
          text: 'Cyberbullying can continue outside school hours because digital devices are always available.',
          type: 'true_false',
          explanation: 'Online harassment is not limited to school time or campus.',
          options: [
            { text: 'True', correct: true },
            { text: 'False', correct: false },
          ],
        },
        {
          text: 'What should you do first when you experience cyberbullying?',
          explanation: 'Save evidence and tell a trusted adult while using block/report tools.',
          options: [
            { text: 'Reply with insults', correct: false },
            { text: 'Ignore forever and tell no one', correct: false },
            { text: 'Document evidence and tell a trusted adult', correct: true },
            { text: 'Share the bully’s private info publicly', correct: false },
          ],
        },
      ],
      game: {
        title: 'Cyber Terms Flashcards',
        description: 'Review key cyberbullying concepts.',
        type: 'flashcards',
        data: {
          items: [
            { term: 'Cyberbullying', definition: 'Using digital tech to harass another person' },
            { term: 'Upstander', definition: 'Someone who supports the target and reports harm' },
            { term: 'Digital footprint', definition: 'Traceable online activity and posts' },
            { term: 'Phishing', definition: 'Fraudulent attempt to steal sensitive information' },
          ],
        },
      },
    },
    {
      shortName: 'Bullying Prevention',
      title: 'Bullying Prevention',
      description: 'Build empathy, intervene safely, and create respectful school communities.',
      subject: 'Values Education',
      grade: 'Grade 7',
      lessons: [
        {
          title: 'Types of Bullying',
          content: 'Bullying is repeated aggressive behavior involving an imbalance of power. Types include physical, verbal, social/relational, and cyberbullying. Understanding forms helps students recognize harm early.',
          summary: 'Recognize types and power imbalance.',
          objectives: 'Define bullying\nList bullying types\nIdentify power imbalance',
        },
        {
          title: 'Empathy and Respect',
          content: 'Empathy means understanding others’ feelings. Respectful communication, inclusion, and celebrating differences reduce bullying. Classroom norms and peer support make schools safer.',
          summary: 'Practice empathy and inclusion.',
          objectives: 'Demonstrate empathy\nUse respectful language\nInclude peers intentionally',
        },
        {
          title: 'Safe Intervention',
          content: 'Safe intervention means helping without escalating danger: support the target, remove the audience when possible, report to adults, and avoid physical confrontation. Schools should enforce clear anti-bullying policies.',
          summary: 'Intervene safely and report.',
          objectives: 'Choose safe interventions\nReport effectively\nSupport targets after incidents',
        },
      ],
      quizQuestions: [
        {
          text: 'Bullying involves repeated behavior and a power imbalance.',
          type: 'true_false',
          explanation: 'Repetition and power imbalance distinguish bullying from one-time conflict.',
          options: [
            { text: 'True', correct: true },
            { text: 'False', correct: false },
          ],
        },
        {
          text: 'Which is a safe first response if you witness bullying?',
          explanation: 'Support the target and report to a trusted adult rather than fighting.',
          options: [
            { text: 'Start a physical fight with the bully', correct: false },
            { text: 'Support the target and report to a trusted adult', correct: true },
            { text: 'Record and post for entertainment', correct: false },
            { text: 'Join the bullying to fit in', correct: false },
          ],
        },
      ],
      game: {
        title: 'Respect Word Search',
        description: 'Find bullying-prevention vocabulary.',
        type: 'word_search',
        data: {
          words: ['EMPATHY', 'RESPECT', 'REPORT', 'KINDNESS', 'UPSTAND'],
          gridSize: 10,
        },
      },
    },
  ];

  for (const module of modules) {
    await seedModule(connection, {
      teacherId,
      adminId,
      studentId,
      student2Id,
      module,
    });
  }

  await connection.execute(
    `INSERT INTO badges (name, description, icon, color, criteria_type, criteria_value, xp_bonus) VALUES
     ('First Steps', 'Complete your first lesson', 'school', '#42A5F5', 'lessons_completed', 1, 10),
     ('Quiz Champion', 'Pass 3 quizzes', 'quiz', '#66BB6A', 'quizzes_passed', 3, 20),
     ('XP Collector', 'Earn 100 XP', 'star', '#FFA726', 'xp', 100, 15),
     ('Rising Star', 'Reach 500 XP', 'auto_awesome', '#AB47BC', 'xp', 500, 50),
     ('Master Educator', 'Awarded to outstanding teachers', 'school', '#0F766E', 'manual', 0, 0),
     ('Creative Teacher', 'Recognized for creative lesson design', 'brush', '#F59E0B', 'manual', 0, 0),
     ('Quiz Creator', 'Recognized for quality quiz creation', 'quiz', '#3B82F6', 'manual', 0, 0),
     ('AI Innovator', 'Recognized for AI-powered teaching', 'auto_awesome', '#8B5CF6', 'manual', 0, 0),
     ('Top Mentor', 'Recognized for exceptional mentoring', 'diversity_3', '#EC4899', 'manual', 0, 0)`
  );

  await connection.execute(
    `INSERT INTO medals (name, description, tier, icon, criteria_type, criteria_value) VALUES
     ('Bronze Climber', 'Reach level 2', 'bronze', 'military_tech', 'level', 2),
     ('Silver Scholar', 'Reach level 5', 'silver', 'military_tech', 'level', 5),
     ('Perfect Score', 'Get a perfect quiz score', 'gold', 'workspace_premium', 'perfect_quiz', 1),
     ('Top Contender', 'Reach top 3 on the leaderboard', 'platinum', 'emoji_events', 'leaderboard_rank', 3),
     ('Diamond Achiever', 'Reach level 10', 'diamond', 'diamond', 'level', 10),
     ('Legendary Learner', 'Reach level 20', 'legendary', 'workspace_premium', 'level', 20)`
  );

  await connection.execute(
    `INSERT INTO notifications (user_id, title, message, type, link) VALUES
     (?, 'Welcome to EduQuest', 'Explore Disaster Preparedness, Cyberbullying Awareness, and Bullying Prevention.', 'system', '/student/dashboard'),
     (?, 'Welcome Teacher', 'Your three safety and citizenship modules are ready. Use AI tools to expand them.', 'system', '/teacher/dashboard')`,
    [studentId, teacherId]
  );

  await connection.end();

  console.log('Seed completed successfully.');
  console.log('Modules: Disaster Preparedness, Cyberbullying Awareness, Bullying Prevention');
  console.log('Demo accounts (password: Password123!):');
  console.log('  admin@eduquest.local');
  console.log('  teacher@eduquest.local');
  console.log('  student@eduquest.local');
  console.log('  student2@eduquest.local');
}

run().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
