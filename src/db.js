const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', 'psicologa.db');
const db = new DatabaseSync(DB_PATH);

db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

const rid = (r) => Number(r.lastInsertRowid);

// Migrações: adiciona colunas novas sem quebrar bancos existentes
const migrations = [
  "ALTER TABLE pacientes ADD COLUMN apelido TEXT",
  "ALTER TABLE contratos ADD COLUMN valor_sessao REAL DEFAULT 0",
  "ALTER TABLE convites ADD COLUMN valor REAL DEFAULT 0",
  "ALTER TABLE convites ADD COLUMN data_inicio TEXT",
  "ALTER TABLE convites ADD COLUMN agendamento_id INTEGER",
  "ALTER TABLE pagamentos ADD COLUMN pago_meses TEXT DEFAULT '[]'",
  // Campos de endereço estruturado para emissão de NFS-e
  "ALTER TABLE pacientes ADD COLUMN nf_logradouro TEXT",
  "ALTER TABLE pacientes ADD COLUMN nf_bairro TEXT",
  "ALTER TABLE pacientes ADD COLUMN nf_cidade TEXT",
  "ALTER TABLE pacientes ADD COLUMN nf_uf TEXT",
  "ALTER TABLE pacientes ADD COLUMN nf_cep TEXT",
  "ALTER TABLE pacientes ADD COLUMN nf_numero TEXT",
  "ALTER TABLE contratos ADD COLUMN end_logradouro TEXT",
  "ALTER TABLE contratos ADD COLUMN end_numero TEXT",
  "ALTER TABLE contratos ADD COLUMN end_bairro TEXT",
  "ALTER TABLE contratos ADD COLUMN end_cidade TEXT",
  "ALTER TABLE contratos ADD COLUMN end_uf TEXT",
  "ALTER TABLE contratos ADD COLUMN end_cep TEXT",
  "ALTER TABLE pacientes ADD COLUMN nf_complemento TEXT",
  "ALTER TABLE contratos ADD COLUMN end_complemento TEXT",
];
for (const m of migrations) {
  try { db.exec(m); } catch(_) {}
}

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
    apelido           TEXT,
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

  CREATE TABLE IF NOT EXISTS pagamentos (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo             TEXT NOT NULL DEFAULT 'pessoal',
    descricao        TEXT NOT NULL,
    categoria        TEXT,
    valor            REAL DEFAULT 0,
    data_vencimento  TEXT,
    data_pagamento   TEXT,
    pago             INTEGER DEFAULT 0,
    recorrente       INTEGER DEFAULT 0,
    obs              TEXT,
    created_at       TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS convites (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    token          TEXT NOT NULL UNIQUE,
    nome_paciente  TEXT,
    expires_at     TEXT NOT NULL,
    usado          INTEGER DEFAULT 0,
    contrato_id    INTEGER,
    created_at     TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (contrato_id) REFERENCES contratos(id)
  );
`);

// Migração: adiciona coluna visto em contratos se ainda não existir
// Tabela de links de agendamento público
db.exec(`
  CREATE TABLE IF NOT EXISTS links_agendamento (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    token      TEXT NOT NULL UNIQUE,
    dias       TEXT NOT NULL,
    horarios   TEXT NOT NULL,
    semanas    INTEGER DEFAULT 2,
    ativo      INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS notificacoes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo        TEXT NOT NULL DEFAULT 'zoom_ended',
    mensagem    TEXT,
    dados_json  TEXT,
    lida        INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now','localtime'))
  );
`);

try { db.prepare('ALTER TABLE contratos ADD COLUMN visto INTEGER DEFAULT 0').run(); } catch(e) {}
try { db.prepare("ALTER TABLE pacientes ADD COLUMN nota_fiscal TEXT DEFAULT 'nao'").run(); } catch(e) {}
try { db.prepare("ALTER TABLE pacientes ADD COLUMN forma_pgto TEXT").run(); } catch(e) {}
try { db.prepare("ALTER TABLE pacientes ADD COLUMN frequencia TEXT").run(); } catch(e) {}
try { db.prepare("ALTER TABLE pacientes ADD COLUMN freq_pgto TEXT").run(); } catch(e) {}

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
const getPacientes = (todos = false) =>
  db.prepare(todos
    ? 'SELECT * FROM pacientes ORDER BY ativo DESC, nome'
    : 'SELECT * FROM pacientes WHERE ativo=1 ORDER BY nome'
  ).all();

const getPacienteById = (id) =>
  db.prepare('SELECT * FROM pacientes WHERE id=?').get(id);

const getPacienteByCpf = (cpf) =>
  db.prepare('SELECT * FROM pacientes WHERE cpf=? LIMIT 1').get(cpf);

const createPaciente = (data) =>
  rid(db.prepare(`
    INSERT INTO pacientes
      (nome, apelido, cpf, data_nascimento, sexo, telefone, whatsapp, email, endereco,
       ocupacao, convenio, num_convenio, responsavel, tel_responsavel,
       queixa_principal, encaminhamento, valor_sessao, obs)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    data.nome, data.apelido || null, data.cpf || null, data.data_nascimento || null, data.sexo || 'F',
    data.telefone || null, data.whatsapp || null, data.email || null, data.endereco || null,
    data.ocupacao || null, data.convenio || null, data.num_convenio || null,
    data.responsavel || null, data.tel_responsavel || null,
    data.queixa_principal || null, data.encaminhamento || null,
    data.valor_sessao || 0, data.obs || null
  ));

const updatePaciente = (id, data) =>
  db.prepare(`
    UPDATE pacientes SET
      nome=?, apelido=?, cpf=?, data_nascimento=?, sexo=?, telefone=?, whatsapp=?, email=?,
      endereco=?, ocupacao=?, convenio=?, num_convenio=?, responsavel=?,
      tel_responsavel=?, queixa_principal=?, encaminhamento=?, valor_sessao=?, obs=?,
      ativo=?, nota_fiscal=?, forma_pgto=?, frequencia=?, freq_pgto=?,
      nf_logradouro=?, nf_numero=?, nf_complemento=?, nf_bairro=?, nf_cidade=?, nf_uf=?, nf_cep=?
    WHERE id=?
  `).run(
    data.nome, data.apelido || null, data.cpf || null, data.data_nascimento || null, data.sexo || 'F',
    data.telefone || null, data.whatsapp || null, data.email || null, data.endereco || null,
    data.ocupacao || null, data.convenio || null, data.num_convenio || null,
    data.responsavel || null, data.tel_responsavel || null,
    data.queixa_principal || null, data.encaminhamento || null,
    data.valor_sessao || 0, data.obs || null,
    data.ativo ?? 1, data.nota_fiscal || 'nao', data.forma_pgto || null, data.frequencia || null, data.freq_pgto || null,
    data.nf_logradouro || null, data.nf_numero || null, data.nf_complemento || null,
    data.nf_bairro || null, data.nf_cidade || null, data.nf_uf || null, data.nf_cep || null,
    id
  );

const deletePaciente = (id) =>
  db.prepare('UPDATE pacientes SET ativo=0 WHERE id=?').run(id);

// ============================================================
// AGENDAMENTOS
// ============================================================
const getAgendamentos = (filtros = {}) => {
  let sql = `
    SELECT a.*, p.nome as paciente_nome, p.apelido as paciente_apelido, p.whatsapp as paciente_whatsapp
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
    SELECT a.*, p.nome as paciente_nome, p.apelido as paciente_apelido, p.whatsapp as paciente_whatsapp
    FROM agendamentos a LEFT JOIN pacientes p ON p.id = a.paciente_id
    WHERE a.id=?
  `).get(id);

try { db.prepare('ALTER TABLE agendamentos ADD COLUMN zoom_link TEXT').run(); } catch(e) {}

const createAgendamento = (data) =>
  rid(db.prepare(`
    INSERT INTO agendamentos (paciente_id, data, hora, duracao, tipo, status, valor, pago, forma_pgto, obs, zoom_link)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    data.paciente_id || null, data.data, data.hora,
    data.duracao || 50, data.tipo || 'sessao', data.status || 'agendado',
    data.valor || 0, data.pago || 0, data.forma_pgto || null, data.obs || null, data.zoom_link || null
  ));

const updateAgendamento = (id, data) =>
  db.prepare(`
    UPDATE agendamentos SET
      paciente_id=?, data=?, hora=?, duracao=?, tipo=?, status=?,
      valor=?, pago=?, forma_pgto=?, obs=?, zoom_link=?
    WHERE id=?
  `).run(
    data.paciente_id || null, data.data, data.hora,
    data.duracao || 50, data.tipo || 'sessao', data.status || 'agendado',
    data.valor || 0, data.pago || 0, data.forma_pgto || null, data.obs || null,
    data.zoom_link || null, id
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
    SELECT a.*, p.nome as paciente_nome, p.apelido as paciente_apelido, p.whatsapp as paciente_whatsapp
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
      COUNT(CASE WHEN status IN ('agendado','confirmado') THEN 1 END) as total_agendadas,
      COALESCE(SUM(CASE WHEN status='realizado' THEN valor ELSE 0 END),0) as faturado,
      COALESCE(SUM(CASE WHEN status='realizado' AND pago=1 THEN valor ELSE 0 END),0) as recebido,
      COALESCE(SUM(CASE WHEN status='realizado' AND pago=0 THEN valor ELSE 0 END),0) as pendente,
      COALESCE(SUM(CASE WHEN status IN ('agendado','confirmado') THEN valor ELSE 0 END),0) as previsao
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
    SELECT a.*, p.nome as paciente_nome, p.nota_fiscal as paciente_nota_fiscal
    FROM agendamentos a
    LEFT JOIN pacientes p ON p.id = a.paciente_id
    WHERE a.data >= ? AND a.data <= ? AND a.status = 'realizado'
    ORDER BY a.data, a.hora
  `).all(de, ate);

  const pendentes = db.prepare(`
    SELECT a.*, p.nome as paciente_nome, p.nota_fiscal as paciente_nota_fiscal
    FROM agendamentos a
    LEFT JOIN pacientes p ON p.id = a.paciente_id
    WHERE a.data >= ? AND a.data <= ? AND a.status = 'realizado' AND a.pago=0
    ORDER BY a.data, a.hora
  `).all(de, ate);

  const previsaoLista = db.prepare(`
    SELECT a.*, p.nome as paciente_nome
    FROM agendamentos a
    LEFT JOIN pacientes p ON p.id = a.paciente_id
    WHERE a.data >= ? AND a.data <= ? AND a.status IN ('agendado','confirmado')
    ORDER BY a.data, a.hora
  `).all(de, ate);

  return { resumo, porDia, lista, pendentes, previsaoLista };
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
// LINKS AGENDAMENTO
// ============================================================
const createLinkAgendamento = ({ token, dias, horarios, semanas }) =>
  rid(db.prepare('INSERT INTO links_agendamento (token,dias,horarios,semanas) VALUES (?,?,?,?)')
    .run(token, JSON.stringify(dias), JSON.stringify(horarios), semanas || 2));

const getLinkAgendamento  = (token) => db.prepare('SELECT * FROM links_agendamento WHERE token=? AND ativo=1').get(token);
const getLinksAgendamento = ()      => db.prepare('SELECT * FROM links_agendamento WHERE ativo=1 ORDER BY created_at DESC').all();
const desativarLinkAgendamento = (id) => db.prepare('UPDATE links_agendamento SET ativo=0 WHERE id=?').run(id);

const getContratosNovos    = () => db.prepare('SELECT * FROM contratos WHERE visto=0 ORDER BY created_at DESC').all();
const marcarContratosVistos = () => db.prepare('UPDATE contratos SET visto=1 WHERE visto=0').run();

// ============================================================
// CONVITES
// ============================================================
const crypto = require('crypto');

const createConvite = (nome_paciente, valor = 0, data_inicio = null, agendamento_id = null) => {
  const token = crypto.randomBytes(16).toString('hex');
  rid(db.prepare(`
    INSERT INTO convites (token, nome_paciente, valor, data_inicio, agendamento_id, expires_at)
    VALUES (?, ?, ?, ?, ?, datetime('now', '+7 days', 'localtime'))
  `).run(token, nome_paciente || null, valor || 0, data_inicio || null, agendamento_id || null));
  return token;
};

const getConvites = () =>
  db.prepare('SELECT * FROM convites ORDER BY created_at DESC').all();

const getConviteByToken = (token) =>
  db.prepare('SELECT * FROM convites WHERE token=?').get(token);

const usarConvite = (token, contrato_id) =>
  db.prepare('UPDATE convites SET usado=1, contrato_id=? WHERE token=?').run(contrato_id, token);

const deleteConvite = (id) =>
  db.prepare('DELETE FROM convites WHERE id=?').run(id);

// ============================================================
// CONTRATOS
// ============================================================
const getContratos = () =>
  db.prepare('SELECT * FROM contratos ORDER BY created_at DESC').all();

const createContrato = (data) =>
  rid(db.prepare(`
    INSERT INTO contratos (nome, data_nascimento, cpf, email, celular, endereco,
      end_logradouro, end_numero, end_complemento, end_bairro, end_cidade, end_uf, end_cep,
      forma_pgto, nome_responsavel, cpf_responsavel, arquivo, origem, aceite)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    data.nome, data.data_nascimento || null, data.cpf || null,
    data.email || null, data.celular || null, data.endereco || null,
    data.end_logradouro || null, data.end_numero || null, data.end_complemento || null,
    data.end_bairro || null, data.end_cidade || null,
    data.end_uf || null, data.end_cep || null,
    data.forma_pgto || null, data.nome_responsavel || null,
    data.cpf_responsavel || null, data.arquivo || null,
    data.origem || 'online', data.aceite || 0
  ));

const updateContrato = (id, data) =>
  db.prepare('UPDATE contratos SET valor_sessao=? WHERE id=?').run(data.valor_sessao ?? 0, id);

const deleteContrato = (id) =>
  db.prepare('DELETE FROM contratos WHERE id=?').run(id);

const getPrevisaoPgto = (hoje) => {
  const d   = new Date(hoje + 'T12:00:00');
  const dow = d.getDay() || 7;
  const seg = new Date(d); seg.setDate(d.getDate() - dow + 1);
  const dom = new Date(seg); dom.setDate(seg.getDate() + 6);
  const semDe  = seg.toISOString().slice(0,10);
  const semAte = dom.toISOString().slice(0,10);
  const ano = d.getFullYear(), mes = d.getMonth() + 1;
  const mesDe  = `${ano}-${String(mes).padStart(2,'0')}-01`;
  const mesAte = `${ano}-${String(mes).padStart(2,'0')}-31`;

  const query = (de, ate, freqs) => db.prepare(`
    SELECT a.data, a.hora, a.valor, a.status, p.nome as paciente_nome, p.freq_pgto
    FROM agendamentos a
    JOIN pacientes p ON p.id = a.paciente_id
    WHERE a.data >= ? AND a.data <= ?
      AND a.status IN ('agendado','confirmado')
      AND p.freq_pgto IN (${freqs.map(()=>'?').join(',')})
    ORDER BY a.data, a.hora
  `).all(de, ate, ...freqs);

  const semanal = query(semDe, semAte, ['fp-semanal','por-sessao']);
  const mensal  = query(mesDe, mesAte, ['fp-mensal','cada4']);

  return {
    semDe, semAte, mesDe, mesAte,
    semanal: { total: semanal.reduce((s,a) => s + (a.valor||0), 0), sessoes: semanal },
    mensal:  { total: mensal.reduce((s,a)  => s + (a.valor||0), 0), sessoes: mensal  },
  };
};

const getProjecaoRecorrente = () => {
  const clientes = db.prepare(`
    SELECT id, nome, frequencia, freq_pgto, valor_sessao, forma_pgto
    FROM pacientes
    WHERE ativo = 1 AND valor_sessao > 0
    ORDER BY frequencia, nome
  `).all();

  const sessMes = { semanal: 4, quinzenal: 2, mensal: 1 };

  let totalSemana = 0, totalMes = 0;
  const itens = [];

  for (const c of clientes) {
    const nm = sessMes[c.frequencia] || 0;
    if (!nm) continue;
    const recMes = nm * c.valor_sessao;
    const recSem = recMes / 4;
    totalMes    += recMes;
    totalSemana += recSem;
    itens.push({
      nome:          c.nome,
      frequencia:    c.frequencia,
      freq_pgto:     c.freq_pgto,
      forma_pgto:    c.forma_pgto,
      valor_sessao:  c.valor_sessao,
      sessoes_mes:   nm,
      receita_semana: recSem,
      receita_mes:    recMes,
    });
  }

  return { totalSemana, totalMes, itens };
};

// ============================================================
// PAGAMENTOS
// ============================================================
const getPagamentos = ({ tipo, ano, mes } = {}) => {
  const tipoFilter = tipo ? "AND tipo = ?" : "";
  const tipoParam  = tipo ? [tipo] : [];

  if (!ano || !mes) {
    const where = tipo ? "WHERE tipo = ?" : "";
    return db.prepare(`SELECT * FROM pagamentos ${where} ORDER BY data_vencimento ASC, id DESC`).all(...tipoParam);
  }

  const mm     = String(mes).padStart(2,'0');
  const mesRef = `${ano}-${mm}`;

  // Pagamentos normais do mês + recorrentes cuja data_vencimento <= último dia do mês consultado
  return db.prepare(`
    SELECT * FROM pagamentos
    WHERE (
      (recorrente = 0 AND strftime('%Y-%m', data_vencimento) = ?)
      OR
      (recorrente = 1 AND (data_vencimento IS NULL OR strftime('%Y-%m', data_vencimento) <= ?))
    )
    ${tipoFilter}
    ORDER BY
      CAST(strftime('%d', data_vencimento) AS INTEGER) ASC,
      id DESC
  `).all(mesRef, mesRef, ...tipoParam);
};

const createPagamento = (d) =>
  rid(db.prepare(`
    INSERT INTO pagamentos (tipo,descricao,categoria,valor,data_vencimento,data_pagamento,pago,recorrente,obs,pago_meses)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(d.tipo||'pessoal', d.descricao||'', d.categoria||null,
         d.valor||0, d.data_vencimento||null, d.data_pagamento||null,
         d.pago?1:0, d.recorrente?1:0, d.obs||null, d.pago_meses||'[]'));

const updatePagamento = (id, d) =>
  db.prepare(`
    UPDATE pagamentos SET tipo=?,descricao=?,categoria=?,valor=?,
    data_vencimento=?,data_pagamento=?,pago=?,recorrente=?,obs=?,pago_meses=?
    WHERE id=?
  `).run(d.tipo||'pessoal', d.descricao||'', d.categoria||null,
         d.valor||0, d.data_vencimento||null, d.data_pagamento||null,
         d.pago?1:0, d.recorrente?1:0, d.obs||null, d.pago_meses||'[]', id);

const deletePagamento = (id) =>
  db.prepare('DELETE FROM pagamentos WHERE id=?').run(id);

// ============================================================
// RELATÓRIOS
// ============================================================
const getRelatorioFiltrado = ({ paciente_id, data_ini, data_fim, status } = {}) => {
  const conds = [];
  const params = [];
  if (paciente_id) { conds.push('a.paciente_id = ?'); params.push(paciente_id); }
  if (data_ini)    { conds.push('a.data >= ?');        params.push(data_ini); }
  if (data_fim)    { conds.push('a.data <= ?');        params.push(data_fim); }
  if (status)      { conds.push('a.status = ?');       params.push(status); }

  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';

  const sessoes = db.prepare(`
    SELECT a.id, a.data, a.hora, a.tipo, a.status, a.valor, a.pago, a.forma_pgto, a.obs,
           p.id as paciente_id, p.nome as paciente_nome, p.apelido as paciente_apelido
    FROM agendamentos a JOIN pacientes p ON a.paciente_id = p.id
    ${where}
    ORDER BY a.data DESC, a.hora DESC
  `).all(...params);

  const totais = {
    total: sessoes.length,
    realizadas: sessoes.filter(s => s.status === 'realizado').length,
    canceladas: sessoes.filter(s => s.status === 'cancelado').length,
    receita_total: sessoes.filter(s => s.status === 'realizado').reduce((s, r) => s + (r.valor || 0), 0),
    receita_paga:  sessoes.filter(s => s.pago).reduce((s, r) => s + (r.valor || 0), 0),
  };

  return { sessoes, totais };
};
const getRelatorios = () => {
  // Sessões por mês (últimos 12)
  const sessoesPorMes = db.prepare(`
    SELECT strftime('%Y-%m', data) as mes, COUNT(*) as total
    FROM agendamentos WHERE status='realizado'
    GROUP BY mes ORDER BY mes DESC LIMIT 12
  `).all().reverse();

  // Receita por mês (últimos 12)
  const receitaPorMes = db.prepare(`
    SELECT strftime('%Y-%m', data) as mes, ROUND(SUM(COALESCE(valor,0)),2) as receita
    FROM agendamentos WHERE pago=1
    GROUP BY strftime('%Y-%m', data) ORDER BY mes DESC LIMIT 12
  `).all().reverse();

  // Sessões por dia da semana (0=dom ... 6=sab)
  const sessoesPorDia = db.prepare(`
    SELECT CAST(strftime('%w', data) AS INTEGER) as dia, COUNT(*) as total
    FROM agendamentos WHERE status='realizado'
    GROUP BY dia ORDER BY dia
  `).all();

  // Sessões por hora
  const sessoesPorHora = db.prepare(`
    SELECT substr(hora,1,2) as hora_n, COUNT(*) as total
    FROM agendamentos WHERE status='realizado' AND hora IS NOT NULL
    GROUP BY hora_n ORDER BY hora_n
  `).all();

  // Status das sessões
  const statusSessoes = db.prepare(`
    SELECT COALESCE(status,'sem status') as status, COUNT(*) as total
    FROM agendamentos GROUP BY status
  `).all();

  // Clientes por gênero
  const porGenero = db.prepare(`
    SELECT COALESCE(sexo,'Não informado') as sexo, COUNT(*) as total
    FROM pacientes WHERE ativo=1 GROUP BY sexo
  `).all();

  // Clientes por faixa etária (baseado em data_nascimento)
  const nascimentos = db.prepare(`
    SELECT data_nascimento FROM pacientes WHERE ativo=1 AND data_nascimento IS NOT NULL AND data_nascimento != ''
  `).all();
  const anoAtual = new Date().getFullYear();
  const faixas = { '0-12': 0, '13-17': 0, '18-29': 0, '30-49': 0, '50-64': 0, '65+': 0 };
  for (const { data_nascimento } of nascimentos) {
    const ano = parseInt((data_nascimento || '').split('-')[0]);
    if (!ano) continue;
    const idade = anoAtual - ano;
    if (idade <= 12) faixas['0-12']++;
    else if (idade <= 17) faixas['13-17']++;
    else if (idade <= 29) faixas['18-29']++;
    else if (idade <= 49) faixas['30-49']++;
    else if (idade <= 64) faixas['50-64']++;
    else faixas['65+']++;
  }
  const porIdade = Object.entries(faixas).map(([faixa, total]) => ({ faixa, total }));

  // Top clientes por sessões (top 10)
  const topClientes = db.prepare(`
    SELECT p.nome, p.apelido, COUNT(a.id) as total_sessoes,
           ROUND(SUM(COALESCE(a.valor,0)),2) as receita_total
    FROM agendamentos a JOIN pacientes p ON a.paciente_id=p.id
    WHERE a.status='realizado'
    GROUP BY a.paciente_id ORDER BY total_sessoes DESC LIMIT 10
  `).all();

  // Sessões por semana (últimas 8)
  const sessoesPorSemana = db.prepare(`
    SELECT strftime('%Y-W%W', data) as semana, COUNT(*) as total,
           ROUND(SUM(COALESCE(valor,0)),2) as receita
    FROM agendamentos WHERE status='realizado'
    GROUP BY semana ORDER BY semana DESC LIMIT 8
  `).all().reverse();

  // Totais gerais
  const totais = db.prepare(`
    SELECT
      COUNT(*) as total_sessoes,
      ROUND(SUM(CASE WHEN pago=1 THEN COALESCE(valor,0) ELSE 0 END),2) as receita_total,
      ROUND(SUM(COALESCE(valor,0)),2) as receita_prevista
    FROM agendamentos WHERE status='realizado'
  `).get();

  const totalClientes = db.prepare(`SELECT COUNT(*) as total FROM pacientes WHERE ativo=1`).get();

  const mediaSemana = db.prepare(`
    SELECT ROUND(AVG(c),2) as media FROM (
      SELECT COUNT(*) as c FROM agendamentos WHERE status='realizado'
      GROUP BY strftime('%Y-%W', data)
    )
  `).get();

  return {
    sessoesPorMes, receitaPorMes, sessoesPorDia, sessoesPorHora,
    statusSessoes, porGenero, porIdade, topClientes, sessoesPorSemana,
    totais, totalClientes: totalClientes.total, mediaSemana: mediaSemana?.media || 0,
  };
};

function limparZoomLinks(id) {
  if (id) return db.prepare('UPDATE agendamentos SET zoom_link = NULL WHERE id = ?').run(id);
  return db.prepare('UPDATE agendamentos SET zoom_link = NULL').run();
}

// ============================================================
// NOTIFICAÇÕES
// ============================================================
const createNotificacao = (tipo, mensagem, dados) =>
  rid(db.prepare('INSERT INTO notificacoes (tipo, mensagem, dados_json) VALUES (?,?,?)')
    .run(tipo, mensagem || null, dados ? JSON.stringify(dados) : null));

const getNotificacoes = (apenasNaoLidas = false) => {
  const rows = apenasNaoLidas
    ? db.prepare('SELECT * FROM notificacoes WHERE lida=0 ORDER BY created_at DESC').all()
    : db.prepare('SELECT * FROM notificacoes ORDER BY created_at DESC LIMIT 50').all();
  return rows.map(r => ({ ...r, dados: r.dados_json ? JSON.parse(r.dados_json) : null }));
};

const marcarNotificacaoLida = (id) =>
  db.prepare('UPDATE notificacoes SET lida=1 WHERE id=?').run(id);

const getAgendamentoByZoomMeetingId = (meetingId) =>
  db.prepare("SELECT * FROM agendamentos WHERE zoom_link LIKE ? LIMIT 1")
    .get(`%/j/${meetingId}%`);

const getNfseData = (pacienteId, ano, mes) => {
  const de  = `${ano}-${String(mes).padStart(2,'0')}-01`;
  const ult = new Date(ano, mes, 0).getDate();
  const ate = `${ano}-${String(mes).padStart(2,'0')}-${String(ult).padStart(2,'0')}`;
  const paciente = db.prepare('SELECT * FROM pacientes WHERE id = ?').get(pacienteId);
  const sessoes  = db.prepare(`
    SELECT * FROM agendamentos
    WHERE paciente_id = ? AND data >= ? AND data <= ? AND status = 'realizado'
    ORDER BY data, hora
  `).all(pacienteId, de, ate);
  return { paciente, sessoes };
};

module.exports = {
  getPacientes, getPacienteById, getPacienteByCpf, createPaciente, updatePaciente, deletePaciente,
  getAgendamentos, getAgendamentoById, createAgendamento, updateAgendamento, deleteAgendamento,
  getProntuarios, createProntuario, updateProntuario, deleteProntuario,
  getDashboard, getFinanceiro, getPrevisaoPgto, getProjecaoRecorrente, getRelatorios, getRelatorioFiltrado, getConfig, setConfig,
  getPagamentos, createPagamento, updatePagamento, deletePagamento,
  getContratos, createContrato, updateContrato, deleteContrato, getContratosNovos, marcarContratosVistos,
  createLinkAgendamento, getLinkAgendamento, getLinksAgendamento, desativarLinkAgendamento,
  createConvite, getConvites, getConviteByToken, usarConvite, deleteConvite,
  limparZoomLinks,
  createNotificacao, getNotificacoes, marcarNotificacaoLida, getAgendamentoByZoomMeetingId,
  getNfseData
};
