import 'dotenv/config';
import express from "express";
import storageRoutes from "./storageRoutes";

const app = express();
app.use('/api', (req, _res, next) => {
  console.log(`[API] ${req.method} ${req.path}`);
  next();
});
app.use(express.json());            // <-- required for POST bodies
app.use("/api", storageRoutes);     // mounts /api/sign-upload, /finalize-upload, /sign-download
// in server/index.ts, after creating app and before routes
app.use('/api', (req, _res, next) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    console.log(`[API] ${req.method} ${req.path} token=${token ? token.slice(0,16)+'…' : 'NONE'}`);
    next();
});
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// JSON error handler (must be after routes)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  const msg = (err && err.message) ? err.message : 'Internal Server Error';
  res.status(500).json({ error: msg });
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const PORT = Number(process.env.PORT || 5174);
app.listen(PORT, () => console.log(`API running on :${PORT}`));