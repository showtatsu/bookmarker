import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pino } from 'pino';
import { pinoHttp } from 'pino-http';
import adminAuditLogRoutes from './routes/admin-audit-log.routes.js';
import auditLogRoutes from './routes/audit-log.routes.js';
import authRoutes from './routes/auth.routes.js';
import bookmarkRoutes from './routes/bookmark.routes.js';
import tagRoutes from './routes/tag.routes.js';
import tokenRoutes from './routes/token.routes.js';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(pinoHttp({ logger }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/admin/audit-logs', adminAuditLogRoutes);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    uptime: process.uptime(),
  });
});

// TODO: Add routes
// app.use('/api/auth', authRoutes);
// app.use('/api/bookmarks', bookmarkRoutes);
// app.use('/api/tags', tagRoutes);
// app.use('/api/tokens', tokenRoutes);
// app.use('/api/audit-logs', auditLogRoutes);

// Error handling
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    logger.error(err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
);

// Only start server when not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`🚀 Server is running on http://localhost:${PORT}`);
  });
}

export default app;
