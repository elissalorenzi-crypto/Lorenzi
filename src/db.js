const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', 'psicologa.db');
const db = new DatabaseSync(DB_PATH);

db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

const rid = (r) => Number(r.lastInsertRowid);

// ============================================================
// SCHEMA
// ============================================================
db.exec(`
  CREATE TABLE IF NOT EXISTS pacientes (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    nome              TEXT NOT NULL,
    cpf               TEXT,
    data_nascimento   TEXT,
    sexo              TEXT DEFAULT 'F',
    telefone          TEXT,
    whatsapp          TEXT,
    email             TEXT,
    endereco          TEXT,
    ocupacao          TEXT,
    convenio          TEXT,
    num_convenio      TEXT,
    responsavel       TEXT,
    tel_responsavel   TEXT,
    queixa_principal  TEXT,
    encaminhamento    TEXT,
    valor_sessao      REAL DEFAULT 0,
    obs               TEXT,
    ativo             INTEGER DEFAULT 1,
    created_at        TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS agendamentos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id INTEGER,
    data        TEXT NOT NULL,
    hora        TEXT NOT NULL,
    duracao     INTEGER DEFAULT 50,
    tipo        TEXT DEFAULT 'sessao',
    status      TEXT DEFAULT 'agendado',
    valor       REAL DEFAULT 0,
    pago        INTEGER DEFAULT 0,
    forma_pgto  TEXT,
    obs         TEXT,
    created_at  TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
  );

  CREATE TABLE IF NOT EXISTS prontuarios (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id     INTEGER NOT NULL,
    agendamento_id  INTEGER,
    data            TEXT NOT NULL,
    conteudo        TEXT,
    humor           TEXT,
    tecnicas        TEXT,
    tarefas         TEXT,
    created_at      TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
    FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id)
  );

  CREATE TABLE IF NOT EXISTS configuracoes (
    chave TEXT PRIMARY KEY,
    valor TEXT
  );

  CREATE TABLE IF NOT EXISTS contratos (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    nome             TEXT NOT NULL,
    data_nascimento  TEXT,
    cpf              TEXT,
    email            TEXT,
    celular          TEXT,
    endereco         TEXT,
    forma_pgto       TEXT,
    nome_responsavel TEXT,
    cpf_responsavel  TEXT,
    arquivo          TEXT,
    origem           TEXT DEFAULT 'online',
    aceite           INTEGER DEFAULT 0,
    created_at       TEXT DEFAULT (datetime('now','localtime'))
  );
`);

// Seed configurações padrão
const cfgCount = db.prepare('SELECT COUNT(*) as n FROM configuracoes').get().n;
if (cfgCount === 0) {
  const ins = db.prepare('INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES (?,?)');
  ins.run('nome_psicologa', 'Psi. Elissa Catarina Lorenzi');
  ins.run('crp', 'CRP 06/91616');
  ins.run('valor_sessao_padrao', '180');
  ins.run('duracao_sessao', '50');
  ins.run('horario_inicio', '08:00');
  ins.run('horario_fim', '18:00');
}

// ============================================================
// PACIENTES
// ============================================================
const getPacientes = () =>
  db.prepare('SELECT * FROM pacientes WHERE ativo=1 ORDER BY nome').all();

const getPacienteById = (id) =>
  db.prepare('SELECT * FROM pacientes WHERE id=?').get(id);

const getPacienteByCpf = (cpf) =>
  db.prepare('SELECT * FROM pacientes WHERE cpf=? LIMIT 1').get(cpf);

const createPaciente = (data) =>
  rid(db.prepare(`
    INSERT INTO pacientes
      (nome, cpf, data_nascimento, sexo, telefone, whatsapp, email, endereco,
       ocupacao, convenio, num_convenio, responsavel, tel_responsavel,
       queixa_principal, encaminhamento, valor_sessao, obs)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    data.nome, data.cpf || null, data.data_nascimento || null, data.sexo || 'F',
    data.telefone || null, data.whatsapp || null, data.email || null, data.endereco || null,
    data.ocupacao || null, data.convenio || null, data.num_convenio || null,
    data.responsavel || null, data.tel_responsavel || null,
    data.queixa_principal || null, data.encaminhamento || null,
    data.valor_sessao || 0, data.obs || null
  ));

const updatePaciente = (id, data) =>
  db.prepare(`
    UPDATE pacientes SET
      nome=?, cpf=?, data_nascimento=?, sexo=?, telefone=?, whatsapp=?, email=?,
      endereco=?, ocupacao=?, convenio=?, num_convenio=?, responsavel=?,
      tel_responsavel=?, queixa_principal=?, encaminhamento=?, valor_sessao=?, obs=?
    WHERE id=?
  `).run(
    data.nome, data.cpf || null, data.data_nascimento || null, data.sexo || 'F',
    data.telefone || null, data.whatsapp || null, data.email || null, data.endereco || null,
    data.ocupacao || null, data.convenio || null, data.num_convenio || null,
    data.responsavel || null, data.tel_responsavel || null,
    data.queixa_principal || null, data.encaminhamento || null,
    data.valor_sessao || 0, data.obs || null, id
  );

const deletePaciente = (id) =>
  db.prepare('UPDATE pacientes SET ativo=0 WHERE id=?').run(id);

// ============================================================
// AGENDAMENTOS
// ============================================================
const getAgendamentos = (filtros = {}) => {
  let sql = `
    SELECT a.*, p.nome as paciente_nome, p.whatsapp as paciente_whatsapp
    FROM agendamentos a
    LEFT JOIN pacientes p ON p.id = a.paciente_id
    WHERE 1=1
  `;
  const params = [];
  if (filtros.data)       { sql += ' AND a.data = ?';       params.push(filtros.data); }
  if (filtros.data_de)    { sql += ' AND a.data >= ?';      params.push(filtros.data_de); }
  if (filtros.data_ate)   { sql += ' AND a.data <= ?';      params.push(filtros.data_ate); }
  if (filtros.paciente_id){ sql += ' AND a.paciente_id = ?';params.push(filtros.paciente_id); }
  if (filtros.status)     { sql += ' AND a.status = ?';     params.push(filtros.status); }
  sql += ' ORDER BY a.data, a.hora';
  return db.prepare(sql).all(...params);
};

const getAgendamentoById = (id) =>
  db.prepare(`
    SELECT a.*, p.nome as paciente_nome
    FROM agendamentos a LEFT JOIN pacientes p ON p.id = a.paciente_id
    WHERE a.id=?
  `).get(id);

const createAgendamento = (data) =>
  rid(db.prepare(`
    INSERT INTO agendamentos (paciente_id, data, hora, duracao, tipo, status, valor, pago, forma_pgto, obs)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(
    data.paciente_id || null, data.data, data.hora,
    data.duracao || 50, data.tipo || 'sessao', data.status || 'agendado',
    data.valor || 0, data.pago || 0, data.forma_pgto || null, data.obs || null
  ));

const updateAgendamento = (id, data) =>
  db.prepare(`
    UPDATE agendamentos SET
      paciente_id=?, data=?, hora=?, duracao=?, tipo=?, status=?,
      valor=?, pago=?, forma_pgto=?, obs=?
    WHERE id=?
  `).run(
    data.paciente_id || null, data.data, data.hora,
    data.duracao || 50, data.tipo || 'sessao', data.status || 'agendado',
    data.valor || 0, data.pago || 0, data.forma_pgto || null, data.obs || null, id
  );

const deleteAgendamento = (id) =>
  db.prepare('DELETE FROM agendamentos WHERE id=?').run(id);

// ============================================================
// PRONTUÁRIOS
// ============================================================
const getProntuarios = (paciente_id) =>
  db.prepare(`
    SELECT r.*, a.hora, a.tipo as sessao_tipo
    FROM prontuarios r
    LEFT JOIN agendamentos a ON a.id = r.agendamento_id
    WHERE r.paciente_id=?
    ORDER BY r.data DESC
  `).all(paciente_id);

const createProntuario = (data) =>
  rid(db.prepare(`
    INSERT INTO prontuarios (paciente_id, agendamento_id, data, conteudo, humor, tecnicas, tarefas)
    VALUES (?,?,?,?,?,?,?)
  `).run(
    data.paciente_id, data.agendamento_id || null, data.data,
    data.conteudo || null, data.humor || null, data.tecnicas || null, data.tarefas || null
  ));

const updateProntuario = (id, data) =>
  db.prepare(`
    UPDATE prontuarios SET conteudo=?, humor=?, tecnicas=?, tarefas=? WHERE id=?
  `).run(data.conteudo || null, data.humor || null, data.tecnicas || null, data.tarefas || null, id);

const deleteProntuario = (id) =>
  db.prepare('DELETE FROM prontuarios WHERE id=?').run(id);

// ============================================================
// DASHBOARD
// ============================================================
const getDashboard = (hoje) => {
  const primeiroDia = hoje.slice(0, 7) + '-01';
  const ultimoDia   = hoje.slice(0, 7) + '-31';

  const totalPacientes = db.prepare('SELECT COUNT(*) as n FROM pacientes WHERE ativo=1').get().n;

  const sessoesMes = db.prepare(`
    SELECT COUNT(*) as n FROM agendamentos
    WHERE data >= ? AND data <= ? AND status NOT IN ('cancelado','falta')
  `).get(primeiroDia, ultimoDia).n;

  const faturamentoMes = db.prepare(`
    SELECT COALESCE(SUM(valor),0) as total FROM agendamentos
    WHERE data >= ? AND data <= ? AND status='realizado'
  `).get(primeiroDia, ultimoDia).total;

  const recebidoMes = db.prepare(`
    SELECT COALESCE(SUM(valor),0) as total FROM agendamentos
    WHERE data >= ? AND data <= ? AND status='realizado' AND pago=1
  `).get(primeiroDia, ultimoDia).total;

  const pendenteMes = db.prepare(`
    SELECT COALESCE(SUM(valor),0) as total FROM agendamentos
    WHERE data >= ? AND data <= ? AND status='realizado' AND pago=0
  `).get(primeiroDia, ultimoDia).total;

  const agendaHoje = db.prepare(`
    SELECT a.*, p.nome as paciente_nome, p.whatsapp as paciente_whatsapp
    FROM agendamentos a
    LEFT JOIN pacientes p ON p.id = a.paciente_id
    WHERE a.data = ?
    ORDER BY a.hora
  `).all(hoje);

  const proximosDias = db.prepare(`
    SELECT a.*, p.nome as paciente_nome
    FROM agendamentos a
    LEFT JOIN pacientes p ON p.id = a.paciente_id
    WHERE a.data > ? AND a.status IN ('agendado','confirmado')
    ORDER BY a.data, a.hora
    LIMIT 8
  `).all(hoje);

  // Sessões por mês (últimos 6 meses)
  const sessoesGraph = db.prepare(`
    SELECT strftime('%Y-%m', data) as mes,
           COUNT(*) as total,
           COALESCE(SUM(CASE WHEN status='realizado' THEN valor ELSE 0 END),0) as faturamento
    FROM agendamentos
    WHERE data >= date(?, '-5 months', 'start of month')
      AND status != 'cancelado'
    GROUP BY mes
    ORDER BY mes
  `).all(hoje);

  // Aniversariantes do mês
  const mesBD = hoje.slice(5, 7);
  const aniversariantes = db.prepare(`
    SELECT nome, data_nascimento, telefone, whatsapp
    FROM pacientes
    WHERE ativo=1 AND strftime('%m', data_nascimento) = ?
    ORDER BY strftime('%d', data_nascimento)
  `).all(mesBD);

  return {
    totalPacientes, sessoesMes, faturamentoMes,
    recebidoMes, pendenteMes,
    agendaHoje, proximosDias, sessoesGraph, aniversariantes
  };
};

// ============================================================
// FINANCEIRO
// ============================================================
const getFinanceiro = (ano, mes) => {
  const prefixo = `${ano}-${String(mes).padStart(2,'0')}`;
  const de = `${prefixo}-01`;
  const ate = `${prefixo}-31`;

  const resumo = db.prepare(`
    SELECT
      COUNT(CASE WHEN status='realizado' THEN 1 END) as total_realizadas,
      COUNT(CASE WHEN status='cancelado' THEN 1 END) as total_canceladas,
      COUNT(CASE WHEN status='falta' THEN 1 END) as total_faltas,
      COALESCE(SUM(CASE WHEN status='realizado' THEN valor ELSE 0 END),0) as faturado,
      COALESCE(SUM(CASE WHEN status='realizado' AND pago=1 THEN valor ELSE 0 END),0) as recebido,
      COALESCE(SUM(CASE WHEN status='realizado' AND pago=0 THEN valor ELSE 0 END),0) as pendente
    FROM agendamentos WHERE data >= ? AND data <= ?
  `).get(de, ate);

  const porDia = db.prepare(`
    SELECT data,
           COUNT(CASE WHEN status='realizado' THEN 1 END) as realizadas,
           COALESCE(SUM(CASE WHEN status='realizado' THEN valor ELSE 0 END),0) as valor
    FROM agendamentos
    WHERE data >= ? AND data <= ?
    GROUP BY data ORDER BY data
  `).all(de, ate);

  const lista = db.prepare(`
    SELECT a.*, p.nome as paciente_nome
    FROM agendamentos a
    LEFT JOIN pacientes p ON p.id = a.paciente_id
    WHERE a.data >= ? AND a.data <= ? AND a.status = 'realizado'
    ORDER BY a.data, a.hora
  `).all(de, ate);

  const pendentes = db.prepare(`
    SELECT a.*, p.nome as paciente_nome
    FROM agendamentos a
    LEFT JOIN pacientes p ON p.id = a.paciente_id
    WHERE a.data >= ? AND a.data <= ? AND a.status = 'realizado' AND a.pago=0
    ORDER BY a.data, a.hora
  `).all(de, ate);

  return { resumo, porDia, lista, pendentes };
};

// ============================================================
// CONFIGURAÇÕES
// ============================================================
const getConfig = () => {
  const rows = db.prepare('SELECT chave, valor FROM configuracoes').all();
  return Object.fromEntries(rows.map(r => [r.chave, r.valor]));
};

const setConfig = (chave, valor) =>
  db.prepare('INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?,?)').run(chave, valor);

// ============================================================
// CONTRATOS
// ============================================================
const getContratos = () =>
  db.prepare('SELECT * FROM contratos ORDER BY created_at DESC').all();

const createContrato = (data) =>
  rid(db.prepare(`
    INSERT INTO contratos (nome, data_nascimento, cpf, email, celular, endereco, forma_pgto, nome_responsavel, cpf_responsavel, arquivo, origem, aceite)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    data.nome, data.data_nascimento || null, data.cpf || null,
    data.email || null, data.celular || null, data.endereco || null,
    data.forma_pgto || null, data.nome_responsavel || null,
    data.cpf_responsavel || null, data.arquivo || null,
    data.origem || 'online', data.aceite || 0
  ));

const deleteContrato = (id) =>
  db.prepare('DELETE FROM contratos WHERE id=?').run(id);

module.exports = {
  getPacientes, getPacienteById, getPacienteByCpf, createPaciente, updatePaciente, deletePaciente,
  getAgendamentos, getAgendamentoById, createAgendamento, updateAgendamento, deleteAgendamento,
  getProntuarios, createProntuario, updateProntuario, deleteProntuario,
  getDashboard, getFinanceiro, getConfig, setConfig,
  getContratos, createContrato, deleteContrato
};
