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
      settings: { join_before_host: true, waiting_room: false }
    })
  });
  const meet = await meetRes.json();
  if (!meet.join_url) throw new Error('Zoom: ' + (meet.message || 'não foi possível criar reunião'));
  return meet.join_url;
}

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

    const conviteToken = db.createConvite(nome);
    const base = `${req.protocol}://${req.get('host')}`;
    res.json({ success: true, contratoLink: `${base}/contratos/?token=${conviteToken}` });
  } catch(e) { erro(res, e); }
});

// ── AGENDA PÚBLICA (cliente) ──────────────────────────────────
app.get('/api/agenda-publica', (req, res) => {
  const semana = req.query.semana || new Date().toISOString().slice(0, 10);
  const d = new Date(semana + 'T12:00:00');
  const dow = d.getDay() || 7;
  const seg = new Date(d); seg.setDate(d.getDate() - dow + 1);

  const dias = Array.from({ length: 6 }, (_, i) => {
    const x = new Date(seg); x.setDate(seg.getDate() + i);
    return x.toISOString().slice(0, 10);
  });

  const cfg = db.getConfig();
  const inicio  = cfg.horario_inicio  || '08:00';
  const fim     = cfg.horario_fim     || '18:00';
  const duracao = parseInt(cfg.duracao_sessao) || 50;

  const toMin   = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const fromMin = n => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

  const inicioMin = toMin(inicio);
  const fimMin    = toMin(fim);
  const todosSlots = [];
  for (let m = inicioMin; m + duracao <= fimMin; m += 60) todosSlots.push(fromMin(m));

  const existentes = db.getAgendamentos({ data_de: dias[0], data_ate: dias[dias.length - 1] })
    .filter(a => ['agendado', 'confirmado'].includes(a.status));

  const bloqueios = [
    [cfg.bloqueio_inicio  || '', cfg.bloqueio_fim  || ''],
    [cfg.bloqueio2_inicio || '', cfg.bloqueio2_fim || ''],
  ].filter(([i, f]) => i && f);

  const semana_data = dias.map(data => ({
    data,
    slots: todosSlots
      .filter(hora => {
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

    const todos = db.getPacientes();
    let pac = todos.find(p => p.nome.toLowerCase() === nome.toLowerCase());
    if (!pac) {
      const id = db.createPaciente({ nome, whatsapp: whatsapp || null });
      pac = { id, nome };
    }

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
