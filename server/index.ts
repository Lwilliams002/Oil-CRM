import 'dotenv/config';
import express from "express";
import cors from 'cors';
import storageRoutes from "./storageRoutes";

const app = express();

// CORS first (handles preflight too)
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
}));
app.options(/^\/api\/.*/, cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
}));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// One concise API logger
app.use('/api', (req, _res, next) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  console.log(`[API] ${req.method} ${req.path} token=${token ? token.slice(0,16)+'…' : 'NONE'}`);
  next();
});

// Routes
app.use('/api', storageRoutes); // mounts /api/sign-upload, /finalize-upload, /sign-download, /patients

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// 404 for unknown /api routes
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// JSON error handler (must be after routes)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  const msg = (err && err.message) ? err.message : 'Internal Server Error';
  res.status(500).json({ error: msg });
});

const PORT = Number(process.env.PORT || 5174);
app.listen(PORT, () => console.log(`API running on :${PORT}`));