const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { Pool } = require("pg");
const crypto = require("crypto");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;

if (!ADMIN_PASSWORD || !SESSION_SECRET || !DATABASE_URL) {
  console.error("Set ADMIN_PASSWORD, SESSION_SECRET, and DATABASE_URL environment variables.");
  process.exit(1);
}
if (ADMIN_PASSWORD.length < 12 || SESSION_SECRET.length < 32) {
  console.error("Use an admin password of at least 12 characters and a session secret of at least 32 characters.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false }
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "10kb" }));
app.use(session({
  name: "ajith_admin_session",
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 60 * 1000
  }
}));
app.use(express.static(path.join(__dirname, "public")));

const createLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: "Please sign in as admin." });
}
function hashCode(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tickets (
      id BIGSERIAL PRIMARY KEY,
      code_hash TEXT NOT NULL UNIQUE,
      code_display TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
    )
  `);
}

app.post("/api/tickets", createLimiter, async (req, res) => {
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  try {
    await pool.query(
      "INSERT INTO tickets (code_hash, code_display, created_at, expires_at) VALUES ($1, $2, $3, $4)",
      [hashCode(code), code, now, expires]
    );
    res.json({ code, expiresAt: expires.toISOString() });
  } catch (err) {
    console.error(err);
    res.status(503).json({ error: "Could not create a code. Please try again." });
  }
});

app.post("/api/admin/login", loginLimiter, (req, res) => {
  const password = String(req.body.password || "");
  const a = Buffer.from(password);
  const b = Buffer.from(ADMIN_PASSWORD);
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) return res.status(401).json({ error: "Incorrect admin password." });
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: "Could not start admin session." });
    req.session.isAdmin = true;
    res.json({ ok: true });
  });
});

app.post("/api/admin/logout", requireAdmin, (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/admin/tickets", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, code_display AS code, created_at AS \"createdAt\", expires_at AS \"expiresAt\", status FROM tickets ORDER BY id DESC LIMIT 500"
    );
    res.json({ tickets: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load codes." });
  }
});

app.post("/api/admin/verify", requireAdmin, async (req, res) => {
  const code = String(req.body.code || "").trim();
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ result: "invalid", message: "Enter a six-digit code." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query(
      "SELECT id, expires_at, status FROM tickets WHERE code_hash = $1 FOR UPDATE",
      [hashCode(code)]
    );
    if (!found.rowCount) {
      await client.query("ROLLBACK");
      return res.json({ result: "invalid", message: "Code not found." });
    }
    const row = found.rows[0];
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await client.query("ROLLBACK");
      return res.json({ result: "expired", message: "Code has expired." });
    }
    if (row.status === "redeemed") {
      await client.query("ROLLBACK");
      return res.json({ result: "used", message: "This code has already been used." });
    }
    await client.query("UPDATE tickets SET status = 'redeemed' WHERE id = $1", [row.id]);
    await client.query("COMMIT");
    res.json({ result: "valid", message: "Valid code — marked as used." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ result: "error", message: "Verification failed. Try again." });
  } finally {
    client.release();
  }
});

initDb().then(() => {
  app.listen(PORT, () => console.log(`Ajith Ticket Verification running on port ${PORT}`));
}).catch(err => {
  console.error("Database initialization failed:", err);
  process.exit(1);
});
