const express = require('express');
const path    = require('path');
const multer  = require('multer');
const db      = require('./src/db');

const upload = multer({
  dest: path.join(__dirname, 'public/uploads/contratos/'),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['application/pdf','image/jpeg','image/png','image/jpg'].includes(file.mimetype);
    cb(null, ok);
  }
});

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
app.get('/api/pacientes', (req, res) => res.json(db.getPacientes()));

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

app.post('/api/agendamentos', (req, res) => {
  try { res.json({ id: db.createAgendamento(req.body), success: true }); }
  catch(e) { erro(res, e); }
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
  try { res.json({ id: db.createProntuario(req.body), success: true }); }
  catch(e) { erro(res, e); }
});

app.put('/api/prontuarios/:id', (req, res) => {
  try { db.updateProntuario(req.params.id, req.body); res.json({ success: true }); }
  catch(e) { erro(res, e); }
});

app.delete('/api/prontuarios/:id', (req, res) => {
  try { db.deleteProntuario(req.params.id); res.json({ success: true }); }
  catch(e) { erro(res, e); }
});

// ── FINANCEIRO ───────────────────────────────────────────────
app.get('/api/financeiro', (req, res) => {
  const now = new Date();
  const ano = parseInt(req.query.ano || now.getFullYear());
  const mes = parseInt(req.query.mes || now.getMonth() + 1);
  res.json(db.getFinanceiro(ano, mes));
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

  // Remove horários dentro do intervalo bloqueado (ex: 11:00–14:00)
  const bIni = cfg.bloqueio_inicio || '';
  const bFim = cfg.bloqueio_fim    || '';
  const slotsFinais = (bIni && bFim)
    ? slots.filter(s => !(s.hora >= bIni && s.hora < bFim))
    : slots;

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

    const conviteToken = db.createConvite(nome);
    const base = `${req.protocol}://${req.get('host')}`;
    res.json({ success: true, contratoLink: `${base}/contratos/?token=${conviteToken}` });
  } catch(e) { erro(res, e); }
});

// ── CONVITES ─────────────────────────────────────────────────
app.get('/api/convites', (req, res) => res.json(db.getConvites()));

app.post('/api/convites', (req, res) => {
  try {
    const token = db.createConvite(req.body.nome_paciente);
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
      const { nome, data_nascimento, cpf, email, celular, endereco, nome_responsavel } = req.body;
      if (nome) {
        const dadosPaciente = {
          nome,
          data_nascimento: data_nascimento || null,
          cpf:             cpf            || null,
          email:           email          || null,
          whatsapp:        celular        || null,
          endereco:        endereco       || null,
          responsavel:     nome_responsavel || null,
        };
        const existente = cpf ? db.getPacienteByCpf(cpf) : null;
        if (existente) {
          db.updatePaciente(existente.id, { ...existente, ...dadosPaciente });
        } else {
          // Verifica por nome (caso paciente tenha sido criado ao gerar o link)
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

    // Marca o convite como usado se veio com token
    if (req.body.token) {
      try { db.usarConvite(req.body.token, id); } catch(e) {}
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

app.delete('/api/contratos/:id', (req, res) => {
  try { db.deleteContrato(req.params.id); res.json({ success: true }); }
  catch(e) { erro(res, e); }
});

// ── CONFIGURAÇÕES ────────────────────────────────────────────
app.get('/api/configuracoes', (req, res) => res.json(db.getConfig()));

app.post('/api/configuracoes', (req, res) => {
  try {
    Object.entries(req.body).forEach(([k, v]) => db.setConfig(k, v));
    res.json({ success: true });
  } catch(e) { erro(res, e); }
});

// ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   CONSULTÓRIO — Sistema de Gestão            ║');
  console.log('╚══════════════════════════════════════════════╝\n');
  console.log(`  Acesse: http://localhost:${PORT}\n`);
});
