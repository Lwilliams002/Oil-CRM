// server/storageRoutes.ts
import express from "express";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Make sure to mount express.json() middleware in your server entry to parse JSON bodies.

const router = express.Router();

const s3 = new S3Client({
    region: process.env.S3_REGION,
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!
    },
    forcePathStyle: true // important for many S3-compatible providers incl. Wasabi
});

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getUserRole(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .single();
  if (error) return null;
  return data?.role ?? null;
}

async function isAdmin(userId: string) {
  const role = await getUserRole(userId);
  return role === 'admin';
}

function sendError(res: express.Response, e: any) {
  const msg = (e && e.message) ? e.message : String(e);
  const lower = msg.toLowerCase();
  const code = lower.includes('forbidden') ? 403 : (lower.includes('not found') ? 404 : 400);
  return res.status(code).json({ error: msg });
}

// helper: validate the caller's Supabase JWT and return user id
async function getUserIdFromRequest(req: express.Request) {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) throw new Error("Missing Bearer token");
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) throw new Error("Invalid token");
    return data.user.id;
}

// POST /api/sign-upload {filename, contentType, patientId}
// returns { uploadUrl, objectKey, docId }
router.post("/sign-upload", async (req, res) => {
    try {
        const userId = await getUserIdFromRequest(req);
        const { filename, contentType, patientId } = req.body as {
            filename: string; contentType: string; patientId: string;
        };

        if (!filename || !patientId) throw new Error('filename and patientId are required');
        const ct = contentType || 'application/octet-stream';

        const admin = await isAdmin(userId);
        const { data: patient, error: pErr } = await supabaseAdmin
          .from('patients')
          .select('id, created_by')
          .eq('id', patientId)
          .single();
        if (pErr || !patient) throw new Error('Patient not found');
        if (patient.created_by !== userId && !admin) throw new Error('Forbidden');

        // object key convention
        const objectKey = `patient-docs/${patientId}/${crypto.randomUUID()}-${filename}`;

        // presign PUT
        const cmd = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET!,
            Key: objectKey,
            ContentType: ct
        });
        const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 * 5 });

        // create pending row
        const { data, error } = await supabaseAdmin
            .from("patient_documents")
            .insert({
                patient_id: patientId,
                owner_user_id: userId,
                object_key: objectKey,
                bucket: process.env.S3_BUCKET!,
                content_type: ct,
                status: "pending",
                original_filename: filename
            })
            .select("id")
            .single();

        if (error) throw error;
        res.json({ uploadUrl, objectKey, docId: data.id });
    } catch (e: any) {
        return sendError(res, e);
    }
});

// POST /api/finalize-upload {docId, sizeBytes, sha256?}
// marks the row as stored after client PUT succeeds
router.post("/finalize-upload", async (req, res) => {
    try {
        const userId = await getUserIdFromRequest(req);
        const { docId, sizeBytes, sha256 } = req.body;

        if (!docId) throw new Error('docId is required');

        const admin = await isAdmin(userId);
        const q = supabaseAdmin
            .from("patient_documents")
            .update({ status: "stored", size_bytes: sizeBytes, sha256 })
            .eq("id", docId);
        if (!admin) q.eq("owner_user_id", userId);
        const { error } = await q;
        if (error) throw error;
        res.json({ ok: true });
    } catch (e: any) {
        return sendError(res, e);
    }
});

// GET /api/sign-download?docId=...
// returns { url } if caller is authorized by RLS-style checks
router.get("/sign-download", async (req, res) => {
  try {
    const userId = await getUserIdFromRequest(req);

    const docId = typeof req.query.docId === 'string' ? req.query.docId : undefined;
    const objectKey = typeof req.query.objectKey === 'string' ? req.query.objectKey : undefined;

    if (!docId && !objectKey) {
      return res.status(400).json({ error: 'Provide docId or objectKey' });
    }

    let Key: string | null = null;
    let Bucket = process.env.S3_BUCKET!;

    if (docId) {
      // Existing document path: authorize by owner or admin
      const { data: doc, error } = await supabaseAdmin
        .from('patient_documents')
        .select('object_key, bucket, patient_id, owner_user_id, status')
        .eq('id', docId)
        .single();
      if (error || !doc) throw new Error('Document not found');

      const admin = await isAdmin(userId);
      if (doc.owner_user_id !== userId && !admin) throw new Error('Forbidden');
      if (doc.status !== 'stored') throw new Error('Document not found');

      Key = doc.object_key as string;
      Bucket = (doc.bucket as string) || Bucket;
      if (!Key) throw new Error('Document missing object_key');
    } else if (objectKey) {
      // Avatar path: authorize via patients.profile_url match, owner or admin
      const { data: patient, error: pErr } = await supabaseAdmin
        .from('patients')
        .select('id, created_by, profile_url')
        .eq('profile_url', objectKey)
        .single();
      if (pErr || !patient) throw new Error('Not found');

      const admin = await isAdmin(userId);
      if (patient.created_by !== userId && !admin) throw new Error('Forbidden');

      Key = patient.profile_url as string;
    }

    const cmd = new GetObjectCommand({ Bucket, Key: Key! });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 120 });
    return res.json({ url });
  } catch (e) {
    return sendError(res, e);
  }
});

// Debug: confirm the caller's user id from Supabase JWT
router.get('/whoami', async (req, res) => {
  try {
    const userId = await getUserIdFromRequest(req);
    return res.json({ userId });
  } catch (e: any) {
    return sendError(res, e);
  }
});

// GET /api/patients — list patients for the authenticated user
router.get('/patients', async (req, res) => {
  try {
    const userId = await getUserIdFromRequest(req);

    const { data, error } = await supabaseAdmin
      .from('patients')
      .select('*')
      .eq('created_by', userId)
      .order('last_name', { ascending: true });

    if (error) throw error;
    return res.json(data || []);
  } catch (e: any) {
    return sendError(res, e);
  }
});

// TEMP: list registered router paths for debugging
router.get('/_routes', (req, res) => {
  try {
    // @ts-ignore access internal stack for quick debug only
    const paths = (router as any).stack
      .map((l: any) => l.route && l.route.path)
      .filter(Boolean);
    res.json({ routes: paths });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'debug error' });
  }
});

export default router;