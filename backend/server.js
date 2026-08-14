import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import env, { ensureUploadDirWritable } from './config/env.js';
import pool from './config/db.js';
import routes from './routes/index.js';
import FileController from './controllers/FileController.js';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';

const app = express();

if (env.isProduction) {
  // Needed when rate-limiting behind a reverse proxy (nginx, etc.).
  app.set('trust proxy', 1);
}

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: env.isProduction ? undefined : false,
}));
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(morgan(env.isProduction ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Public static /uploads is disabled. Uploaded files require authenticated access via /api/files/*.
app.use('/uploads', FileController.legacyUploadsBlocked);

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    ensureUploadDirWritable({ requireWritable: true });

    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    const server = app.listen(env.port, () => {
      console.log(`EduWow API running on port ${env.port} (${env.nodeEnv})`);
      console.log(`AI provider: ${env.aiProvider}`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(
          `Port ${env.port} is already in use. On macOS, port 5000 is often taken by AirPlay Receiver — set PORT in .env to another value (e.g. 4000).`
        );
      } else {
        console.error('Failed to bind server:', error.message);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error('Failed to start server.', error.message);
    process.exit(1);
  }
}

start();
