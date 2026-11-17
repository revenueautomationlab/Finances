'use strict';
// RAL Finance API: small replacement for the Supabase data layer (src/services/supabaseService.js).
// One dependency (pg). Google ID token in, own HS256 JWT out. Role re-read from app_users on every
// request; every request runs in one transaction with app.user_email set for the audit trigger.
const http = require('node:http');
const crypto = require('node:crypto');
const { Pool, types } = require('pg');

// Match PostgREST JSON: numerics as numbers, dates/timestamps as the text Postgres returns.
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
types.setTypeParser(20, (v) => (v === null ? null : Number(v)));
for (const oid of [1082, 1114, 1184]) types.setTypeParser(oid, (v) => v);

const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || '';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const OWNER_EMAIL = 'revenueautomationlab@gmail.com'; // always admin, same as public.app_user_role()
const ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://finance.raltech.dev,http://localhost:5173')
  .split(',').map((s) => s.trim()).filter(Boolean);
const TOKEN_TTL = 12 * 3600;
const MAX_BODY = 2 * 1024 * 1024;
if (JWT_SECRET.length < 32) { console.error('JWT_SECRET missing or too short'); process.exit(1); }

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, idleTimeoutMillis: 30000 });
pool.on('error', (e) => console.error('pg pool error', e.message));

// Business tables the SPA reads and writes (fetchState + CRUD in supabaseService.js).
const BUSINESS = [
  'projects', 'payments', 'expenses', 'bank_spending', 'secret_investment_spending',
  'secret_investment_transfers', 'partners', 'partner_withdrawals', 'partner_dividends', 'budgets',
  'budget_spending', 'recurring_revenue', 'recurring_expenses', 'recurring_revenue_payments',
  'recurring_expense_payments', 'domains', 'payment_schedule', 'payment_schedule_payments',
];
const READ_ROLES = new Set(['reader', 'full', 'admin']);
const WRITE_ROLES = new Set(['full', 'admin']);

let COLS = null; // table -> Map(column -> data_type)
async function loadColumns() {
  const { rows } = await pool.query(
    "select table_name, column_name, data_type from information_schema.columns where table_schema = 'public'");
  const m = new Map();
  for (const r of rows) {
    if (!m.has(r.table_name)) m.set(r.table_name, new Map());
    m.get(r.table_name).set(r.column_name, r.data_type);
  }
  COLS = m;
}

// ---------- helpers ----------
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const qi = (name) => '"' + String(name).replace(/"/g, '""') + '"';
const b64u = (s) => Buffer.from(s).toString('base64url');

function signJwt(payload) {
  const h = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const p = b64u(JSON.stringify(payload));
  const s = crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${s}`;
}
function verifyJwt(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const want = crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${p}`).digest();
  const got = Buffer.from(s, 'base64url');
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null;
  try {
    const hdr = JSON.parse(Buffer.from(h, 'base64url').toString());
    const pl = JSON.parse(Buffer.from(p, 'base64url').toString());
    if (hdr.alg !== 'HS256' || !pl.email || !pl.exp || pl.exp < Date.now() / 1000) return null;
    return pl;
  } catch { return null; }
}

function cols(table) {
  const c = COLS.get(table);
  if (!c) throw new HttpError(404, `unknown table ${table}`);
  return c;
}
function toParam(type, v) {
  if (v !== null && typeof v === 'object' && type !== 'ARRAY') return JSON.stringify(v);
  return v;
}
function checkRow(table, row, { lenient = false } = {}) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) throw new HttpError(400, 'row must be an object');
  const c = cols(table);
  const unknown = Object.keys(row).filter((k) => !c.has(k));
  if (unknown.length && !lenient) throw new HttpError(400, `unknown column(s) for ${table}: ${unknown.join(', ')}`);
  const keys = Object.keys(row).filter((k) => c.has(k));
  return { keys, vals: keys.map((k) => toParam(c.get(k), row[k])) };
}

async function insertRows(db, table, rows, onConflict, opts) {
  if (onConflict && !cols(table).has(onConflict)) throw new HttpError(400, 'bad on_conflict column');
  const out = [];
  for (const row of rows) {
    const { keys, vals } = checkRow(table, row, opts);
    if (!keys.length) throw new HttpError(400, 'empty row');
    let sql = `insert into public.${qi(table)} (${keys.map(qi).join(', ')}) values (${keys.map((_, i) => '$' + (i + 1)).join(', ')})`;
    if (onConflict) {
      const upd = keys.filter((k) => k !== onConflict);
      sql += ` on conflict (${qi(onConflict)}) do ` +
        (upd.length ? `update set ${upd.map((k) => `${qi(k)} = excluded.${qi(k)}`).join(', ')}` : 'nothing');
    }
    out.push(...(await db.query(sql + ' returning *', vals)).rows);
  }
  return out;
}
async function updateRow(db, table, keyCol, keyVal, fields, opts) {
  const { keys, vals } = checkRow(table, fields, opts);
  const set = keys.filter((k) => k !== keyCol);
  if (!set.length) throw new HttpError(400, 'nothing to update');
  const sql = `update public.${qi(table)} set ${set.map((k, i) => `${qi(k)} = $${i + 1}`).join(', ')} where ${qi(keyCol)} = $${set.length + 1} returning *`;
  return (await db.query(sql, [...set.map((k) => vals[keys.indexOf(k)]), keyVal])).rows;
}
async function deleteRow(db, table, keyCol, keyVal) {
  return (await db.query(`delete from public.${qi(table)} where ${qi(keyCol)} = $1`, [keyVal])).rowCount;
}

// One transaction per request; app.user_email is what the audit trigger records as actor_email.
async function withTx(email, fn) {
  const db = await pool.connect();
  try {
    await db.query('begin');
    await db.query("select set_config('app.user_email', $1, true)", [email || '']);
    const r = await fn(db);
    await db.query('commit');
    return r;
  } catch (e) {
    await db.query('rollback').catch(() => {});
    throw e;
  } finally { db.release(); }
}
async function roleOf(db, email) {
  if (email === OWNER_EMAIL) return 'admin';
  const { rows } = await db.query(
    "select role from public.app_users where lower(email) = lower($1) and status = 'active'", [email]);
  return rows[0] ? rows[0].role : null;
}

async function verifyGoogle(idToken) {
  if (!GOOGLE_CLIENT_ID) throw new HttpError(503, 'GOOGLE_CLIENT_ID is not configured on the server');
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken));
  if (!r.ok) throw new HttpError(401, 'invalid Google token');
  const t = await r.json();
  if (t.aud !== GOOGLE_CLIENT_ID) throw new HttpError(401, 'token audience mismatch');
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(t.iss)) throw new HttpError(401, 'bad issuer');
  if (String(t.email_verified) !== 'true' || !t.email) throw new HttpError(401, 'email not verified');
  if (Number(t.exp) < Date.now() / 1000) throw new HttpError(401, 'token expired');
  return String(t.email).toLowerCase();
}

// ---------- routes ----------
async function readState(db) {
  const all = {};
  for (const t of BUSINESS) all[t] = (await db.query(`select * from public.${qi(t)}`)).rows;
  const group = (rows, key) => rows.reduce((m, r) => ((m[r[key]] ||= []).push(r), m), {});
  const pay = group(all.payments, 'project_id');
  const exp = group(all.expenses, 'project_id');
  const bs = group(all.budget_spending, 'budget_id');
  const state = { ...all };
  state.projects = all.projects.map((p) => ({ ...p, payments: pay[p.id] || [], expenses: exp[p.id] || [] }));
  state.budgets = all.budgets.map((b) => ({ ...b, budget_spending: bs[b.id] || [] }));
  delete state.payments; delete state.expenses; delete state.budget_spending;
  return state;
}

async function revertAudit(db, id) {
  const { rows: [a] } = await db.query('select * from public.audit_log where id = $1 for update', [id]);
  if (!a) throw new HttpError(404, 'audit entry not found');
  if (a.reverted_at) throw new HttpError(409, 'already reverted');
  if (!BUSINESS.includes(a.table_name)) throw new HttpError(400, 'table not revertable');
  const lenient = { lenient: true }; // old rows may hold columns dropped since
  if (a.action === 'INSERT') await deleteRow(db, a.table_name, 'id', a.row_id);
  else if (a.action === 'DELETE') await insertRows(db, a.table_name, [a.old_data], null, lenient);
  else if (a.action === 'UPDATE') await updateRow(db, a.table_name, 'id', a.row_id, a.old_data, lenient);
  else throw new HttpError(400, `cannot revert action ${a.action}`);
  return (await db.query('update public.audit_log set reverted_at = now() where id = $1 returning *', [id])).rows[0];
}

// Snapshots: same 16 tables and JSON shape the daily-brief Worker used to write via PostgREST,
// read from the live VPS DB. Last 30 kept. restore_snapshot() (plpgsql, imported with the schema)
// deletes and re-inserts those tables; it runs inside the caller's transaction.
const SNAP_TABLES = [
  'projects', 'payments', 'expenses', 'bank_spending', 'secret_investment_spending',
  'partner_withdrawals', 'partner_dividends', 'budgets', 'budget_spending',
  'recurring_revenue', 'recurring_expenses', 'recurring_revenue_payments',
  'recurring_expense_payments', 'domains', 'payment_schedule', 'payment_schedule_payments',
];
async function takeSnapshot(db, by) {
  const data = {}; const counts = {};
  for (const t of SNAP_TABLES) {
    const { rows } = await db.query(`select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) as r from public.${qi(t)} x`);
    data[t] = rows[0].r; counts[t] = rows[0].r.length;
  }
  const { rows: [created] } = await db.query(
    'insert into public.db_snapshots (created_by, row_counts, data) values ($1, $2, $3) returning id, created_at, created_by, row_counts',
    [by, counts, data]);
  await db.query('delete from public.db_snapshots where id not in (select id from public.db_snapshots order by created_at desc limit 30)');
  return created;
}
const sha256hex = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

async function route(req, url, body) {
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const seg = path.split('/').filter(Boolean).map(decodeURIComponent);
  const m = req.method;

  if (m === 'GET' && path === '/healthz') {
    await pool.query('select 1');
    return { ok: true };
  }
  if (m === 'POST' && path === '/auth/google') {
    const email = await verifyGoogle(body && (body.credential || body.id_token));
    const role = await withTx(email, (db) => roleOf(db, email));
    if (!role) throw new HttpError(403, 'not an active user');
    const now = Math.floor(Date.now() / 1000);
    return { token: signJwt({ email, iat: now, exp: now + TOKEN_TTL }), email, role, expiresIn: TOKEN_TTL };
  }

  // Everything below needs a valid JWT and a current role from the DB.
  const auth = req.headers.authorization || '';
  const claims = verifyJwt(auth.startsWith('Bearer ') ? auth.slice(7) : '');
  if (!claims) throw new HttpError(401, 'not signed in');
  const email = claims.email;

  return withTx(email, async (db) => {
    const role = await roleOf(db, email);
    if (!role || !READ_ROLES.has(role)) throw new HttpError(403, 'access revoked');
    const needWrite = () => { if (!WRITE_ROLES.has(role)) throw new HttpError(403, 'read-only user'); };
    const needAdmin = () => { if (role !== 'admin') throw new HttpError(403, 'admin only'); };
    // Service token (daily-brief Worker): HS256 JWT with svc=true, minted with JWT_SECRET.
    const needSvc = () => { if (claims.svc !== true) throw new HttpError(403, 'service token only'); };

    if (m === 'GET' && path === '/auth/me') return { email, role };
    if (m === 'GET' && path === '/state') return readState(db);

    // Generic CRUD on business tables: /tables/:table[/:id]
    if (seg[0] === 'tables' && seg[1]) {
      const t = seg[1];
      if (!BUSINESS.includes(t)) throw new HttpError(404, 'unknown table');
      if (m === 'GET' && seg.length === 2) return (await db.query(`select * from public.${qi(t)}`)).rows;
      needWrite();
      if (m === 'POST' && seg.length === 2) {
        const rows = Array.isArray(body) ? body : [body];
        return insertRows(db, t, rows, url.searchParams.get('on_conflict'));
      }
      if (m === 'PATCH' && seg.length === 3) return updateRow(db, t, 'id', seg[2], body || {});
      if (m === 'DELETE' && seg.length === 3) return { deleted: await deleteRow(db, t, 'id', seg[2]) };
    }

    // Admin: users, audit log, snapshots
    if (seg[0] === 'admin') {
      needAdmin();
      if (seg[1] === 'users') {
        if (m === 'GET' && seg.length === 2) return (await db.query('select * from public.app_users order by created_at asc')).rows;
        if (m === 'POST' && seg.length === 2) {
          const row = { ...(body || {}) };
          if (!row.email) throw new HttpError(400, 'email required');
          row.email = String(row.email).toLowerCase().trim();
          return (await insertRows(db, 'app_users', [row]))[0];
        }
        if (m === 'PATCH' && seg.length === 3) return updateRow(db, 'app_users', 'email', seg[2], body || {});
        if (m === 'DELETE' && seg.length === 3) return { deleted: await deleteRow(db, 'app_users', 'email', seg[2]) };
      }
      if (seg[1] === 'audit') {
        if (m === 'GET' && seg.length === 2) {
          const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '200', 10) || 200, 1), 2000);
          const where = []; const args = [];
          if (url.searchParams.get('table')) { args.push(url.searchParams.get('table')); where.push(`table_name = $${args.length}`); }
          if (url.searchParams.get('since')) { args.push(url.searchParams.get('since')); where.push(`changed_at >= $${args.length}`); }
          args.push(limit);
          return (await db.query(`select * from public.audit_log ${where.length ? 'where ' + where.join(' and ') : ''} order by changed_at desc limit $${args.length}`, args)).rows;
        }
        if (m === 'POST' && seg.length === 4 && seg[3] === 'revert') return revertAudit(db, seg[2]);
      }
      if (seg[1] === 'snapshots') {
        if (m === 'GET' && seg.length === 2) return (await db.query('select id, created_at, created_by, row_counts from public.db_snapshots order by created_at desc')).rows;
        if (m === 'GET' && seg.length === 3) {
          const { rows: [s] } = await db.query('select data, created_at from public.db_snapshots where id = $1', [seg[2]]);
          if (!s) throw new HttpError(404, 'snapshot not found');
          return s;
        }
        // Create from live data. Only the service token may set created_by (e.g. "cron").
        if (m === 'POST' && seg.length === 2) {
          const by = claims.svc === true && body && body.by ? String(body.by) : email;
          return takeSnapshot(db, by);
        }
        // OTP-gated full restore, all in this one transaction: burn the code, safety snapshot, restore.
        if (m === 'POST' && seg.length === 4 && seg[3] === 'restore') {
          const code = String((body && body.code) || '');
          if (!/^\d{6}$/.test(code)) throw new HttpError(400, 'code required');
          const { rows: [otp] } = await db.query(
            "update public.admin_otp set used = true where id = (select id from public.admin_otp where purpose = 'restore' and not used and code_hash = $1 and expires_at > now() order by id desc limit 1) returning id",
            [sha256hex(code)]);
          if (!otp) throw new HttpError(403, 'Invalid or expired code');
          const { rows: [snap] } = await db.query('select id from public.db_snapshots where id = $1', [seg[2]]);
          if (!snap) throw new HttpError(404, 'snapshot not found');
          await takeSnapshot(db, `pre-restore safety (${email})`);
          await db.query('select public.restore_snapshot($1)', [seg[2]]);
          return { ok: true };
        }
      }
      // Restore codes: the Worker generates and emails the code, the API stores only its hash.
      if (seg[1] === 'otp' && m === 'POST' && seg.length === 2) {
        needSvc();
        const hash = String((body && body.code_hash) || '');
        if (!/^[0-9a-f]{64}$/.test(hash)) throw new HttpError(400, 'code_hash required');
        await db.query("insert into public.admin_otp (code_hash, purpose, expires_at) values ($1, 'restore', now() + interval '10 minutes')", [hash]);
        return { ok: true };
      }
      // Resend quota counters from send responses (Worker only).
      if (seg[1] === 'email-quota' && m === 'PUT' && seg.length === 2) {
        needSvc();
        const n = (v) => (Number.isFinite(Number(v)) && v !== null ? Number(v) : null);
        await db.query('insert into public.email_quota (id, daily_used, monthly_used, updated_at) values (1, $1, $2, now()) on conflict (id) do update set daily_used = excluded.daily_used, monthly_used = excluded.monthly_used, updated_at = now()',
          [n(body && body.daily_used), n(body && body.monthly_used)]);
        return { ok: true };
      }
    }
    throw new HttpError(404, 'not found');
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { reject(new HttpError(413, 'body too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      if (!chunks.length) return resolve(null);
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new HttpError(400, 'invalid JSON')); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  if (origin && ORIGINS.includes(origin)) {
    Object.assign(headers, {
      'Access-Control-Allow-Origin': origin, Vary: 'Origin',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS', 'Access-Control-Max-Age': '600',
    });
  }
  if (req.method === 'OPTIONS') { res.writeHead(204, headers); return res.end(); }
  let status = 200; let payload;
  try {
    if (!COLS) await loadColumns();
    const url = new URL(req.url, 'http://localhost');
    const body = ['POST', 'PATCH', 'PUT'].includes(req.method) ? await readBody(req) : null;
    payload = await route(req, url, body);
  } catch (e) {
    if (e instanceof HttpError) { status = e.status; payload = { error: e.message }; }
    else if (e && e.code && /^(22|23)/.test(e.code)) { status = e.code.startsWith('23') ? 409 : 400; payload = { error: e.message, code: e.code }; }
    else { status = req.url === '/healthz' ? 503 : 500; payload = { error: 'internal error' }; console.error(req.method, req.url, e && e.message); }
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(payload === undefined ? null : payload));
});

server.listen(PORT, () => console.log(`ral-finance-api listening on ${PORT}`));
const stop = () => server.close(() => pool.end().then(() => process.exit(0)));
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
