const express = require('express');
const path    = require('path');
const multer  = require('multer');
const db      = require('./src/db');
const fs      = require('fs');

// Carrega .env local se existir (desenvolvimento)
try {
  const env = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
} catch(_) {}

const upload = multer({
  dest: path.join(__dirname, 'public/uploads/contratos/'),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['application/pdf','image/jpeg','image/png','image/jpg'].includes(file.mimetype);
    cb(null, ok);
  }
});

const crypto = require('crypto');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── AUTH ─────────────────────────────────────────────────────
const hashSenha = s => crypto.createHash('sha256').update(s + 'psi2024').digest('hex');
const _tokens   = new Map(); // token → expiry

app.post('/api/auth/login', (req, res) => {
  const { senha } = req.body || {};
  const cfg = db.getConfig();
  const hash = cfg.senha_admin || hashSenha('2207');
  if (hashSenha(senha) !== hash) return res.status(401).json({ error: 'Senha incorreta' });
  const token = crypto.randomBytes(32).toString('hex');
  _tokens.set(token, Date.now() + 8 * 60 * 60 * 1000);
  res.json({ token });
});

app.post('/api/auth/logout', (req, res) => {
  _tokens.delete((req.headers.authorization || '').replace('Bearer ', ''));
  res.json({ ok: true });
});

app.post('/api/auth/verificar', (req, res) => {
  const token  = (req.headers.authorization || '').replace('Bearer ', '');
  const expiry = _tokens.get(token);
  if (!token || !expiry || Date.now() > expiry) return res.status(401).json({ ok: false });
  _tokens.set(token, Date.now() + 8 * 60 * 60 * 1000);
  res.json({ ok: true });
});

app.post('/api/auth/senha', (req, res) => {
  const { senha_atual, senha_nova } = req.body || {};
  const cfg = db.getConfig();
  if (hashSenha(senha_atual) !== (cfg.senha_admin || hashSenha('2207')))
    return res.status(401).json({ error: 'Senha atual incorreta' });
  db.setConfig('senha_admin', hashSenha(senha_nova));
  res.json({ ok: true });
});

// Valida token em rotas individuais que precisam de proteção
function authOk(req) {
  const token  = (req.headers.authorization || '').replace('Bearer ', '');
  const expiry = _tokens.get(token);
  return !!(token && expiry && Date.now() <= expiry);
}

// Download do banco para backup
app.get('/api/admin/backup-db', (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'Não autorizado' });
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'psicologa.db');
  if (!fs.existsSync(dbPath)) return res.status(404).json({ error: 'Banco não encontrado' });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  res.setHeader('Content-Disposition', `attachment; filename="psicologa_${stamp}.db"`);
  res.setHeader('Content-Type', 'application/octet-stream');
  fs.createReadStream(dbPath).pipe(res);
});

// Traduz mensagens de erro técnicas do SQLite para português
function traduzErro(msg) {
  if (!msg) return 'Erro desconhecido';
  if (msg.includes('UNIQUE constraint failed')) return 'Já existe um registro com esses dados. Verifique os campos duplicados.';
  if (msg.includes('NOT NULL constraint failed')) return 'Campo obrigatório não preenchido.';
  if (msg.includes('FOREIGN KEY constraint failed')) return 'Referência inválida. Verifique os dados informados.';
  if (msg.includes('no such table')) return 'Tabela não encontrada. Reinicie o sistema.';
  return msg;
}

const erro = (res, e, status = 400) =>
  res.status(status).json({ error: traduzErro(e.message) });

// ── DASHBOARD ────────────────────────────────────────────────
app.get('/api/dashboard', (req, res) => {
  const hoje = req.query.hoje || new Date().toISOString().slice(0, 10);
  res.json(db.getDashboard(hoje));
});

// ── PACIENTES ────────────────────────────────────────────────
app.get('/api/pacientes', (req, res) => res.json(db.getPacientes(req.query.todos === '1')));

app.get('/api/pacientes/:id', (req, res) => {
  const p = db.getPacienteById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Paciente não encontrada' });
  res.json(p);
});

app.post('/api/pacientes', (req, res) => {
  try { res.json({ id: db.createPaciente(req.body), success: true }); }
  catch(e) { erro(res, e); }
});

app.put('/api/pacientes/:id', (req, res) => {
  try { db.updatePaciente(req.params.id, req.body); res.json({ success: true }); }
  catch(e) { erro(res, e); }
});

app.delete('/api/pacientes/:id', (req, res) => {
  try { db.deletePaciente(req.params.id); res.json({ success: true }); }
  catch(e) { erro(res, e); }
});

app.get('/api/pacientes/:id/prontuarios', (req, res) =>
  res.json(db.getProntuarios(req.params.id))
);

app.get('/api/pacientes/:id/agendamentos', (req, res) =>
  res.json(db.getAgendamentos({ paciente_id: req.params.id }))
);

// ── AGENDAMENTOS ─────────────────────────────────────────────
app.get('/api/agendamentos', (req, res) => {
  const { data, data_de, data_ate, paciente_id, status } = req.query;
  res.json(db.getAgendamentos({ data, data_de, data_ate, paciente_id, status }));
});

app.get('/api/agendamentos/:id', (req, res) => {
  const a = db.getAgendamentoById(req.params.id);
  if (!a) return res.status(404).json({ error: 'Agendamento não encontrado' });
  res.json(a);
});

app.post('/api/agendamentos', async (req, res) => {
  try {
    const id = db.createAgendamento(req.body);
    // Gera link Zoom automaticamente (não bloqueia resposta em caso de falha)
    try {
      const ag  = db.getAgendamentoById(id);
      const cfg = db.getConfig();
      if (cfg.zoom_account_id && ag) {
        const nome = ag.paciente_nome || 'Consulta';
        const link = await criarReuniaozoom(cfg, `Sessão — ${nome}`, `${ag.data}T${ag.hora}:00`, ag.duracao || cfg.duracao_sessao || 50);
        db.updateAgendamento(id, { ...ag, zoom_link: link });
      }
    } catch(ze) { console.warn('Zoom (auto):', ze.message); }
    res.json({ id, success: true });
  } catch(e) { erro(res, e); }
});

app.put('/api/agendamentos/:id', (req, res) => {
  try { db.updateAgendamento(req.params.id, req.body); res.json({ success: true }); }
  catch(e) { erro(res, e); }
});

app.delete('/api/agendamentos/:id', (req, res) => {
  try { db.deleteAgendamento(req.params.id); res.json({ success: true }); }
  catch(e) { erro(res, e); }
});

// ── PRONTUÁRIOS ──────────────────────────────────────────────
app.get('/api/prontuarios', (req, res) => {
  if (!req.query.paciente_id) return res.status(400).json({ error: 'Informe o ID da paciente' });
  res.json(db.getProntuarios(req.query.paciente_id));
});

app.post('/api/prontuarios', (req, res) => {
  try {
    const id = db.createProntuario(req.body);
    // Marca a sessão vinculada como realizada automaticamente
    const agId = req.body.agendamento_id;
    if (agId) {
      const ag = db.getAgendamentoById(agId);
      if (ag && ag.status !== 'realizado') {
        db.updateAgendamento(agId, { ...ag, status: 'realizado' });
      }
    }
    res.json({ id, success: true });
  } catch(e) { erro(res, e); }
});

app.put('/api/prontuarios/:id', (req, res) => {
  try { db.updateProntuario(req.params.id, req.body); res.json({ success: true }); }
  catch(e) { erro(res, e); }
});

app.delete('/api/prontuarios/:id', (req, res) => {
  try { db.deleteProntuario(req.params.id); res.json({ success: true }); }
  catch(e) { erro(res, e); }
});

// ── PAGAMENTOS ───────────────────────────────────────────────
app.get('/api/pagamentos', (req, res) => {
  try { res.json(db.getPagamentos(req.query)); }
  catch(e) { erro(res, e); }
});

app.post('/api/pagamentos', (req, res) => {
  try { res.json({ id: db.createPagamento(req.body), success: true }); }
  catch(e) { erro(res, e); }
});

app.put('/api/pagamentos/:id', (req, res) => {
  try { db.updatePagamento(req.params.id, req.body); res.json({ success: true }); }
  catch(e) { erro(res, e); }
});

app.delete('/api/pagamentos/:id', (req, res) => {
  try { db.deletePagamento(req.params.id); res.json({ success: true }); }
  catch(e) { erro(res, e); }
});

// ── RELATÓRIOS ───────────────────────────────────────────────
app.get('/api/relatorios', (req, res) => {
  try { res.json(db.getRelatorios()); }
  catch(e) { erro(res, e); }
});

app.get('/api/relatorios/filtrado', (req, res) => {
  try { res.json(db.getRelatorioFiltrado(req.query)); }
  catch(e) { erro(res, e); }
});

// ── FINANCEIRO ───────────────────────────────────────────────
app.get('/api/financeiro', (req, res) => {
  const now = new Date();
  const ano = parseInt(req.query.ano || now.getFullYear());
  const mes = parseInt(req.query.mes || now.getMonth() + 1);
  res.json(db.getFinanceiro(ano, mes));
});

// ── ZOOM ─────────────────────────────────────────────────────
async function criarReuniaozoom(cfg, topic, startLocal, durationMin) {
  if (!cfg.zoom_account_id || !cfg.zoom_client_id || !cfg.zoom_client_secret)
    throw new Error('Credenciais Zoom não configuradas. Acesse Configurações → Zoom.');

  const tokenRes = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${cfg.zoom_account_id}`,
    { method: 'POST', headers: {
        Authorization: 'Basic ' + Buffer.from(`${cfg.zoom_client_id}:${cfg.zoom_client_secret}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
    }}
  );
  const tok = await tokenRes.json();
  if (!tok.access_token) throw new Error('Zoom: falha na autenticação — verifique Account ID, Client ID e Client Secret.');

  const meetRes = await fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tok.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic,
      type: 2,
      start_time: startLocal,
      duration: durationMin,
      timezone: 'America/Sao_Paulo',
      settings: {
        join_before_host: true,
        waiting_room: false,
        auto_recording: 'none',
        cloud_recording: false,
        local_recording: false,
        transcription: false,
        meeting_summary: false
      }
    })
  });
  const meet = await meetRes.json();
  if (!meet.join_url) throw new Error('Zoom: ' + (meet.message || 'não foi possível criar reunião'));
  return meet.join_url;
}

app.post('/api/admin/gerar-zoom-todos', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'Não autorizado' });
  try {
    const cfg  = db.getConfig();
    const hoje = new Date().toISOString().slice(0, 10);
    const ags  = db.getAgendamentos({ data_de: hoje })
      .filter(a => ['agendado','confirmado'].includes(a.status) && !a.zoom_link);
    const resultados = [];
    for (const ag of ags) {
      try {
        const link = await criarReuniaozoom(cfg, `Sessão — ${ag.paciente_nome}`, `${ag.data}T${ag.hora}:00`, ag.duracao || cfg.duracao_sessao || 50);
        db.updateAgendamento(ag.id, { ...ag, zoom_link: link });
        resultados.push({ id: ag.id, nome: ag.paciente_nome, data: ag.data, hora: ag.hora, ok: true });
      } catch(e) {
        resultados.push({ id: ag.id, nome: ag.paciente_nome, data: ag.data, hora: ag.hora, ok: false, erro: e.message });
      }
    }
    res.json({ total: ags.length, resultados });
  } catch(e) { erro(res, e); }
});

app.post('/api/agendamentos/:id/zoom', async (req, res) => {
  try {
    const ag  = db.getAgendamentoById(req.params.id);
    if (!ag) return res.status(404).json({ error: 'Agendamento não encontrado' });
    const cfg  = db.getConfig();
    const nome = ag.paciente_nome || 'Consulta';
    const link = await criarReuniaozoom(cfg, `Sessão — ${nome}`, `${ag.data}T${ag.hora}:00`, ag.duracao || cfg.duracao_sessao || 50);
    db.updateAgendamento(ag.id, { ...ag, zoom_link: link });
    res.json({ zoom_link: link, success: true });
  } catch(e) { erro(res, e); }
});

app.get('/api/financeiro/previsao-pgto', (req, res) => {
  const hoje = req.query.hoje || new Date().toISOString().slice(0,10);
  res.json(db.getPrevisaoPgto(hoje));
});

app.get('/api/financeiro/projecao-recorrente', (req, res) => {
  res.json(db.getProjecaoRecorrente());
});

// ── LINKS AGENDAMENTO ────────────────────────────────────────
app.get('/api/agendamento-links', (req, res) => res.json(db.getLinksAgendamento()));

app.post('/api/agendamento-links', (req, res) => {
  try {
    const token = require('crypto').randomBytes(12).toString('hex');
    db.createLinkAgendamento({ token, ...req.body });
    const base = `${req.protocol}://${req.get('host')}`;
    res.json({ token, link: `${base}/agendar/?token=${token}`, success: true });
  } catch(e) { erro(res, e); }
});

app.delete('/api/agendamento-links/:id', (req, res) => {
  try { db.desativarLinkAgendamento(req.params.id); res.json({ success: true }); }
  catch(e) { erro(res, e); }
});

app.get('/api/agendamento-links/:token/slots', (req, res) => {
  const link = db.getLinkAgendamento(req.params.token);
  if (!link) return res.status(404).json({ error: 'Link inválido ou expirado.' });

  const dias     = JSON.parse(link.dias);
  const horarios = JSON.parse(link.horarios);
  const semanas  = link.semanas || 2;

  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const d    = new Date(hoje); d.setDate(d.getDate() + 1);
  const fim  = new Date(hoje); fim.setDate(fim.getDate() + semanas * 7);

  const hojeStr = hoje.toISOString().slice(0,10);
  const fimStr  = fim.toISOString().slice(0,10);

  const existentes = db.getAgendamentos({ data_de: hojeStr, data_ate: fimStr });
  const ocupados   = new Set(existentes.map(a => `${a.data}|${a.hora}`));

  const slots = [];
  while (d <= fim) {
    const dow     = d.getDay();
    const dataStr = d.toISOString().slice(0,10);
    if (dias.includes(dow)) {
      for (const hora of horarios) {
        if (!ocupados.has(`${dataStr}|${hora}`)) slots.push({ data: dataStr, hora });
      }
    }
    d.setDate(d.getDate() + 1);
  }

  const cfg = db.getConfig();

  // Remove horários dentro dos intervalos bloqueados
  const bloqueios = [
    [cfg.bloqueio_inicio  || '', cfg.bloqueio_fim   || ''],
    [cfg.bloqueio2_inicio || '', cfg.bloqueio2_fim  || ''],
  ].filter(([i, f]) => i && f);
  const slotsFinais = slots.filter(s =>
    !bloqueios.some(([i, f]) => s.hora >= i && s.hora < f)
  );

  res.json({ slots: slotsFinais, nome_psicologa: cfg.nome_psicologa, crp: cfg.crp });
});

app.post('/api/agendamento-links/:token/reservar', (req, res) => {
  const link = db.getLinkAgendamento(req.params.token);
  if (!link) return res.status(404).json({ error: 'Link inválido.' });

  const { nome, whatsapp, data, hora } = req.body;
  if (!nome || !data || !hora) return res.status(400).json({ error: 'Dados incompletos.' });

  try {
    const existentes = db.getAgendamentos({ data });
    if (existentes.find(a => a.hora === hora))
      return res.status(409).json({ error: 'Este horário acabou de ser ocupado. Escolha outro.' });

    const todos = db.getPacientes();
    let pac = todos.find(p => p.nome.toLowerCase() === nome.toLowerCase());
    if (!pac) {
      const id = db.createPaciente({ nome, whatsapp: whatsapp || null });
      pac = { id, nome };
    }

    const cfg = db.getConfig();
    db.createAgendamento({
      paciente_id: pac.id, data, hora,
      tipo: 'sessao', status: 'agendado',
      valor: cfg.valor_sessao_padrao || 180
    });

    const conviteToken = db.createConvite(nome, cfg.valor_sessao_padrao || 0);
    const base = `${req.protocol}://${req.get('host')}`;
    res.json({ success: true, contratoLink: `${base}/contratos/?token=${conviteToken}` });
  } catch(e) { erro(res, e); }
});

// ── AGENDA PÚBLICA (cliente) ──────────────────────────────────
app.get('/api/agenda-publica', (req, res) => {
  const semana = req.query.semana || new Date().toISOString().slice(0, 10);
  const d = new Date(semana + 'T12:00:00');
  const dom = new Date(d); dom.setDate(d.getDate() - d.getDay()); // domingo da semana

  const dias = Array.from({ length: 7 }, (_, i) => {
    const x = new Date(dom); x.setDate(dom.getDate() + i);
    return x.toISOString().slice(0, 10);
  });

  const cfg = db.getConfig();
  const inicio  = cfg.horario_inicio  || '08:00';
  const fim     = cfg.horario_fim     || '18:00';
  const duracao = parseInt(cfg.duracao_sessao) || 50;

  const toMin   = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const fromMin = n => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

  // Manhã: só horas cheias 08:00-11:00. Tarde: 14:00-21:00 a cada 60min
  // Ter(2)/Qui(4)/Sex(5): sem 20:00
  const SEM_20H = new Set([2, 4, 5]);
  const baseSlots = [];
  for (let m = 480; m <= 600; m += 60) baseSlots.push(fromMin(m));  // 08:00–10:00 horas cheias
  for (let m = 840; m <= 1200; m += 60) baseSlots.push(fromMin(m)); // 14:00–20:00

  const existentes = db.getAgendamentos({ data_de: dias[0], data_ate: dias[dias.length - 1] })
    .filter(a => ['agendado', 'confirmado', 'realizado'].includes(a.status));

  const bloqueios = [
    [cfg.bloqueio_inicio  || '', cfg.bloqueio_fim  || ''],
    [cfg.bloqueio2_inicio || '', cfg.bloqueio2_fim || ''],
  ].filter(([i, f]) => i && f);

  const semana_data = dias.map(data => ({
    data,
    slots: baseSlots
      .filter(hora => {
        if (hora === '20:00' && SEM_20H.has(new Date(data + 'T12:00:00').getDay())) return false;
        const m = toMin(hora);
        return !bloqueios.some(([i, f]) => m >= toMin(i) && m < toMin(f));
      })
      .map(hora => {
        const slotMin = toMin(hora), slotFim = slotMin + duracao;
        const ocupado = existentes.some(a => {
          if (a.data !== data) return false;
          const am = toMin(a.hora), af = am + duracao;
          return slotMin < af && am < slotFim;
        });
        return { hora, livre: !ocupado };
      })
  }));

  res.json({
    semDe: dias[0], semAte: dias[dias.length - 1],
    semana: semana_data,
    config: { nome_psicologa: cfg.nome_psicologa || '', crp: cfg.crp || '' }
  });
});

app.post('/api/agenda-publica/reservar', async (req, res) => {
  const { nome, whatsapp, data, hora } = req.body;
  if (!nome || !data || !hora) return res.status(400).json({ error: 'Dados incompletos.' });

  try {
    const cfg = db.getConfig();
    const duracao = parseInt(cfg.duracao_sessao) || 50;
    const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

    const existentes = db.getAgendamentos({ data })
      .filter(a => ['agendado', 'confirmado'].includes(a.status));
    const slotMin = toMin(hora), slotFim = slotMin + duracao;
    const conflict = existentes.find(a => {
      const am = toMin(a.hora), af = am + duracao;
      return slotMin < af && am < slotFim;
    });
    if (conflict) return res.status(409).json({ error: 'Este horário acabou de ser ocupado. Escolha outro.' });

    // Agendamento e paciente só são criados após assinatura do contrato
    const conviteToken = db.createConvite(nome, cfg.valor_sessao_padrao || 0, data, null, hora);
    const base = `${req.protocol}://${req.get('host')}`;
    res.json({ success: true, contratoLink: `${base}/contratos/?token=${conviteToken}` });
  } catch(e) { erro(res, e); }
});

app.post('/api/agenda-publica/cancelar-reserva', (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Token obrigatório.' });
  const convite = db.getConviteByToken(token);
  if (!convite) return res.status(404).json({ error: 'Token inválido.' });
  if (convite.usado) return res.status(409).json({ error: 'Contrato já enviado.' });
  db.deleteConvite(convite.id);
  res.json({ ok: true });
});

// ── CONVITES ─────────────────────────────────────────────────
app.get('/api/convites', (req, res) => res.json(db.getConvites()));

app.post('/api/convites', (req, res) => {
  try {
    const { nome_paciente, valor, data_inicio } = req.body;
    const token = db.createConvite(nome_paciente, valor, data_inicio);
    const base  = `${req.protocol}://${req.get('host')}`;
    res.json({ token, link: `${base}/contratos/?token=${token}`, success: true });
  } catch(e) { erro(res, e); }
});

app.get('/api/convites/validar/:token', (req, res) => {
  const c = db.getConviteByToken(req.params.token);
  if (!c)        return res.status(404).json({ error: 'Link inválido.' });
  if (c.usado)   return res.status(410).json({ error: 'Este link já foi utilizado.' });
  if (new Date(c.expires_at) < new Date()) return res.status(410).json({ error: 'Este link expirou. Solicite um novo.' });
  res.json(c);
});

app.delete('/api/convites/:id', (req, res) => {
  try { db.deleteConvite(req.params.id); res.json({ success: true }); }
  catch(e) { erro(res, e); }
});

// ── CONTRATOS ────────────────────────────────────────────────
app.get('/api/contratos', (req, res) => res.json(db.getContratos()));

app.get('/api/contratos/novos', (req, res) => {
  const contratos = db.getContratosNovos();
  res.json({ count: contratos.length, contratos });
});

app.post('/api/contratos/marcar-vistos', (req, res) => {
  try { db.marcarContratosVistos(); res.json({ success: true }); }
  catch(e) { erro(res, e); }
});

app.post('/api/contratos', (req, res) => {
  try {
    const id = db.createContrato(req.body);

    // Cria ou atualiza paciente automaticamente com os dados do contrato
    try {
      const { nome, data_nascimento, cpf, email, celular, endereco, nome_responsavel, forma_pgto, freq_sessoes, token } = req.body;
      if (nome) {
        // Busca valor_sessao do convite (se existir)
        let valorSessao = 0;
        if (token) {
          try { const conv = db.getConviteByToken(token); valorSessao = conv?.valor || 0; } catch(_) {}
        }

        // Mapeia forma_pgto do contrato → campos do paciente
        const freqPgtoMap = { 'mensal': 'fp-mensal', 'por sessão': 'por-sessao' };
        const freqPgto = freqPgtoMap[forma_pgto] || null;

        const dadosPaciente = {
          nome,
          data_nascimento:  data_nascimento  || null,
          cpf:              cpf              || null,
          email:            email            || null,
          whatsapp:         celular          || null,
          endereco:         endereco         || null,
          responsavel:      nome_responsavel || null,
          freq_pgto:        freqPgto,
          frequencia:       freq_sessoes || 'semanal',
          ...(valorSessao ? { valor_sessao: valorSessao } : {}),
        };
        const existente = cpf ? db.getPacienteByCpf(cpf) : null;
        if (existente) {
          db.updatePaciente(existente.id, { ...existente, ...dadosPaciente });
        } else {
          const porNome = db.getPacientes().find(p => p.nome.toLowerCase() === nome.toLowerCase());
          if (porNome) {
            db.updatePaciente(porNome.id, { ...porNome, ...dadosPaciente });
          } else {
            db.createPaciente(dadosPaciente);
          }
        }
      }
    } catch(e) {
      console.warn('Aviso: não foi possível criar paciente automaticamente:', e.message);
    }

    // Marca o convite como usado e cria agendamento se veio da agenda pública
    if (req.body.token) {
      try {
        const conv = db.getConviteByToken(req.body.token);
        if (conv && conv.data_inicio && conv.hora_inicio && !conv.agendamento_id) {
          const cfg2 = db.getConfig();
          const duracao = parseInt(cfg2.duracao_sessao) || 50;
          const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
          const existentes = db.getAgendamentos({ data: conv.data_inicio })
            .filter(a => ['agendado', 'confirmado'].includes(a.status));
          const slotMin = toMin(conv.hora_inicio), slotFim = slotMin + duracao;
          const conflict = existentes.find(a => {
            const am = toMin(a.hora), af = am + duracao;
            return slotMin < af && am < slotFim;
          });
          if (!conflict) {
            // Busca ou usa o paciente já criado pelo contrato
            const todos = db.getPacientes();
            const pac = todos.find(p => p.nome.toLowerCase() === (req.body.nome || '').toLowerCase());
            if (pac) {
              db.createAgendamento({
                paciente_id: pac.id, data: conv.data_inicio, hora: conv.hora_inicio,
                tipo: 'sessao', status: 'agendado',
                valor: conv.valor || cfg2.valor_sessao_padrao || 0
              });
            }
          }
        }
        db.usarConvite(req.body.token, id);
      } catch(e) { console.warn('Aviso ao criar agendamento do contrato:', e.message); }
    }

    res.json({ id, success: true });
  } catch(e) { erro(res, e); }
});

app.post('/api/contratos/upload', upload.single('arquivo'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    const ext  = req.file.originalname.split('.').pop().toLowerCase();
    const nome = req.body.nome || 'Cliente';
    const filename = `${Date.now()}_${nome.replace(/\s+/g,'_')}.${ext}`;
    const fs   = require('fs');
    const dest = path.join(__dirname, 'public/uploads/contratos/', filename);
    fs.renameSync(req.file.path, dest);
    const id = db.createContrato({
      nome,
      celular:    req.body.celular   || null,
      email:      req.body.email     || null,
      forma_pgto: req.body.forma_pgto|| null,
      arquivo:    `/uploads/contratos/${filename}`,
      origem:     'whatsapp',
      aceite: 1
    });

    // Cria ou atualiza paciente automaticamente (upload não tem CPF — busca por nome)
    try {
      const celular = req.body.celular || null;
      const email   = req.body.email   || null;
      const porNome = db.getPacientes().find(p => p.nome.toLowerCase() === nome.toLowerCase());
      if (porNome) {
        db.updatePaciente(porNome.id, { ...porNome, whatsapp: celular || porNome.whatsapp, email: email || porNome.email });
      } else {
        db.createPaciente({ nome, whatsapp: celular, email });
      }
    } catch(e) {
      console.warn('Aviso: não foi possível criar paciente via upload:', e.message);
    }

    res.json({ id, success: true, arquivo: `/uploads/contratos/${filename}` });
  } catch(e) { erro(res, e); }
});

app.put('/api/contratos/:id', (req, res) => {
  try { db.updateContrato(req.params.id, req.body); res.json({ success: true }); }
  catch(e) { erro(res, e); }
});

app.delete('/api/contratos/:id', (req, res) => {
  try { db.deleteContrato(req.params.id); res.json({ success: true }); }
  catch(e) { erro(res, e); }
});

// ── CONFIGURAÇÕES ────────────────────────────────────────────
// Normaliza telefones/whatsapp de todos os clientes (remove código de país duplicado, adiciona 9º dígito)
app.post('/api/admin/limpar-zoom-links', (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'Não autorizado' });
  try {
    const { id } = req.body || {};
    const result = db.limparZoomLinks(id || null);
    res.json({ ok: true, alterados: result.changes });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/normalizar-fones', (req, res) => {
  try {
    const normalize = (fone) => {
      if (!fone) return null;
      let d = fone.replace(/\D/g, '');
      if (d.startsWith('55') && d.length >= 12) d = d.slice(2);
      if (d.length === 10) d = d.slice(0, 2) + '9' + d.slice(2);
      if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
      return fone;
    };
    const pacientes = db.getPacientes('todos');
    let atualizados = 0;
    for (const p of pacientes) {
      const wpp = normalize(p.whatsapp);
      const tel = normalize(p.telefone);
      if (wpp !== p.whatsapp || tel !== p.telefone) {
        db.updatePaciente(p.id, { ...p, whatsapp: wpp, telefone: tel });
        atualizados++;
      }
    }
    res.json({ success: true, atualizados });
  } catch(e) { erro(res, e); }
});

// ── NOTIFICAÇÕES ──────────────────────────────────────────────
app.get('/api/notificacoes', (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'Não autorizado' });
  res.json(db.getNotificacoes(req.query.nao_lidas === '1'));
});

app.post('/api/notificacoes/:id/lida', (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'Não autorizado' });
  db.marcarNotificacaoLida(Number(req.params.id));
  res.json({ ok: true });
});

// ── NFS-e HELPER ──────────────────────────────────────────────
app.get('/api/nfse/dados', (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'Não autorizado' });
  const { paciente_id, ano, mes } = req.query;
  if (!paciente_id || !ano || !mes) return res.status(400).json({ error: 'Parâmetros obrigatórios: paciente_id, ano, mes' });
  const dados = db.getNfseData(Number(paciente_id), Number(ano), Number(mes));
  const cfg   = db.getConfig();
  res.json({ ...dados, config: { nome_psicologa: cfg.nome_psicologa, crp: cfg.crp } });
});

// ── BULK CEP ENRICHMENT ───────────────────────────────────────
app.post('/api/admin/enrich-cep', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'Não autorizado' });
  const pacientes = db.getPacientes();
  const semCep    = pacientes.filter(p => !p.nf_cep);
  const cepRe     = /\b(\d{5}-?\d{3})\b/;
  const log = [];

  for (const p of semCep) {
    const match = cepRe.exec(p.endereco || '');
    if (!match) { log.push({ nome: p.nome, status: 'sem_cep' }); continue; }
    const cepRaw = match[1].replace('-', '');
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cepRaw}/json/`);
      const d = await r.json();
      if (d.erro) { log.push({ nome: p.nome, cep: cepRaw, status: 'invalido' }); continue; }
      db.updatePaciente(p.id, {
        ...p,
        nf_logradouro: d.logradouro || '',
        nf_bairro:     d.bairro     || '',
        nf_cidade:     d.localidade || '',
        nf_uf:         d.uf         || '',
        nf_cep:        cepRaw.replace(/(\d{5})(\d{3})/, '$1-$2'),
      });
      log.push({ nome: p.nome, cep: cepRaw, logradouro: d.logradouro, cidade: d.localidade, uf: d.uf, status: 'ok' });
    } catch(e) {
      log.push({ nome: p.nome, cep: cepRaw, status: 'erro', msg: e.message });
    }
    await new Promise(r => setTimeout(r, 120));
  }

  const ok   = log.filter(l => l.status === 'ok').length;
  const skip = log.filter(l => l.status === 'sem_cep').length;
  res.json({ total: pacientes.length, processados: semCep.length, atualizados: ok, sem_cep: skip, log });
});

// ── ZOOM WEBHOOK (sem auth — chamado diretamente pelo Zoom) ───
app.post('/api/zoom/webhook', express.json(), (req, res) => {
  const body = req.body || {};
  const cfg    = db.getConfig();
  const secret = cfg.zoom_webhook_secret || '';

  // Validação de assinatura (obrigatória quando secret está configurado)
  if (secret) {
    const sig       = req.headers['x-zm-signature'] || '';
    const timestamp = req.headers['x-zm-request-timestamp'] || '';
    const msg       = `v0:${timestamp}:${JSON.stringify(body)}`;
    const expected  = 'v0=' + crypto.createHmac('sha256', secret).update(msg).digest('hex');
    if (sig !== expected) return res.status(401).json({ error: 'Assinatura inválida' });
  }

  // Desafio de validação de URL (Zoom chama ao cadastrar o webhook)
  if (body.event === 'endpoint.url_validation') {
    const hash = crypto.createHmac('sha256', secret).update(body.payload?.plainToken || '').digest('hex');
    return res.json({ plainToken: body.payload?.plainToken, encryptedToken: hash });
  }

  // Sessão encerrada
  if (body.event === 'meeting.ended') {
    const meetingId = String(body.payload?.object?.id || '');
    if (meetingId) {
      try {
        const ag  = db.getAgendamentoByZoomMeetingId(meetingId);
        const pac = ag ? db.getPacienteById(ag.paciente_id) : null;
        const nome = pac?.apelido || pac?.nome?.split(' ')[0] || 'cliente';
        db.createNotificacao('zoom_ended',
          `Sessão com ${nome} encerrada — abrir prontuário?`,
          { agendamento_id: ag?.id || null, paciente_id: pac?.id || null, paciente_nome: pac?.nome || null }
        );
      } catch(e) { console.error('Webhook zoom_ended:', e.message); }
    }
  }

  res.json({ ok: true });
});

app.get('/api/configuracoes', (req, res) => res.json(db.getConfig()));

app.post('/api/configuracoes', (req, res) => {
  try {
    Object.entries(req.body).forEach(([k, v]) => db.setConfig(k, v));
    res.json({ success: true });
  } catch(e) { erro(res, e); }
});

// ─── ORGANIZAR PRONTUÁRIO ────────────────────────────────────
app.post('/api/prontuarios/organizar', async (req, res) => {
  const { conteudo, humor, tecnicas, tarefas, nome_paciente } = req.body || {};
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'ANTHROPIC_API_KEY não configurada no servidor' });

  const CAMPOS = [
    { key: 'conteudo',  label: 'Relato e conteúdo da sessão',              valor: conteudo  },
    { key: 'humor',     label: 'Estado emocional e humor do paciente',      valor: humor     },
    { key: 'tecnicas',  label: 'Técnicas e intervenções realizadas',        valor: tecnicas  },
    { key: 'tarefas',   label: 'Tarefas e encaminhamentos propostos',       valor: tarefas   },
  ];

  const resultado = {};
  for (const campo of CAMPOS) {
    if (!campo.valor?.trim()) { resultado[campo.key] = campo.valor || ''; continue; }
    const prompt = `Você é um assistente especializado em prontuários psicológicos seguindo as diretrizes do CFP (Conselho Federal de Psicologia).

A psicóloga escreveu as seguintes anotações para o campo "${campo.label}" do prontuário${nome_paciente ? ` de ${nome_paciente}` : ''}:

---
${campo.valor}
---

Sua tarefa é ORGANIZAR essas anotações, seguindo rigorosamente estas regras:
1. PRESERVE todos os pontos e informações escritos pela psicóloga — nenhuma informação pode ser removida ou omitida
2. NÃO acrescente observações, interpretações ou informações que não estejam no texto original
3. Corrija apenas ortografia e gramática
4. Organize em tópicos objetivos quando houver mais de um ponto
5. Use linguagem técnica e objetiva (3ª pessoa: "O paciente relatou...", "Foram utilizadas...")
6. Mantenha a essência e o estilo clínico da psicóloga

Retorne SOMENTE o texto organizado, sem comentários, sem explicações, sem aspas.`;

    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error?.message || 'Erro na API');
      resultado[campo.key] = data.content?.[0]?.text || campo.valor;
    } catch(e) {
      console.error('organizar-prontuario:', e.message);
      resultado[campo.key] = campo.valor;
    }
  }

  res.json(resultado);
});

// ─── ANÁLISE CLÍNICA IA ──────────────────────────────────────
app.post('/api/analisar-prontuario', async (req, res) => {
  const { conteudo, humor, tecnicas, tarefas, nome_paciente } = req.body || {};
  const partes = [
    conteudo  && `Relato da sessão:\n${conteudo}`,
    humor     && `Humor / estado emocional: ${humor}`,
    tecnicas  && `Técnicas utilizadas: ${tecnicas}`,
    tarefas   && `Tarefas propostas: ${tarefas}`,
  ].filter(Boolean);

  if (!partes.length) return res.status(400).json({ error: 'Sem conteúdo para analisar' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'ANTHROPIC_API_KEY não configurada' });

  const prompt = `Você é um assistente de apoio clínico para psicólogos. Com base nas anotações da sessão${nome_paciente ? ` de ${nome_paciente}` : ''} abaixo, forneça uma análise clínica estruturada em três partes:

**1. Padrões Observados**
Identifique padrões emocionais, cognitivos ou comportamentais relevantes presentes na sessão.

**2. Sugestões Terapêuticas**
Sugira abordagens, técnicas ou intervenções baseadas em evidências adequadas ao contexto descrito (TCC, ACT, psicanálise, etc.).

**3. Pontos de Atenção**
Destaque aspectos importantes a monitorar ou aprofundar nas próximas sessões.

Use linguagem profissional e objetiva, adequada para registro clínico. Seja conciso (máximo 3 itens por seção).

---
${partes.join('\n\n')}`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.error?.message || 'Erro na API');
    res.json({ analise: data.content?.[0]?.text || '' });
  } catch(e) {
    console.error('analisar-prontuario:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── ESTRUTURAR DITADO ──────────────────────────────────────
app.post('/api/prontuarios/estruturar-ditado', async (req, res) => {
  const { transcricao, nome_paciente } = req.body || {};
  if (!transcricao?.trim()) return res.status(400).json({ error: 'Transcrição vazia' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'ANTHROPIC_API_KEY não configurada' });

  const prompt = `Você é um assistente especializado em registros de prontuário psicológico. O psicólogo fez o seguinte relato livre sobre a sessão${nome_paciente ? ` com ${nome_paciente}` : ''}:

---
${transcricao}
---

Com base nesse relato, estruture uma anotação de prontuário psicológico profissional, objetiva e técnica. Siga rigorosamente as diretrizes éticas do CFP (Conselho Federal de Psicologia) para registros em prontuário.

Retorne um JSON com exatamente estes campos (sem markdown, sem explicações, apenas o JSON):
{
  "conteudo": "Demandas e temas abordados na sessão; relatos e acontecimentos relevantes; intervenções realizadas pelo psicólogo; observações clínicas",
  "humor": "Estado emocional e humor observados no cliente",
  "tecnicas": "Técnicas e intervenções realizadas pelo psicólogo",
  "tarefas": "Encaminhamentos, combinados e tarefas propostas para a próxima sessão"
}

Diretrizes:
- Linguagem técnica, objetiva e em terceira pessoa ("O paciente relatou...", "Foram trabalhados...")
- Registrar apenas informações pertinentes ao acompanhamento psicológico
- Evitar interpretações não fundamentadas
- Preservar sigilo — não incluir nomes de terceiros mencionados
- Se o relato não mencionar algo para um campo, deixe a string vazia ""`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.error?.message || 'Erro na API');
    const texto = data.content?.[0]?.text || '{}';
    const jsonMatch = texto.match(/\{[\s\S]*\}/);
    const resultado = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    res.json({
      conteudo:  resultado.conteudo  || '',
      humor:     resultado.humor     || '',
      tecnicas:  resultado.tecnicas  || '',
      tarefas:   resultado.tarefas   || '',
    });
  } catch(e) {
    console.error('estruturar-ditado:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── TAREFAS ──────────────────────────────────────────────────
app.get('/api/tarefas', auth, (req, res) => {
  const hoje = new Date().toISOString().slice(0, 10);
  db.resetTarefasDiarias(hoje);
  res.json(db.getTarefas());
});
app.post('/api/tarefas', auth, (req, res) => {
  const { titulo, diaria } = req.body || {};
  if (!titulo?.trim()) return res.status(400).json({ error: 'Título obrigatório' });
  const id = db.createTarefa(titulo.trim(), diaria !== false);
  res.json({ id });
});
app.put('/api/tarefas/:id', auth, (req, res) => {
  db.updateTarefa(Number(req.params.id), req.body);
  res.json({ ok: true });
});
app.delete('/api/tarefas/:id', auth, (req, res) => {
  db.deleteTarefa(Number(req.params.id));
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   CONSULTÓRIO — Sistema de Gestão            ║');
  console.log('╚══════════════════════════════════════════════╝\n');
  console.log(`  Acesse: http://localhost:${PORT}\n`);
});
