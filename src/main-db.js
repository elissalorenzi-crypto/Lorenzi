const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const _dir = process.env.DATABASE_PATH
  ? path.dirname(process.env.DATABASE_PATH)
  : path.join(__dirname, '..');
const MAIN_DB_PATH = path.join(_dir, 'main.db');

const db = new DatabaseSync(MAIN_DB_PATH);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`CREATE TABLE IF NOT EXISTS profissionais (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  senha         TEXT NOT NULL,
  nome          TEXT,
  crp           TEXT,
  conselho      TEXT DEFAULT 'CFP',
  especialidade TEXT,
  slug          TEXT UNIQUE,
  plano         TEXT DEFAULT 'trial',
  trial_expires TEXT,
  ativo         INTEGER DEFAULT 1,
  created_at    TEXT DEFAULT (datetime('now','localtime'))
)`);

db.exec(`CREATE TABLE IF NOT EXISTS sessoes (
  token           TEXT PRIMARY KEY,
  profissional_id INTEGER NOT NULL,
  expiry          INTEGER NOT NULL,
  FOREIGN KEY (profissional_id) REFERENCES profissionais(id)
)`);

// Mapeia tokens públicos (agenda-links, convites) → profissional_id
// Permite que rotas públicas encontrem o banco certo sem autenticação
db.exec(`CREATE TABLE IF NOT EXISTS link_registry (
  token           TEXT PRIMARY KEY,
  profissional_id INTEGER NOT NULL,
  tipo            TEXT
)`);

setInterval(() => {
  try { db.prepare("DELETE FROM sessoes WHERE expiry < ?").run(Date.now()); } catch(_) {}
}, 60 * 60 * 1000);

const getProfissionalByEmail = (email) =>
  db.prepare("SELECT * FROM profissionais WHERE LOWER(email) = LOWER(?) AND ativo = 1").get(email);

const getProfissionalById = (id) =>
  db.prepare("SELECT * FROM profissionais WHERE id = ?").get(id);

const getProfissionalBySlug = (slug) =>
  db.prepare("SELECT * FROM profissionais WHERE slug = ? AND ativo = 1").get(slug);

const getAllProfissionais = () =>
  db.prepare("SELECT id, email, nome, crp, conselho, plano, trial_expires, ativo, created_at FROM profissionais ORDER BY id").all();

const createProfissional = ({ email, senha, nome, crp, conselho, especialidade }) => {
  const trial = new Date();
  trial.setDate(trial.getDate() + 14);
  const baseSlug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-');
  // Garante slug único
  let slug = baseSlug;
  let i = 2;
  while (db.prepare("SELECT id FROM profissionais WHERE slug = ?").get(slug)) {
    slug = `${baseSlug}-${i++}`;
  }
  const r = db.prepare(`
    INSERT INTO profissionais (email, senha, nome, crp, conselho, especialidade, trial_expires, slug)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(email, senha, nome || null, crp || null, conselho || 'CFP', especialidade || null,
         trial.toISOString().slice(0, 10), slug);
  return Number(r.lastInsertRowid);
};

const updateProfissionalSenha = (id, senha) =>
  db.prepare("UPDATE profissionais SET senha = ? WHERE id = ?").run(senha, id);

const updateProfissional = (id, { email, senha, nome, crp, conselho, especialidade, plano, ativo } = {}) => {
  if (email) db.prepare("UPDATE profissionais SET email=? WHERE id=?").run(email, id);
  if (senha) db.prepare("UPDATE profissionais SET senha=? WHERE id=?").run(senha, id);
  if (nome  !== undefined) db.prepare("UPDATE profissionais SET nome=?  WHERE id=?").run(nome,  id);
  if (crp   !== undefined) db.prepare("UPDATE profissionais SET crp=?   WHERE id=?").run(crp,   id);
  if (conselho) db.prepare("UPDATE profissionais SET conselho=? WHERE id=?").run(conselho, id);
  if (especialidade !== undefined) db.prepare("UPDATE profissionais SET especialidade=? WHERE id=?").run(especialidade, id);
  if (plano !== undefined) db.prepare("UPDATE profissionais SET plano=? WHERE id=?").run(plano, id);
  if (ativo !== undefined) db.prepare("UPDATE profissionais SET ativo=? WHERE id=?").run(ativo ? 1 : 0, id);
};

// Garante que profissional_id=1 (Elissa) existe; atualiza senha/nome se já existe
const ensureProfissional1 = ({ email, senha, nome, crp } = {}) => {
  db.prepare(`INSERT OR IGNORE INTO profissionais (id, email, senha, nome, crp, plano, ativo, trial_expires)
              VALUES (1, ?, ?, ?, ?, 'premium', 1, '2099-12-31')`)
    .run(email || 'admin@local', senha || '', nome || '', crp || '');
  if (senha) db.prepare("UPDATE profissionais SET senha=?, nome=?, crp=? WHERE id=1").run(senha, nome||'', crp||'');
};

const setSession = (token, profissional_id, expiry) =>
  db.prepare("INSERT OR REPLACE INTO sessoes (token, profissional_id, expiry) VALUES (?,?,?)").run(token, profissional_id, expiry);

const getSession = (token) =>
  db.prepare("SELECT * FROM sessoes WHERE token = ?").get(token);

const deleteSession = (token) =>
  db.prepare("DELETE FROM sessoes WHERE token = ?").run(token);

const registerLink = (token, profissional_id, tipo) => {
  try { db.prepare("INSERT OR REPLACE INTO link_registry (token, profissional_id, tipo) VALUES (?,?,?)").run(token, profissional_id, tipo); } catch(_) {}
};

const getProfissionalByToken = (token) =>
  db.prepare("SELECT profissional_id FROM link_registry WHERE token = ?").get(token);

const unregisterLink = (token) => {
  try { db.prepare("DELETE FROM link_registry WHERE token = ?").run(token); } catch(_) {}
};

module.exports = {
  MAIN_DB_PATH,
  getProfissionalByEmail, getProfissionalById, getProfissionalBySlug, getAllProfissionais,
  createProfissional, updateProfissionalSenha, updateProfissional, ensureProfissional1,
  setSession, getSession, deleteSession,
  registerLink, getProfissionalByToken, unregisterLink,
};
