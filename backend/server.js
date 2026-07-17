import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import env from './config/env.js';
import pool from './config/db.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    const server = app.listen(env.port, () => {
      console.log(`EduQuest API running on http://localhost:${env.port}`);
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
    console.error('Failed to start server. Check database connection.', error.message);
    process.exit(1);
  }
}

start();
