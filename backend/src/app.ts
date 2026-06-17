import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { env } from './config/env';
import { logger } from './utils/logger';

// Routes
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/users.routes';
import branchRoutes from './modules/branches/branches.routes';
import clientRoutes from './modules/clients/clients.routes';
import loanProductRoutes from './modules/loans/loanProducts.routes';
import loanRoutes from './modules/loans/loans.routes';
import repaymentRoutes from './modules/repayments/repayments.routes';
import collectionRoutes from './modules/collections/collections.routes';
import reportRoutes from './modules/reports/reports.routes';
import smsRoutes from './modules/sms/sms.routes';
import auditRoutes from './modules/audit/audit.routes';

const app = express();

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Global rate limit
app.use(rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  message: { success: false, error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(process.cwd(), env.UPLOAD_DIR)));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', app: env.APP_NAME, timestamp: new Date().toISOString() });
});

// API routes
const api = '/api/v1';
app.use(`${api}/auth`, authRoutes);
app.use(`${api}/users`, userRoutes);
app.use(`${api}/branches`, branchRoutes);
app.use(`${api}/clients`, clientRoutes);
app.use(`${api}/loan-products`, loanProductRoutes);
app.use(`${api}/loans`, loanRoutes);
app.use(`${api}/repayments`, repaymentRoutes);
app.use(`${api}/collections`, collectionRoutes);
app.use(`${api}/reports`, reportRoutes);
app.use(`${api}/sms`, smsRoutes);
app.use(`${api}/audit`, auditRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(err.stack || err.message);
  res.status(500).json({ success: false, error: env.isProd ? 'Internal server error' : err.message });
});

export default app;