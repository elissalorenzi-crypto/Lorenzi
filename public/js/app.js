// ============================================================
//  Consultório — Frontend
// ============================================================

const BRL = v => v == null ? '—' : new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v);
const HOJE = () => new Date().toISOString().slice(0, 10);

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

const STATUS_LABEL = {
  agendado: 'Agendado', confirmado: 'Confirmado',
  realizado: 'Realizado', cancelado: 'Cancelado', falta: 'Falta'
};
const TIPO_LABEL = {
  sessao: 'Sessão', avaliacao: 'Avaliação', retorno: 'Retorno', outro: 'Outro'
};

// ── AUTH ─────────────────────────────────────────────────────
function getToken()   { return localStorage.getItem('psi_token') || ''; }
function setToken(t)  { localStorage.setItem('psi_token', t); }
function clearToken() { localStorage.removeItem('psi_token'); }

function mostrarLogin() {
  document.getElementById('login-screen').style.display = 'flex';
  setTimeout(() => document.getElementById('login-senha')?.focus(), 100);
}
function ocultarLogin() {
  document.getElementById('login-screen').style.display = 'none';
}

async function doLogin() {
  const senha = document.getElementById('login-senha').value;
  const btn   = document.getElementById('btn-login');
  const erro  = document.getElementById('login-erro');
  if (!senha) return;
  btn.disabled = true; btn.textContent = 'Entrando…'; erro.style.display = 'none';
  try {
    const r = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha })
    });
    const d = await r.json();
    if (!r.ok) throw new Error();
    setToken(d.token);
    ocultarLogin();
    iniciarApp();
  } catch(_) { erro.style.display = 'block'; }
  btn.disabled = false; btn.textContent = 'Entrar';
}

async function fazerLogout() {
  try { await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + getToken() } }); } catch(_) {}
  clearToken();
  document.getElementById('login-senha').value = '';
  document.getElementById('login-erro').style.display = 'none';
  mostrarLogin();
}

// ── API ──────────────────────────────────────────────────────
async function api(method, path, body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch('/api' + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ocorreu um erro. Tente novamente.');
  return data;
}

// ── TOAST ────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const tc = document.getElementById('toast-container');
  const t  = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  tc.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ── MODAL ────────────────────────────────────────────────────
let _modalSaveFn = null;

function openModal(title, bodyHtml, saveFn, opts = {}) {
  const box = document.getElementById('modal-box');
  box.className = 'modal' + (opts.large ? ' modal-lg' : '');
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-save-btn').textContent = opts.saveLabel || 'Salvar';
  document.getElementById('modal-save-btn').style.display = saveFn ? '' : 'none';
  _modalSaveFn = saveFn;
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() {
  if (_ditadoAtivo) pararDitado();
  _salvarDitadoLocal();
  document.getElementById('modal-overlay').classList.remove('open');
  _modalSaveFn = null;
}

async function modalSave() {
  if (!_modalSaveFn) return;
  const result = await _modalSaveFn();
  if (result !== false) closeModal();
}

// fechar ao clicar no overlay
document.getElementById('modal-overlay').addEventListener('mousedown', e => {
  if (e.target === document.getElementById('modal-overlay')) e.currentTarget._pendingClose = true;
});
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay') && e.currentTarget._pendingClose) {
    if (!window.getSelection()?.toString()) closeModal();
  }
  e.currentTarget._pendingClose = false;
});

// ── NAVIGATION ───────────────────────────────────────────────
let _currentSection = 'dashboard';
let _config = {};

function navigate(name) {
  if (_ditadoAtivo) pararDitado();
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
  const sec = document.getElementById('section-' + name);
  if (!sec) return;
  sec.classList.add('active');
  document.querySelector(`[data-section="${name}"]`)?.classList.add('active');

  const titles = {
    dashboard: 'Dashboard', contratos: 'Contratos Assinados', agenda: 'Agenda',
    pacientes: 'Clientes', prontuarios: 'Prontuários', biblioteca: 'Biblioteca de Atividades',
    financeiro: 'Financeiro', configuracoes: 'Configurações',
    'agenda-cliente': 'Agenda Cliente'
  };
  document.getElementById('topbar-title').textContent = titles[name] || name;
  _currentSection = name;

  if (name === 'agenda-cliente') {
    const fr = document.getElementById('iframe-agenda-cliente');
    if (!fr.src || fr.src === window.location.href) fr.src = '/agenda-cliente/';
    return;
  }

  const loaders = {
    dashboard:    loadDashboard,
    contratos:    loadContratos,
    agenda:       loadAgenda,
    pacientes:    loadPacientes,
    prontuarios:  loadProntuariosPage,
    biblioteca:   bibRenderHome,
    relatorios:   loadRelatorios,
    financeiro:   loadFinanceiro,
    pagamentos:   loadPagamentos,
    tarefas:      loadTarefas,
    configuracoes:loadConfiguracoes,
    social:       loadSocial,
    nfse:         loadNfse
  };
  loaders[name]?.();
}

async function refreshAll() {
  const tasks = [
    loadDashboard(),
    loadPacientes(),
    loadFinanceiro(),
    fetchAgendaSemana(),
    loadContratos(),
  ];
  if (_currentSection === 'relatorios') tasks.push(loadRelatorios());
  await Promise.all(tasks);
}

document.querySelectorAll('.nav-link').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    navigate(a.dataset.section);
    if (window.innerWidth <= 768) toggleSidebar(false);
  });
});

function toggleSidebar(force) {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  const isOpen   = typeof force === 'boolean' ? force : !sidebar.classList.contains('open');
  sidebar.classList.toggle('open', isOpen);
  overlay.classList.toggle('open', isOpen);
}

// ── HELPERS ──────────────────────────────────────────────────
function fmtData(d) {
  if (!d) return '—';
  const [a, m, dia] = d.split('-');
  return `${dia}/${m}/${a}`;
}

function fmtNascimento(d) {
  if (!d) return '—';
  const [a, m, dia] = d.split('-');
  const idade = new Date().getFullYear() - parseInt(a);
  return `${dia}/${m}/${a} (${idade} anos)`;
}

function calcIdade(d) {
  if (!d) return '';
  const nasc = new Date(d);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  if (hoje.getMonth() < nasc.getMonth() || (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

function iniciais(nome) {
  return (nome || '').split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

function badgeStatus(s) {
  return `<span class="badge badge-${s}">${STATUS_LABEL[s] || s}</span>`;
}

// Retorna { s, total, faltam } calculando sessão progressiva pelas futuras agendadas
function calcSessao(a) {
  if (!a.paciente_total_sessoes || !a.paciente_sessao_atual) return null;
  const s = a.paciente_sessao_atual + (a.sessao_offset || 0);
  return { s, total: a.paciente_total_sessoes, faltam: Math.max(0, a.paciente_total_sessoes - s) };
}

function getSegundaFeira(ref) {
  const d = new Date(ref + 'T12:00:00');
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ============================================================
// ── DASHBOARD ────────────────────────────────────────────────
// ============================================================
async function loadDashboard() {
  const data = await api('GET', `/dashboard?hoje=${HOJE()}`);

  // Saudação
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const primeiroNome = (_config.nome_psicologa || 'Doutora').split(' ')[0];
  document.getElementById('dash-greeting').innerHTML = `
    <div style="display:flex;align-items:baseline;gap:10px">
      <h2 style="font-size:22px;font-weight:800;color:var(--plum)">${saudacao}, ${primeiroNome}</h2>
      <span style="font-size:14px;color:var(--muted)">${new Date().toLocaleDateString('pt-BR', {weekday:'long', day:'numeric', month:'long'})}</span>
    </div>
  `;

  // Stats
  document.getElementById('dash-stats').innerHTML = `
    <div class="stat-card rose stat-clickable" onclick="navigate('agenda')" title="Ver agenda">
      <span class="stat-icon">📅</span>
      <div class="stat-label">Sessões Hoje</div>
      <div class="stat-value">${data.agendaHoje.length}</div>
      <div class="stat-sub">${data.agendaHoje.filter(a=>a.status==='realizado').length} realizadas</div>
      <div class="stat-arrow">›</div>
    </div>
    <div class="stat-card lavender stat-clickable" onclick="navigate('agenda')" title="Ver agenda do mês">
      <span class="stat-icon">🗓</span>
      <div class="stat-label">Sessões no Mês</div>
      <div class="stat-value">${data.sessoesMes}</div>
      <div class="stat-sub">${MESES[new Date().getMonth()]}</div>
      <div class="stat-arrow">›</div>
    </div>
    <div class="stat-card sage stat-clickable" onclick="navigate('pacientes')" title="Ver clientes">
      <span class="stat-icon">👤</span>
      <div class="stat-label">Clientes Ativos</div>
      <div class="stat-value">${data.totalPacientes}</div>
      <div class="stat-sub">em atendimento</div>
      <div class="stat-arrow">›</div>
    </div>
    <div class="stat-card peach stat-clickable" onclick="navigate('financeiro')" title="Ver financeiro">
      <span class="stat-icon">💰</span>
      <div class="stat-label">Recebido no Mês</div>
      <div class="stat-value" style="font-size:18px">${BRL(data.recebidoMes)}</div>
      <div class="stat-sub">${BRL(data.pendenteMes)} pendente</div>
      <div class="stat-arrow">›</div>
    </div>
  `;

  // Agenda hoje
  const hojeEl = document.getElementById('dash-hoje');
  if (!data.agendaHoje.length) {
    hojeEl.innerHTML = '<div class="empty-state" style="padding:24px 0"><span class="empty-icon" style="font-size:32px">☀️</span><p>Nenhuma sessão hoje</p></div>';
  } else {
    hojeEl.innerHTML = data.agendaHoje.map(a => `
      <div class="timeline-item">
        <div class="timeline-hora">${a.hora}</div>
        <div class="timeline-dot ${a.status}"></div>
        <div class="timeline-info">
          <div class="timeline-nome">${a.paciente_nome || 'Sem cliente'}</div>
          <div class="timeline-sub">${TIPO_LABEL[a.tipo]||a.tipo} · ${badgeStatus(a.status)} · ${BRL(a.valor)}</div>
        </div>
        <button class="btn btn-ghost btn-xs" onclick="editAgendamento(${a.id})">✏️</button>
      </div>
    `).join('');
  }

  // Próximas sessões
  const proxEl = document.getElementById('dash-proximas');
  if (!data.proximosDias.length) {
    proxEl.innerHTML = '<div class="empty-state" style="padding:24px 0"><span class="empty-icon" style="font-size:32px">📭</span><p>Nenhuma sessão agendada</p></div>';
  } else {
    proxEl.innerHTML = data.proximosDias.map(a => `
      <div class="timeline-item">
        <div class="timeline-hora" style="color:var(--lavender);width:80px;font-size:12px">${fmtData(a.data)}<br>${a.hora}</div>
        <div class="timeline-dot ${a.status}"></div>
        <div class="timeline-info">
          <div class="timeline-nome">${a.paciente_nome || 'Sem cliente'}</div>
          <div class="timeline-sub">${TIPO_LABEL[a.tipo]||a.tipo} · ${badgeStatus(a.status)}</div>
        </div>
      </div>
    `).join('');
  }

  // Gráfico
  const chartEl = document.getElementById('dash-chart');
  if (!data.sessoesGraph.length) {
    chartEl.innerHTML = '<p class="text-muted" style="text-align:center;padding:20px">Sem dados</p>';
  } else {
    const maxVal = Math.max(...data.sessoesGraph.map(r => r.faturamento), 1);
    chartEl.innerHTML = data.sessoesGraph.map(r => {
      const [a, m] = r.mes.split('-');
      const pct = Math.round((r.faturamento / maxVal) * 100);
      return `
        <div class="fin-bar-row">
          <div class="fin-bar-label">${MESES[parseInt(m)-1].slice(0,3)}</div>
          <div class="fin-bar-track"><div class="fin-bar-fill" style="width:${pct}%"></div></div>
          <div class="fin-bar-val">${BRL(r.faturamento)}</div>
        </div>
      `;
    }).join('');
  }

  // Pop-up aniversariantes de HOJE
  if (data.aniversariantesHoje && data.aniversariantesHoje.length) {
    const bdayHoje = data.aniversariantesHoje;
    const nomes = bdayHoje.map(p => p.apelido || p.nome.split(' ')[0]).join(', ');
    const plural = bdayHoje.length > 1;
    const waLinks = bdayHoje
      .filter(p => p.whatsapp)
      .map(p => {
        const primeiroNome = p.apelido || p.nome.split(' ')[0];
        const msg = encodeURIComponent(`Olá, ${primeiroNome}! 🎉 Desejo a você um feliz aniversário! Que este novo ano traga muitas alegrias e conquistas. 🎂`);
        return `<a href="https://wa.me/${toWaNum(p.whatsapp)}?text=${msg}" target="_blank" class="btn btn-sage" style="gap:6px;width:100%;justify-content:center">💬 Enviar parabéns para ${primeiroNome}</a>`;
      }).join('');
    const popup = document.createElement('div');
    popup.id = 'bday-popup-overlay';
    popup.style.cssText = 'position:fixed;inset:0;background:rgba(74,55,40,.45);z-index:3000;display:flex;align-items:center;justify-content:center';
    popup.innerHTML = `
      <div style="background:#fff;border-radius:20px;padding:36px 32px;max-width:380px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(74,55,40,.35);position:relative">
        <div style="font-size:52px;margin-bottom:8px">🎂</div>
        <h3 style="font-size:20px;font-weight:800;color:var(--plum);margin:0 0 6px">Aniversário${plural?'s':''} hoje!</h3>
        <p style="font-size:15px;color:var(--rose);font-weight:700;margin:0 0 18px">${nomes}</p>
        <p style="font-size:13px;color:var(--muted);margin:0 0 22px">${plural ? 'Seus clientes fazem' : 'Seu cliente faz'} aniversário hoje! 🎉</p>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${waLinks}
          <button onclick="document.getElementById('bday-popup-overlay').remove()" class="btn btn-outline" style="width:100%;justify-content:center">Fechar</button>
        </div>
      </div>
    `;
    document.body.appendChild(popup);
  }

  // Aniversariantes
  const bdayEl = document.getElementById('dash-bday');
  if (!data.aniversariantes.length) {
    bdayEl.innerHTML = '<div class="empty-state" style="padding:20px 0"><span class="empty-icon" style="font-size:28px">🎂</span><p>Nenhum aniversariante este mês</p></div>';
  } else {
    bdayEl.innerHTML = data.aniversariantes.map(p => {
      const [, , dia] = (p.data_nascimento || '').split('-');
      return `
        <div class="bday-item">
          <span class="bday-icon">🎂</span>
          <div>
            <div class="bday-nome">${p.nome}</div>
            <div class="bday-dia">Dia ${parseInt(dia)} — ${calcIdade(p.data_nascimento)} anos</div>
          </div>
          ${p.whatsapp ? `<a href="https://wa.me/${toWaNum(p.whatsapp)}" target="_blank" class="btn btn-sage btn-xs" style="margin-left:auto">💬</a>` : ''}
        </div>
      `;
    }).join('');
  }
}

// ============================================================
// ── AGENDA ───────────────────────────────────────────────────
// ============================================================
function _domingoSemana(dataStr) {
  const d = new Date(dataStr + 'T12:00:00');
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}
let _agendaSemana = _domingoSemana(HOJE());
let _agendaData   = [];

async function loadAgenda() {
  await fetchAgendaSemana();
}

async function fetchAgendaSemana() {
  const de  = _agendaSemana;
  const ate = addDays(_agendaSemana, 6);
  _agendaData = await api('GET', `/agendamentos?data_de=${de}&data_ate=${ate}`);
  renderAgendaGrid();
  renderAgendaLista();
  renderAgendaHorario();
}

function agendaNavSemana(delta) {
  _agendaSemana = addDays(_agendaSemana, delta * 7);
  fetchAgendaSemana();
}

function agendaIrHoje() {
  _agendaSemana = _domingoSemana(HOJE());
  fetchAgendaSemana();
}


function renderAgendaGrid() {
  const label = document.getElementById('agenda-week-label');
  const grid  = document.getElementById('agenda-week-grid');
  const hoje  = HOJE();

  const fim = addDays(_agendaSemana, 6);
  const [, mI, dI] = _agendaSemana.split('-');
  const [, mF, dF] = fim.split('-');
  const hojeNaSemana = HOJE() >= _agendaSemana && HOJE() <= fim;
  const intervalo = mI === mF
    ? `${parseInt(dI)} – ${parseInt(dF)} de ${MESES[parseInt(mI)-1]}`
    : `${parseInt(dI)} ${MESES[parseInt(mI)-1].slice(0,3)} – ${parseInt(dF)} ${MESES[parseInt(mF)-1].slice(0,3)}`;
  label.textContent = hojeNaSemana ? `Semana atual · ${intervalo}` : intervalo;

  const dias = Array.from({length:7}, (_, i) => addDays(_agendaSemana, i));

  grid.innerHTML = dias.map(dia => {
    const [, , d] = dia.split('-');
    const dow = new Date(dia + 'T12:00:00').getDay();
    const isHoje = dia === hoje;
    const appts = _agendaData.filter(a => a.data === dia);

    return `
      <div class="day-col ${isHoje ? 'today' : ''}">
        <div class="day-header">
          <div class="day-name">${DIAS_SEMANA[dow]}</div>
          <div class="day-num">${parseInt(d)}</div>
        </div>
        <div class="day-slots">
          ${appts.length
            ? appts.map(a => `
                <div class="appt-chip ${a.status}" title="${a.paciente_nome||''}">
                  <div onclick="editAgendamento(${a.id})" style="cursor:pointer">
                    <div class="appt-hora">${a.hora}</div>
                    <div class="appt-nome">${a.paciente_nome || 'Sem cliente'}</div>
                    <div class="appt-tipo">${TIPO_LABEL[a.tipo]||a.tipo}</div>
                    ${(() => { const si = calcSessao(a); return si ? `<div class="appt-sessao">S${si.s}/${si.total} · faltam ${si.faltam}</div>` : ''; })()}
                  </div>
                  <div class="appt-actions">
                    <button class="appt-btn appt-btn-ok"   onclick="marcarRealizado(${a.id})"       title="Finalizar">✓</button>
                    <button class="appt-btn appt-btn-edit"  onclick="editAgendamento(${a.id})"      title="Alterar">✏</button>
                    <button class="appt-btn appt-btn-del"   onclick="deleteAgendamentoItem(${a.id})" title="Excluir">✕</button>
                    ${a.zoom_link
                      ? `<div class="zoom-menu-wrap">
                           <button class="appt-btn appt-btn-zoom appt-btn-zoom-ok" onclick="toggleZoomMenu(event,${a.id})" title="Zoom">🎥</button>
                           <div class="zoom-menu" id="zmenu-${a.id}">
                             <button onclick="copiarZoom('${a.zoom_link}')">📋 Copiar link</button>
                             <a href="${a.zoom_link}" target="_blank" onclick="fecharZoomMenus()">🚀 Abrir sessão</a>
                             <a href="${a.paciente_whatsapp ? zoomWaUrl(a.paciente_nome, a.zoom_link, a.paciente_whatsapp, a.data, a.hora, a.paciente_apelido) : zoomWaUrlSemFone(a.paciente_nome, a.zoom_link, a.data, a.hora, a.paciente_apelido)}" target="_blank" onclick="fecharZoomMenus()" style="color:#25d366">💬 Enviar no WhatsApp${a.paciente_whatsapp ? ` <span style="font-size:10px;opacity:.7">${exibirFone(a.paciente_whatsapp)}</span>` : ''}</a>
                           </div>
                         </div>`
                      : `<button class="appt-btn appt-btn-zoom" onclick="gerarZoom(${a.id})" title="Gerar link Zoom">📹</button>`
                    }
                  </div>
                </div>
              `).join('')
            : `<div class="empty-day">livre</div>`
          }
          <div style="text-align:center;margin-top:4px">
            <button class="btn btn-ghost btn-xs" style="font-size:16px;line-height:1" onclick="openModalAgendamento(null,'${dia}')">+</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function _renderAgendaRow(a) { return `
    <tr>
      <td>${fmtData(a.data)}</td>
      <td><strong>${a.hora}</strong></td>
      <td>${a.paciente_nome || '<span class="text-muted">—</span>'}${(() => { const si = calcSessao(a); return si ? ` <span class="hor-sessao" style="vertical-align:middle">S${si.s}/${si.total}</span>` : ''; })()}</td>
      <td>${TIPO_LABEL[a.tipo]||a.tipo}</td>
      <td>${badgeStatus(a.status)}</td>
      <td class="text-right fw-bold">${BRL(a.valor)}</td>
      <td>${a.pago ? '<span style="color:var(--sage);font-size:16px" title="Pago">✓</span>' : (a.status === 'realizado' ? `<button class="btn btn-xs" style="background:#e8f5e9;color:#388e3c;border:1.5px solid #388e3c;font-weight:700;padding:2px 8px" onclick="pagarRapido(${a.id})" title="Registrar recebimento">✓ Pago</button>` : '<span style="color:var(--peach);font-size:16px">○</span>')}</td>
      <td>
        <div class="inline-actions">
          <button class="btn btn-xs" style="background:var(--sage-pale);color:var(--sage);border:1.5px solid var(--sage);font-weight:700" onclick="marcarRealizado(${a.id})" title="Finalizar">✓</button>
          <button class="btn btn-outline btn-xs" onclick="editAgendamento(${a.id})" title="Alterar">✏️</button>
          <button class="btn btn-ghost btn-xs" style="color:var(--red)" onclick="deleteAgendamentoItem(${a.id})" title="Excluir">🗑</button>
          ${a.zoom_link
            ? `<div class="zoom-menu-wrap">
                 <button class="btn btn-xs appt-btn-zoom-ok" style="background:#1a6ff4;color:#fff;border-color:#1a6ff4" onclick="toggleZoomMenu(event,${a.id})" title="Zoom">🎥 Zoom</button>
                 <div class="zoom-menu" id="zmenu-${a.id}">
                   <button onclick="copiarZoom('${a.zoom_link}')">📋 Copiar link</button>
                   <a href="${a.zoom_link}" target="_blank" onclick="fecharZoomMenus()">🚀 Abrir sessão</a>
                   <a href="${a.paciente_whatsapp ? zoomWaUrl(a.paciente_nome, a.zoom_link, a.paciente_whatsapp, a.data, a.hora, a.paciente_apelido) : zoomWaUrlSemFone(a.paciente_nome, a.zoom_link, a.data, a.hora, a.paciente_apelido)}" target="_blank" onclick="fecharZoomMenus()" style="color:#25d366">💬 Enviar no WhatsApp${a.paciente_whatsapp ? ` <span style="font-size:10px;opacity:.7">${exibirFone(a.paciente_whatsapp)}</span>` : ''}</a>
                 </div>
               </div>`
            : `<button class="btn btn-outline btn-xs" style="color:#1a6ff4;border-color:#1a6ff4" onclick="gerarZoom(${a.id})" title="Gerar link Zoom">📹</button>`
          }
        </div>
      </td>
    </tr>
  `; }

function renderAgendaLista() {
  const filtro = document.getElementById('agenda-status-filter')?.value || '';
  const lista  = _agendaData.filter(a => !filtro || a.status === filtro);
  if (!lista.length) {
    document.getElementById('agenda-tbody').innerHTML = `<tr><td colspan="8"><div class="empty-state"><span class="empty-icon">📅</span><p>Nenhuma sessão nesta semana</p></div></td></tr>`;
    _sortState['agenda-tbody'] = null;
    return;
  }
  _sortInit('agenda-tbody', lista, _renderAgendaRow, 'data');
}

function renderAgendaHorario() {
  const table = document.getElementById('agenda-hor-table');
  if (!table) return;

  const DIAS_S = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const hoje   = HOJE();
  const dias   = Array.from({ length: 7 }, (_, i) => addDays(_agendaSemana, i));

  // Indexa por "data|hora" → array (suporta múltiplos no mesmo horário)
  const idx = {};
  for (const a of _agendaData) {
    const k = `${a.data}|${a.hora}`;
    if (!idx[k]) idx[k] = [];
    idx[k].push(a);
  }

  // Slots base: 08:00–11:00 a cada 30 min; 14:00–21:00 somente horas cheias
  const toMin  = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
  const toStr  = n => `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
  const baseSet = new Set();
  for (let m = 480; m <= 660; m += 30) baseSet.add(toStr(m));   // 08:00–11:00
  for (let m = 840; m <= 1260; m += 60) baseSet.add(toStr(m));  // 14:00–21:00

  // Adiciona horários reais que estejam fora do range base
  for (const a of _agendaData) baseSet.add(a.hora);

  // Ordena todos os slots
  const allSlots = [...baseSet].sort();

  // Monta a lista com flag isHour e separador de almoço
  const slots = allSlots.map(t => ({
    t,
    isHour: t.endsWith(':00'),
    isBase: baseSet.has(t)
  }));

  // Cabeçalho
  const headers = dias.map(d => {
    const dt  = new Date(d + 'T12:00:00');
    const dom = dt.getDay() === 0;
    const cls = [d === hoje ? 'hoje' : '', dom ? 'dom' : ''].filter(Boolean).join(' ');
    const label = dom
      ? `Dom`
      : `${DIAS_S[dt.getDay()]} <span style="font-weight:500;opacity:.75">${dt.getDate()}/${String(dt.getMonth()+1).padStart(2,'0')}</span>`;
    return `<th class="${cls}">${label}</th>`;
  }).join('');

  let html = `<thead><tr><th class="hora-th">Hora</th>${headers}</tr></thead><tbody>`;

  let almocoDone = false;
  for (const { t, isHour } of slots) {
    const min = toMin(t);

    // Separador + barra de dias antes de 14:00
    if (!almocoDone && min >= 840) {
      almocoDone = true;
      html += `<tr class="hor-break"><td colspan="${dias.length + 1}">— Intervalo —</td></tr>`;
      const diaHeaders = dias.map(d => {
        const dt  = new Date(d + 'T12:00:00');
        const dom = dt.getDay() === 0;
        const hj  = d === hoje;
        const cls = [hj ? 'hoje' : '', dom ? 'dom' : ''].filter(Boolean).join(' ');
        const label = dom ? 'Dom'
          : `${DIAS_S[dt.getDay()]} <span style="font-weight:500;opacity:.75">${dt.getDate()}/${String(dt.getMonth()+1).padStart(2,'0')}</span>`;
        return `<th class="${cls}">${label}</th>`;
      }).join('');
      html += `<tr class="hor-dias-sub"><th class="hora-th"></th>${diaHeaders}</tr>`;
    }

    const cells = dias.map(d => {
      const dom   = new Date(d + 'T12:00:00').getDay() === 0;
      const domCl = dom ? ' dom' : '';
      const lista = idx[`${d}|${t}`] || [];
      if (!lista.length) {
        return `<td class="hor-cell${domCl}" onclick="openModalAgendamento(null,'${d}',null,'${t}')"><span class="hor-add">+</span></td>`;
      }
      const a  = lista[0]; // exibe apenas o primeiro quando há múltiplos
      const sc = a.status || 'agendado';
      const duplo = lista.length > 1
        ? `<span title="${lista.length} agendamentos" style="font-size:10px;color:var(--red);font-weight:700;margin-left:2px">×${lista.length}</span>`
        : '';
      const zoomBtn = a.zoom_link
        ? `<div class="zoom-menu-wrap">
             <button class="appt-btn appt-btn-zoom appt-btn-zoom-ok" onclick="toggleZoomMenu(event,${a.id})" title="Zoom">🎥</button>
             <div class="zoom-menu" id="zmenu-${a.id}">
               <button onclick="copiarZoom('${a.zoom_link}')">📋 Copiar link</button>
               <a href="${a.zoom_link}" target="_blank" onclick="fecharZoomMenus()">🚀 Abrir sessão</a>
               <a href="${a.paciente_whatsapp ? zoomWaUrl(a.paciente_nome,a.zoom_link,a.paciente_whatsapp,a.data,a.hora,a.paciente_apelido) : zoomWaUrlSemFone(a.paciente_nome, a.zoom_link, a.data, a.hora, a.paciente_apelido)}" target="_blank" onclick="fecharZoomMenus()" style="color:#25d366">💬 WhatsApp${a.paciente_whatsapp ? ` <span style="font-size:10px;opacity:.7">${exibirFone(a.paciente_whatsapp)}</span>` : ''}</a>
             </div>
           </div>`
        : `<button class="appt-btn appt-btn-zoom" onclick="gerarZoom(${a.id})" title="Zoom">📹</button>`;
      const _si = calcSessao(a);
      const sessaoTag = _si ? `<span class="hor-sessao">S${_si.s}/${_si.total}</span>` : '';
      const bloco = `<div class="hor-appt ${sc}">
        <span class="hor-nome">${a.paciente_nome || '—'}${duplo}</span>${sessaoTag}
        <div class="hor-actions">
          ${zoomBtn}
          <button class="appt-btn appt-btn-ok"  onclick="marcarRealizado(${a.id})"       title="Finalizar">✓</button>
          <button class="appt-btn appt-btn-edit" onclick="editAgendamento(${a.id})"       title="Alterar">✏</button>
          <button class="appt-btn appt-btn-del"  onclick="deleteAgendamentoItem(${a.id})" title="Excluir">✕</button>
        </div>
      </div>`;
      return `<td class="hor-cell has-appt${domCl}">${bloco}</td>`;
    }).join('');

    html += `<tr class="${isHour ? 'hor-row-h' : 'hor-row-m'}"><td class="hor-hora">${t}</td>${cells}</tr>`;
  }

  html += '</tbody>';
  table.innerHTML = html;
}

// ── Modal Agendamento ─────────────────────────────────────────
let _pacientesCache = [];

async function openModalAgendamento(ag = null, dataPreset = null, pacienteIdPreset = null, horaPreset = null) {
  _pacientesCache = await api('GET', '/pacientes');
  const cfg = _config;
  const isEdit = !!ag?.id;
  const defaultDate = dataPreset || HOJE();
  const defaultDur  = cfg.duracao_sessao || 50;

  const pacIdSel = ag?.paciente_id || pacienteIdPreset || null;
  const presetPac = pacIdSel ? _pacientesCache.find(p => p.id == pacIdSel) : null;
  const defaultValor = ag?.valor ?? presetPac?.valor_sessao ?? cfg.valor_sessao_padrao ?? 180;

  const pacOptions = _pacientesCache.map(p =>
    `<option value="${p.id}" ${pacIdSel == p.id ? 'selected' : ''}>${p.nome}</option>`
  ).join('');

  const html = `
    <div class="form-grid">
      <div class="form-group full">
        <label>Cliente</label>
        <select id="ag-paciente" onchange="autoPreencherAgendamento()">
          <option value="">Sem cliente (bloquear horário)</option>
          ${pacOptions}
        </select>
      </div>
      <div class="form-group">
        <label>Data</label>
        <input type="date" id="ag-data" value="${ag?.data || defaultDate}">
      </div>
      <div class="form-group">
        <label>Hora</label>
        <input type="time" id="ag-hora" value="${ag?.hora || horaPreset || '09:00'}">
      </div>
      <div class="form-group">
        <label>Duração (min)</label>
        <input type="number" id="ag-duracao" value="${ag?.duracao || defaultDur}" min="20" max="180" step="5">
      </div>
      <div class="form-group">
        <label>Tipo</label>
        <select id="ag-tipo">
          <option value="sessao"    ${(ag?.tipo||'sessao')==='sessao'?'selected':''}>Sessão</option>
          <option value="avaliacao" ${ag?.tipo==='avaliacao'?'selected':''}>Avaliação</option>
          <option value="retorno"   ${ag?.tipo==='retorno'?'selected':''}>Retorno</option>
          <option value="outro"     ${ag?.tipo==='outro'?'selected':''}>Outro</option>
        </select>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="ag-status">
          <option value="agendado"   ${(ag?.status||'agendado')==='agendado'?'selected':''}>Agendado</option>
          <option value="confirmado" ${ag?.status==='confirmado'?'selected':''}>Confirmado</option>
          <option value="realizado"  ${ag?.status==='realizado'?'selected':''}>Realizado</option>
          <option value="cancelado"  ${ag?.status==='cancelado'?'selected':''}>Cancelado</option>
          <option value="falta"      ${ag?.status==='falta'?'selected':''}>Falta</option>
        </select>
      </div>
      <div class="form-group">
        <label>Valor (R$)</label>
        <input type="number" id="ag-valor" value="${ag?.valor ?? defaultValor}" min="0" step="10">
      </div>
      <div class="form-group" style="align-self:end">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" id="ag-pago" ${ag?.pago ? 'checked' : ''}> Pagamento recebido
        </label>
      </div>
      <div class="form-group">
        <label>Forma de Pagamento</label>
        <select id="ag-forma">
          <option value="">—</option>
          <option value="dinheiro"  ${ag?.forma_pgto==='dinheiro'?'selected':''}>Dinheiro</option>
          <option value="pix"       ${ag?.forma_pgto==='pix'?'selected':''}>PIX</option>
          <option value="credito"   ${ag?.forma_pgto==='credito'?'selected':''}>Cartão de Crédito</option>
          <option value="debito"    ${ag?.forma_pgto==='debito'?'selected':''}>Cartão de Débito</option>
          <option value="convenio"  ${ag?.forma_pgto==='convenio'?'selected':''}>Convênio</option>
          <option value="transferencia" ${ag?.forma_pgto==='transferencia'?'selected':''}>Transferência</option>
        </select>
      </div>
      <div class="form-group">
        <label>Modalidade <span style="font-size:11px;color:var(--muted)">(CFP Res. 004/2020)</span></label>
        <select id="ag-modalidade" onchange="toggleConsentTeleconsulta()">
          <option value="presencial" ${(ag?.modalidade||'presencial')==='presencial'?'selected':''}>Presencial</option>
          <option value="online"     ${ag?.modalidade==='online'?'selected':''}>Online (Teleconsulta)</option>
          <option value="hibrido"    ${ag?.modalidade==='hibrido'?'selected':''}>Híbrido</option>
        </select>
      </div>
      <div class="form-group" id="ag-consent-box" style="${ag?.modalidade==='online'?'':'display:none'}">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" id="ag-consent-tele" ${ag?.consentimento_teleconsulta ? 'checked' : ''}> Paciente consentiu com atendimento online
        </label>
      </div>
      <div class="form-group full">
        <label>Observações</label>
        <textarea id="ag-obs" rows="2">${ag?.obs || ''}</textarea>
      </div>
    </div>
  `;

  openModal(isEdit ? 'Editar Agendamento' : 'Nova Sessão', html, async () => {
    const modalidade = document.getElementById('ag-modalidade')?.value || 'presencial';
    const body = {
      paciente_id:              document.getElementById('ag-paciente').value || null,
      data:                     document.getElementById('ag-data').value,
      hora:                     document.getElementById('ag-hora').value,
      duracao:                  parseInt(document.getElementById('ag-duracao').value),
      tipo:                     document.getElementById('ag-tipo').value,
      status:                   document.getElementById('ag-status').value,
      valor:                    parseFloat(document.getElementById('ag-valor').value) || 0,
      pago:                     document.getElementById('ag-pago').checked ? 1 : 0,
      forma_pgto:               document.getElementById('ag-forma').value || null,
      obs:                      document.getElementById('ag-obs').value.trim(),
      modalidade,
      consentimento_teleconsulta: modalidade === 'online' && document.getElementById('ag-consent-tele')?.checked ? 1 : 0
    };
    if (!body.data || !body.hora) return toast('Data e hora são obrigatórios', 'error') || false;
    try {
      const savedPacId = body.paciente_id;
      const dv = document.getElementById('pacientes-detail-view');
      const detailWasOpen = dv && dv.style.display !== 'none';
      if (isEdit) { await api('PUT', `/agendamentos/${ag.id}`, body); toast('Agendamento atualizado!'); }
      else {
        await api('POST', '/agendamentos', body);
        toast('Sessão agendada!');
        if (body.paciente_id) {
          try {
            const diasPorFreq = { '2x-mes': 14, '1x-mes': 30 };
            const p = await api('GET', `/pacientes/${body.paciente_id}`);
            const dias = diasPorFreq[p.frequencia];
            if (dias) {
              const proxData = new Date(body.data + 'T12:00:00');
              proxData.setDate(proxData.getDate() + dias);
              const proxDataStr = proxData.toISOString().slice(0, 10);
              const todas = await api('GET', `/pacientes/${body.paciente_id}/agendamentos`);
              const jaExiste = todas.some(a => a.data === proxDataStr && a.hora === body.hora);
              if (!jaExiste) {
                await api('POST', '/agendamentos', {
                  paciente_id: body.paciente_id, data: proxDataStr, hora: body.hora,
                  duracao: body.duracao, tipo: body.tipo, status: 'agendado',
                  valor: body.valor, pago: 0,
                });
                const dd = String(proxData.getDate()).padStart(2,'0');
                const mm = String(proxData.getMonth()+1).padStart(2,'0');
                toast(`📅 Próxima sessão agendada para ${dd}/${mm}`);
              }
            }
          } catch(_) {}
        }
      }
      closeModal();
      await refreshAll();
      if (detailWasOpen && savedPacId) {
        await verDetalhePaciente(savedPacId);
        document.getElementById('pac-historico-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch(e) { toast(e.message, 'error'); }
  });
}

function toggleConsentTeleconsulta() {
  const box = document.getElementById('ag-consent-box');
  if (box) box.style.display = document.getElementById('ag-modalidade')?.value === 'online' ? '' : 'none';
}

function autoPreencherAgendamento() {
  const pacId = document.getElementById('ag-paciente')?.value;
  const pac   = pacId ? _pacientesCache.find(p => p.id == pacId) : null;
  if (pac?.valor_sessao) document.getElementById('ag-valor').value = pac.valor_sessao;
}

async function editAgendamento(id) {
  const ag = await api('GET', `/agendamentos/${id}`);
  openModalAgendamento(ag);
}

function fecharZoomMenus() {
  document.querySelectorAll('.zoom-menu.open').forEach(m => m.classList.remove('open'));
}

function toggleZoomMenu(e, id) {
  e.stopPropagation();
  const menu = document.getElementById('zmenu-' + id);
  const isOpen = menu.classList.contains('open');
  fecharZoomMenus();
  if (!isOpen) {
    const rect = e.currentTarget.getBoundingClientRect();
    const menuW = 180;
    let left = rect.right - menuW;
    if (left < 4) left = rect.left;
    let top = rect.bottom + 4;
    if (top + 100 > window.innerHeight) top = rect.top - 110;
    menu.style.top  = top + 'px';
    menu.style.left = left + 'px';
    menu.classList.add('open');
  }
}

function copiarZoom(link) {
  navigator.clipboard.writeText(link).then(() => toast('Link copiado! 📋'));
  fecharZoomMenus();
}

// Remove código de país e formata como (DDD) NNNNN-NNNN para armazenamento
async function buscarCep(valor) {
  const cep = valor.replace(/\D/g, '');
  if (cep.length !== 8) return;
  const cepEl = document.getElementById('fp-nf-cep');
  if (cepEl) cepEl.style.borderColor = 'var(--border)';
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const d = await r.json();
    if (d.erro) { if (cepEl) cepEl.style.borderColor = 'var(--red)'; return; }
    const set = (id, v) => { const el = document.getElementById(id); if (el && v) el.value = v; };
    set('fp-nf-logradouro', d.logradouro);
    set('fp-nf-bairro',     d.bairro);
    set('fp-nf-cidade',     d.localidade);
    set('fp-nf-uf',         d.uf);
    if (cepEl) cepEl.style.borderColor = 'var(--sage)';
    // Formata CEP
    if (cepEl) cepEl.value = cep.replace(/(\d{5})(\d{3})/, '$1-$2');
  } catch(e) {
    if (cepEl) cepEl.style.borderColor = 'var(--red)';
  }
}

function normalizarFone(fone) {
  if (!fone) return '';
  let d = fone.replace(/\D/g, '');
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2);
  if (d.length === 10) d = d.slice(0, 2) + '9' + d.slice(2);
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  return fone; // retorna original se não reconhecido
}

// Constrói número internacional para wa.me a partir de qualquer formato armazenado
function toWaNum(fone) {
  let d = (fone || '').replace(/\D/g, '');
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2); // remove código país duplicado
  if (d.startsWith('0')) d = d.slice(1);                    // remove zero discagem antiga
  if (d.length === 10) d = d.slice(0, 2) + '9' + d.slice(2); // adiciona 9 em celular antigo
  return '55' + d;
}

// Formata número para exibição: +55 (11) 99999-9999
function exibirFone(fone) {
  const d = toWaNum(fone).slice(2); // remove o 55
  if (d.length === 11) return `+55 (${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `+55 (${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return '+55 ' + d;
}

function _zoomWaMsg(nome, link, data, hora, apelido) {
  const primeiroNome = (apelido || '').trim() || (nome || '').split(' ')[0];
  const DIAS  = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
  const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  let dataFmt = '';
  if (data) {
    const d = new Date(data + 'T12:00:00');
    dataFmt = `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
  }
  const horaFmt = hora ? ` às ${hora}` : '';
  return `Oi, ${primeiroNome}! Passo para lembrá-lo(a) da nossa sessão ${dataFmt}${horaFmt}. Segue o link para acesso:\n${link}`;
}

function zoomWaUrl(nome, link, fone, data, hora, apelido) {
  return `https://wa.me/${toWaNum(fone)}?text=${encodeURIComponent(_zoomWaMsg(nome, link, data, hora, apelido))}`;
}

function zoomWaUrlSemFone(nome, link, data, hora, apelido) {
  return `https://wa.me/?text=${encodeURIComponent(_zoomWaMsg(nome, link, data, hora, apelido))}`;
}

document.addEventListener('click', fecharZoomMenus);

async function gerarZoom(id) {
  const btn = event?.target;
  if (btn) { btn.textContent = '⏳'; btn.disabled = true; }
  try {
    const r = await api('POST', `/agendamentos/${id}/zoom`);
    toast('Link Zoom gerado! 🎥');
    fetchAgendaSemana();
  } catch(e) {
    toast(e.message, 'error');
    if (btn) { btn.textContent = '📹'; btn.disabled = false; }
  }
}

async function deleteAgendamentoItem(id) {
  if (!confirm('Remover este agendamento?')) return;
  await api('DELETE', `/agendamentos/${id}`);
  toast('Agendamento removido');
  refreshAll();
}

async function marcarRealizado(id) {
  const ag = await api('GET', `/agendamentos/${id}`);
  if (!ag?.id) return;
  if (ag.status === 'realizado') { toast('Sessão já finalizada', 'info'); return; }
  await api('PUT', `/agendamentos/${id}`, { ...ag, status: 'realizado' });
  toast('Sessão finalizada ✓');
  refreshAll();
}

async function openModalGerenciarAgenda() {
  const hoje = HOJE();
  const ate  = addDays(hoje, 28);
  let sessoes = await api('GET', `/agendamentos?data_de=${hoje}&data_ate=${ate}`);
  sessoes = sessoes
    .filter(a => a.status !== 'cancelado')
    .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));

  const linhas = () => sessoes.map((a, i) => `
    <tr id="ger-row-${i}">
      <td style="font-size:13px;font-weight:600">${a.paciente_nome || '—'}</td>
      <td><input type="date"  class="ger-data" data-i="${i}" data-id="${a.id}" value="${a.data}"
            style="font-size:12.5px;padding:5px 8px;border:1.5px solid var(--border);border-radius:6px;width:130px"
            onchange="gerMarcarAlterado(${i})"></td>
      <td><input type="time"  class="ger-hora" data-i="${i}" value="${a.hora}"
            style="font-size:12.5px;padding:5px 8px;border:1.5px solid var(--border);border-radius:6px;width:90px"
            onchange="gerMarcarAlterado(${i})"></td>
      <td>${badgeStatus(a.status)}</td>
      <td><button class="btn btn-ghost btn-xs" style="color:var(--red)"
            onclick="gerExcluir(${i},${a.id})">🗑</button></td>
    </tr>
  `).join('');

  window._gerSessoes = sessoes;

  openModal('Gerenciar Sessões', `
    <p style="font-size:12.5px;color:var(--muted);margin-bottom:12px">Próximos 28 dias · ${sessoes.length} sessão(ões)</p>
    ${sessoes.length === 0
      ? `<div class="empty-state"><span class="empty-icon">📅</span><p>Nenhuma sessão nos próximos 28 dias</p></div>`
      : `<div class="table-wrap">
          <table>
            <thead><tr><th>Cliente</th><th>Data</th><th>Hora</th><th>Status</th><th></th></tr></thead>
            <tbody id="ger-tbody">${linhas()}</tbody>
          </table>
        </div>`
    }
  `, async () => {
    const rows = document.querySelectorAll('#ger-tbody tr[data-changed]');
    if (!rows.length) { closeModal(); return; }
    let salvos = 0;
    for (const row of rows) {
      const i   = parseInt(row.dataset.i);
      const ag  = window._gerSessoes[i];
      if (!ag) continue;
      const novaData = row.querySelector('.ger-data')?.value;
      const novaHora = row.querySelector('.ger-hora')?.value;
      try {
        await api('PUT', `/agendamentos/${ag.id}`, { ...ag, data: novaData, hora: novaHora });
        salvos++;
      } catch(e) {}
    }
    toast(`${salvos} sessão(ões) atualizada(s)!`);
    closeModal();
    refreshAll();
  }, { saveLabel: '💾 Salvar Alterações' });
}

function gerMarcarAlterado(i) {
  const row = document.querySelector(`#ger-tbody tr:nth-child(${i + 1})`);
  if (row) { row.dataset.changed = '1'; row.dataset.i = i; }
}

async function gerExcluir(i, id) {
  if (!confirm('Excluir esta sessão?')) return;
  try {
    await api('DELETE', `/agendamentos/${id}`);
    window._gerSessoes.splice(i, 1);
    const tbody = document.getElementById('ger-tbody');
    if (tbody) {
      tbody.innerHTML = window._gerSessoes.map((a, idx) => `
        <tr id="ger-row-${idx}">
          <td style="font-size:13px;font-weight:600">${a.paciente_nome || '—'}</td>
          <td><input type="date"  class="ger-data" data-i="${idx}" data-id="${a.id}" value="${a.data}"
                style="font-size:12.5px;padding:5px 8px;border:1.5px solid var(--border);border-radius:6px;width:130px"
                onchange="gerMarcarAlterado(${idx})"></td>
          <td><input type="time"  class="ger-hora" data-i="${idx}" value="${a.hora}"
                style="font-size:12.5px;padding:5px 8px;border:1.5px solid var(--border);border-radius:6px;width:90px"
                onchange="gerMarcarAlterado(${idx})"></td>
          <td>${badgeStatus(a.status)}</td>
          <td><button class="btn btn-ghost btn-xs" style="color:var(--red)"
                onclick="gerExcluir(${idx},${a.id})">🗑</button></td>
        </tr>
      `).join('');
    }
    toast('Sessão excluída');
    refreshAll();
  } catch(e) { toast(e.message, 'error'); }
}

// ============================================================
// ── PACIENTES ────────────────────────────────────────────────
// ============================================================
let _pacientes = [];

async function loadPacientes() {
  _pacientes = await api('GET', '/pacientes?todos=1');
  document.getElementById('pacientes-list-view').style.display = '';
  document.getElementById('pacientes-detail-view').style.display = 'none';
  filtrarPacientes();
  populateProntSelect();
}

function filtrarPacientes() {
  const q      = (document.getElementById('pac-search')?.value || '').toLowerCase();
  const status = document.getElementById('pac-filtro-status')?.value || 'ativos';
  const titulo = document.getElementById('pac-list-title');
  if (titulo) titulo.textContent = status === 'todos' ? 'Todos os Clientes' : 'Clientes Ativos';
  const filtered = _pacientes.filter(p => {
    if (status === 'ativos' && !p.ativo) return false;
    return !q || p.nome.toLowerCase().includes(q) ||
      (p.cpf||'').includes(q) ||
      (p.convenio||'').toLowerCase().includes(q) ||
      (p.email||'').toLowerCase().includes(q);
  });
  renderPacientesTable(filtered);
}

let _pacientesData = [];
function _renderPacienteRow(p, i) {
  return `
    <tr>
      <td style="text-align:center;color:var(--muted);font-size:11px;font-weight:600;width:28px;padding:0 4px">${i + 1}</td>
      <td>
        <div style="font-weight:700;color:var(--plum)">${p.nome}</div>
      </td>
      <td style="font-size:12px;color:var(--muted)">${p.cpf || '—'}</td>
      <td>
        ${p.frequencia ? `
        <select class="status-select ${p.frequencia}"
                onchange="this.className='status-select '+this.value;alterarFrequencia(${p.id},this.value)">
          <option value="4x-mes"  ${(p.frequencia==='4x-mes'||p.frequencia==='semanal') ?'selected':''}>4x ao mês</option>
          <option value="2x-mes"  ${p.frequencia==='2x-mes'  ?'selected':''}>2x ao mês</option>
          <option value="1x-mes"  ${p.frequencia==='1x-mes'  ?'selected':''}>1x ao mês</option>
        </select>` : `
        <select class="status-select 4x-mes" style="opacity:.5"
                onchange="this.className='status-select '+this.value;this.style.opacity=1;alterarFrequencia(${p.id},this.value)">
          <option value="" disabled selected>—</option>
          <option value="4x-mes">4x ao mês</option>
          <option value="2x-mes">2x ao mês</option>
          <option value="1x-mes">1x ao mês</option>
        </select>`}
      </td>
      <td>
        ${p.freq_pgto ? `
        <select class="status-select ${p.freq_pgto}"
                onchange="this.className='status-select '+this.value;alterarFreqPgto(${p.id},this.value)">
          <option value="por-sessao" ${(p.freq_pgto==='por-sessao'||p.freq_pgto==='fp-semanal')?'selected':''}>Por sessão</option>
          <option value="fp-mensal"  ${(p.freq_pgto==='fp-mensal'||p.freq_pgto==='cada4') ?'selected':''}>Mensal</option>
        </select>` : `
        <select class="status-select fp-mensal" style="opacity:.5"
                onchange="this.className='status-select '+this.value;this.style.opacity=1;alterarFreqPgto(${p.id},this.value)">
          <option value="" disabled selected>—</option>
          <option value="por-sessao">Por sessão</option>
          <option value="fp-mensal">Mensal</option>
        </select>`}
      </td>
      <td>
        <select class="status-select ${p.forma_pgto || 'pix'}"
                onchange="this.className='status-select '+this.value;alterarFormaPgto(${p.id},this.value)">
          <option value="pix"          ${p.forma_pgto==='pix'          ?'selected':''}>PIX</option>
          <option value="credito"      ${p.forma_pgto==='credito'      ?'selected':''}>Crédito</option>
          <option value="debito"       ${p.forma_pgto==='debito'       ?'selected':''}>Débito</option>
          <option value="dinheiro"     ${p.forma_pgto==='dinheiro'     ?'selected':''}>Dinheiro</option>
          <option value="transferencia"${p.forma_pgto==='transferencia'?'selected':''}>Transf.</option>
        </select>
      </td>
      <td>
        <select class="status-select nf ${p.nota_fiscal === 'sim' ? 'sim' : 'nao'}"
                onchange="this.className='status-select nf '+this.value;alterarNotaFiscal(${p.id},this.value)">
          <option value="sim" ${p.nota_fiscal === 'sim' ? 'selected' : ''}>Sim</option>
          <option value="nao" ${p.nota_fiscal !== 'sim' ? 'selected' : ''}>Não</option>
        </select>
      </td>
      <td class="text-right fw-bold">${BRL(p.valor_sessao)}</td>
      <td>
        <select class="status-select ${p.ativo ? 'ativo' : 'finalizado'}"
                onchange="this.className='status-select '+(this.value==='1'?'ativo':'finalizado');alterarStatusCliente(${p.id}, this.value, this)">
          <option value="1" ${p.ativo ? 'selected' : ''}>Ativo</option>
          <option value="0" ${!p.ativo ? 'selected' : ''}>Finalizado</option>
        </select>
      </td>
      <td>
        <div class="inline-actions">
          <button class="btn btn-outline btn-xs" onclick="verDetalhePaciente(${p.id})">👁</button>
          <button class="btn btn-outline btn-xs" onclick="editPaciente(${p.id})">✏️</button>
          <button class="btn btn-outline btn-xs" title="Enviar Lista de Profissões" onclick="enviarListaProfissoes(${p.id})">📋</button>
          <button class="btn btn-outline btn-xs" title="Enviar Rotas Profissionais" onclick="enviarRotasProfissionais(${p.id})">🛤️</button>
          <button class="btn btn-ghost btn-xs" style="color:var(--red)" onclick="deletePacienteItem(${p.id})" title="Desativar">🗑</button>
          <button class="btn btn-ghost btn-xs" style="color:#c0392b;font-size:10px" onclick="excluirDadosLGPD(${p.id},${JSON.stringify(p.nome)})" title="Excluir todos os dados (LGPD)">LGPD</button>
        </div>
      </td>
    </tr>
  `; }

function renderPacientesTable(data) {
  if (!data.length) {
    document.getElementById('pacientes-tbody').innerHTML = `<tr><td colspan="10"><div class="empty-state"><span class="empty-icon">👤</span><p>Nenhum cliente encontrado</p></div></td></tr>`;
    _sortState['pacientes-tbody'] = null;
    return;
  }
  const contadorEl = document.getElementById('pac-contador');
  if (contadorEl) contadorEl.textContent = `${data.length} cliente${data.length !== 1 ? 's' : ''}`;
  _pacientesData = data;
  _sortInit('pacientes-tbody', data, _renderPacienteRow, 'nome');
}

async function enviarRotasProfissionais(id) {
  try {
    const base = location.origin;
    const p = await api('GET', `/pacientes/${id}`);
    const nome = p.nome, whatsapp = p.whatsapp || '';
    const url = base + '/conhecendo-as-rotas-profissionais/';
    const waNome = p.apelido || nome.split(' ')[0];
    const waMsg = encodeURIComponent('Olá, ' + waNome + '! 😊\nSegue o link do material sobre as Rotas Profissionais:\n' + url + '\n\nExplore cada rota e observe qual delas mais combina com você. Qualquer dúvida me chame! 🌟');
    const waLink = whatsapp ? 'https://wa.me/' + toWaNum(whatsapp) + '?text=' + waMsg : '';
    window._urlRotas = url;
    openModal('🛤️ Rotas Profissionais — ' + nome, `
      <p style="margin-bottom:12px;font-size:14px;color:#555">Envie o link do material de Rotas Profissionais para <strong>${nome}</strong>.</p>
      <div style="background:#f8f4ff;border:1.5px solid #d8b8ff;border-radius:8px;padding:10px 14px;font-size:12px;word-break:break-all;margin-bottom:14px;color:#5c35a0">${url}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="navigator.clipboard.writeText(window._urlRotas).then(function(){toast('Link copiado!')})">📋 Copiar link</button>
        ${waLink ? '<a href="' + waLink + '" target="_blank" class="btn btn-primary" style="background:#25d366;border-color:#25d366;text-decoration:none">💬 Enviar pelo WhatsApp</a>' : '<span style="color:#999;font-size:13px">WhatsApp não cadastrado</span>'}
      </div>
    `, null);
  } catch(e) {
    toast('Erro: ' + e.message, 'error');
  }
}

async function enviarListaProfissoes(id) {
  try {
    const base = location.origin;
    const [p, respostas] = await Promise.all([
      api('GET', `/pacientes/${id}`),
      api('GET', `/atividade-profissoes/respostas?paciente_id=${id}`).catch(() => [])
    ]);
    const nome = p.nome, whatsapp = p.whatsapp || '';
    const r = await api('POST', '/atividade-profissoes/link', { paciente_id: id });
    if (!r || !r.token) { toast('Erro ao gerar link', 'error'); return; }
    const url = base + '/atividade-profissoes/?t=' + r.token;
    const waNome = nome.split(' ')[0];
    const waMsg = encodeURIComponent('Olá, ' + waNome + '! 😊\nSegue o link da atividade de Orientação Profissional:\n' + url + '\n\nClique no link, explore as profissões e marque as que você gostaria de conhecer melhor. Qualquer dúvida me chame! 🌟');
    const waLink = whatsapp ? 'https://wa.me/' + toWaNum(whatsapp) + '?text=' + waMsg : '';
    window._urlListaProf = url;

    let respostasHtml = '';
    if (respostas && respostas.length) {
      const ultima = respostas[0];
      const profs = ultima.profissoes || [];
      const dt = ultima.created_at ? ultima.created_at.slice(0,10).split('-').reverse().join('/') : '';
      respostasHtml = `
        <hr style="margin:16px 0;border-color:#e0d0ff">
        <strong style="color:#7b1fa2;font-size:13px">📋 Respostas recebidas (${dt}) — ${profs.length} profissões marcadas${respostas.length > 1 ? ` · ${respostas.length} envios` : ''}</strong>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">
          ${profs.map(mp => `<span style="background:#f3e5f5;color:#6a1b9a;padding:3px 10px;border-radius:12px;font-size:12px">${mp}</span>`).join('')}
        </div>`;
    } else {
      respostasHtml = `<hr style="margin:16px 0;border-color:#e0d0ff"><p style="font-size:12px;color:#aaa">Nenhuma resposta recebida ainda.</p>`;
    }

    openModal('📋 Lista de Profissões — ' + nome, `
      <p style="margin-bottom:12px;font-size:14px;color:#555">Link gerado para <strong>${nome}</strong>. Envie pelo WhatsApp ou copie o link.</p>
      <div style="background:#f8f4ff;border:1.5px solid #d8b8ff;border-radius:8px;padding:10px 14px;font-size:12px;word-break:break-all;margin-bottom:14px;color:#5c35a0">${url}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="navigator.clipboard.writeText(window._urlListaProf).then(function(){toast('Link copiado!')})">📋 Copiar link</button>
        ${waLink ? '<a href="' + waLink + '" target="_blank" class="btn btn-primary" style="background:#25d366;border-color:#25d366;text-decoration:none">💬 Enviar pelo WhatsApp</a>' : '<span style="color:#999;font-size:13px">WhatsApp não cadastrado</span>'}
      </div>
      ${respostasHtml}
    `, null);
  } catch(e) {
    toast('Erro ao gerar link: ' + e.message, 'error');
  }
}

async function verDetalhePaciente(id) {
  const p = await api('GET', `/pacientes/${id}`);
  const [ags, respostas] = await Promise.all([
    api('GET', `/pacientes/${id}/agendamentos`),
    api('GET', `/atividade-profissoes/respostas?paciente_id=${id}`).catch(() => [])
  ]);

  document.getElementById('pacientes-list-view').style.display = 'none';
  document.getElementById('pacientes-detail-view').style.display = '';

  const total    = p.total_sessoes || ags.length;
  const todasOrdenadas = [...ags].sort((a,b) => (b.data+b.hora).localeCompare(a.data+a.hora));
  // Numeração cronológica: sessão mais antiga = #1
  const numMap = {};
  [...ags].sort((a,b) => (a.data+a.hora).localeCompare(b.data+b.hora)).forEach((a,i) => { numMap[a.id] = i+1; });
  const realizadas = ags.filter(a => a.status === 'realizado');
  const realiz   = realizadas.length;
  const faturado = realizadas.reduce((s, a) => s + (a.valor||0), 0);
  const recebido = ags.filter(a => a.pago).reduce((s, a) => s + (a.valor||0), 0);
  const pendente = realizadas.filter(a => !a.pago).reduce((s, a) => s + (a.valor||0), 0);

  document.getElementById('pac-detail-content').innerHTML = `
    <div class="grid-2col">
      <!-- Info pessoal -->
      <div class="card">
        <div class="card-body">
          <div class="pac-detail-header">
            <div class="pac-avatar">${iniciais(p.nome)}</div>
            <div>
              <div class="pac-detail-name">${p.nome}</div>
              <div class="pac-detail-sub">${fmtNascimento(p.data_nascimento)} · ${ p.sexo === 'M' ? 'Masculino' : p.sexo === 'O' ? 'Outro' : 'Feminino'}</div>
              ${p.convenio ? `<div class="pac-detail-sub">🏥 ${p.convenio} ${p.num_convenio ? '· '+p.num_convenio : ''}</div>` : ''}
            </div>
          </div>
          <hr class="divider">
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">WhatsApp</div>
              <div class="info-value">${p.whatsapp ? `<a href="https://wa.me/${toWaNum(p.whatsapp)}" target="_blank" style="color:var(--sage)">💬 ${p.whatsapp}</a>` : '—'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">E-mail</div>
              <div class="info-value">${p.email || '—'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">CPF</div>
              <div class="info-value">${p.cpf || '—'}</div>
            </div>
            <div class="info-item full" style="grid-column:1/-1">
              <div class="info-label">Endereço</div>
              <div class="info-value">${p.endereco || '—'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Ocupação</div>
              <div class="info-value">${p.ocupacao || '—'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Encaminhamento</div>
              <div class="info-value">${p.encaminhamento || '—'}</div>
            </div>
            ${p.responsavel ? `
            <div class="info-item">
              <div class="info-label">Responsável</div>
              <div class="info-value">${p.responsavel}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Tel. Responsável</div>
              <div class="info-value">${p.tel_responsavel || '—'}</div>
            </div>` : ''}
          </div>
          ${p.queixa_principal ? `
          <hr class="divider">
          <div class="info-item">
            <div class="info-label">Queixa Principal</div>
            <div class="info-value" style="white-space:pre-wrap;line-height:1.6">${p.queixa_principal}</div>
          </div>` : ''}
        </div>
      </div>

      <!-- Stats -->
      <div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">
          <div class="stat-card rose" style="padding:14px">
            <div class="stat-label">Sessões Previstas</div>
            <div class="stat-value" style="font-size:22px">${p.total_sessoes || ags.length}</div>
          </div>
          <div class="stat-card sage" style="padding:14px">
            <div class="stat-label">Sessões Realizadas</div>
            <div class="stat-value" style="font-size:22px">${realiz}</div>
          </div>
          <div class="stat-card" style="padding:14px;background:#e8f5e9">
            <div class="stat-label">Recebido</div>
            <div class="stat-value" style="font-size:13px;color:#388e3c">${BRL(recebido)}</div>
          </div>
          <div class="stat-card" style="padding:14px;background:${pendente > 0 ? '#fff3e0' : '#f5f5f5'}">
            <div class="stat-label">A realizar</div>
            <div class="stat-value" style="font-size:13px;color:${pendente > 0 ? '#e65100' : '#aaa'}">${BRL(pendente)}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Histórico em largura total -->
    <div id="pac-historico-card" class="card" style="margin-top:16px">
      <div class="card-header">
        <span class="card-title">Histórico de Sessões</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline btn-sm" onclick="exportarHistoricoPDF(${p.id})">📄 Exportar PDF</button>
          <button class="btn btn-outline btn-sm" onclick="openModalAgendamento(null,null,${p.id})">+ Agendar</button>
          <button class="btn btn-primary btn-sm" onclick="abrirModalCobranca(${p.id})">💰 Cobrar</button>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th style="width:36px;text-align:center">#</th><th>Data</th><th>Hora</th><th>Tipo</th><th>Status</th><th>Pagamento</th><th>Data Recebimento</th><th>Forma</th><th class="text-right">Valor</th><th></th></tr></thead>
          <tbody>
            ${todasOrdenadas.length ? todasOrdenadas.map(a => `
              <tr>
                <td style="text-align:center;color:var(--muted);font-size:11px;font-weight:600">${numMap[a.id]}</td>
                <td>${fmtData(a.data)}</td>
                <td>${a.hora}</td>
                <td>${TIPO_LABEL[a.tipo]||a.tipo}</td>
                <td><select onblur="salvarStatusSessao(${a.id},this.value,${p.id})" style="border:1px solid #e0d5cb;border-radius:5px;padding:2px 4px;font-size:11px;background:#faf8f6;color:var(--plum);font-weight:600;cursor:pointer">
                  ${['agendado','confirmado','realizado','cancelado','falta'].map(s=>`<option value="${s}"${a.status===s?' selected':''}>${STATUS_LABEL[s]||s}</option>`).join('')}
                </select></td>
                <td>${a.pago
                  ? `<button class="btn btn-xs" style="background:#e8f5e9;color:#388e3c;border:1.5px solid #388e3c;font-weight:700;padding:2px 8px" onclick="marcarPendente(${a.id})" title="Desfazer recebimento">✓ Pago</button>`
                  : `<button class="btn btn-xs" style="background:#fff3e0;color:#e65100;border:1.5px solid #e65100;font-weight:700;padding:2px 8px" onclick="pagarRapido(${a.id})" title="Registrar recebimento">Pendente</button>`}</td>
                <td><input type="date" value="${a.data_pagamento||''}" onblur="salvarDataPagamento(${a.id},this.value)" style="border:1px solid #e0d5cb;border-radius:5px;padding:2px 6px;font-size:11px;color:var(--muted);background:transparent;width:118px"></td>
                <td style="font-size:12px">${a.forma_pgto && a.pago ? ({pix:'PIX',dinheiro:'Dinheiro',credito:'Crédito',debito:'Débito',transferencia:'Transf.',convenio:'Convênio'}[a.forma_pgto]||a.forma_pgto) : '—'}</td>
                <td class="text-right">${a.valor ? BRL(a.valor) : '—'}</td>
                <td style="white-space:nowrap">
                  <button class="btn btn-ghost btn-xs" onclick="editAgendamento(${a.id})" title="Editar">✏️</button>
                  <button class="btn btn-ghost btn-xs" onclick="deletarSessaoHistorico(${a.id},${p.id})" title="Excluir" style="color:#c62828">🗑️</button>
                </td>
              </tr>
            `).join('') : `<tr><td colspan="10" class="text-muted" style="text-align:center;padding:16px">Nenhum agendamento</td></tr>`}
          </tbody>
          ${realiz ? `<tfoot style="font-weight:600;background:#faf8f6">
            <tr>
              <td colspan="5" style="padding:8px 12px;font-size:12px;color:#888">${realiz} realizadas de ${total}</td>
              <td colspan="4" style="padding:8px 12px;font-size:12px;color:#388e3c">Recebido: ${BRL(recebido)}${pendente > 0 ? ` · <span style="color:#e65100">A realizar: ${BRL(pendente)}</span>` : ''}</td>
              <td></td>
            </tr>
          </tfoot>` : ''}
        </table>
      </div>
    </div>

    <div id="respostas-profissoes-${p.id}" style="margin:16px 0"></div>

    <!-- Acompanhamento (CFP Res. 001/2009) -->
    <div class="card" style="margin-top:16px;border:${p.data_encerramento ? '2px solid #c62828' : '1px solid var(--border)'}">
      <div class="card-body" style="padding:14px 16px">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div style="display:flex;gap:24px;flex-wrap:wrap">
            <div>
              <div style="font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.5px">Início do acompanhamento</div>
              <div style="font-size:14px;font-weight:600;color:var(--plum)">${p.data_inicio_acompanhamento ? fmtData(p.data_inicio_acompanhamento) : '—'}</div>
            </div>
            <div>
              <div style="font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.5px">Status do caso</div>
              <div style="font-size:14px;font-weight:600;color:${p.data_encerramento ? '#c62828' : '#388e3c'}">${p.data_encerramento ? `Encerrado em ${fmtData(p.data_encerramento)}` : 'Em andamento'}</div>
            </div>
            ${p.motivo_encerramento ? `<div>
              <div style="font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.5px">Motivo do encerramento</div>
              <div style="font-size:14px;color:#c62828">${p.motivo_encerramento}</div>
            </div>` : ''}
          </div>
          <div style="display:flex;gap:8px">
            ${p.data_encerramento
              ? `<button class="btn btn-outline btn-sm" onclick="reabrirCasoPaciente(${p.id})">↩ Reabrir caso</button>`
              : `<button class="btn btn-ghost btn-sm" style="color:#c62828;border-color:#c62828" onclick="encerrarCasoPaciente(${p.id})">📁 Encerrar caso</button>`}
          </div>
        </div>
      </div>
    </div>

    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:16px">
      <button class="btn btn-primary" onclick="editPaciente(${p.id})">✏️ Editar Dados</button>
      <button class="btn btn-lavender" onclick="navigate('prontuarios');setTimeout(()=>{document.getElementById('pront-paciente-select').value=${p.id};loadProntuariosSection();},100)">📋 Ver Prontuários</button>
      ${(() => {
        if (!p.total_sessoes) return '';
        const ultima = [...ags].sort((a,b) => (b.data+b.hora).localeCompare(a.data+a.hora))[0];
        const uData  = ultima ? ultima.data : '';
        const uHora  = ultima ? ultima.hora : '08:00';
        return `<button class="btn btn-sage" onclick="abrirModalSerie(${p.id},${p.sessao_atual||1},${p.total_sessoes},${p.valor_sessao||0},'${uData}','${uHora}')">📅 Criar sessões em série</button>`;
      })()}
      <button class="btn btn-ghost" style="color:var(--red);border-color:var(--red)" onclick="limparSessoesFuturas(${p.id},'${(p.apelido||p.nome.split(' ')[0]).replace(/'/g,"\\'")}')">🗑 Cancelar série</button>
      <button class="btn btn-ghost" style="color:var(--sage);border-color:var(--sage)" onclick="restaurarSessoesFuturas(${p.id},'${(p.apelido||p.nome.split(' ')[0]).replace(/'/g,"\\'")}')">↩ Restaurar série</button>
      <button class="btn btn-outline" onclick="enviarListaProfissoes(${p.id})">📋 Enviar Lista de Profissões</button>
      <button class="btn btn-outline" onclick="enviarRotasProfissionais(${p.id})">🛤️ Enviar Rotas Profissionais</button>
    </div>
  `;

  // Render respostas da atividade de profissões
  const elResp = document.getElementById('respostas-profissoes-' + p.id);
  if (elResp && respostas && respostas.length) {
    const ultima = respostas[0];
    const profs = ultima.profissoes || [];
    const dt = ultima.created_at ? ultima.created_at.slice(0,10).split('-').reverse().join('/') : '';
    elResp.innerHTML = `
      <div class="card" style="border:2px solid #9c27b0">
        <div class="card-body">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <strong style="color:#7b1fa2">📋 Lista de Profissões — Respostas (${dt})</strong>
            <span style="font-size:12px;color:#888">${profs.length} marcadas · ${respostas.length} envio(s)</span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${profs.map(mp => {
              const nome = mp.split(' ').slice(0, mp.split(' ').findIndex(w => ['saúde','tec','eng','hum','art','neg','bio','ser','com','ani'].includes(w.toLowerCase())) || 99).join(' ') || mp;
              return `<span style="background:#f3e5f5;color:#6a1b9a;padding:3px 10px;border-radius:12px;font-size:12px">${nome}</span>`;
            }).join('')}
          </div>
          ${respostas.length > 1 ? `<p style="font-size:11px;color:#aaa;margin-top:8px">Mostrando resposta mais recente. Total: ${respostas.length} envios.</p>` : ''}
        </div>
      </div>`;
  }

  // Aviso se faltam menos de 2 sessões para o limite
  if (p.total_sessoes) {
    const realizadas = ags.filter(a => a.status === 'realizado').length;
    const restantes = p.total_sessoes - realizadas;
    if (restantes < 2) {
      const nome = p.apelido || p.nome.split(' ')[0];
      const msg = restantes <= 0
        ? `<strong>${nome}</strong> já completou as <strong>${p.total_sessoes} sessões</strong> previstas.`
        : `<strong>${nome}</strong> está a <strong>1 sessão</strong> de concluir as ${p.total_sessoes} previstas.`;
      setTimeout(() => openModal(
        '📊 Sessões quase concluídas',
        `<p style="margin-bottom:12px">${msg}</p>
         <p style="margin-bottom:16px">Deseja aumentar o número total de sessões?</p>
         <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Novo total:</label>
         <input type="number" id="novo-total-sessoes" min="${p.total_sessoes + 1}" value="${p.total_sessoes + 10}"
                style="width:120px;padding:6px 10px;border:1px solid #e0d5cb;border-radius:6px;font-size:14px">`,
        async () => {
          const novoTotal = Number(document.getElementById('novo-total-sessoes').value);
          if (novoTotal > p.total_sessoes) {
            await api('PUT', `/pacientes/${p.id}`, { ...p, total_sessoes: novoTotal });
            toast(`Total de sessões atualizado para ${novoTotal}`);
            const ultimaSessao = [...ags].sort((a,b) => (b.data+b.hora).localeCompare(a.data+a.hora))[0];
            abrirModalSerie(p.id, realizadas + 1, novoTotal, p.valor_sessao, ultimaSessao?.data || '', ultimaSessao?.hora || '08:00');
          }
        }
      ), 400);
    }
  }
}

function voltarListaPacientes() {
  document.getElementById('pacientes-list-view').style.display = '';
  document.getElementById('pacientes-detail-view').style.display = 'none';
}

async function abrirModalCobranca(pacienteId) {
  const [p, ags] = await Promise.all([
    api('GET', `/pacientes/${pacienteId}`),
    api('GET', `/pacientes/${pacienteId}/agendamentos`)
  ]);

  const pendentes = ags.filter(a => a.status === 'realizado' && !a.pago)
    .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));

  if (!pendentes.length) return toast('Nenhuma sessão pendente de pagamento', 'error');

  const fmtData = d => { const [y,m,dd] = d.split('-'); return `${dd}/${m}/${y}`; };
  const brl = v => Number(v||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
  const nome = p.apelido || p.nome.split(' ')[0];
  const fone = p.whatsapp || p.telefone || '';

  const linhas = pendentes.map(a => `
    <label style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid var(--border);cursor:pointer">
      <input type="checkbox" class="cobr-chk" data-id="${a.id}" data-data="${a.data}" data-valor="${a.valor||0}"
        style="width:16px;height:16px;accent-color:var(--plum)" checked onchange="cobranÇaRecalcular()">
      <span style="flex:1;font-size:13px">📅 ${fmtData(a.data)} ${a.hora}</span>
      <span style="font-weight:600;color:var(--plum)">R$ ${brl(a.valor)}</span>
    </label>
  `).join('');

  openModal('💰 Cobrar Sessões', `
    <p style="font-size:13px;color:var(--muted);margin-bottom:12px">Selecione as sessões para incluir na cobrança:</p>
    <div style="border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:14px">${linhas}</div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--bg);border-radius:8px;margin-bottom:16px">
      <span style="font-size:13px;color:var(--muted)">Total selecionado:</span>
      <span id="cobr-total" style="font-size:16px;font-weight:700;color:var(--plum)">R$ 0,00</span>
    </div>
    <div style="margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <span style="font-size:12px;color:var(--muted);font-weight:600">PRÉVIA DA MENSAGEM</span>
        <button class="btn btn-ghost btn-xs" onclick="cobranÇaCopiar()">📋 Copiar texto</button>
      </div>
      <pre id="cobr-preview" style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;font-size:12px;font-family:inherit;white-space:pre-wrap;word-break:break-word;max-height:220px;overflow-y:auto;margin:0;color:var(--text)"></pre>
    </div>
    <button class="btn btn-primary" style="width:100%" onclick="cobranÇaEnviarWa('${nome.replace(/'/g,"\\'")}','${fone}')">
      💬 Abrir WhatsApp com mensagem
    </button>
  `, null);

  _cobrNF    = p.nota_fiscal || 'nao';
  _cobrForma = p.forma_pgto  || '';
  cobranÇaRecalcular();
}

function cobranÇaGerarMsg(notaFiscal, formaPgto) {
  const selecionadas = [...document.querySelectorAll('.cobr-chk:checked')];
  const fmtData = d => { const [,m,dd] = d.split('-'); return `${dd}/${m}`; };
  const brl = v => Number(v||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
  const linhasSessoes = selecionadas.map(el => `${fmtData(el.dataset.data)} - R$ ${brl(el.dataset.valor)}`).join('\n');
  const total = selecionadas.reduce((s, el) => s + parseFloat(el.dataset.valor || 0), 0);

  const isCartao = ['credito','debito'].includes(formaPgto);
  const querNF   = notaFiscal === 'sim';

  if (isCartao) {
    const linkCartao = _config?.link_cartao || '';
    return [
      `Oi, abaixo dados para pagamento das sessões de orientação profissional:`,
      ``, linhasSessoes, ``,
      `Total: R$ ${brl(total)}`,
      ``, ``,
      `Segue link para pagamento:`,
      ``, linkCartao || '(link de pagamento não configurado)',
      ``, `Obrigada e um beijo!`,
    ].join('\n');
  }

  const pixKey = querNF ? (_config?.chave_pix_cnpj || '31.879.267/0001-24') : (_config?.chave_pix || '318.505.928-02');
  const dadosBanco = querNF
    ? `Elissa Catarina Ramos Pereira Lorenzi\nSantander\nAgencia: 3822\nConta: 0001300734-14\nCNPJ(pix): ${pixKey}`
    : `Elissa Catarina Ramos Pereira Lorenzi\nSantander\nAgencia: 3822\nConta: 01004845-3\nCPF(pix): ${pixKey}`;
  return [
    `Oi, abaixo dados para pagamento das sessões de orientação profissional:`,
    ``, linhasSessoes, ``,
    `Total: R$ ${brl(total)}`,
    ``, ``,
    `Abaixo dados para transferência:`,
    ``, dadosBanco, ``,
    `Por favor, encaminhar o recibo da transferência.`,
    ``, `Obrigada e um beijo!`,
    ``, ``,
    `Abaixo pix para copiar e colar:`,
    ``, pixKey,
  ].join('\n');
}

let _cobrNF = 'nao', _cobrForma = '';

function cobranÇaRecalcular() {
  const selecionadas = [...document.querySelectorAll('.cobr-chk:checked')];
  const total = selecionadas.reduce((s, el) => s + parseFloat(el.dataset.valor || 0), 0);
  const elTotal = document.getElementById('cobr-total');
  if (elTotal) elTotal.textContent = 'R$ ' + total.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
  const preview = document.getElementById('cobr-preview');
  if (preview) preview.textContent = cobranÇaGerarMsg(_cobrNF, _cobrForma);
}

async function cobranÇaCopiar() {
  const preview = document.getElementById('cobr-preview');
  if (!preview) return;
  try {
    await navigator.clipboard.writeText(preview.textContent);
    toast('Mensagem copiada!');
  } catch { toast('Não foi possível copiar', 'error'); }
}

function cobranÇaEnviarWa(nome, fone) {
  if (![...document.querySelectorAll('.cobr-chk:checked')].length)
    return toast('Selecione ao menos uma sessão', 'error');
  const msg = cobranÇaGerarMsg(_cobrNF, _cobrForma);
  const waNum = fone ? toWaNum(fone) : '';
  window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, '_blank');
}

async function exportarHistoricoPDF(pacienteId) {
  const [p, ags, cfg] = await Promise.all([
    api('GET', `/pacientes/${pacienteId}`),
    api('GET', `/pacientes/${pacienteId}/agendamentos`),
    api('GET', '/configuracoes')
  ]);

  const FORMA = {pix:'PIX',dinheiro:'Dinheiro',credito:'Cartão Crédito',debito:'Cartão Débito',transferencia:'Transferência',convenio:'Convênio'};
  const todasOrd = [...ags].sort((a,b) => (a.data+a.hora).localeCompare(b.data+b.hora));
  const realizadas = ags.filter(a => a.status === 'realizado');
  const faturado = realizadas.reduce((s,a) => s+(a.valor||0), 0);
  const recebido = ags.filter(a => a.pago).reduce((s,a) => s+(a.valor||0), 0);
  const pendente = realizadas.filter(a => !a.pago).reduce((s,a) => s+(a.valor||0), 0);

  const psico   = cfg.nome_psicologa || 'Psicóloga';
  const crpRaw  = (cfg.crp || '').replace(/^CRP\s*/i, '');
  const crp     = crpRaw ? ` · CRP ${crpRaw}` : '';
  const hoje    = new Date().toLocaleDateString('pt-BR', {day:'2-digit',month:'long',year:'numeric'});

  // Numeração cronológica: #1 = sessão mais antiga
  const numMap = {};
  todasOrd.forEach((a, i) => { numMap[a.id] = i + 1; });

  const linhas = todasOrd.map(a => {
    const status = {agendado:'Agendado',confirmado:'Confirmado',realizado:'Realizado',cancelado:'Cancelado',falta:'Falta'}[a.status]||a.status;
    const pgto   = a.pago ? '✓ Pago' : 'A realizar';
    const dataPgto = a.data_pagamento ? a.data_pagamento.split('-').reverse().join('/') : '—';
    const forma  = a.forma_pgto && a.pago ? (FORMA[a.forma_pgto]||a.forma_pgto) : '—';
    const valor  = a.valor ? 'R$ '+a.valor.toFixed(2).replace('.',',') : '—';
    return `<tr>
      <td style="text-align:center;color:#aaa;font-size:9pt">${numMap[a.id]}</td>
      <td>${a.data.split('-').reverse().join('/')}</td>
      <td>${a.hora}</td>
      <td>${({individual:'Individual',casal:'Casal',grupo:'Grupo',online:'Online',avaliacao:'Avaliação',sessao:'Sessão'}[a.tipo]||a.tipo)}</td>
      <td>${status}</td>
      <td>${pgto}</td>
      <td>${dataPgto}</td>
      <td>${forma}</td>
      <td style="text-align:right">${valor}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Histórico — ${p.nome}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Segoe UI',Arial,sans-serif; font-size:11pt; color:#2d2028; padding:30px 40px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; padding-bottom:16px; border-bottom:2px solid #7a5a48; }
  .header-left h1 { font-size:17pt; color:#7a5a48; font-weight:700; }
  .header-left p  { font-size:10pt; color:#888; margin-top:2px; }
  .header-right   { text-align:right; font-size:10pt; color:#666; line-height:1.7; }
  .paciente-box { background:#faf7f4; border:1px solid #e0d5cb; border-radius:8px; padding:14px 18px; margin-bottom:20px; display:flex; gap:40px; }
  .paciente-box div { font-size:10pt; }
  .paciente-box .label { font-size:9pt; color:#888; margin-bottom:2px; }
  .paciente-box .val   { font-weight:600; color:#2d2028; }
  table { width:100%; border-collapse:collapse; font-size:9.5pt; }
  thead tr { background:#7a5a48; color:#fff; }
  thead th { padding:8px 10px; text-align:left; font-weight:600; }
  thead th:first-child { text-align:center; width:32px; }
  thead th:last-child { text-align:right; }
  tbody tr:nth-child(even) { background:#faf7f4; }
  tbody td { padding:7px 10px; border-bottom:1px solid #ece5de; }
  tfoot tr { background:#f0ebe5; font-weight:700; }
  tfoot td { padding:8px 10px; font-size:9.5pt; }
  .totais { display:flex; gap:24px; margin-top:20px; }
  .tot-card { flex:1; border:1px solid #e0d5cb; border-radius:8px; padding:12px 16px; text-align:center; }
  .tot-card .tl { font-size:9pt; color:#888; margin-bottom:4px; }
  .tot-card .tv { font-size:13pt; font-weight:700; }
  .tv.green { color:#388e3c; }
  .tv.orange { color:#e65100; }
  .tv.plum   { color:#7a5a48; }
  .footer { margin-top:40px; text-align:center; font-size:9pt; color:#aaa; border-top:1px solid #e0d5cb; padding-top:14px; }
  .assinatura { margin-top:50px; text-align:center; }
  .assinatura .linha { width:220px; border-top:1px solid #2d2028; margin:0 auto 6px; }
  .assinatura p { font-size:10pt; }
  @media print { body { padding:20px; } }
</style>
</head>
<body>
<div class="header">
  <div class="header-left">
    <h1>Histórico de Atendimentos</h1>
    <p>${psico}${crp}</p>
  </div>
  <div class="header-right">
    <div>Emitido em ${hoje}</div>
    <div style="font-size:9pt;color:#bbb;margin-top:4px">Documento confidencial</div>
  </div>
</div>

<div class="paciente-box">
  <div><div class="label">Cliente</div><div class="val">${p.nome}</div></div>
  ${p.data_nascimento ? `<div><div class="label">Nascimento</div><div class="val">${p.data_nascimento.split('-').reverse().join('/')}</div></div>` : ''}
  ${p.cpf ? `<div><div class="label">CPF</div><div class="val">${p.cpf}</div></div>` : ''}
  ${p.convenio ? `<div><div class="label">Convênio</div><div class="val">${p.convenio}</div></div>` : ''}
</div>

<table>
  <thead>
    <tr>
      <th>#</th><th>Data</th><th>Hora</th><th>Tipo</th><th>Status</th>
      <th>Pagamento</th><th>Data Receb.</th><th>Forma</th><th>Valor</th>
    </tr>
  </thead>
  <tbody>${linhas}</tbody>
  ${realizadas.length ? `<tfoot>
    <tr>
      <td colspan="5">${realizadas.length} sessão(ões) realizada(s) de ${ags.length} no total</td>
      <td colspan="4">Recebido: R$ ${recebido.toFixed(2).replace('.',',')}${pendente>0?' · A realizar: R$ '+pendente.toFixed(2).replace('.',','):''}</td>
    </tr>
  </tfoot>` : ''}
</table>

<div class="assinatura">
  <div class="linha"></div>
  <p>${psico}${crp}</p>
</div>

<div class="footer">Documento gerado pelo sistema de gestão do consultório · ${hoje}</div>

<script>window.onload = () => window.print();<\/script>
</body>
</html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
}

async function limparSessoesFuturas(pacienteId, nome) {
  if (!confirm(`Cancelar todas as sessões futuras agendadas de ${nome}?\n\nElas ficarão salvas com status "cancelado" e podem ser restauradas depois.`)) return;
  const r = await api('DELETE', `/pacientes/${pacienteId}/sessoes-futuras`);
  toast(`${r.cancelados} sessão(ões) cancelada(s) — use "Restaurar série" para desfazer`);
  verDetalhePaciente(pacienteId);
}

async function restaurarSessoesFuturas(pacienteId, nome) {
  if (!confirm(`Restaurar sessões futuras canceladas de ${nome} para "agendado"?`)) return;
  const r = await api('POST', `/pacientes/${pacienteId}/restaurar-sessoes`);
  if (!r.restaurados) return toast('Nenhuma sessão cancelada encontrada para restaurar', 'error');
  toast(`${r.restaurados} sessão(ões) restaurada(s)`);
  verDetalhePaciente(pacienteId);
}

// ── Calendário inline para série ─────────────────────────────
let _serieCalMes = null; // 'YYYY-MM'

function serieCalRender(sel) {
  const el = document.getElementById('serie-cal');
  if (!el) return;
  const hoje = HOJE();
  const selDate = sel || document.getElementById('serie-data')?.value || hoje;
  if (!_serieCalMes) _serieCalMes = selDate.slice(0, 7);
  const [ano, mes] = _serieCalMes.split('-').map(Number);
  const primeiroDia = new Date(ano, mes - 1, 1).getDay();
  const diasNoMes   = new Date(ano, mes, 0).getDate();
  const MESES_CAL   = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const DIAS_CAL    = ['D','S','T','Q','Q','S','S'];

  let html = `
    <div style="background:var(--plum);color:#fff;padding:8px 12px;display:flex;align-items:center;justify-content:space-between">
      <button onclick="serieCalNav(-1)" style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer;padding:0 6px">‹</button>
      <span style="font-size:13px;font-weight:700">${MESES_CAL[mes-1]} ${ano}</span>
      <button onclick="serieCalNav(1)"  style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer;padding:0 6px">›</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);background:#f5eff8">
      ${DIAS_CAL.map(d => `<div style="text-align:center;font-size:10px;font-weight:700;color:var(--muted);padding:4px 0">${d}</div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:var(--border);padding:1px">
  `;
  // células vazias antes do 1º dia
  for (let i = 0; i < primeiroDia; i++) html += `<div style="background:#fff;padding:5px"></div>`;
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const isoDate = `${ano}-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
    const passado = isoDate < hoje;
    const selecionado = isoDate === selDate;
    const bg    = selecionado ? 'var(--rose)' : passado ? '#f5f5f5' : '#fff';
    const color = selecionado ? '#fff'        : passado ? '#bbb'    : 'var(--plum)';
    const cursor = passado ? 'default' : 'pointer';
    const fw = selecionado ? '800' : '500';
    html += `<div onclick="${passado ? '' : `serieCalSel('${isoDate}')`}"
      style="background:${bg};color:${color};text-align:center;padding:6px 2px;font-size:12px;font-weight:${fw};cursor:${cursor};border-radius:4px">${dia}</div>`;
  }
  html += `</div>`;
  el.innerHTML = html;
}

function serieCalNav(delta) {
  const [ano, mes] = _serieCalMes.split('-').map(Number);
  const d = new Date(ano, mes - 1 + delta, 1);
  _serieCalMes = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  serieCalRender(document.getElementById('serie-data')?.value);
}

function serieCalSel(iso) {
  const inp = document.getElementById('serie-data');
  if (inp) inp.value = iso;
  serieCalRender(iso);
}

async function abrirModalSerie(pacienteId, sessaoAtual, totalSessoes, valorSessao, ultimaData = '', ultimaHora = '08:00') {
  const restantes = Math.max(1, totalSessoes - sessaoAtual + 1);
  // Calcula próxima ocorrência do mesmo dia da semana da última sessão
  const proximaData = (() => {
    const base = ultimaData ? new Date(ultimaData + 'T12:00:00') : null;
    const dow   = base ? base.getDay() : 1; // segunda por padrão
    const hoje  = new Date();
    const d     = new Date(hoje);
    d.setDate(d.getDate() + 1); // começa amanhã
    while (d.getDay() !== dow) d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  })();
  const html = `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">
        <!-- Calendário visual -->
        <div>
          <label style="font-size:12px;font-weight:700;color:var(--muted);display:block;margin-bottom:6px">Data da 1ª sessão</label>
          <div id="serie-cal" style="border:1.5px solid var(--border);border-radius:12px;overflow:hidden;min-width:224px"></div>
          <input type="hidden" id="serie-data" value="${proximaData}">
        </div>
        <!-- Opções -->
        <div style="display:flex;flex-direction:column;gap:12px;flex:1;min-width:180px">
          <div class="form-group" style="margin:0">
            <label>Horário</label>
            <input type="time" id="serie-hora" value="${ultimaHora}" style="font-size:18px;padding:8px 12px">
          </div>
          <div class="form-group" style="margin:0">
            <label>Qtd. de sessões a criar</label>
            <input type="number" id="serie-qtd" value="${restantes}" min="1" max="${totalSessoes}" step="1">
            <small class="text-muted">Sessão ${sessaoAtual} → ${totalSessoes} (${restantes} restantes)</small>
          </div>
          <div class="form-group" style="margin:0">
            <label>Valor por sessão (R$)</label>
            <input type="number" id="serie-valor" value="${valorSessao||0}" min="0" step="10">
          </div>
        </div>
      </div>
      <p class="text-muted" style="font-size:12px;margin:0">As sessões serão criadas semanalmente (1 por semana) a partir da data escolhida.</p>
    </div>
  `;
  // Renderiza calendário após inserção no DOM
  _serieCalMes = proximaData.slice(0, 7);
  setTimeout(() => serieCalRender(proximaData), 50);
  openModal('📅 Criar sessões em série', html, async () => {
    const data_inicio = document.getElementById('serie-data').value;
    const hora        = document.getElementById('serie-hora').value;
    const quantidade  = parseInt(document.getElementById('serie-qtd').value) || 1;
    const valor       = parseFloat(document.getElementById('serie-valor').value) || 0;
    if (!data_inicio || !hora) return toast('Preencha data e horário', 'error');
    const res = await api('POST', '/agendamentos/serie', { paciente_id: pacienteId, data_inicio, hora, quantidade, valor });
    toast(`${res.ids.length} sessão(ões) criada(s) com sucesso`);
    navigate('agenda');
  });
}

// ── Modal Paciente ────────────────────────────────────────────
function pacienteFormHtml(p = {}) {
  return `
    <div class="form-grid">
      <div class="form-group" style="flex:2">
        <label>Nome completo *</label>
        <input type="text" id="fp-nome" value="${p.nome||''}" placeholder="Nome do cliente">
      </div>
      <div class="form-group" style="flex:1">
        <label>Apelido</label>
        <input type="text" id="fp-apelido" value="${p.apelido||''}" placeholder="Como prefere ser chamado(a)">
      </div>
      <div class="form-group">
        <label>CPF</label>
        <input type="text" id="fp-cpf" value="${p.cpf||''}" placeholder="000.000.000-00">
      </div>
      <div class="form-group">
        <label>Data de Nascimento</label>
        <input type="date" id="fp-nasc" value="${p.data_nascimento||''}">
      </div>
      <div class="form-group">
        <label>Sexo</label>
        <select id="fp-sexo">
          <option value="F" ${(p.sexo||'F')==='F'?'selected':''}>Feminino</option>
          <option value="M" ${p.sexo==='M'?'selected':''}>Masculino</option>
          <option value="O" ${p.sexo==='O'?'selected':''}>Outro</option>
        </select>
      </div>
      <div class="form-group">
        <label>WhatsApp</label>
        <input type="tel" id="fp-wpp" value="${p.whatsapp||''}" placeholder="(00) 00000-0000">
      </div>
      <div class="form-group">
        <label>E-mail</label>
        <input type="email" id="fp-email" value="${p.email||''}" placeholder="email@exemplo.com">
      </div>
      <div class="form-group">
        <label>Ocupação</label>
        <input type="text" id="fp-ocup" value="${p.ocupacao||''}" placeholder="Profissão">
      </div>
      <div class="form-group full">
        <label>Endereço (geral)</label>
        <input type="text" id="fp-end" value="${p.endereco||''}" placeholder="Rua, número, bairro, cidade">
      </div>
      <div class="form-group full" style="border-top:1px solid var(--border);padding-top:12px;margin-top:4px">
        <label style="color:var(--muted);font-size:11px;letter-spacing:.5px;text-transform:uppercase;font-weight:700">Endereço estruturado para Nota Fiscal</label>
      </div>
      <div style="flex:1 1 100%;display:flex;gap:10px;align-items:flex-end">
        <div class="form-group" style="flex:0 0 260px;min-width:0;margin:0">
          <label>Logradouro</label>
          <input type="text" id="fp-nf-logradouro" value="${p.nf_logradouro||''}" placeholder="Rua Exemplo">
        </div>
        <div class="form-group" style="flex:1 1 0;min-width:0;margin:0">
          <label>Número</label>
          <input type="text" id="fp-nf-numero" value="${p.nf_numero||''}" placeholder="123">
        </div>
        <div class="form-group" style="flex:0 0 90px;min-width:0;margin:0">
          <label>Complemento</label>
          <input type="text" id="fp-nf-complemento" value="${p.nf_complemento||''}" placeholder="Apto 45">
        </div>
      </div>
      <div class="form-group" style="flex:2">
        <label>Bairro</label>
        <input type="text" id="fp-nf-bairro" value="${p.nf_bairro||''}" placeholder="Bairro">
      </div>
      <div class="form-group" style="flex:2">
        <label>Cidade</label>
        <input type="text" id="fp-nf-cidade" value="${p.nf_cidade||''}" placeholder="Cidade">
      </div>
      <div class="form-group" style="flex:1;min-width:60px;max-width:80px">
        <label>UF</label>
        <input type="text" id="fp-nf-uf" value="${p.nf_uf||''}" placeholder="SP" maxlength="2">
      </div>
      <div class="form-group" style="flex:1;min-width:100px">
        <label>CEP</label>
        <input type="text" id="fp-nf-cep" value="${p.nf_cep||''}" placeholder="00000-000" oninput="buscarCep(this.value)" maxlength="9">
      </div>
      <div class="form-group">
        <label>Convênio</label>
        <input type="text" id="fp-conv" value="${p.convenio||''}" placeholder="Nome do convênio ou Particular">
      </div>
      <div class="form-group">
        <label>Nº do Convênio</label>
        <input type="text" id="fp-numconv" value="${p.num_convenio||''}">
      </div>
      <div class="form-group">
        <label>Valor da Sessão (R$)</label>
        <input type="number" id="fp-valor" value="${p.valor_sessao||_config.valor_sessao_padrao||180}" min="0" step="10">
      </div>
      <div class="form-group">
        <label>Sessão atual (nº)</label>
        <input type="number" id="fp-sessao-atual" value="${p.sessao_atual||1}" min="1" step="1">
      </div>
      <div class="form-group">
        <label>Total de sessões</label>
        <input type="number" id="fp-total-sessoes" value="${p.total_sessoes||''}" min="1" step="1" placeholder="Automático">
      </div>
      <div class="form-group">
        <label>Frequência</label>
        <select id="fp-freq">
          <option value="">—</option>
          <option value="4x-mes"  ${(p.frequencia==='4x-mes'||p.frequencia==='semanal') ?'selected':''}>4x ao mês (semanal)</option>
          <option value="2x-mes"  ${p.frequencia==='2x-mes'  ?'selected':''}>2x ao mês (quinzenal)</option>
          <option value="1x-mes"  ${p.frequencia==='1x-mes'  ?'selected':''}>1x ao mês</option>
        </select>
      </div>
      <div class="form-group">
        <label>Dia da semana</label>
        <select id="fp-dia-semana">
          <option value="">—</option>
          <option value="1" ${p.dia_semana===1||p.dia_semana==='1'?'selected':''}>Segunda-feira</option>
          <option value="2" ${p.dia_semana===2||p.dia_semana==='2'?'selected':''}>Terça-feira</option>
          <option value="3" ${p.dia_semana===3||p.dia_semana==='3'?'selected':''}>Quarta-feira</option>
          <option value="4" ${p.dia_semana===4||p.dia_semana==='4'?'selected':''}>Quinta-feira</option>
          <option value="5" ${p.dia_semana===5||p.dia_semana==='5'?'selected':''}>Sexta-feira</option>
          <option value="6" ${p.dia_semana===6||p.dia_semana==='6'?'selected':''}>Sábado</option>
        </select>
      </div>
      <div class="form-group">
        <label>Horário da sessão</label>
        <input type="time" id="fp-hora-sessao" value="${p.hora_sessao||''}">
      </div>
      <div class="form-group">
        <label>Freq. de Pagamento</label>
        <select id="fp-freqpgto">
          <option value="">—</option>
          <option value="por-sessao" ${(p.freq_pgto==='por-sessao'||p.freq_pgto==='fp-semanal')?'selected':''}>Por sessão</option>
          <option value="fp-mensal"  ${(p.freq_pgto==='fp-mensal'||p.freq_pgto==='cada4') ?'selected':''}>Mensal</option>
        </select>
      </div>
      <div class="form-group">
        <label>Forma de Pagamento</label>
        <select id="fp-forma">
          <option value="">—</option>
          <option value="pix"          ${p.forma_pgto==='pix'         ?'selected':''}>PIX</option>
          <option value="credito"      ${p.forma_pgto==='credito'     ?'selected':''}>Cartão de Crédito</option>
          <option value="debito"       ${p.forma_pgto==='debito'      ?'selected':''}>Cartão de Débito</option>
          <option value="dinheiro"     ${p.forma_pgto==='dinheiro'    ?'selected':''}>Dinheiro</option>
          <option value="transferencia"${p.forma_pgto==='transferencia'?'selected':''}>Transferência</option>
        </select>
      </div>
      <div class="form-group">
        <label>Encaminhamento</label>
        <input type="text" id="fp-enc" value="${p.encaminhamento||''}" placeholder="Como chegou ao consultório">
      </div>
      <div class="form-group">
        <label>Responsável (se menor)</label>
        <input type="text" id="fp-resp" value="${p.responsavel||''}">
      </div>
      <div class="form-group">
        <label>Tel. Responsável</label>
        <input type="tel" id="fp-telresp" value="${p.tel_responsavel||''}">
      </div>
      <div class="form-group full">
        <label>Queixa Principal</label>
        <textarea id="fp-queixa" rows="3">${p.queixa_principal||''}</textarea>
      </div>
      <div class="form-group full">
        <label>Observações</label>
        <textarea id="fp-obs" rows="2">${p.obs||''}</textarea>
      </div>
    </div>
  `;
}

function openModalPaciente(p = {}) {
  openModal(p.id ? 'Editar Cliente' : 'Novo Cliente', pacienteFormHtml(p), async () => {
    const body = {
      nome:            document.getElementById('fp-nome').value.trim(),
      apelido:         document.getElementById('fp-apelido').value.trim(),
      cpf:             document.getElementById('fp-cpf').value.trim(),
      data_nascimento: document.getElementById('fp-nasc').value,
      sexo:            document.getElementById('fp-sexo').value,
      whatsapp:        normalizarFone(document.getElementById('fp-wpp').value.trim()),
      email:           document.getElementById('fp-email').value.trim(),
      endereco:        document.getElementById('fp-end').value.trim(),
      nf_logradouro:   document.getElementById('fp-nf-logradouro').value.trim(),
      nf_numero:       document.getElementById('fp-nf-numero').value.trim(),
      nf_complemento:  document.getElementById('fp-nf-complemento').value.trim(),
      nf_bairro:       document.getElementById('fp-nf-bairro').value.trim(),
      nf_cidade:       document.getElementById('fp-nf-cidade').value.trim(),
      nf_uf:           document.getElementById('fp-nf-uf').value.trim().toUpperCase(),
      nf_cep:          document.getElementById('fp-nf-cep').value.trim(),
      ocupacao:        document.getElementById('fp-ocup').value.trim(),
      convenio:        document.getElementById('fp-conv').value.trim(),
      num_convenio:    document.getElementById('fp-numconv').value.trim(),
      valor_sessao:    parseFloat(document.getElementById('fp-valor').value) || 0,
      encaminhamento:  document.getElementById('fp-enc').value.trim(),
      responsavel:     document.getElementById('fp-resp').value.trim(),
      tel_responsavel: document.getElementById('fp-telresp').value.trim(),
      queixa_principal:document.getElementById('fp-queixa').value.trim(),
      obs:             document.getElementById('fp-obs').value.trim(),
      forma_pgto:      document.getElementById('fp-forma').value     || null,
      frequencia:      document.getElementById('fp-freq').value      || null,
      freq_pgto:       document.getElementById('fp-freqpgto').value  || null,
      nota_fiscal:     p.nota_fiscal || 'nao',
      sessao_atual:    parseInt(document.getElementById('fp-sessao-atual').value) || 1,
      total_sessoes:   parseInt(document.getElementById('fp-total-sessoes').value) || null,
      hora_sessao:     document.getElementById('fp-hora-sessao').value || null,
      dia_semana:      document.getElementById('fp-dia-semana').value !== '' ? parseInt(document.getElementById('fp-dia-semana').value) : null,
    };
    if (!body.nome) return toast('Nome é obrigatório', 'error') || false;
    try {
      let savedId;
      const isNovo = !p.id;
      if (p.id) { await api('PUT', `/pacientes/${p.id}`, body); savedId = p.id; toast('Cliente atualizado!'); }
      else      { const r = await api('POST', '/pacientes', body); savedId = r.id; toast('Cliente cadastrado!'); }
      closeModal();
      refreshAll();
      // Auto-agendar série para novo cliente com frequência + dia + horário definidos
      if (isNovo && body.frequencia && body.dia_semana != null && body.hora_sessao && body.total_sessoes) {
        try {
          const intervalo = body.frequencia === '2x-mes' ? 14 : body.frequencia === '1x-mes' ? 30 : 7;
          // Próxima ocorrência do dia da semana escolhido
          const d = new Date(); d.setDate(d.getDate() + 1);
          while (d.getDay() !== body.dia_semana) d.setDate(d.getDate() + 1);
          const data_inicio = d.toISOString().slice(0, 10);
          const res = await api('POST', '/agendamentos/serie', {
            paciente_id: savedId, data_inicio, hora: body.hora_sessao,
            quantidade: body.total_sessoes, valor: body.valor_sessao || 0, intervalo
          });
          toast(`✅ ${res.ids.length} sessões agendadas automaticamente!`);
          refreshAll();
        } catch(se) { toast('Cliente salvo, mas erro ao criar sessões: ' + se.message, 'error'); }
      }
      // Se não tem CEP estruturado mas o campo endereco contém um, preenche automaticamente
      if (!body.nf_cep && savedId) {
        const match = /\b(\d{5}-?\d{3})\b/.exec(body.endereco || '');
        if (match) {
          const cepRaw = match[1].replace('-', '');
          try {
            const vr = await fetch(`https://viacep.com.br/ws/${cepRaw}/json/`);
            const vd = await vr.json();
            if (!vd.erro) {
              await api('PUT', `/pacientes/${savedId}`, {
                ...body, id: savedId,
                nf_logradouro: vd.logradouro || '',
                nf_bairro:     vd.bairro     || '',
                nf_cidade:     vd.localidade || '',
                nf_uf:         vd.uf         || '',
                nf_cep:        cepRaw.replace(/(\d{5})(\d{3})/, '$1-$2'),
              });
              toast('Endereço NF preenchido via CEP');
              refreshAll();
            }
          } catch(_) {}
        }
      }
    } catch(e) { toast(e.message, 'error'); }
  }, { large: true });
}

async function editPaciente(id) {
  const p = await api('GET', `/pacientes/${id}`);
  openModalPaciente(p);
}

async function deletePacienteItem(id) {
  if (!confirm('Desativar este cliente? Seus dados serão mantidos.')) return;
  await api('DELETE', `/pacientes/${id}`);
  toast('Cliente desativado');
  refreshAll();
}

async function encerrarCasoPaciente(id) {
  const motivos = ['Alta clínica', 'Abandono de tratamento', 'Encaminhamento externo', 'Transferência de profissional', 'Conclusão do objetivo terapêutico', 'Óbito', 'Outros'];
  const html = `<div class="form-group" style="margin-bottom:14px">
    <label>Motivo do encerramento <span style="color:#c62828">*</span></label>
    <select id="enc-motivo" style="width:100%">
      <option value="">— Selecione —</option>
      ${motivos.map(m => `<option value="${m}">${m}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label>Data do encerramento</label>
    <input type="date" id="enc-data" value="${HOJE()}">
  </div>
  <p style="font-size:12px;color:var(--muted);margin-top:10px">⚠ O cliente será movido para inativos. O prontuário permanece arquivado conforme CFP Res. 001/2009.</p>`;
  openModal('Encerrar Caso', html, async () => {
    const motivo = document.getElementById('enc-motivo').value;
    const data   = document.getElementById('enc-data').value;
    if (!motivo) return toast('Selecione o motivo', 'error') || false;
    await api('POST', `/pacientes/${id}/encerrar`, { motivo, data });
    toast('Caso encerrado e registrado');
    verDetalhePaciente(id);
  });
}

async function reabrirCasoPaciente(id) {
  if (!confirm('Reabrir este caso? O cliente voltará para ativos.')) return;
  await api('POST', `/pacientes/${id}/reabrir`);
  toast('Caso reaberto');
  verDetalhePaciente(id);
}

async function excluirDadosLGPD(id, nome) {
  const msg = `EXCLUSÃO PERMANENTE — LGPD\n\nEsta ação apagará TODOS os dados de "${nome}":\n• Prontuários\n• Agendamentos\n• Dados pessoais\n\nEsta ação NÃO pode ser desfeita.\n\nDigite CONFIRMAR para prosseguir:`;
  if (prompt(msg) !== 'CONFIRMAR') return toast('Cancelado', 'error');
  const r = await api('DELETE', `/pacientes/${id}/dados-lgpd`);
  if (r?.success) { toast(`Dados de ${r.nome} excluídos conforme LGPD`); refreshAll(); }
}

async function alterarFreqPgto(id, valor) {
  const p = await api('GET', `/pacientes/${id}`);
  if (!p?.id) return;
  await api('PUT', `/pacientes/${id}`, { ...p, freq_pgto: valor });
  const label = { 'por-sessao':'Por sessão', 'fp-semanal':'Por sessão', 'cada4':'Mensal', 'fp-mensal':'Mensal' }[valor] || valor;
  toast(`Freq. pagamento: ${label}`);
  refreshAll();
}

async function alterarFormaPgto(id, valor) {
  const p = await api('GET', `/pacientes/${id}`);
  if (!p?.id) return;
  await api('PUT', `/pacientes/${id}`, { ...p, forma_pgto: valor });
  const label = { pix:'PIX', credito:'Crédito', debito:'Débito', dinheiro:'Dinheiro', transferencia:'Transferência' }[valor] || valor;
  toast(`Forma de pagamento: ${label}`);
  refreshAll();
}

async function alterarFrequencia(id, valor) {
  const p = await api('GET', `/pacientes/${id}`);
  if (!p?.id) return;
  await api('PUT', `/pacientes/${id}`, { ...p, frequencia: valor });
  const label = { semanal:'4x ao mês', '1x-mes':'1x ao mês', '2x-mes':'2x ao mês', '4x-mes':'4x ao mês' }[valor] || valor;
  toast(`Frequência: ${label}`);
  refreshAll();
}

async function alterarNotaFiscal(id, valor) {
  const p = await api('GET', `/pacientes/${id}`);
  if (!p?.id) return;
  await api('PUT', `/pacientes/${id}`, { ...p, nota_fiscal: valor });
  toast(valor === 'sim' ? 'Nota fiscal: Sim ✓' : 'Nota fiscal: Não');
  refreshAll();
}

async function alterarStatusCliente(id, novoAtivoStr, selectEl) {
  const novoAtivo = parseInt(novoAtivoStr);
  const p = await api('GET', `/pacientes/${id}`);
  if (!p?.id) { loadPacientes(); return; }

  if (novoAtivo === 0) {
    if (!confirm(`Finalizar ${p.nome}?\n\nAs sessões futuras pendentes serão removidas da agenda.`)) {
      // revert select
      if (selectEl) { selectEl.value = '1'; selectEl.className = 'status-select ativo'; }
      return;
    }
    const hoje = HOJE();
    const ags = await api('GET', `/pacientes/${id}/agendamentos`);
    const futuras = (ags || []).filter(a => a.data >= hoje && ['agendado','confirmado'].includes(a.status));
    for (const ag of futuras) await api('DELETE', `/agendamentos/${ag.id}`);
    await api('PUT', `/pacientes/${id}`, { ...p, ativo: 0 });
    toast(`${p.nome} finalizado · ${futuras.length} sessão(ões) removida(s)`);
  } else {
    await api('PUT', `/pacientes/${id}`, { ...p, ativo: 1 });
    toast(`${p.nome} reativado`);
  }

  refreshAll();
}

// ============================================================
// ── PRONTUÁRIOS ──────────────────────────────────────────────
// ============================================================
async function loadProntuariosPage() {
  const [pacs, ags] = await Promise.all([
    api('GET', '/pacientes'),
    api('GET', `/agendamentos?data=${HOJE()}`),
  ]);
  _pacientesCache = pacs;
  populateProntSelect(pacs);
  renderClientesHoje(ags, pacs);
}

function renderClientesHoje(ags, pacs) {
  const el = document.getElementById('pront-clientes-hoje');
  if (!el) return;

  const hoje = ags
    .filter(a => ['agendado','confirmado','realizado'].includes(a.status))
    .sort((a, b) => a.hora.localeCompare(b.hora));

  if (!hoje.length) { el.innerHTML = ''; return; }

  const STATUS_COR = {
    agendado:   { bg: '#FBF3F9', border: '#E8D5E4', dot: '#CEBBAD',  label: 'Agendado'   },
    confirmado: { bg: '#f0fdf4', border: '#a8d5c2', dot: '#2A6B4A',  label: 'Confirmado' },
    realizado:  { bg: '#f5f0f7', border: '#c8a8d5', dot: '#5B4466',  label: 'Realizado'  },
  };

  el.innerHTML = `
    <div style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px">
        📅 Clientes de hoje — ${fmtData(HOJE())}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${hoje.map(ag => {
          const pac = pacs.find(p => p.id === ag.paciente_id);
          if (!pac) return '';
          const nome = pac.apelido || pac.nome.split(' ')[0];
          const c = STATUS_COR[ag.status] || STATUS_COR.agendado;
          return `
            <button onclick="selecionarClienteHoje(${pac.id})" style="
              display:flex;align-items:center;gap:10px;
              background:${c.bg};border:1.5px solid ${c.border};
              border-radius:12px;padding:10px 14px;cursor:pointer;
              text-align:left;transition:box-shadow .15s;min-width:140px;
            " onmouseover="this.style.boxShadow='0 3px 12px rgba(74,55,40,.12)'"
               onmouseout="this.style.boxShadow=''">
              <div style="width:8px;height:8px;border-radius:50%;background:${c.dot};flex-shrink:0"></div>
              <div>
                <div style="font-weight:700;font-size:13.5px;color:var(--plum)">${nome}</div>
                <div style="font-size:11.5px;color:var(--muted)">${ag.hora} · ${c.label}</div>
              </div>
            </button>`;
        }).join('')}
      </div>
    </div>`;
}

async function selecionarClienteHoje(pacId) {
  const sel = document.getElementById('pront-paciente-select');
  if (!sel) return;
  sel.value = pacId;
  await loadProntuariosSection();
  openModalProntuario();
}

function populateProntSelect(pacs) {
  const sel = document.getElementById('pront-paciente-select');
  if (!sel) return;
  const pList = pacs || _pacientesCache || [];
  const current = sel.value;
  sel.innerHTML = '<option value="">Selecione um cliente...</option>' +
    pList.map(p => `<option value="${p.id}" ${p.id == current ? 'selected' : ''}>${p.nome}</option>`).join('');
}

async function loadProntuariosSection() {
  const pacId = document.getElementById('pront-paciente-select')?.value;
  const btnNovo = document.getElementById('btn-novo-pront');
  if (!pacId) {
    btnNovo.style.display = 'none';
    document.getElementById('pront-content').innerHTML = `
      <div class="empty-state"><span class="empty-icon">📋</span><p>Selecione um cliente para ver os prontuários</p></div>`;
    return;
  }
  btnNovo.style.display = '';
  const pronts = await api('GET', `/prontuarios?paciente_id=${pacId}`);
  renderProntuarios(pronts, pacId);
}

function renderProntuarios(pronts, pacId) {
  const el = document.getElementById('pront-content');
  if (!pronts.length) {
    el.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📋</span>
        <p>Nenhum registro encontrado. Clique em <strong>+ Nova Anotação</strong> para começar.</p>
      </div>`;
    return;
  }
  el.innerHTML = pronts.map(r => `
    <div class="prontuario-item" id="pront-${r.id}">
      <div class="pront-header" onclick="togglePront(${r.id})">
        <div>
          <div class="pront-data">📋 ${fmtData(r.data)} ${r.hora ? '· ' + r.hora : ''}</div>
          <div class="pront-tipo">${r.sessao_tipo ? TIPO_LABEL[r.sessao_tipo] || r.sessao_tipo : 'Anotação'}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <button class="btn btn-ghost btn-xs" style="color:var(--red)" onclick="event.stopPropagation();deleteProntuarioItem(${r.id},${pacId})">🗑</button>
          <span style="color:var(--muted);font-size:18px" id="pront-chevron-${r.id}">›</span>
        </div>
      </div>
      <div class="pront-body" id="pront-body-${r.id}">
        ${r.conteudo ? `
          <div class="pront-field pront-field-edit" onclick="editProntuario(${r.id},${pacId})" title="Clique para editar">
            <div class="pront-field-label">Relato da Sessão <span class="pront-edit-hint">✏️ clique para editar</span></div>
            <div class="pront-field-value">${r.conteudo.replace(/\n/g,'<br>')}</div>
          </div>` : ''}
        ${r.humor ? `
          <div class="pront-field pront-field-edit" onclick="editProntuario(${r.id},${pacId})" title="Clique para editar">
            <div class="pront-field-label">Humor / Estado Emocional <span class="pront-edit-hint">✏️ clique para editar</span></div>
            <div class="pront-field-value">${r.humor}</div>
          </div>` : ''}
        ${r.hipotese_trabalho ? `
          <div class="pront-field pront-field-edit" onclick="editProntuario(${r.id},${pacId})" title="Clique para editar">
            <div class="pront-field-label">Hipótese de Trabalho <span class="pront-edit-hint">✏️ clique para editar</span></div>
            <div class="pront-field-value">${r.hipotese_trabalho.replace(/\n/g,'<br>')}</div>
          </div>` : ''}
        ${r.tecnicas ? `
          <div class="pront-field pront-field-edit" onclick="editProntuario(${r.id},${pacId})" title="Clique para editar">
            <div class="pront-field-label">Técnicas Utilizadas <span class="pront-edit-hint">✏️ clique para editar</span></div>
            <div class="pront-field-value">${r.tecnicas}</div>
          </div>` : ''}
        ${r.tarefas ? `
          <div class="pront-field pront-field-edit" onclick="editProntuario(${r.id},${pacId})" title="Clique para editar">
            <div class="pront-field-label">Tarefas / Homework <span class="pront-edit-hint">✏️ clique para editar</span></div>
            <div class="pront-field-value">${r.tarefas}</div>
          </div>` : ''}
        <div style="padding:8px 0 4px;border-top:1px solid var(--border);margin-top:12px;display:flex;gap:8px;align-items:center;justify-content:space-between">
          <button class="btn btn-primary btn-sm" onclick="editProntuario(${r.id},${pacId})">✏️ Editar anotação</button>
          ${r.criado_por ? `<span style="font-size:11px;color:var(--muted)">🔒 ${r.criado_por}</span>` : ''}
        </div>
        <div class="pront-analise-box" id="analise-box-${r.id}">
          <div class="pront-analise-header">
            <span>🧠 Análise & Conselhos Clínicos</span>
            <button class="btn btn-sm btn-analise" id="btn-analise-${r.id}" onclick="gerarAnalise(${r.id})">Gerar análise</button>
          </div>
          <div class="pront-analise-content" id="analise-content-${r.id}">
            <span class="pront-analise-placeholder">Clique em <strong>Gerar análise</strong> para obter insights clínicos baseados nas anotações desta sessão.</span>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

async function gerarAnalise(id) {
  const btn = document.getElementById(`btn-analise-${id}`);
  const box = document.getElementById(`analise-content-${id}`);
  if (!btn || !box) return;

  btn.disabled = true;
  btn.textContent = '⏳ Analisando…';
  box.innerHTML = '<span class="pront-analise-placeholder">Gerando análise com IA…</span>';

  // Coleta dados do card já renderizado
  const item = document.getElementById(`pront-${id}`);
  const campos = item ? item.querySelectorAll('.pront-field-value') : [];
  const labels = item ? item.querySelectorAll('.pront-field-label') : [];
  const dados = {};
  labels.forEach((l, i) => {
    const label = l.textContent.replace(/✏️.*/, '').trim();
    const val = campos[i]?.innerText?.trim() || '';
    if (label.includes('Relato'))   dados.conteudo = val;
    if (label.includes('Humor'))    dados.humor    = val;
    if (label.includes('Técnicas')) dados.tecnicas = val;
    if (label.includes('Tarefas'))  dados.tarefas  = val;
  });

  const nomePaciente = document.getElementById('pront-paciente-select');
  const nomeOpt = nomePaciente?.options[nomePaciente.selectedIndex]?.text || '';
  if (nomeOpt) dados.nome_paciente = nomeOpt.split(' — ')[0];

  try {
    const r = await api('POST', '/analisar-prontuario', dados);
    box.innerHTML = _mdParaHtml(r.analise || 'Sem análise gerada.');
    btn.textContent = '🔄 Regerar';
  } catch(e) {
    box.innerHTML = `<span style="color:var(--red)">Erro: ${e.message}</span>`;
    btn.textContent = 'Tentar novamente';
  }
  btn.disabled = false;
}

function _mdParaHtml(md) {
  return md
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^#{1,3}\s+(.+)$/gm, '<h4 style="margin:14px 0 6px;color:var(--plum);font-size:13px">$1</h4>')
    .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul style="margin:4px 0 10px;padding-left:18px;font-size:13px">$1</ul>')
    .replace(/\n{2,}/g, '</p><p style="margin:6px 0">')
    .replace(/^(?!<[hul])(.+)$/gm, (m) => m.startsWith('<') ? m : `<p style="margin:6px 0">${m}</p>`);
}

function togglePront(id) {
  const body = document.getElementById(`pront-body-${id}`);
  const chev = document.getElementById(`pront-chevron-${id}`);
  const open = body.classList.toggle('open');
  chev.textContent = open ? '˅' : '›';
  chev.style.transform = open ? 'rotate(0deg)' : '';
  // Gera análise automaticamente na primeira abertura
  if (open) {
    const content = document.getElementById(`analise-content-${id}`);
    const jaGerou = content && !content.querySelector('.pront-analise-placeholder');
    if (!jaGerou) gerarAnalise(id);
  }
}

function prontuarioFormHtml(r = {}, agendamentos = []) {
  const agSelect = agendamentos.length ? `
    <div class="form-group" style="margin-bottom:14px">
      <label>Sessão vinculada</label>
      <select id="pr-agendamento" onchange="syncDataPront()">
        <option value="">— Sem vínculo —</option>
        ${agendamentos.slice(0, 30).map(a =>
          `<option value="${a.id}" data-data="${a.data}" ${r.agendamento_id == a.id ? 'selected' : ''}>
            ${fmtData(a.data)} ${a.hora} — ${TIPO_LABEL[a.tipo]||a.tipo} (${STATUS_LABEL[a.status]||a.status})
          </option>`
        ).join('')}
      </select>
    </div>` : `<input type="hidden" id="pr-agendamento" value="${r.agendamento_id||''}">`;

  return `
    ${agSelect}
    <div class="form-group" style="margin-bottom:14px">
      <label>Data da Sessão</label>
      <input type="date" id="pr-data" value="${r.data || HOJE()}">
    </div>
    <!-- Ditado por voz -->
    <div id="ditado-box" style="background:#FBF3F9;border:1.5px solid #E8D5E4;border-radius:12px;padding:14px 16px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <button type="button" id="btn-mic" onclick="toggleDitado()" title="Gravar relato por voz" style="width:42px;height:42px;border-radius:50%;border:none;background:var(--rose);color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s">🎙️</button>
        <div>
          <div style="font-weight:700;font-size:13.5px;color:var(--plum)">Ditado por Voz</div>
          <div id="ditado-status" style="font-size:12px;color:var(--muted)">Clique no microfone e fale livremente sobre a sessão</div>
        </div>
        <button type="button" id="btn-estruturar" onclick="estruturarDitado()" style="display:none;margin-left:auto" class="btn btn-sm btn-primary">✨ Estruturar com IA</button>
      </div>
      <textarea id="ditado-transcricao" rows="3" placeholder="A transcrição aparecerá aqui enquanto você fala..." style="width:100%;border:1px solid #E8D5E4;border-radius:8px;padding:10px;font-size:13px;color:var(--text);background:#fff;resize:vertical;display:none"></textarea>
    </div>
    <div style="display:flex;justify-content:flex-end;margin-bottom:10px">
      <button type="button" class="btn btn-sm btn-outline" id="btn-corrigir-pront" onclick="corrigirProntuario()" title="Organiza e estrutura suas anotações seguindo as diretrizes do CFP, preservando todo o conteúdo que você escreveu">
        📋 Organizar com IA
      </button>
      <span style="font-size:10px;color:var(--muted);margin-left:6px" title="Conteúdo gerado por IA — revise antes de salvar (Código de Ética CFP, Art. 1º)">⚠ IA assistiva</span>
    </div>
    <div class="form-group" style="margin-bottom:14px">
      <label>Relato / Conteúdo da Sessão</label>
      <textarea id="pr-conteudo" rows="5" spellcheck="true" lang="pt-BR" placeholder="Descreva os principais temas abordados na sessão...">${r.conteudo||''}</textarea>
    </div>
    <div class="form-group" style="margin-bottom:14px">
      <label>Humor / Estado Emocional do Cliente</label>
      <input type="text" id="pr-humor" spellcheck="true" lang="pt-BR" value="${r.humor||''}" placeholder="Ex: Ansiosa, reflexiva, mais tranquila...">
    </div>
    <div class="form-group" style="margin-bottom:14px">
      <label>Hipótese de Trabalho <span style="font-weight:400;color:var(--muted);font-size:11px">(CFP Res. 001/2009)</span></label>
      <textarea id="pr-hipotese" rows="2" spellcheck="true" lang="pt-BR" placeholder="Hipótese diagnóstica ou de trabalho para este caso...">${r.hipotese_trabalho||''}</textarea>
    </div>
    <div class="form-group" style="margin-bottom:14px">
      <label>Técnicas / Intervenções Utilizadas</label>
      <textarea id="pr-tecnicas" rows="2" spellcheck="true" lang="pt-BR" placeholder="Ex: TCC, reestruturação cognitiva, mindfulness...">${r.tecnicas||''}</textarea>
    </div>
    <div class="form-group">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <label style="margin:0">Tarefas / Homework</label>
        <button type="button" class="btn btn-outline btn-xs" onclick="abrirPickerBiblioteca()" style="font-size:11px">📚 Selecionar da Biblioteca</button>
      </div>
      <textarea id="pr-tarefas" rows="3" spellcheck="true" lang="pt-BR" placeholder="Atividades propostas para a próxima semana...">${r.tarefas||''}</textarea>
    </div>
  `;
}

function abrirPickerBiblioteca() {
  const todas = [];
  const cards = typeof BIB_CARDS !== 'undefined' ? BIB_CARDS : [];
  for (const area of cards) {
    for (const pasta of (area.pastas || [])) {
      for (const atv of (pasta.atividades || [])) {
        todas.push({ area: area.titulo, pasta: pasta.nome, id: atv.id, titulo: atv.titulo, subtitulo: atv.subtitulo || '' });
      }
    }
  }
  // Atividades salvas no localStorage
  try {
    const custom = JSON.parse(localStorage.getItem('bib_custom') || '[]');
    for (const atv of custom) todas.push({ area: atv.area || 'Personalizado', pasta: atv.pasta || '', id: atv.id, titulo: atv.titulo, subtitulo: atv.subtitulo || '' });
  } catch(_) {}

  const html = `
    <div style="margin-bottom:12px">
      <input type="search" id="bib-picker-busca" oninput="filtrarPickerBib(this.value)"
        placeholder="🔍 Buscar atividade..." style="width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px">
    </div>
    <div id="bib-picker-lista" style="max-height:420px;overflow-y:auto;display:flex;flex-direction:column;gap:6px">
      ${todas.map(a => `
        <div class="bib-pick-item" data-titulo="${a.titulo}" data-sub="${a.subtitulo}"
          style="padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;cursor:pointer;transition:background .1s"
          onmouseover="this.style.background='#f5f0fb'" onmouseout="this.style.background=''"
          onclick="inserirAtividadeHomework('${a.titulo.replace(/'/g,"\\'")}','${a.subtitulo.replace(/'/g,"\\'")}')">
          <div style="font-weight:600;font-size:13px;color:var(--plum)">${a.titulo}</div>
          ${a.subtitulo ? `<div style="font-size:11.5px;color:var(--muted)">${a.area} · ${a.subtitulo}</div>` : `<div style="font-size:11.5px;color:var(--muted)">${a.area}</div>`}
        </div>`).join('')}
    </div>`;

  openModal('📚 Selecionar Atividade de Homework', html, null, { saveLabel: null });
  setTimeout(() => document.getElementById('bib-picker-busca')?.focus(), 100);
}

function filtrarPickerBib(q) {
  const termo = q.toLowerCase();
  document.querySelectorAll('.bib-pick-item').forEach(el => {
    const txt = (el.dataset.titulo + ' ' + el.dataset.sub).toLowerCase();
    el.style.display = txt.includes(termo) ? '' : 'none';
  });
}

function inserirAtividadeHomework(titulo, subtitulo) {
  const ta = document.getElementById('pr-tarefas');
  if (!ta) return;
  const linha = subtitulo ? `${titulo} — ${subtitulo}` : titulo;
  ta.value = ta.value ? ta.value + '\n' + linha : linha;
  closeModal();
}

async function corrigirProntuario() {
  const btn = document.getElementById('btn-corrigir-pront');
  const campos = {
    conteudo: document.getElementById('pr-conteudo')?.value || '',
    humor:    document.getElementById('pr-humor')?.value    || '',
    tecnicas: document.getElementById('pr-tecnicas')?.value || '',
    tarefas:  document.getElementById('pr-tarefas')?.value  || '',
  };
  if (Object.values(campos).every(t => !t.trim())) return toast('Nenhum texto para organizar', 'error');

  btn.disabled = true;
  btn.textContent = '⏳ Organizando…';

  try {
    const nome = document.querySelector('#pront-modal-titulo')?.textContent?.split('—')[1]?.trim() || '';
    const r = await api('POST', '/prontuarios/organizar', { ...campos, nome_paciente: nome });
    let alterados = 0;
    for (const [key, val] of Object.entries(r)) {
      const el = document.getElementById('pr-' + key);
      if (el && val && val !== campos[key]) {
        el.value = val;
        el.style.background = '#f0fdf4';
        setTimeout(() => el.style.background = '', 2000);
        alterados++;
      }
    }
    if (alterados > 0) toast(`✅ ${alterados} campo(s) organizado(s)!`);
    else toast('Texto já está organizado 👍');
  } catch(e) {
    toast('Erro ao organizar: ' + e.message, 'error');
  }

  btn.disabled = false;
  btn.textContent = '📋 Organizar com IA';
}

// ── DITADO POR VOZ ────────────────────────────────────────────
let _ditadoRec   = null;
let _ditadoAtivo = false;
let _ditadoAcumulado = ''; // texto confirmado entre reinícios

const _DITADO_KEY = 'ditado_transcricao_v1';
const _DITADO_TTL = 24 * 60 * 60 * 1000; // 24 horas em ms

function _salvarDitadoLocal() {
  const texto = document.getElementById('ditado-transcricao')?.value?.trim();
  if (texto) localStorage.setItem(_DITADO_KEY, JSON.stringify({ texto, ts: Date.now() }));
  else       localStorage.removeItem(_DITADO_KEY);
}

function _restaurarDitadoLocal() {
  try {
    const raw = localStorage.getItem(_DITADO_KEY);
    if (!raw) return;
    const { texto, ts } = JSON.parse(raw);
    if (!texto || Date.now() - ts > _DITADO_TTL) { localStorage.removeItem(_DITADO_KEY); return; }
    const ta = document.getElementById('ditado-transcricao');
    if (!ta) return;
    ta.value = texto;
    ta.style.display = 'block';
    _ditadoAcumulado = texto;
    const horas = Math.round((Date.now() - ts) / 3600000);
    const label = horas < 1 ? 'há menos de 1h' : `há ${horas}h`;
    document.getElementById('ditado-status').innerHTML =
      `📝 Transcrição restaurada (${label}) — revise e clique em <strong>Estruturar com IA</strong>`;
    document.getElementById('btn-estruturar').style.display = 'inline-flex';
  } catch(_) {}
}

function _limparDitadoLocal() {
  localStorage.removeItem(_DITADO_KEY);
}

function toggleDitado() {
  if (_ditadoAtivo) pararDitado();
  else iniciarDitado();
}

function _criarReconhecedor() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SpeechRec();
  rec.lang = 'pt-BR';
  rec.continuous = true;
  rec.interimResults = true;

  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) _ditadoAcumulado += e.results[i][0].transcript + ' ';
      else interim = e.results[i][0].transcript;
    }
    const ta = document.getElementById('ditado-transcricao');
    if (ta) { ta.value = _ditadoAcumulado + interim; ta.scrollTop = ta.scrollHeight; }
  };

  rec.onerror = (e) => {
    if (e.error === 'not-allowed') { toast('Permissão de microfone negada', 'error'); pararDitado(); }
    // no-speech e outros erros: o onend vai reiniciar automaticamente
  };

  // O browser para sozinho após silêncio — reinicia sempre que _ditadoAtivo for true
  rec.onend = () => {
    if (!_ditadoAtivo) return;
    _ditadoRec = _criarReconhecedor();
    try { _ditadoRec.start(); } catch(_) {}
  };

  return rec;
}

function iniciarDitado() {
  if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) {
    toast('Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.', 'error');
    return;
  }

  const textarea = document.getElementById('ditado-transcricao');
  const btnEstr  = document.getElementById('btn-estruturar');
  const btnMic   = document.getElementById('btn-mic');
  const status   = document.getElementById('ditado-status');

  _ditadoAtivo     = true;
  _ditadoAcumulado = textarea.value; // preserva texto já digitado/transcrito
  textarea.style.display = 'block';
  btnEstr.style.display  = 'none';

  btnMic.style.background = '#c0425d';
  btnMic.innerHTML = '⏹️';
  btnMic.title = 'Parar gravação';
  status.innerHTML = '<span style="color:#c0425d;font-weight:700">● Gravando…</span> fale livremente sobre a sessão';

  _ditadoRec = _criarReconhecedor();
  _ditadoRec.start();
}

function pararDitado() {
  _ditadoAtivo = false;
  if (_ditadoRec) {
    _ditadoRec.onend = null; // impede reinício após o stop
    try { _ditadoRec.stop(); } catch(_) {}
    _ditadoRec = null;
  }

  const btnMic  = document.getElementById('btn-mic');
  const status  = document.getElementById('ditado-status');
  const textarea = document.getElementById('ditado-transcricao');
  const btnEstr  = document.getElementById('btn-estruturar');

  btnMic.style.background = 'var(--rose)';
  btnMic.innerHTML = '🎙️';
  btnMic.title = 'Gravar relato por voz';

  if (textarea?.value?.trim()) {
    status.innerHTML = '✅ Gravação concluída — revise o texto e clique em <strong>Estruturar com IA</strong>';
    btnEstr.style.display = 'inline-flex';
  } else {
    status.textContent = 'Clique no microfone e fale livremente sobre a sessão';
  }
}

async function estruturarDitado() {
  const textarea  = document.getElementById('ditado-transcricao');
  const btnEstr   = document.getElementById('btn-estruturar');
  const status    = document.getElementById('ditado-status');
  const transcricao = textarea?.value?.trim();
  if (!transcricao) return toast('Nenhum texto para estruturar', 'error');

  const pacId = document.getElementById('pront-paciente-select')?.value;
  const pac = _pacientesCache?.find(p => p.id == pacId);
  const nome = pac?.apelido || pac?.nome?.split(' ')[0] || '';

  btnEstr.disabled = true;
  btnEstr.textContent = '⏳ Estruturando…';
  status.textContent = 'Processando com IA…';

  try {
    const r = await api('POST', '/prontuarios/estruturar-ditado', { transcricao, nome_paciente: nome });

    if (r.conteudo)  { const el = document.getElementById('pr-conteudo');  el.value = r.conteudo;  el.style.background = '#f0fdf4'; setTimeout(() => el.style.background = '', 2000); }
    if (r.humor)     { const el = document.getElementById('pr-humor');     el.value = r.humor;     el.style.background = '#f0fdf4'; setTimeout(() => el.style.background = '', 2000); }
    if (r.tecnicas)  { const el = document.getElementById('pr-tecnicas');  el.value = r.tecnicas;  el.style.background = '#f0fdf4'; setTimeout(() => el.style.background = '', 2000); }
    if (r.tarefas)   { const el = document.getElementById('pr-tarefas');   el.value = r.tarefas;   el.style.background = '#f0fdf4'; setTimeout(() => el.style.background = '', 2000); }

    status.innerHTML = '✅ Campos preenchidos! Revise e ajuste antes de salvar.';
    btnEstr.style.display = 'none';
    toast('Prontuário estruturado com sucesso! ✨');
  } catch(e) {
    toast('Erro ao estruturar: ' + e.message, 'error');
    status.textContent = 'Erro ao processar. Tente novamente.';
  } finally {
    btnEstr.disabled = false;
    btnEstr.textContent = '✨ Estruturar com IA';
  }
}

function syncDataPront() {
  const sel = document.getElementById('pr-agendamento');
  const data = sel?.options[sel.selectedIndex]?.dataset?.data;
  if (data) document.getElementById('pr-data').value = data;
}

async function openModalProntuario(r = {}) {
  const pacId = document.getElementById('pront-paciente-select')?.value;
  if (!pacId) return toast('Selecione um cliente primeiro', 'error') || false;

  let agendamentos = [];
  if (!r.id) {
    try {
      const todos = await api('GET', `/agendamentos?paciente_id=${pacId}`);
      agendamentos = todos.sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));
      // pré-seleciona a sessão realizada mais recente
      const ultima = agendamentos.find(a => a.status === 'realizado') || agendamentos[0];
      if (ultima && !r.data) {
        r = { ...r, data: ultima.data, agendamento_id: ultima.id };
      }
    } catch(e) {}
  }

  openModal(r.id ? 'Editar Anotação' : 'Nova Anotação de Sessão', prontuarioFormHtml(r, agendamentos), async () => {
    const body = {
      paciente_id:       pacId,
      agendamento_id:    document.getElementById('pr-agendamento')?.value || null,
      data:              document.getElementById('pr-data').value,
      conteudo:          document.getElementById('pr-conteudo').value.trim(),
      humor:             document.getElementById('pr-humor').value.trim(),
      hipotese_trabalho: document.getElementById('pr-hipotese')?.value.trim() || null,
      tecnicas:          document.getElementById('pr-tecnicas').value.trim(),
      tarefas:           document.getElementById('pr-tarefas').value.trim()
    };
    if (!body.data) return toast('Data é obrigatória', 'error') || false;
    try {
      if (r.id) {
        await api('PUT', `/prontuarios/${r.id}`, body);
        _limparDitadoLocal();
        toast('Anotação atualizada!');
        closeModal();
        await loadProntuariosSection();
        const card = document.getElementById(`pront-${r.id}`);
        if (card) {
          const body2 = document.getElementById(`pront-body-${r.id}`);
          const chev  = document.getElementById(`pront-chevron-${r.id}`);
          if (body2 && !body2.classList.contains('open')) {
            body2.classList.add('open');
            if (chev) { chev.textContent = '˅'; }
          }
          gerarAnalise(r.id);
        }
      } else {
        await api('POST', '/prontuarios', body);
        _limparDitadoLocal();
        toast('Anotação salva! 📋');
        closeModal();
        loadProntuariosSection();
      }
      if (body.agendamento_id) {
        const agId = parseInt(body.agendamento_id);
        const idx  = _agendaData.findIndex(a => a.id === agId);
        if (idx !== -1 && _agendaData[idx].status !== 'realizado') {
          _agendaData[idx] = { ..._agendaData[idx], status: 'realizado' };
          renderAgendaHorario();
          renderAgendaGrid();
          renderAgendaLista();
        }
      }
    } catch(e) { toast(e.message, 'error'); }
  });
  // openModal insere o HTML de forma síncrona — DOM pronto aqui
  if (!r.id) _restaurarDitadoLocal();
}

async function editProntuario(id, pacId) {
  const pronts = await api('GET', `/prontuarios?paciente_id=${pacId}`);
  const r = pronts.find(x => x.id === id) || {};
  openModalProntuario(r);
}

async function deleteProntuarioItem(id, pacId) {
  if (!confirm('Excluir esta anotação permanentemente?')) return;
  await api('DELETE', `/prontuarios/${id}`);
  toast('Anotação excluída');
  loadProntuariosSection();
}

// ============================================================
// ── FINANCEIRO ───────────────────────────────────────────────
// ============================================================
let _finAno = new Date().getFullYear();
let _finMes = new Date().getMonth() + 1;

let _previsaoPgto  = null;
let _tabPgtoAtiva  = 'semanal';
let _semPgtoOffset = 0;

function switchTabPgto(tab) {
  _tabPgtoAtiva = tab;
  document.getElementById('tab-pgto-sem').className = `btn btn-sm ${tab==='semanal' ? 'btn-primary' : 'btn-outline'}`;
  document.getElementById('tab-pgto-mes').className = `btn btn-sm ${tab==='mensal'  ? 'btn-primary' : 'btn-outline'}`;
  renderTabPgto();
}

async function navSemPgto(delta) {
  _semPgtoOffset += delta;
  const ref = new Date(HOJE() + 'T12:00:00');
  ref.setDate(ref.getDate() + _semPgtoOffset * 7);
  _previsaoPgto = await api('GET', `/financeiro/previsao-pgto?hoje=${ref.toISOString().slice(0,10)}`);
  renderTabPgto();
}

function renderTabPgto() {
  const body = document.getElementById('fin-previsao-pgto-body');
  if (!body || !_previsaoPgto) return;
  const isSem = _tabPgtoAtiva === 'semanal';
  const d     = isSem ? _previsaoPgto.semanal : _previsaoPgto.mensal;
  const label = isSem
    ? `${fmtData(_previsaoPgto.semDe)} – ${fmtData(_previsaoPgto.semAte)}`
    : `${fmtData(_previsaoPgto.mesDe)} – ${fmtData(_previsaoPgto.mesAte)}`;

  const hojeBtnHtml = (_semPgtoOffset !== 0)
    ? `<button class="btn btn-ghost btn-sm" onclick="_semPgtoOffset=0;navSemPgto(0)" style="font-size:11px;padding:1px 7px;margin-left:4px">hoje</button>`
    : '';

  const navBar = isSem
    ? `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 16px 4px">
         <button class="btn btn-ghost btn-sm" onclick="navSemPgto(-1)" style="font-size:18px;line-height:1;padding:0 8px">&#8249;</button>
         <span style="font-size:12px;color:var(--muted);font-weight:600">${label}${hojeBtnHtml}</span>
         <button class="btn btn-ghost btn-sm" onclick="navSemPgto(1)" style="font-size:18px;line-height:1;padding:0 8px">&#8250;</button>
       </div>`
    : `<div style="padding:8px 16px 4px;font-size:12px;color:var(--muted);font-weight:600">${label}</div>`;

  if (!d.sessoes.length) {
    body.innerHTML = navBar + `<p class="text-muted" style="text-align:center;padding:12px 0 20px">Nenhuma sessão agendada</p>`;
    return;
  }
  body.innerHTML = navBar + `
    <div style="text-align:right;padding:0 16px 4px;font-size:12px;color:var(--muted)">${d.sessoes.length} sessão(ões) · <strong style="color:var(--plum)">${BRL(d.total)}</strong></div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Data</th><th>Hora</th><th>Cliente</th><th class="text-right">Valor</th></tr></thead>
        <tbody>
          ${d.sessoes.map(a => `
            <tr>
              <td>${fmtData(a.data)}</td>
              <td>${a.hora}</td>
              <td>${a.paciente_nome || '—'}</td>
              <td class="text-right fw-bold" style="color:var(--plum)">${BRL(a.valor)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// ─── PAGAMENTOS ──────────────────────────────────────────────
let _pgtoAba  = 'pessoal';
let _pgtoAno  = new Date().getFullYear();
let _pgtoMes  = new Date().getMonth() + 1;
let _pgtoData = [];

const CATS_PESSOAL = ['Moradia','Alimentação','Saúde','Transporte','Educação','Lazer','Assinaturas','Outros'];
const CATS_EMPRESA = ['Aluguel/Espaço','Software/Assinaturas','Material','Contador','Marketing','Telefone/Internet','Impostos','Outros'];

function pgtoNavMes(d) { _pgtoMes += d; if (_pgtoMes > 12) { _pgtoMes = 1; _pgtoAno++; } if (_pgtoMes < 1) { _pgtoMes = 12; _pgtoAno--; } loadPagamentos(); }
function pgtoMesAtual() { _pgtoAno = new Date().getFullYear(); _pgtoMes = new Date().getMonth()+1; loadPagamentos(); }

function switchAbaPgto(aba) {
  _pgtoAba = aba;
  document.getElementById('tab-pgto-pessoal').className = 'tab-btn' + (aba==='pessoal' ? ' tab-btn-active' : '');
  document.getElementById('tab-pgto-empresa').className = 'tab-btn' + (aba==='empresa'  ? ' tab-btn-active' : '');
  renderPagamentosTabela();
}

async function loadPagamentos() {
  const mLabel = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  document.getElementById('pgto-mes-label').textContent = `${mLabel[_pgtoMes-1]} ${_pgtoAno}`;
  const params = new URLSearchParams({ ano: _pgtoAno, mes: _pgtoMes });
  _pgtoData = await api('GET', `/pagamentos?${params}`);
  renderPagamentosTabela();
}

function _pgtoMesRef() {
  return `${_pgtoAno}-${String(_pgtoMes).padStart(2,'0')}`;
}

function _pgtoEstaPago(p) {
  if (!p.recorrente) return !!p.pago;
  try { return JSON.parse(p.pago_meses || '[]').includes(_pgtoMesRef()); } catch(_) { return false; }
}

function _pgtoVencimentoExibido(p) {
  // Para recorrentes: usa o dia original mas no mês/ano consultado
  if (!p.data_vencimento) return null;
  const dia = p.data_vencimento.split('-')[2];
  if (p.recorrente) {
    const mm = String(_pgtoMes).padStart(2,'0');
    return `${_pgtoAno}-${mm}-${dia}`;
  }
  return p.data_vencimento;
}

function renderPagamentosTabela() {
  const lista = _pgtoData.filter(p => p.tipo === _pgtoAba);
  const mesRef = _pgtoMesRef();
  const hoje   = HOJE();

  const total    = lista.reduce((s,p) => s + (p.valor||0), 0);
  const pagoVal  = lista.filter(p => _pgtoEstaPago(p)).reduce((s,p) => s + (p.valor||0), 0);
  const pendente = total - pagoVal;
  const vencidos = lista.filter(p => {
    if (_pgtoEstaPago(p)) return false;
    const venc = _pgtoVencimentoExibido(p);
    return venc && venc < hoje;
  }).length;

  document.getElementById('pgto-stats').innerHTML = `
    <div class="stat-card"><div class="stat-value">${brl(total)}</div><div class="stat-label">Total do Mês</div></div>
    <div class="stat-card"><div class="stat-value" style="color:var(--sage)">${brl(pagoVal)}</div><div class="stat-label">Pago</div></div>
    <div class="stat-card"><div class="stat-value" style="color:${pendente>0?'var(--rose)':'inherit'}">${brl(pendente)}</div><div class="stat-label">Pendente</div></div>
    <div class="stat-card"><div class="stat-value" style="color:${vencidos>0?'#c0425d':'inherit'}">${vencidos}</div><div class="stat-label">Vencidos</div></div>
  `;

  const tbody = document.getElementById('pgto-tbody');
  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><span class="empty-icon">💳</span><p>Nenhum pagamento em ${['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][_pgtoMes-1]}.<br>Clique em <strong>+ Novo Pagamento</strong> para adicionar.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(p => {
    const vencDate = _pgtoVencimentoExibido(p);
    const [a,m,d]  = (vencDate||'').split('-');
    const vencFmt  = d ? `${d}/${m}/${a}` : '—';
    const pago     = _pgtoEstaPago(p);
    const vencido  = !pago && vencDate && vencDate < hoje;
    const statusHtml = pago
      ? `<span class="badge badge-confirmado">✅ Pago</span>`
      : vencido
        ? `<span class="badge badge-cancelado">⚠️ Vencido</span>`
        : `<span class="badge badge-agendado">⏳ Pendente</span>`;
    return `
      <tr>
        <td style="white-space:nowrap;${vencido?'color:#c0425d;font-weight:700':''}">${vencFmt}</td>
        <td>
          <strong>${p.descricao}</strong>
          ${p.recorrente ? '<span style="font-size:10px;color:var(--muted);margin-left:6px">🔄 recorrente</span>' : ''}
          ${p.obs ? `<br><span style="font-size:11px;color:var(--muted)">${p.obs}</span>` : ''}
        </td>
        <td><span class="badge" style="background:#f0ebfa;color:var(--plum)">${p.categoria||'—'}</span></td>
        <td class="text-right" style="font-weight:700">${brl(p.valor)}</td>
        <td>${statusHtml}</td>
        <td style="white-space:nowrap">
          ${!pago ? `<button class="btn btn-ghost btn-xs" style="color:var(--sage)" onclick="marcarPago(${p.id})" title="Marcar como pago">✅</button>` : ''}
          <button class="btn btn-ghost btn-xs" onclick="editarPagamento(${p.id})" title="Editar">✏️</button>
          <button class="btn btn-ghost btn-xs" style="color:var(--red,#c0425d)" onclick="deletarPagamento(${p.id})" title="Excluir">🗑</button>
        </td>
      </tr>
    `;
  }).join('');
}

function _formPagamento(p = {}) {
  const cats = _pgtoAba === 'empresa' ? CATS_EMPRESA : CATS_PESSOAL;
  const catOpts = cats.map(c => `<option value="${c}" ${p.categoria===c?'selected':''}>${c}</option>`).join('');
  const pagoChecked = p.id ? _pgtoEstaPago(p) : !!p.pago;
  return `
    <div class="form-grid">
      <div class="form-group full">
        <label>Descrição *</label>
        <input type="text" id="fp-desc" value="${p.descricao||''}" placeholder="Ex: Conta de luz" autofocus>
      </div>
      <div class="form-group">
        <label>Categoria</label>
        <select id="fp-cat">
          <option value="">Selecione…</option>
          ${catOpts}
        </select>
      </div>
      <div class="form-group">
        <label>Valor (R$)</label>
        <input type="number" id="fp-valor" value="${p.valor||''}" placeholder="0,00" min="0" step="0.01">
      </div>
      <div class="form-group">
        <label>Vencimento</label>
        <input type="date" id="fp-venc" value="${p.data_vencimento||HOJE()}">
      </div>
      <div class="form-group">
        <label>Data de pagamento</label>
        <input type="date" id="fp-pgto-data" value="${p.data_pagamento||''}">
      </div>
    </div>
    <div style="display:flex;gap:24px;margin-top:14px">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px">
        <input type="checkbox" id="fp-pago" ${pagoChecked?'checked':''} style="accent-color:var(--sage);width:15px;height:15px">
        Pago
      </label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px">
        <input type="checkbox" id="fp-recorrente" ${p.recorrente?'checked':''} style="accent-color:var(--plum);width:15px;height:15px">
        🔄 Recorrente (mensal)
      </label>
    </div>
    <div class="form-group" style="margin-top:12px">
      <label>Observação</label>
      <input type="text" id="fp-obs" value="${p.obs||''}" placeholder="Opcional">
    </div>
  `;
}

function _coletarPagamento(original = {}) {
  const recorrente = document.getElementById('fp-recorrente').checked;
  const pagoChecked = document.getElementById('fp-pago').checked;

  let pago_meses = original.pago_meses || '[]';
  let pago = pagoChecked ? 1 : 0;

  if (recorrente) {
    const mesRef = _pgtoMesRef();
    let meses = [];
    try { meses = JSON.parse(pago_meses); } catch(_) {}
    if (pagoChecked && !meses.includes(mesRef)) meses.push(mesRef);
    if (!pagoChecked) meses = meses.filter(m => m !== mesRef);
    pago_meses = JSON.stringify(meses);
    pago = 0; // recorrente usa pago_meses
  }

  return {
    tipo:            _pgtoAba,
    descricao:       document.getElementById('fp-desc').value.trim(),
    categoria:       document.getElementById('fp-cat').value,
    valor:           parseFloat(document.getElementById('fp-valor').value) || 0,
    data_vencimento: document.getElementById('fp-venc').value || null,
    data_pagamento:  pagoChecked ? (document.getElementById('fp-pgto-data').value || HOJE()) : null,
    pago,
    recorrente:      recorrente ? 1 : 0,
    obs:             document.getElementById('fp-obs').value.trim() || null,
    pago_meses,
  };
}

function novoPagamento() {
  const abaLabel = _pgtoAba === 'empresa' ? '🏢 Empresa' : '👤 Pessoal';
  openModal(`+ Novo Pagamento — ${abaLabel}`, _formPagamento(), async () => {
    const d = _coletarPagamento();
    if (!d.descricao) return toast('Informe a descrição', 'error') || false;
    await api('POST', '/pagamentos', d);
    toast('Pagamento adicionado!');
    loadPagamentos();
  });
}

function editarPagamento(id) {
  const p = _pgtoData.find(x => x.id === id);
  if (!p) return;
  openModal('✏️ Editar Pagamento', _formPagamento(p), async () => {
    const d = _coletarPagamento(p);
    if (!d.descricao) return toast('Informe a descrição', 'error') || false;
    await api('PUT', `/pagamentos/${id}`, d);
    toast('Pagamento atualizado!');
    loadPagamentos();
  });
}

async function marcarPago(id) {
  const p = _pgtoData.find(x => x.id === id);
  if (!p) return;
  if (p.recorrente) {
    // Registra pagamento deste mês específico no array pago_meses
    const mesRef = _pgtoMesRef();
    let meses = [];
    try { meses = JSON.parse(p.pago_meses || '[]'); } catch(_) {}
    if (!meses.includes(mesRef)) meses.push(mesRef);
    await api('PUT', `/pagamentos/${id}`, { ...p, pago_meses: JSON.stringify(meses), data_pagamento: HOJE() });
  } else {
    await api('PUT', `/pagamentos/${id}`, { ...p, pago: 1, data_pagamento: HOJE() });
  }
  toast('Marcado como pago ✅');
  loadPagamentos();
}

async function deletarPagamento(id) {
  if (!confirm('Excluir este pagamento?')) return;
  await api('DELETE', `/pagamentos/${id}`);
  toast('Pagamento excluído');
  loadPagamentos();
}

// ─── RELATÓRIOS ──────────────────────────────────────────────
const _relCharts = {};

function relDestroyChart(id) {
  if (_relCharts[id]) { _relCharts[id].destroy(); delete _relCharts[id]; }
}

function relMkChart(id, type, labels, datasets, opts = {}) {
  relDestroyChart(id);
  const ctx = document.getElementById(id);
  if (!ctx) return;
  _relCharts[id] = new Chart(ctx, {
    type,
    data: { labels, datasets },
    options: {
      responsive: true,
      plugins: { legend: { display: opts.legend ?? (type === 'pie' || type === 'doughnut') } },
      scales: (type === 'pie' || type === 'doughnut') ? {} : {
        x: { ticks: { font: { size: 11 } } },
        y: { beginAtZero: true, ticks: { font: { size: 11 } } }
      },
      ...opts.extra
    }
  });
}

function brl(v) { return 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

let _relData = null;

async function loadRelatorios() {
  _relData = await api('GET', '/relatorios');
  const d = _relData;
  const PLUM = '#7b5ea7', ROSE = '#d4869b', SAGE = '#8aab8e', LAVENDER = '#a9b4d8';
  const COLORS6 = [PLUM, ROSE, SAGE, LAVENDER, '#c4945a', '#e8c8a0'];

  // ── Cards de resumo ────────────────────────────────────────
  document.getElementById('rel-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${d.totais?.total_sessoes ?? 0}</div>
      <div class="stat-label">Sessões Realizadas</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${d.totalClientes}</div>
      <div class="stat-label">Clientes Ativos</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${brl(d.totais?.receita_total)}</div>
      <div class="stat-label">Receita Confirmada</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${Number(d.mediaSemana || 0).toFixed(1)}</div>
      <div class="stat-label">Média Sessões/Semana</div>
    </div>
  `;

  // ── Sessões por mês ────────────────────────────────────────
  const meses = d.sessoesPorMes.map(r => {
    const [ano, mes] = r.mes.split('-');
    return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][parseInt(mes)-1] + '/' + ano.slice(2);
  });
  relMkChart('chart-sessoes-mes', 'line', meses,
    [{ label: 'Sessões', data: d.sessoesPorMes.map(r => r.total),
       borderColor: PLUM, backgroundColor: PLUM + '22', tension: 0.3, fill: true, pointRadius: 4 }]);

  // ── Receita por mês ────────────────────────────────────────
  const mesesRec = d.receitaPorMes.map(r => {
    const [ano, mes] = r.mes.split('-');
    return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][parseInt(mes)-1] + '/' + ano.slice(2);
  });
  relMkChart('chart-receita-mes', 'bar', mesesRec,
    [{ label: 'Receita (R$)', data: d.receitaPorMes.map(r => r.receita),
       backgroundColor: SAGE + 'cc', borderRadius: 6 }]);

  // ── Sessões por dia da semana ──────────────────────────────
  const diasNome = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const diaMap = Object.fromEntries(d.sessoesPorDia.map(r => [r.dia, r.total]));
  relMkChart('chart-dia-semana', 'bar',
    diasNome,
    [{ label: 'Sessões', data: diasNome.map((_, i) => diaMap[i] || 0),
       backgroundColor: [PLUM+'44',PLUM+'aa',PLUM+'cc',PLUM+'ff',PLUM+'cc',PLUM+'aa',PLUM+'44'],
       borderRadius: 6 }],
    { legend: false });

  // ── Sessões por hora ───────────────────────────────────────
  relMkChart('chart-hora', 'bar',
    d.sessoesPorHora.map(r => r.hora_n + ':00'),
    [{ label: 'Sessões', data: d.sessoesPorHora.map(r => r.total),
       backgroundColor: ROSE + 'bb', borderRadius: 6 }],
    { legend: false });

  // ── Gênero ─────────────────────────────────────────────────
  const genLabel = { F: 'Feminino', M: 'Masculino', O: 'Outro' };
  relMkChart('chart-genero', 'doughnut',
    d.porGenero.map(r => genLabel[r.sexo] || r.sexo),
    [{ data: d.porGenero.map(r => r.total), backgroundColor: COLORS6 }],
    { legend: true });

  // ── Faixa etária ───────────────────────────────────────────
  relMkChart('chart-idade', 'bar',
    d.porIdade.map(r => r.faixa),
    [{ label: 'Clientes', data: d.porIdade.map(r => r.total),
       backgroundColor: LAVENDER + 'cc', borderRadius: 6 }],
    { legend: false });

  // ── Status sessões ─────────────────────────────────────────
  const statusCor = { realizado: SAGE, agendado: LAVENDER, cancelado: '#e07070', remarcado: '#e8c8a0' };
  relMkChart('chart-status', 'doughnut',
    d.statusSessoes.map(r => r.status),
    [{ data: d.statusSessoes.map(r => r.total),
       backgroundColor: d.statusSessoes.map(r => statusCor[r.status] || COLORS6[3]) }],
    { legend: true });

  // ── Top clientes (gráfico horizontal) ─────────────────────
  const topNomes = d.topClientes.map(r => (r.apelido || r.nome.split(' ')[0]));
  relMkChart('chart-top-clientes', 'bar',
    topNomes,
    [{ label: 'Sessões', data: d.topClientes.map(r => r.total_sessoes),
       backgroundColor: PLUM + 'bb', borderRadius: 6 }],
    { legend: false, extra: { indexAxis: 'y' } });

  // ── Tabela top clientes ────────────────────────────────────
  if (d.topClientes.length) {
    _sortInit('rel-top-tbody', d.topClientes, (r, i) => `<tr>
      <td><strong style="color:var(--plum)">#${i+1}</strong></td>
      <td>${r.nome}</td>
      <td class="text-right">${r.total_sessoes}</td>
      <td class="text-right">${brl(r.receita_total)}</td>
      <td class="text-right">${brl(r.total_sessoes ? r.receita_total / r.total_sessoes : 0)}</td>
    </tr>`, 'total_sessoes');
    _sortState['rel-top-tbody'].asc = false;
    _sortRender('rel-top-tbody');
  } else {
    document.getElementById('rel-top-tbody').innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted)">Nenhuma sessão realizada ainda</td></tr>`;
  }

  // ── Tabela semanas ─────────────────────────────────────────
  document.getElementById('rel-semana-tbody').innerHTML = d.sessoesPorSemana.map(r => `
    <tr>
      <td>${r.semana}</td>
      <td class="text-right">${r.total}</td>
      <td class="text-right">${brl(r.receita)}</td>
    </tr>
  `).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--muted)">Sem dados</td></tr>`;
}

function exportarRelatorioCSV() {
  if (!_relData) return;
  const d = _relData;
  const linhas = [
    ['Cliente', 'Sessões Realizadas', 'Receita Total (R$)', 'Média por Sessão (R$)'],
    ...d.topClientes.map(r => [
      r.nome,
      r.total_sessoes,
      Number(r.receita_total || 0).toFixed(2).replace('.', ','),
      Number(r.total_sessoes ? r.receita_total / r.total_sessoes : 0).toFixed(2).replace('.', ',')
    ])
  ];
  _downloadCSV(linhas, 'relatorio_geral');
}

// ── Filtros ───────────────────────────────────────────────────
let _relFiltradoData = null;

function _downloadCSV(linhas, nome) {
  const csv = linhas.map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `${nome}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

function toggleFiltroRel() {
  const p = document.getElementById('rel-filtro-painel');
  const aberto = p.style.display !== 'none';
  p.style.display = aberto ? 'none' : 'block';
  if (!aberto) preencherSelectClientes();
}

async function preencherSelectClientes() {
  const sel = document.getElementById('fil-cliente');
  if (sel.options.length > 1) return;
  const pacs = await api('GET', '/pacientes');
  pacs.filter(p => p.ativo).sort((a,b) => a.nome.localeCompare(b.nome)).forEach(p => {
    const o = document.createElement('option');
    o.value = p.id;
    o.textContent = p.nome + (p.apelido ? ` (${p.apelido})` : '');
    sel.appendChild(o);
  });
}

function limparFiltroRel() {
  document.getElementById('fil-cliente').value = '';
  document.getElementById('fil-data-ini').value = '';
  document.getElementById('fil-data-fim').value = '';
  document.getElementById('fil-status').value = '';
  document.getElementById('rel-filtrado-resultado').style.display = 'none';
  document.getElementById('btn-export-filtrado').style.display = 'none';
  _relFiltradoData = null;
}

async function gerarRelatorioFiltrado() {
  const paciente_id = document.getElementById('fil-cliente').value;
  const data_ini    = document.getElementById('fil-data-ini').value;
  const data_fim    = document.getElementById('fil-data-fim').value;
  const status      = document.getElementById('fil-status').value;

  const params = new URLSearchParams();
  if (paciente_id) params.set('paciente_id', paciente_id);
  if (data_ini)    params.set('data_ini', data_ini);
  if (data_fim)    params.set('data_fim', data_fim);
  if (status)      params.set('status', status);

  const d = await api('GET', `/relatorios/filtrado?${params}`);
  _relFiltradoData = d;

  const resultado = document.getElementById('rel-filtrado-resultado');
  resultado.style.display = 'block';
  document.getElementById('btn-export-filtrado').style.display = '';
  resultado.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Título dinâmico
  const nomePac = document.getElementById('fil-cliente').selectedOptions[0]?.text || 'Todos os clientes';
  const periodoTxt = data_ini || data_fim
    ? ` | ${data_ini ? data_ini.split('-').reverse().join('/') : '...'} → ${data_fim ? data_fim.split('-').reverse().join('/') : '...'}`
    : '';
  const statusTxt = status ? ` | ${status}` : '';
  document.getElementById('rel-filtrado-titulo').textContent =
    `📋 ${nomePac}${periodoTxt}${statusTxt}`;

  // Cards de resumo
  const t = d.totais;
  document.getElementById('rel-filtrado-stats').innerHTML = `
    <div class="stat-card"><div class="stat-value">${t.total}</div><div class="stat-label">Total de Sessões</div></div>
    <div class="stat-card"><div class="stat-value">${t.realizadas}</div><div class="stat-label">Realizadas</div></div>
    <div class="stat-card"><div class="stat-value">${t.canceladas}</div><div class="stat-label">Canceladas</div></div>
    <div class="stat-card"><div class="stat-value">${brl(t.receita_total)}</div><div class="stat-label">Receita Total</div></div>
    <div class="stat-card"><div class="stat-value">${brl(t.receita_paga)}</div><div class="stat-label">Receita Paga</div></div>
  `;

  const statusBadge = {
    realizado: 'badge-confirmado', agendado: 'badge-agendado',
    cancelado: 'badge-cancelado',  remarcado: 'badge-remarcado'
  };

  // Tabela detalhada
  document.getElementById('rel-filtrado-tbody').innerHTML = d.sessoes.length
    ? d.sessoes.map(s => {
        const [a,m,di] = (s.data || '').split('-');
        const dataFmt = di ? `${di}/${m}/${a}` : '—';
        return `
          <tr>
            <td style="white-space:nowrap"><strong>${dataFmt}</strong></td>
            <td>${s.hora || '—'}</td>
            <td>${s.paciente_apelido || s.paciente_nome}</td>
            <td>${s.tipo || '—'}</td>
            <td><span class="badge ${statusBadge[s.status] || ''}">${s.status || '—'}</span></td>
            <td class="text-right">${s.valor ? brl(s.valor) : '—'}</td>
            <td style="text-align:center">${s.pago ? '✅' : '—'}</td>
          </tr>`;
      }).join('')
    : `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:20px">Nenhuma sessão encontrada com esses filtros.</td></tr>`;

  document.getElementById('rel-filtrado-rodape').textContent =
    `${d.sessoes.length} registro(s) encontrado(s)`;
}

function exportarFiltradoCSV() {
  if (!_relFiltradoData) return;
  const linhas = [
    ['Data', 'Hora', 'Cliente', 'Tipo', 'Status', 'Valor (R$)', 'Pago'],
    ..._relFiltradoData.sessoes.map(s => {
      const [a,m,d] = (s.data || '').split('-');
      return [
        d ? `${d}/${m}/${a}` : '',
        s.hora || '',
        s.paciente_nome,
        s.tipo || '',
        s.status || '',
        Number(s.valor || 0).toFixed(2).replace('.', ','),
        s.pago ? 'Sim' : 'Não'
      ];
    })
  ];
  _downloadCSV(linhas, 'relatorio_filtrado');
}

const _finFiltros = new Set();
let _finPeriodo = 'mes'; // 'ano' | 'mes' | 'semana'

function _finSemanaSegunda() {
  const hoje = new Date();
  const dow = hoje.getDay();
  const seg = new Date(hoje);
  seg.setDate(hoje.getDate() - (dow === 0 ? 6 : dow - 1));
  return seg.toISOString().slice(0, 10);
}
let _finSemanaIni = _finSemanaSegunda();

function finSetPeriodo(p) {
  _finPeriodo = p;
  _finFiltros.delete('semana');
  _finFiltros.delete('ano');
  if (p === 'ano')    _finFiltros.add('ano');
  if (p === 'semana') { _finFiltros.add('semana'); _finSemanaIni = _finSemanaSegunda(); }
  if (p === 'mes') { const n = new Date(); _finMes = n.getMonth()+1; _finAno = n.getFullYear(); }
  loadFinanceiro();
}

function finNavPeriodo(delta) {
  if (_finPeriodo === 'ano') {
    _finAno += delta;
    loadFinanceiro();
  } else if (_finPeriodo === 'semana') {
    const d = new Date(_finSemanaIni + 'T12:00:00');
    d.setDate(d.getDate() + delta * 7);
    _finSemanaIni = d.toISOString().slice(0, 10);
    loadFinanceiro();
  } else {
    finNavMes(delta);
  }
}

function finToggleFiltro(nome) {
  // Apenas filtros client-side (recebido/pendente/comnfse/semnota/pix/cartao)
  if (_finFiltros.has(nome)) {
    _finFiltros.delete(nome);
    document.getElementById('ff-' + nome)?.classList.remove('ativo');
  } else {
    _finFiltros.add(nome);
    document.getElementById('ff-' + nome)?.classList.add('ativo');
  }
  finListaFiltrar();
}

async function loadFinanceiro() {
  updateFinMesLabel();
  const mesParam = (_finPeriodo === 'ano' || _finPeriodo === 'semana') ? 0 : _finMes;
  const [data, prevPgto, proj] = await Promise.all([
    api('GET', `/financeiro?ano=${_finAno}&mes=${mesParam}`),
    api('GET', `/financeiro/previsao-pgto?hoje=${HOJE()}`),
    api('GET', `/financeiro/projecao-recorrente`)
  ]);
  _previsaoPgto = prevPgto;
  renderTabPgto();

  // Projeção recorrente baseada em clientes
  const projTbody  = document.getElementById('fin-proj-tbody');
  const projTotais = document.getElementById('fin-proj-totais');
  const freqLabel  = { semanal:'4x ao mês', '1x-mes':'1x ao mês', '2x-mes':'2x ao mês', '4x-mes':'4x ao mês' };
  const fpLabel    = { 'fp-semanal':'Por sessão', 'fp-mensal':'Mensal', 'cada4':'Mensal', 'por-sessao':'Por sessão' };
  const fmLabel    = { pix:'PIX', credito:'Crédito', debito:'Débito', dinheiro:'Dinheiro', transferencia:'Transf.' };
  if (projTbody) {
    projTbody.innerHTML = (proj.itens || []).map(c => {
      const ePorSessao = c.freq_pgto === 'fp-semanal' || c.freq_pgto === 'por-sessao';
      const semStr = ePorSessao
        ? `<span style="color:var(--sage);font-weight:700">${BRL(c.receita_semana)}</span>`
        : `<span style="color:var(--muted);font-size:11px">—</span>`;
      const mesStr = c.freq_pgto === 'fp-mensal'
        ? `<span style="color:var(--plum);font-weight:700">${BRL(c.receita_mes)}</span>`
        : `<span style="color:var(--muted);font-size:11px">—</span>`;
      const totRow = c.receita_mes;
      // Distribuição semanal: 4x=todas, 2x=sem1+sem3, 1x=sem1
      const v = c.valor_sessao;
      const sem = {
        '4x-mes':  [v, v, v, v],
        'semanal': [v, v, v, v],
        '2x-mes':  [v, 0, v, 0],
        '1x-mes':  [v, 0, 0, 0],
      }[c.frequencia] || [0, 0, 0, 0];
      const semCell = s => s > 0 ? `<span style="font-size:11.5px">${BRL(s)}</span>` : `<span style="color:var(--muted);font-size:11px">—</span>`;
      return `<tr>
        <td style="font-weight:600">${c.nome}</td>
        <td><span style="font-size:11.5px">${freqLabel[c.frequencia] || c.frequencia || '—'}</span></td>
        <td><span style="font-size:11.5px">${fpLabel[c.freq_pgto] || c.freq_pgto || '—'}</span></td>
        <td class="text-right">${BRL(c.valor_sessao)}</td>
        <td class="text-right">${mesStr}</td>
        <td class="text-right">${semCell(sem[0])}</td>
        <td class="text-right">${semCell(sem[1])}</td>
        <td class="text-right">${semCell(sem[2])}</td>
        <td class="text-right">${semCell(sem[3])}</td>
        <td class="text-right" style="font-weight:700">${totRow > 0 ? BRL(totRow) : '<span style="color:var(--muted);font-size:11px">—</span>'}</td>
      </tr>`;
    }).join('') + (() => {
      const ts = [0,1,2,3].map(i => proj.itens.reduce((s,c) => {
        const v = c.valor_sessao;
        const sem = {'4x-mes':[v,v,v,v],'semanal':[v,v,v,v],'2x-mes':[v,0,v,0],'1x-mes':[v,0,0,0]}[c.frequencia]||[0,0,0,0];
        return s + sem[i];
      }, 0));
      return `<tr style="border-top:2px solid var(--border);background:var(--bg-alt)">
        <td colspan="3" style="font-weight:700;font-size:12.5px">Total estimado (${proj.itens?.length || 0} clientes)</td>
        <td></td>
        <td class="text-right fw-bold" style="color:var(--plum)">${BRL(proj.totalMes)}</td>
        <td class="text-right fw-bold" style="color:var(--plum)">${BRL(ts[0])}</td>
        <td class="text-right fw-bold" style="color:var(--plum)">${BRL(ts[1])}</td>
        <td class="text-right fw-bold" style="color:var(--plum)">${BRL(ts[2])}</td>
        <td class="text-right fw-bold" style="color:var(--plum)">${BRL(ts[3])}</td>
        <td class="text-right fw-bold" style="color:var(--text)">${BRL(proj.itens.reduce((s,c)=>s+c.receita_mes,0))}</td>
      </tr>`;
    })();
  }
  if (projTotais) projTotais.textContent = `Semana: ${BRL(proj.totalSemana)} · Mês: ${BRL(proj.totalMes)} · Total: ${BRL(proj.totalCombinado)}`;

  // Stats
  document.getElementById('fin-stats').innerHTML = `
    <div class="stat-card sage">
      <span class="stat-icon">✅</span>
      <div class="stat-label">Sessões Realizadas</div>
      <div class="stat-value">${data.resumo.total_realizadas}</div>
    </div>
    <div class="stat-card rose">
      <span class="stat-icon">💰</span>
      <div class="stat-label">Faturado</div>
      <div class="stat-value" style="font-size:18px">${BRL(data.resumo.faturado)}</div>
    </div>
    <div class="stat-card lavender">
      <span class="stat-icon">✓</span>
      <div class="stat-label">Recebido</div>
      <div class="stat-value" style="font-size:18px">${BRL(data.resumo.recebido)}</div>
    </div>
    <div class="stat-card peach">
      <span class="stat-icon">⏳</span>
      <div class="stat-label">Pendente</div>
      <div class="stat-value" style="font-size:18px">${BRL(data.resumo.pendente)}</div>
      <div class="stat-sub">${data.resumo.total_faltas} faltas · ${data.resumo.total_canceladas} canceladas</div>
    </div>
    <div class="stat-card plum">
      <span class="stat-icon">📅</span>
      <div class="stat-label">Previsão do Mês</div>
      <div class="stat-value" style="font-size:18px">${BRL(data.resumo.faturado + data.resumo.previsao)}</div>
      <div class="stat-sub">${data.resumo.total_agendadas} sessões agendadas · potencial ${BRL(proj.totalMes)}</div>
    </div>
    <div class="stat-card teal">
      <span class="stat-icon">📆</span>
      <div class="stat-label">Previsão da Semana</div>
      <div class="stat-value" style="font-size:18px">${BRL(prevPgto.semanal.total)}</div>
      <div class="stat-sub">${prevPgto.semanal.sessoes.length} agendadas · potencial ${BRL(proj.totalSemana)}</div>
    </div>
  `;

  // Previsão — lista de sessões agendadas/confirmadas do mês
  const prevTbody = document.getElementById('fin-previsao-tbody');
  const prevTotal = document.getElementById('fin-previsao-total');
  if (!data.previsaoLista?.length) {
    prevTbody.innerHTML = `<tr><td colspan="5" class="text-muted" style="text-align:center;padding:20px">Nenhuma sessão agendada neste mês</td></tr>`;
    prevTotal.textContent = '';
  } else {
    prevTotal.textContent = `Total esperado: ${BRL(data.resumo.faturado + data.resumo.previsao)}`;
    const statusLabel = { agendado: 'Agendado', confirmado: 'Confirmado ✓' };
    prevTbody.innerHTML = data.previsaoLista.map(a => `
      <tr>
        <td>${fmtData(a.data)}</td>
        <td>${a.hora}</td>
        <td>${a.paciente_nome || '—'}</td>
        <td class="text-right fw-bold" style="color:var(--plum)">${BRL(a.valor)}</td>
        <td><span style="color:var(--muted);font-size:12px">${statusLabel[a.status] || a.status}</span></td>
      </tr>
    `).join('');
  }

  // Gráfico por dia
  const chartEl = document.getElementById('fin-chart');
  if (!data.porDia.length) {
    chartEl.innerHTML = '<p class="text-muted" style="text-align:center;padding:20px 0">Sem dados neste mês</p>';
  } else {
    const maxVal = Math.max(...data.porDia.map(r => r.valor), 1);
    chartEl.innerHTML = data.porDia.map(r => {
      const [, , d] = r.data.split('-');
      const pct = Math.round((r.valor / maxVal) * 100);
      return `
        <div class="fin-bar-row">
          <div class="fin-bar-label">Dia ${parseInt(d)}</div>
          <div class="fin-bar-track"><div class="fin-bar-fill" style="width:${pct}%"></div></div>
          <div class="fin-bar-val">${BRL(r.valor)}</div>
        </div>
      `;
    }).join('');
  }

  // Pendentes
  const pendTbody = document.getElementById('fin-pendentes-tbody');
  const pixKey     = _config?.chave_pix      || '';
  const pixKeyCnpj = _config?.chave_pix_cnpj || '';
  _pendDados = data.pendentes;
  const chkAll = document.getElementById('pend-chk-all');
  if (chkAll) chkAll.checked = false;
  _pendRenderizar();

  // Lista completa
  if (!data.lista.length) {
    document.getElementById('fin-lista-tbody').innerHTML = `<tr><td colspan="8" class="text-muted" style="text-align:center;padding:20px">Nenhuma sessão realizada neste período</td></tr>`;
    _sortState['fin-lista-tbody'] = null;
  } else {
    _finPixKey = pixKey;
    _finPixKeyCnpj = pixKeyCnpj;
    _sortInit('fin-lista-tbody', data.lista, _renderFinRow, 'data');
    finListaFiltrar();
  }

  _finIniciarDrag();
  _restaurarFinLayout();
}

// ── UTILITÁRIO DE ORDENAÇÃO GENÉRICA ─────────────────────────
const _sortState = {};

function sortPor(tbodyId, col) {
  const s = _sortState[tbodyId];
  if (!s) return;
  if (s.col === col) s.asc = !s.asc;
  else { s.col = col; s.asc = true; }
  if (tbodyId === 'fin-lista-tbody') localStorage.setItem('sort_fin_lista', JSON.stringify({ col: s.col, asc: s.asc }));
  _sortRender(tbodyId);
}

function _sortInit(tbodyId, dados, renderFn, defaultCol = null) {
  let col = defaultCol, asc = true;
  if (tbodyId === 'fin-lista-tbody') {
    try { const s = JSON.parse(localStorage.getItem('sort_fin_lista')); if (s) { col = s.col; asc = s.asc; } } catch(_) {}
  }
  _sortState[tbodyId] = { col, asc, dados, renderFn };
  _sortRender(tbodyId);
}

function _sortRender(tbodyId) {
  const s = _sortState[tbodyId];
  if (!s) return;
  document.querySelectorAll(`[data-sort-for="${tbodyId}"]`).forEach(th => {
    const ind = th.querySelector('.sort-ind');
    if (ind) ind.textContent = s.col === th.dataset.sortCol ? (s.asc ? ' ▲' : ' ▼') : '';
  });
  const base = s.dadosFiltrados || s.dados;
  const sorted = s.col ? [...base].sort((a, b) => {
    let va = a[s.col] ?? '', vb = b[s.col] ?? '';
    const isNum = typeof va === 'number' || (va !== '' && !isNaN(Number(va)));
    if (isNum) { va = Number(va) || 0; vb = Number(vb) || 0; }
    else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase(); }
    return va < vb ? (s.asc ? -1 : 1) : va > vb ? (s.asc ? 1 : -1) : 0;
  }) : [...base];
  document.getElementById(tbodyId).innerHTML = sorted.map((item, i) => s.renderFn(item, i)).join('');
}

let _finPixKey = '';
let _finPixKeyCnpj = '';
const _finFormaLabel = { dinheiro:'Dinheiro', pix:'PIX', credito:'Crédito', debito:'Débito', convenio:'Convênio', transferencia:'TED/PIX' };
function _renderFinRow(a) {
  const nfCell = a.paciente_nota_fiscal === 'sim'
    ? `<button class="btn-nfse" onclick="abrirModalNfse(${a.paciente_id},${_finAno},${_finMes})" title="Emitir NFS-e">📄 NFS-e</button>`
    : '<span style="color:var(--muted);font-size:11px">—</span>';
  const nfseEmitidaCell = a.nfse_ref
    ? (a.nfse_manual
        ? `<button onclick="nfseToggle(${a.id},${a.paciente_id},true)" style="background:#e8eaf6;color:#3949ab;border:1.5px solid #3949ab;font-weight:700;padding:2px 8px;border-radius:5px;font-size:11px;white-space:nowrap;cursor:pointer;min-width:88px">✓ Emitida Manu</button>`
        : `<button onclick="nfseToggle(${a.id},${a.paciente_id},true)" style="background:#e8f5e9;color:#388e3c;border:1.5px solid #388e3c;font-weight:700;padding:2px 8px;border-radius:5px;font-size:11px;white-space:nowrap;cursor:pointer;min-width:88px">✓ Emitida</button>`)
    : `<button onclick="nfseToggle(${a.id},${a.paciente_id},false)" style="background:#fff;color:transparent;border:1.5px solid #c8e6c9;padding:2px 8px;border-radius:5px;font-size:11px;cursor:pointer;min-width:88px">✓ Emitida</button>`;
  const nomeSafe = (a.paciente_nome || '').replace(/'/g, '');
  return `
    <tr>
      <td style="width:30px;text-align:center"><input type="checkbox" class="fin-lista-chk" data-id="${a.id}" data-pid="${a.paciente_id}" data-pnome="${nomeSafe}" data-nf="${a.paciente_nota_fiscal||''}" onchange="finListaChkChanged()" style="cursor:pointer"></td>
      <td>${fmtData(a.data)}</td>
      <td>${a.hora}</td>
      <td>${a.paciente_nome || '—'}</td>
      <td class="text-right fw-bold">${BRL(a.valor)}</td>
      <td>${a.pago
        ? `<button class="btn btn-xs" style="background:#e8f5e9;color:#388e3c;border:1.5px solid #388e3c;font-weight:700;padding:2px 8px" onclick="marcarPendente(${a.id})" title="Desfazer recebimento">✓ Pago</button>`
        : `<button class="btn btn-xs" style="background:#fff3e0;color:#e65100;border:1.5px solid #e65100;font-weight:700;padding:2px 8px" onclick="pagarRapido(${a.id})" title="Registrar recebimento">Pendente</button>`}</td>
      <td style="font-size:12px;color:var(--muted)">${a.data_pagamento ? fmtData(a.data_pagamento) : '—'}</td>
      <td>${_finFormaLabel[a.forma_pgto] || a.forma_pgto || '—'}</td>
      <td>${nfCell}</td>
      <td>${nfseEmitidaCell}</td>
    </tr>
  `;
}

function finListaChkAll(chk) {
  document.querySelectorAll('.fin-lista-chk').forEach(c => c.checked = chk.checked);
  finListaChkChanged();
}

function finListaChkChanged() {
  const checked = [...document.querySelectorAll('.fin-lista-chk:checked')];
  const bar  = document.getElementById('fin-nfse-sel-bar');
  const info = document.getElementById('fin-nfse-sel-info');
  const btn  = document.getElementById('fin-nfse-sel-btn');
  if (!bar) return;
  if (!checked.length) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  const pids = [...new Set(checked.map(c => c.dataset.pid))];
  if (pids.length > 1) {
    info.textContent = `${checked.length} sessões · ${pids.length} clientes — selecione só um`;
    btn.disabled = true;
  } else {
    info.textContent = `${checked.length} sessão(ões) · ${checked[0].dataset.pnome}`;
    btn.disabled = false;
  }
}

function finListaDesmarcar() {
  document.querySelectorAll('.fin-lista-chk').forEach(c => c.checked = false);
  const chkAll = document.getElementById('fin-lista-chk-all');
  if (chkAll) chkAll.checked = false;
  const bar = document.getElementById('fin-nfse-sel-bar');
  if (bar) bar.style.display = 'none';
}

async function finListaNfseSelected() {
  const checked = [...document.querySelectorAll('.fin-lista-chk:checked')];
  if (!checked.length) return;
  const ids        = checked.map(c => Number(c.dataset.id));
  const pacienteId = Number(checked[0].dataset.pid);
  try {
    await abrirModalNfse(pacienteId, _finAno, _finMes, ids);
  } catch(e) {
    toast('Erro ao abrir NFS-e: ' + e.message, 'error');
  }
}

let _pendDados = [];
let _pendSortCol = (() => { try { return JSON.parse(localStorage.getItem('sort_pend'))?.col || 'data'; } catch(_) { return 'data'; } })();
let _pendSortAsc = (() => { try { const s = JSON.parse(localStorage.getItem('sort_pend')); return s ? s.asc : true; } catch(_) { return true; } })();

function pendSelecionarTodos(chkAll) {
  document.querySelectorAll('.pend-chk').forEach(c => c.checked = chkAll.checked);
}

function pendOrdenar(col) {
  if (_pendSortCol === col) { _pendSortAsc = !_pendSortAsc; }
  else { _pendSortCol = col; _pendSortAsc = true; }
  localStorage.setItem('sort_pend', JSON.stringify({ col: _pendSortCol, asc: _pendSortAsc }));
  _pendRenderizar();
}

function pendFiltrar() { _pendRenderizar(); }

function finListaFiltrar() {
  const s = _sortState['fin-lista-tbody'];
  if (!s) return;
  const termo = (document.getElementById('fin-lista-busca')?.value || '').toLowerCase().trim();
  let f = s.dados;
  if (termo) f = f.filter(a => (a.paciente_nome || '').toLowerCase().includes(termo));

  // Semana: filtra pela semana navegada
  if (_finFiltros.has('semana')) {
    const seg = new Date(_finSemanaIni + 'T12:00:00');
    const dom = new Date(seg); dom.setDate(seg.getDate() + 6);
    const de  = _finSemanaIni;
    const ate = dom.toISOString().slice(0, 10);
    f = f.filter(a => a.data >= de && a.data <= ate);
  }

  // Recebido / Pendente
  const hasRec = _finFiltros.has('recebido'), hasPend = _finFiltros.has('pendente');
  if (hasRec && !hasPend)  f = f.filter(a => a.pago === 1);
  if (hasPend && !hasRec)  f = f.filter(a => !a.pago);

  // Com NFS-e / Sem nota
  const hasNf = _finFiltros.has('comnfse'), hasSem = _finFiltros.has('semnota');
  if (hasNf  && !hasSem)   f = f.filter(a => a.paciente_nota_fiscal === 'sim');
  if (hasSem && !hasNf)    f = f.filter(a => a.paciente_nota_fiscal !== 'sim');

  // PIX / Cartão
  const hasPix = _finFiltros.has('pix'), hasCart = _finFiltros.has('cartao');
  if (hasPix && !hasCart)  f = f.filter(a => a.forma_pgto === 'pix');
  if (hasCart && !hasPix)  f = f.filter(a => ['credito','debito'].includes(a.forma_pgto));
  if (hasPix && hasCart)   f = f.filter(a => a.forma_pgto === 'pix' || ['credito','debito'].includes(a.forma_pgto));

  s.dadosFiltrados = f.length < s.dados.length || termo ? f : null;
  _sortRender('fin-lista-tbody');
}

function _pendRenderizar() {
  if (!document.getElementById('fin-pendentes-tbody')) return;
  const pixKey     = _config?.chave_pix      || '';
  const pixKeyCnpj = _config?.chave_pix_cnpj || '';

  // Atualizar indicadores de ordenação
  ['data','nome','valor'].forEach(c => {
    const el = document.getElementById('pend-sort-' + c);
    if (el) el.textContent = _pendSortCol === c ? (_pendSortAsc ? '▲' : '▼') : '';
  });

  const termoPend = (document.getElementById('pend-busca')?.value || '').toLowerCase().trim();
  const dadosFiltrados = termoPend ? _pendDados.filter(a => (a.paciente_nome || '').toLowerCase().includes(termoPend)) : _pendDados;
  const sorted = [...dadosFiltrados].sort((a, b) => {
    let va, vb;
    if (_pendSortCol === 'data')  { va = a.data; vb = b.data; }
    else if (_pendSortCol === 'nome')  { va = (a.paciente_nome||'').toLowerCase(); vb = (b.paciente_nome||'').toLowerCase(); }
    else if (_pendSortCol === 'valor') { va = parseFloat(a.valor)||0; vb = parseFloat(b.valor)||0; }
    if (va < vb) return _pendSortAsc ? -1 : 1;
    if (va > vb) return _pendSortAsc ?  1 : -1;
    return 0;
  });

  const pendTbody = document.getElementById('fin-pendentes-tbody');
  if (!sorted.length) {
    pendTbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="text-align:center;padding:20px">Sem pendências 🎉</td></tr>`;
    return;
  }

  pendTbody.innerHTML = sorted.map(a => {
    const nfCell = a.paciente_nota_fiscal === 'sim'
      ? `<button class="btn-nfse" onclick="abrirModalNfse(${a.paciente_id},${_finAno},${_finMes})" title="Emitir NFS-e">📄 NFS-e</button>`
      : '<span style="color:var(--muted);font-size:11px">—</span>';
    const usaCnpj  = a.paciente_nota_fiscal === 'sim';
    const pixTipo  = usaCnpj ? 'cnpj' : 'cpf';
    const pixLabel = usaCnpj ? 'CNPJ 📋' : 'CPF 📋';
    const pixAtivo = usaCnpj ? pixKeyCnpj : pixKey;
    const pixCell  = pixAtivo
      ? `<button class="btn-pix-copy" title="PIX ${pixTipo.toUpperCase()}" onclick="copiarPixKey('${pixTipo}')">${pixLabel}</button>`
      : '<span style="color:var(--muted);font-size:11px">—</span>';
    const dadosJson = JSON.stringify({ id: a.id, paciente_id: a.paciente_id, nome: a.paciente_nome,
      apelido: a.paciente_apelido, wpp: a.paciente_whatsapp, data: a.data, valor: a.valor,
      nf: a.paciente_nota_fiscal }).replace(/"/g, '&quot;');
    return `
      <tr>
        <td style="text-align:center"><input type="checkbox" class="pend-chk" data-sessao="${dadosJson}"></td>
        <td>${fmtData(a.data)}</td>
        <td>${a.paciente_nome || '—'}</td>
        <td class="text-right fw-bold" style="color:var(--peach)">${BRL(a.valor)}</td>
        <td>${nfCell}</td>
        <td>${pixCell}</td>
        <td><button class="btn btn-sage btn-xs" onclick="marcarPago(${a.id})">✓ Recebido</button></td>
      </tr>
    `;
  }).join('');
}

function dispararCobrancas() {
  const selecionados = [...document.querySelectorAll('.pend-chk:checked')]
    .map(c => JSON.parse(c.dataset.sessao.replace(/&quot;/g, '"')));

  if (!selecionados.length) return toast('Selecione pelo menos uma pendência', 'error');

  // Agrupar por paciente
  const porPaciente = {};
  selecionados.forEach(s => {
    if (!porPaciente[s.paciente_id]) porPaciente[s.paciente_id] = { ...s, sessoes: [] };
    porPaciente[s.paciente_id].sessoes.push({ data: s.data, valor: s.valor });
  });

  const fmtDia = d => {
    const [y, m, dia] = d.split('-');
    return `${dia}/${m}/${y}`;
  };

  const itens = Object.values(porPaciente);

  const html = `
    <div style="display:flex;flex-direction:column;gap:14px">
      ${itens.map((p, i) => {
        const usaCnpj = p.nf === 'sim';
        const pixKey  = usaCnpj ? (_config?.chave_pix_cnpj || '') : (_config?.chave_pix || '');
        const pixTipo = usaCnpj ? 'CNPJ' : 'CPF';
        const total   = p.sessoes.reduce((acc, s) => acc + parseFloat(s.valor || 0), 0);
        const datas   = p.sessoes.map(s => fmtDia(s.data)).join(', ');
        const sessoesLinha = p.sessoes.length === 1
          ? `sessão de orientação profissional realizada em ${datas}`
          : `sessões de orientação profissional realizadas em ${datas}`;
        const nomeExibir = p.apelido || p.nome?.split(' ')[0] || p.nome;
        const msg = `Oi ${nomeExibir}, abaixo dados para pagamento das ${sessoesLinha}.\n`
          + (p.sessoes.length > 1 ? `Valor total: ${BRL(total)}\n` : `Valor: ${BRL(total)}\n`)
          + `\nAbaixo dados para transferência:\n`
          + `PIX ${pixTipo}: ${pixKey || '(configure a chave PIX em Configurações)'}\n`
          + `\nPor favor, encaminhar o recibo da transferência.\n\nObrigada e um beijo!`;
        const waNum = toWaNum(p.wpp || '');
        const waEnviar = waNum
          ? `onclick="window.open('https://wa.me/${waNum}?text='+encodeURIComponent(document.getElementById('cobranca-msg-${i}').value),'_blank')"`
          : '';
        return `
          <div style="border:1px solid var(--border);border-radius:8px;padding:12px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <strong>${p.nome}</strong>
              ${waNum
                ? `<button class="btn btn-sage btn-sm" ${waEnviar}>📲 Enviar WhatsApp</button>`
                : `<span style="color:var(--muted);font-size:12px">⚠️ Sem WhatsApp cadastrado</span>`}
            </div>
            <textarea id="cobranca-msg-${i}" style="width:100%;font-size:12px;line-height:1.5;border:1px solid var(--border);border-radius:6px;padding:8px;resize:vertical;background:var(--bg);color:var(--text)" rows="7">${msg}</textarea>
          </div>
        `;
      }).join('')}
    </div>
  `;

  openModal('📲 Cobranças via WhatsApp', html, null, { large: true });
}

async function copiarPixKey(tipo = 'cpf') {
  const key = tipo === 'cnpj' ? (_config?.chave_pix_cnpj || '') : (_config?.chave_pix || '');
  if (!key) { toast('Chave PIX não configurada. Vá em ⚙ Configurações.', 'error'); return; }
  try {
    await navigator.clipboard.writeText(key);
    toast(`PIX ${tipo.toUpperCase()} copiado! 📋`);
  } catch(e) {
    toast('Não foi possível copiar. Chave: ' + key, 'error');
  }
}

// ── NFS-e Helper ──────────────────────────────────────────────
const _NFSE_PORTAL = () => _config?.nfse_url || 'https://webapp1-boituva.cidade360.cloud/NFSe.Portal/';

function _nfseCopiaBotao(label, valor) {
  const id = 'nfse_' + Math.random().toString(36).slice(2);
  return `
    <div class="nfse-linha">
      <span class="nfse-label">${label}</span>
      <span class="nfse-val" id="${id}">${valor || '<span style="color:var(--muted)">—</span>'}</span>
      ${valor ? `<button class="nfse-copy" onclick="nfseCopiar('${id}',this)" title="Copiar">📋</button>` : ''}
    </div>`;
}

async function nfseCopiar(elId, btn) {
  const el  = document.getElementById(elId) || document.querySelector(`[id="${elId}"]`);
  const txt = (el?.value || el?.textContent || '').trim();
  if (!txt) return;
  try {
    await navigator.clipboard.writeText(txt);
    const orig = btn.textContent;
    btn.textContent = '✓';
    setTimeout(() => btn.textContent = orig, 1500);
  } catch(e) { toast('Erro ao copiar', 'error'); }
}

async function marcarNfseManual(pacienteId, ano, mes, ids = null) {
  try {
    const r = await api('POST', '/nfse/marcar', { paciente_id: pacienteId, ano, mes, ids });
    const ref = r.ref || `psi-${pacienteId}-${ano}${String(mes).padStart(2,'0')}`;
    const _s = _sortState['fin-lista-tbody'];
    if (_s) {
      const _mark = row => { if (row.paciente_id == pacienteId) row.nfse_ref = ref; };
      _s.dados.forEach(_mark);
      if (_s.dadosFiltrados) _s.dadosFiltrados.forEach(_mark);
      _sortRender('fin-lista-tbody');
    }
  } catch(_) {}
}

async function emitirNfseFocus(pacienteId, ano, mes, uid, ids = null) {
  const btn      = document.querySelector(`[data-nfse-uid="${uid}"]`);
  const statusEl = document.getElementById(`nfse-emit-status-${uid}`);
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Enviando...'; }
  if (statusEl) statusEl.innerHTML = '';
  closeModal();
  try {
    const body = { paciente_id: pacienteId, ano, mes };
    if (ids?.length) body.agendamento_ids = ids;
    const r = await api('POST', '/nfse/emitir', body);
    // Atualiza célula NFS-e Emitida imediatamente nos dados em memória
    const _nfRef = r.ref || `psi-${pacienteId}-${ano}${String(mes).padStart(2,'0')}`;
    const _s = _sortState['fin-lista-tbody'];
    if (_s) {
      const _mark = row => { if (row.paciente_id == pacienteId && (!ids?.length || ids.includes(Number(row.id)))) { row.nfse_ref = _nfRef; if (r.numero) row.nfse_numero = r.numero; } };
      _s.dados.forEach(_mark);
      if (_s.dadosFiltrados) _s.dadosFiltrados.forEach(_mark);
      _sortRender('fin-lista-tbody');
    }
    loadFinanceiro();
    if (r.status === 'autorizado') {
      if (btn) { btn.textContent = '✅ Nota Emitida!'; btn.style.background = 'var(--sage)'; }
      if (statusEl) statusEl.innerHTML = `NFS-e nº <strong>${r.numero || '—'}</strong>${r.link_pdf ? ` &nbsp;·&nbsp; <a href="${r.link_pdf}" target="_blank">📥 PDF</a>` : ''}`;
      toast('NFS-e emitida com sucesso!');
    } else if (r.status && (r.status.includes('processando') || r.status === 'recebido')) {
      if (btn) btn.textContent = '⏳ Processando...';
      if (statusEl) statusEl.textContent = 'Aguardando autorização...';
      setTimeout(() => _pollNfseStatus(r.ref, btn, statusEl, 0), 3000);
    } else {
      if (btn) { btn.disabled = false; btn.textContent = '🚀 Emitir NFS-e Automaticamente'; }
      if (statusEl) statusEl.textContent = 'Status: ' + r.status;
      toast('NFS-e retornou: ' + r.status, 'error');
    }
  } catch(e) {
    if (btn) { btn.disabled = false; btn.textContent = '🚀 Emitir NFS-e Automaticamente'; }
    toast('Erro ao emitir NFS-e: ' + e.message, 'error');
  }
}

async function _pollNfseStatus(ref, btn, statusEl, tentativas) {
  if (tentativas >= 12) {
    if (statusEl) statusEl.textContent = 'Timeout. Verifique no portal Focus NFe.';
    if (btn) { btn.disabled = false; btn.textContent = '🚀 Emitir NFS-e Automaticamente'; }
    return;
  }
  try {
    const r = await api('GET', `/nfse/status/${encodeURIComponent(ref)}`);
    if (r.status === 'autorizado') {
      if (btn) { btn.textContent = '✅ Nota Emitida!'; btn.style.background = 'var(--sage)'; }
      if (statusEl) statusEl.innerHTML = `NFS-e nº <strong>${r.numero || '—'}</strong>${r.link_pdf ? ` &nbsp;·&nbsp; <a href="${r.link_pdf}" target="_blank">📥 PDF</a>` : ''}`;
      toast('NFS-e emitida com sucesso!');
      loadFinanceiro();
    } else if (r.status && r.status.startsWith('erro')) {
      if (btn) { btn.disabled = false; btn.textContent = '🚀 Emitir NFS-e Automaticamente'; }
      if (statusEl) statusEl.textContent = r.status;
      toast('Erro na autorização: ' + r.status, 'error');
    } else {
      setTimeout(() => _pollNfseStatus(ref, btn, statusEl, tentativas + 1), 3000);
    }
  } catch(_) {
    setTimeout(() => _pollNfseStatus(ref, btn, statusEl, tentativas + 1), 3000);
  }
}

function _gerarDescricaoNfse(p, sessoes, cfg) {
  if (!sessoes.length) return '';
  const datas = sessoes.map(s => {
    const d = new Date(s.data + 'T12:00:00');
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(2)}`;
  });
  const datasStr = datas.length === 1 ? datas[0]
    : datas.length === 2 ? `${datas[0]} e ${datas[1]}`
    : datas.slice(0,-1).join(', ') + ' e ' + datas.at(-1);

  const valor   = parseFloat(sessoes[0]?.valor) || parseFloat(p.valor_sessao) || 0;
  const total   = sessoes.reduce((acc, s) => acc + (parseFloat(s.valor) || 0), 0);
  const n       = sessoes.length;
  const nomePsi = (cfg.nome_psicologa || 'ELISSA CATARINA RAMOS PEREIRA LORENZI').toUpperCase();
  const crp     = cfg.crp || '06/91616';
  const brl     = v => v.toFixed(2).replace('.', ',');

  return `SESSÃO DE PSICOTERAPIA: ${datasStr}. PACIENTE: ${p.nome.toUpperCase()} PSICOLOGA: ${nomePsi} CRP: ${crp} VALOR DA SESSÃO: R$${brl(valor)} VALOR TOTAL DE ${n} ${n === 1 ? 'SESSÃO' : 'SESSÕES'}: R$${brl(total)}. Alíquota Efetiva: 2,0100000000%.`;
}

async function abrirModalNfse(pacienteId, ano, mes, ids = null) {
  marcarNfseManual(pacienteId, ano, mes, ids);
  let dados;
  try {
    const idsParam = ids?.length ? `&ids=${ids.join(',')}` : '';
    dados = await api('GET', `/nfse/dados?paciente_id=${pacienteId}&ano=${ano}&mes=${mes}${idsParam}`);
  } catch(e) {
    return toast('Erro ao carregar dados NFS-e: ' + e.message, 'error');
  }
  const { paciente: p, sessoes, config: cfg } = dados;

  const total     = sessoes.reduce((acc, s) => acc + (parseFloat(s.valor) || 0), 0);
  const descricao = _gerarDescricaoNfse(p, sessoes, cfg);
  const uid       = Date.now();
  const descId    = 'nfse_desc_' + uid;
  const valorId   = 'nfse_val_'  + uid;

  const html = `
    <div class="nfse-modal">
      <div class="nfse-emitir-bar">
        <button class="btn btn-primary" data-nfse-uid="${uid}" onclick="emitirNfseFocus(${pacienteId},${ano},${mes},'${uid}',${ids ? JSON.stringify(ids) : 'null'})">
          🚀 Emitir NFS-e Automaticamente
        </button>
        <span id="nfse-emit-status-${uid}" class="nfse-emit-status"></span>
      </div>

      <div class="nfse-portal-bar">
        <a href="${_NFSE_PORTAL()}" target="_blank" class="btn btn-outline btn-sm" onclick="closeModal()">🌐 Abrir Portal Manual</a>
        <span style="font-size:12px;color:var(--muted)">Login: CPF <strong>${_config?.nfse_cpf || '—'}</strong></span>
      </div>

      <div class="nfse-secao">
        <div class="nfse-secao-titulo">👤 Tomador do Serviço</div>
        ${_nfseCopiaBotao('Nome / Razão Social', p.nome?.toUpperCase())}
        ${_nfseCopiaBotao('CNPJ / CPF', p.cpf)}
        ${_nfseCopiaBotao('E-mail', p.email)}
        ${_nfseCopiaBotao('Telefone', p.whatsapp || p.telefone)}
        ${_nfseCopiaBotao('Logradouro', p.nf_logradouro)}
        ${_nfseCopiaBotao('Número', p.nf_numero)}
        ${_nfseCopiaBotao('Bairro', p.nf_bairro)}
        ${_nfseCopiaBotao('Cidade', p.nf_cidade)}
        ${_nfseCopiaBotao('UF', p.nf_uf)}
        ${_nfseCopiaBotao('CEP', p.nf_cep)}
      </div>

      <div class="nfse-secao">
        <div class="nfse-secao-titulo">🔧 Dados do Serviço</div>
        ${_nfseCopiaBotao('Código do Serviço', '04.16 - Psicologia')}
        ${_nfseCopiaBotao('Código NBS', '123019800')}
        <div class="nfse-linha">
          <span class="nfse-label">Valor Total (R$)</span>
          <span class="nfse-val" id="${valorId}">${total.toFixed(2).replace('.',',')}</span>
          <button class="nfse-copy" onclick="nfseCopiar('${valorId}',this)">📋</button>
        </div>
        <div class="nfse-desc-wrap">
          <div class="nfse-label" style="margin-bottom:6px">Discriminação dos Serviços</div>
          <textarea class="nfse-desc-area" id="${descId}" rows="5" readonly>${descricao}</textarea>
          <button class="btn btn-outline btn-sm" style="margin-top:6px" onclick="nfseCopiar('${descId}',this)">📋 Copiar Descrição Completa</button>
          ${!sessoes.length ? '<p style="color:var(--peach);font-size:12px;margin-top:6px">⚠️ Nenhuma sessão realizada neste mês.</p>' : ''}
        </div>
      </div>

      <div class="nfse-secao">
        <div class="nfse-secao-titulo">📋 Passo a Passo</div>
        <ol class="nfse-passos">
          <li>Clique em <strong>Abrir Portal NFS-e</strong> acima</li>
          <li>Login → CPF: <code>${_config?.nfse_cpf || '—'}</code> / Senha: <code>${_config?.nfse_senha || '—'}</code>${_config?.nfse_ramal ? ` · Ramal: <code>${_config.nfse_ramal}</code>` : ''}</li>
          <li>Clique em <strong>Emitir NFS-e</strong></li>
          <li>Seção <em>Tomador do Serviço</em>: copie os dados acima (📋)</li>
          <li>Seção <em>Discriminação dos Serviços</em>: cole o texto gerado acima</li>
          <li>Código do Serviço: <code>04.16</code> → Psicologia</li>
          <li>Valor total: <code>${total.toFixed(2).replace('.',',')}</code></li>
          <li>Confirme e baixe o PDF da NFS-e</li>
        </ol>
        ${!p.nf_logradouro ? '<p style="color:var(--peach);font-size:12px;margin-top:8px">⚠️ Endereço NFS-e não preenchido — edite o cadastro do cliente e preencha os campos "Endereço estruturado para Nota Fiscal".</p>' : ''}
      </div>
    </div>
  `;

  openModal(`📄 NFS-e — ${p.nome.split(' ')[0]} · ${MESES[mes-1]}/${ano}`, html, null, { large: true });
}

async function pagarRapido(agId) {
  const ag = await api('GET', `/agendamentos/${agId}`);
  await api('PUT', `/agendamentos/${agId}`, {
    ...ag, pago: 1,
    data_pagamento: ag.data_pagamento || HOJE(),
    forma_pgto: ag.forma_pgto || 'pix'
  });
  toast('💰 Recebido — ' + BRL(ag.valor));
  refreshAll();
  const dv = document.getElementById('pacientes-detail-view');
  if (dv && dv.style.display !== 'none' && ag.paciente_id) verDetalhePaciente(ag.paciente_id);
}

async function marcarPendente(agId) {
  const ag = await api('GET', `/agendamentos/${agId}`);
  await api('PUT', `/agendamentos/${agId}`, { ...ag, pago: 0, data_pagamento: null });
  toast('Marcado como pendente');
  refreshAll();
  const dv = document.getElementById('pacientes-detail-view');
  if (dv && dv.style.display !== 'none' && ag.paciente_id) verDetalhePaciente(ag.paciente_id);
}

async function deletarSessaoHistorico(agId, pacienteId) {
  if (!confirm('Excluir esta sessão? Esta ação não pode ser desfeita.')) return;
  try {
    await api('DELETE', `/agendamentos/${agId}`);
    toast('Sessão excluída');
    await refreshAll();
    await verDetalhePaciente(pacienteId);
    document.getElementById('pac-historico-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch(e) {
    toast('Erro ao excluir sessão', 'error');
  }
}

async function salvarStatusSessao(agId, status, pacienteId) {
  try {
    const ag = await api('GET', `/agendamentos/${agId}`);
    await api('PUT', `/agendamentos/${agId}`, { ...ag, status });
    toast('Status atualizado');

    if (status === 'realizado') {
      const diasPorFreq = { '2x-mes': 14, '1x-mes': 30 };
      const p = await api('GET', `/pacientes/${pacienteId}`);
      const dias = diasPorFreq[p.frequencia];
      const todas = await api('GET', `/pacientes/${pacienteId}/agendamentos`);

      if (dias) {
        const proxData = new Date(ag.data + 'T12:00:00');
        proxData.setDate(proxData.getDate() + dias);
        const proxDataStr = proxData.toISOString().slice(0, 10);
        const jaExiste = todas.some(a => a.data === proxDataStr && a.hora === ag.hora);
        if (!jaExiste) {
          await api('POST', '/agendamentos', {
            paciente_id: pacienteId, data: proxDataStr, hora: ag.hora,
            duracao: ag.duracao, tipo: ag.tipo, status: 'agendado',
            valor: ag.valor, pago: 0,
          });
          const dd = String(proxData.getDate()).padStart(2,'0');
          const mm = String(proxData.getMonth()+1).padStart(2,'0');
          toast(`📅 Próxima sessão agendada para ${dd}/${mm}`);
        }
      }

      if (p.total_sessoes) {
        const realizadas = todas.filter(a => a.status === 'realizado').length;
        if (realizadas >= p.total_sessoes - 2) {
          const nome = p.apelido || p.nome.split(' ')[0];
          const restantes = p.total_sessoes - realizadas;
          const msg = restantes <= 0
            ? `<strong>${nome}</strong> completou as <strong>${p.total_sessoes} sessões</strong> previstas.`
            : `<strong>${nome}</strong> está a <strong>${restantes} sessão${restantes > 1 ? 'ões' : ''}</strong> de concluir as ${p.total_sessoes} previstas.`;
          setTimeout(() => openModal(
            '📊 Sessões quase concluídas',
            `<p style="margin-bottom:12px">${msg}</p>
             <p style="margin-bottom:16px">Deseja aumentar o número total de sessões?</p>
             <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Novo total:</label>
             <input type="number" id="novo-total-sessoes" min="${p.total_sessoes + 1}" value="${p.total_sessoes + 10}"
                    style="width:120px;padding:6px 10px;border:1px solid #e0d5cb;border-radius:6px;font-size:14px">`,
            async () => {
              const novoTotal = Number(document.getElementById('novo-total-sessoes').value);
              if (novoTotal > p.total_sessoes) {
                await api('PUT', `/pacientes/${pacienteId}`, { ...p, total_sessoes: novoTotal });
                toast(`Total de sessões atualizado para ${novoTotal}`);
                abrirModalSerie(pacienteId, realizadas + 1, novoTotal, p.valor_sessao, ag.data, ag.hora);
              }
            }
          ), 600);
        }
      }
    }

    verDetalhePaciente(pacienteId);
  } catch(e) {
    toast('Erro ao salvar status', 'error');
  }
}

async function salvarDataPagamento(agId, data) {
  try {
    const ag = await api('GET', `/agendamentos/${agId}`);
    const pago = data ? 1 : 0;
    await api('PUT', `/agendamentos/${agId}`, { ...ag, data_pagamento: data || null, pago });
    toast(data ? '💰 Pagamento registrado' : 'Data de recebimento removida');
    const dv = document.getElementById('pacientes-detail-view');
    const detailWasOpen = dv && dv.style.display !== 'none';
    await refreshAll();
    if (detailWasOpen && ag.paciente_id) {
      await verDetalhePaciente(ag.paciente_id);
      document.getElementById('pac-historico-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch(e) {
    toast('Erro ao salvar data', 'error');
  }
}

async function marcarPago(id) {
  const ag = await api('GET', `/agendamentos/${id}`);
  const formaAtual = ag.forma_pgto || 'pix';

  const dataAtual = ag.data_pagamento || HOJE();

  const html = `
    <div style="margin-bottom:16px">
      <div style="font-size:14px;color:var(--text-mid);margin-bottom:14px">
        <strong>${ag.paciente_nome || 'Cliente'}</strong> — ${fmtData(ag.data)} às ${ag.hora}<br>
        <span style="font-size:13px;color:var(--muted)">Valor: <strong style="color:var(--plum)">${BRL(ag.valor)}</strong></span>
      </div>
      <div style="display:flex;gap:12px">
        <div class="form-group" style="flex:1">
          <label>Forma de Pagamento</label>
          <select id="fin-forma">
            <option value="pix"          ${formaAtual==='pix'?'selected':''}>PIX</option>
            <option value="dinheiro"     ${formaAtual==='dinheiro'?'selected':''}>Dinheiro</option>
            <option value="credito"      ${formaAtual==='credito'?'selected':''}>Cartão de Crédito</option>
            <option value="debito"       ${formaAtual==='debito'?'selected':''}>Cartão de Débito</option>
            <option value="transferencia"${formaAtual==='transferencia'?'selected':''}>Transferência</option>
            <option value="convenio"     ${formaAtual==='convenio'?'selected':''}>Convênio</option>
          </select>
        </div>
        <div class="form-group" style="flex:0 0 150px">
          <label>Data do Recebimento</label>
          <input type="date" id="fin-data-pgto" value="${dataAtual}" style="width:100%">
        </div>
      </div>
    </div>
  `;

  openModal('Confirmar Recebimento', html, async () => {
    const forma = document.getElementById('fin-forma').value;
    const dataPgto = document.getElementById('fin-data-pgto').value || HOJE();
    await api('PUT', `/agendamentos/${id}`, { ...ag, pago: 1, forma_pgto: forma, data_pagamento: dataPgto });
    toast('Pagamento registrado! 💰');
    closeModal();
    refreshAll();
    const dv = document.getElementById('pacientes-detail-view');
    if (dv && dv.style.display !== 'none' && ag.paciente_id) verDetalhePaciente(ag.paciente_id);
  }, { saveLabel: '💰 Confirmar Recebimento' });
}

function finNavMes(delta) {
  _finMes += delta;
  if (_finMes > 12) { _finMes = 1;  _finAno++; }
  if (_finMes < 1)  { _finMes = 12; _finAno--; }
  loadFinanceiro();
}

function finIrMesAtual() {
  const now = new Date();
  _finAno = now.getFullYear();
  _finMes = now.getMonth() + 1;
  loadFinanceiro();
}

function updateFinMesLabel() {
  const el = document.getElementById('fin-mes-label');
  if (!el) return;
  // Sync segment buttons
  ['ano','mes','semana'].forEach(s =>
    document.getElementById('fsc-' + s)?.classList.toggle('ativo', s === _finPeriodo)
  );
  // Label
  if (_finPeriodo === 'ano') {
    el.textContent = `${_finAno}`;
  } else if (_finPeriodo === 'semana') {
    const seg = new Date(_finSemanaIni + 'T12:00:00');
    const dom = new Date(seg); dom.setDate(seg.getDate() + 6);
    const fmt = d => `${d.getDate()} ${MESES[d.getMonth()].slice(0,3)}`;
    el.textContent = `${fmt(seg)} – ${fmt(dom)}`;
  } else {
    el.textContent = `${MESES[_finMes-1]} / ${_finAno}`;
  }
}

// ── Financeiro: drag & expand ─────────────────────────────────
const _FIN_LAYOUT_KEY = 'fin_layout_v2';
let _finDrag = null;
let _finDragInit = false;
let _finPointerEl = null; // último elemento clicado — para checar se veio da alça

function _finIniciarDrag() {
  if (_finDragInit) return;
  _finDragInit = true;
  const grid = document.getElementById('fin-grid');
  if (!grid) return;

  // Rastreia de onde veio o clique
  grid.addEventListener('pointerdown', e => { _finPointerEl = e.target; });

  grid.addEventListener('dragstart', e => {
    // Só inicia drag se o clique foi na alça ⣿
    if (!_finPointerEl?.closest('.fin-drag-handle')) {
      e.preventDefault();
      return;
    }
    const card = e.target.closest('.fin-card');
    if (!card) { e.preventDefault(); return; }
    _finDrag = card;
    setTimeout(() => card.classList.add('fin-dragging'), 0);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.dataset.finId);
  });

  grid.addEventListener('dragend', () => {
    if (_finDrag) _finDrag.classList.remove('fin-dragging');
    grid.querySelectorAll('.fin-drop-over').forEach(el => el.classList.remove('fin-drop-over'));
    _finDrag = null;
    _salvarFinLayout();
  });

  grid.addEventListener('dragover', e => {
    e.preventDefault();
    const card = e.target.closest('.fin-card');
    if (!card || card === _finDrag) return;
    grid.querySelectorAll('.fin-drop-over').forEach(el => el.classList.remove('fin-drop-over'));
    card.classList.add('fin-drop-over');
    // Determina se deve inserir antes ou depois baseado na posição do mouse
    const rect = card.getBoundingClientRect();
    card.dataset.dropBefore = (e.clientY < rect.top + rect.height / 2) ? '1' : '0';
  });

  grid.addEventListener('dragleave', e => {
    const card = e.target.closest('.fin-card');
    if (card && !card.contains(e.relatedTarget)) card.classList.remove('fin-drop-over');
  });

  grid.addEventListener('drop', e => {
    e.preventDefault();
    const target = e.target.closest('.fin-card');
    if (!target || !_finDrag || target === _finDrag) return;
    target.classList.remove('fin-drop-over');
    if (target.dataset.dropBefore === '1') {
      grid.insertBefore(_finDrag, target);
    } else {
      grid.insertBefore(_finDrag, target.nextSibling);
    }
  });
}

function finToggleExpand(id) {
  const card = document.querySelector(`.fin-card[data-fin-id="${id}"]`);
  if (!card) return;
  const expanding = !card.classList.contains('fin-expanded');
  card.classList.toggle('fin-expanded', expanding);
  const btn = card.querySelector('.fin-expand-btn');
  if (btn) btn.textContent = expanding ? '⊟ Reduzir' : '⊞ Ampliar';
  _salvarFinLayout();
}

function _salvarFinLayout() {
  const grid = document.getElementById('fin-grid');
  if (!grid) return;
  const layout = [...grid.querySelectorAll('.fin-card')].map(c => ({
    id: c.dataset.finId,
    expanded: c.classList.contains('fin-expanded')
  }));
  localStorage.setItem(_FIN_LAYOUT_KEY, JSON.stringify(layout));
}

function _restaurarFinLayout() {
  const grid = document.getElementById('fin-grid');
  if (!grid) return;
  const saved = localStorage.getItem(_FIN_LAYOUT_KEY);
  if (!saved) return;
  try {
    const layout = JSON.parse(saved);
    layout.forEach(({ id, expanded }) => {
      const card = grid.querySelector(`.fin-card[data-fin-id="${id}"]`);
      if (!card) return;
      card.classList.toggle('fin-expanded', expanded);
      const btn = card.querySelector('.fin-expand-btn');
      if (btn) btn.textContent = expanded ? '⊟ Reduzir' : '⊞ Ampliar';
    });
    layout.forEach(({ id }) => {
      const card = grid.querySelector(`.fin-card[data-fin-id="${id}"]`);
      if (card) grid.appendChild(card);
    });
  } catch(e) {}
}

// ============================================================
// ── NFS-e ─────────────────────────────────────────────────────
// ============================================================
async function loadNfse() {
  const tbody = document.getElementById('nfse-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:32px">Carregando...</td></tr>';

  const lista = await api('GET', '/nfse/lista');
  if (!lista?.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:32px">Nenhuma NFS-e emitida ainda.</td></tr>';
    return;
  }

  const fmtMes = (d) => {
    if (!d) return '—';
    const [y, m] = d.split('-');
    const nomes = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    return `${nomes[Number(m)-1]}/${y}`;
  };
  const fmtData = (d) => {
    if (!d) return '—';
    const [y, m, dd] = d.split('-');
    return `${dd}/${m}/${y}`;
  };
  const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  tbody.innerHTML = lista.map(n => {
    const periodo = n.datas_texto
      || (n.datas || '').split(',').filter(Boolean).map(d => { const [,m,dd] = d.split('-'); return `${dd}/${m}`; }).join(', ')
      || fmtData(n.data_ini);
    const numero = n.nfse_numero || '—';
    const statusBadge = n.nfse_numero
      ? '<span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600">✅ Autorizada</span>'
      : '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600">📤 Emitida</span>';
    const nome = n.apelido ? `${n.apelido} <span style="color:var(--muted);font-size:12px">(${n.nome})</span>` : n.nome;
    const refEsc  = n.nfse_ref.replace(/'/g, "\\'");
    const datas   = (n.datas || '').replace(/'/g, "\\'");
    const fone    = (n.whatsapp || n.telefone || '').replace(/'/g, "\\'");
    return `<tr>
      <td style="font-weight:600;color:var(--plum)">${numero}</td>
      <td>${nome}</td>
      <td style="font-size:13px"><span contenteditable="true" class="nfse-datas-edit" data-ref="${n.nfse_ref}" style="display:inline-block;min-width:80px;padding:2px 4px;border-radius:4px;outline:none;cursor:text" onblur="nfseSalvarDatas(this)" onfocus="this.style.background='#fafafa';this.style.boxShadow='0 0 0 1.5px var(--plum)'" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}">${periodo}</span></td>
      <td style="text-align:center">${n.total_sessoes}</td>
      <td style="text-align:right;font-weight:600">R$ ${brl(n.valor_total)}</td>
      <td>${statusBadge}</td>
      <td>
        <button class="btn btn-outline btn-xs" onclick="nfseAbrirPdf(this,'${refEsc}','${datas}','${fone}')" title="Ver opções de PDF">📥 PDF</button>
      </td>
      <td style="display:flex;gap:4px">
        <button class="btn btn-ghost btn-xs" onclick="nfseVerStatus('${refEsc}')" title="Consultar status">🔍 Ver</button>
        <button class="btn btn-ghost btn-xs" onclick="nfseDeletar('${refEsc}')" title="Remover marcação" style="color:var(--rose)">🗑</button>
      </td>
    </tr>`;
  }).join('');
}

async function nfseSalvarDatas(el) {
  el.style.background = '';
  el.style.boxShadow = '';
  const ref = el.dataset.ref;
  const texto = el.textContent.trim();
  try {
    await api('PUT', `/nfse/${encodeURIComponent(ref)}/datas`, { datas_texto: texto || null });
  } catch(e) {
    toast('Erro ao salvar datas', 'error');
  }
}

const _nfsePdfCache = {};

async function nfseAbrirPdf(btn, ref, datas, fone) {
  document.querySelectorAll('.nfse-pdf-drop').forEach(d => d.remove());

  if (!_nfsePdfCache[ref] || typeof _nfsePdfCache[ref] === 'string') {
    const orig = btn.textContent;
    btn.textContent = '⏳';
    btn.disabled = true;
    try {
      const [r, datasArr] = await Promise.all([
        api('GET', `/nfse/status/${encodeURIComponent(ref)}`),
        api('GET', `/nfse/sessoes/${encodeURIComponent(ref)}`).catch(() => [])
      ]);
      btn.textContent = orig;
      btn.disabled = false;
      if (r?.error || !r?.link_pdf) return toast('PDF ainda não disponível para esta nota', 'error');
      const datasDoServidor = Array.isArray(datasArr) && datasArr.length ? datasArr : (datas || '').split(',').filter(Boolean);
      _nfsePdfCache[ref] = { pdf: r.link_pdf, datas: datasDoServidor };
    } catch(e) {
      btn.textContent = orig;
      btn.disabled = false;
      return toast('Erro ao buscar dados da nota', 'error');
    }
  }

  const pdfUrl = _nfsePdfCache[ref].pdf;
  const datasEditavel = document.querySelector(`.nfse-datas-edit[data-ref="${ref}"]`)?.textContent?.trim();
  const datasFormatadas = datasEditavel
    || (_nfsePdfCache[ref].datas || []).map(d => { const [, m, dd] = d.split('-'); return `${dd}/${m}`; }).join(', ');

  const msg = `Oi, segue a Nota Fiscal referente às sessões realizadas nas datas ${datasFormatadas}.\n\nClique no link para ter acesso à nota fiscal:\n📄 ${pdfUrl}\n\nObrigado!`;
  const waNum = fone ? toWaNum(fone) : '';
  const waUrl = `https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`;

  const drop = document.createElement('div');
  drop.className = 'nfse-pdf-drop';
  drop.style.cssText = 'position:fixed;background:#fff;border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,.15);z-index:9999;min-width:200px;overflow:hidden';
  drop.innerHTML = `
    <a href="${pdfUrl}" target="_blank" style="display:flex;align-items:center;gap:8px;padding:11px 16px;text-decoration:none;color:inherit;font-size:13px;border-bottom:1px solid var(--border);hover:background:#f5f5f5">📥 Baixar PDF</a>
    <a href="${waUrl}"  target="_blank" style="display:flex;align-items:center;gap:8px;padding:11px 16px;text-decoration:none;color:inherit;font-size:13px">💬 Enviar por WhatsApp</a>
  `;

  const rect = btn.getBoundingClientRect();
  drop.style.top  = (rect.bottom + 4) + 'px';
  drop.style.left = rect.left + 'px';
  document.body.appendChild(drop);

  setTimeout(() => {
    document.addEventListener('click', function fechar(e) {
      if (!drop.contains(e.target)) { drop.remove(); document.removeEventListener('click', fechar); }
    });
  }, 0);
}

async function nfseToggle(agId, pacienteId, jaEmitida) {
  if (jaEmitida) {
    await api('DELETE', `/nfse/sessao/${agId}`);
  } else {
    await api('POST', '/nfse/marcar', { paciente_id: pacienteId, ano: _finAno, mes: _finMes, ids: [agId] });
  }
  loadFinanceiro();
}

function nfseEditarCelula(btn, ref, numero) {
  document.querySelectorAll('.nfse-edit-pop').forEach(d => d.remove());

  const pop = document.createElement('div');
  pop.className = 'nfse-edit-pop';
  pop.style.cssText = 'position:fixed;background:#fff;border:1px solid var(--border);border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,.15);z-index:9999;padding:14px;min-width:230px';
  pop.innerHTML = `
    <div style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:8px">Nº da NFS-e</div>
    <input id="nfse-edit-input" type="text" value="${numero}" placeholder="ex: 34"
      style="width:100%;border:1px solid var(--border);border-radius:6px;padding:6px 10px;font-size:13px;margin-bottom:10px;box-sizing:border-box">
    <div style="display:flex;gap:6px">
      <button class="btn btn-primary btn-sm" style="flex:1" onclick="nfseSalvarNumero('${ref}')">💾 Salvar</button>
      <button class="btn btn-ghost btn-sm" style="color:var(--rose);border-color:var(--rose)" onclick="nfseDeletar('${ref}')">🗑</button>
    </div>
  `;

  const rect = btn.getBoundingClientRect();
  pop.style.top  = (rect.bottom + 4) + 'px';
  pop.style.left = Math.min(rect.left, window.innerWidth - 250) + 'px';
  document.body.appendChild(pop);
  pop.querySelector('input').focus();

  setTimeout(() => {
    document.addEventListener('click', function fechar(e) {
      if (!pop.contains(e.target) && e.target !== btn) { pop.remove(); document.removeEventListener('click', fechar); }
    });
  }, 0);
}

async function nfseSalvarNumero(ref) {
  const input = document.getElementById('nfse-edit-input');
  const numero = input?.value.trim() || null;
  const r = await api('PUT', `/nfse/${encodeURIComponent(ref)}/numero`, { numero });
  if (r?.error) return toast('Erro: ' + r.error, 'error');
  document.querySelectorAll('.nfse-edit-pop').forEach(d => d.remove());
  toast('Número salvo');
  loadFinanceiro();
  loadNfse();
}

async function nfseDeletar(ref) {
  if (!confirm(`Remover marcação de NFS-e para a referência "${ref}"?\nAs sessões voltarão a ficar disponíveis para emissão.`)) return;
  const r = await api('DELETE', `/nfse/${encodeURIComponent(ref)}`);
  if (r?.error) return toast('Erro: ' + r.error, 'error');
  toast('Marcação removida');
  loadNfse();
}

async function nfseVerStatus(ref) {
  const r = await api('GET', `/nfse/status/${encodeURIComponent(ref)}`);
  if (r?.error) return toast('Erro ao consultar: ' + r.error, 'error');

  const statusTxt = r.status || '—';
  const numero    = r.numero  || '—';
  const botoes = [
    r.link_pdf   ? `<a href="${r.link_pdf}"   target="_blank" class="btn btn-primary btn-sm">📥 Baixar PDF</a>` : '',
    r.url_nfse   ? `<a href="${r.url_nfse}"   target="_blank" class="btn btn-outline btn-sm">🔗 Consulta Pública</a>` : '',
  ].filter(Boolean).join(' ');

  openModal('🧾 Status da NFS-e', `
    <div style="display:flex;flex-direction:column;gap:10px">
      <div><strong>Referência:</strong> ${ref}</div>
      <div><strong>Número NF:</strong> ${numero}</div>
      <div><strong>Status Focus NFe:</strong> ${statusTxt}</div>
      ${botoes ? `<div style="display:flex;gap:8px;margin-top:8px">${botoes}</div>` : ''}
      ${r.dados ? `<details style="margin-top:8px"><summary style="cursor:pointer;font-size:12px;color:var(--muted)">Dados completos</summary><pre style="font-size:11px;overflow:auto;max-height:300px;margin-top:8px">${JSON.stringify(r.dados, null, 2)}</pre></details>` : ''}
    </div>
  `, null);
}

// ============================================================
// ── CONFIGURAÇÕES ────────────────────────────────────────────
// ============================================================
async function loadConfiguracoes() {
  const cfg = await api('GET', '/configuracoes');
  document.getElementById('cfg-nome').value         = cfg.nome_psicologa || '';
  document.getElementById('cfg-crp').value          = cfg.crp || '';
  document.getElementById('cfg-especialidade').value= cfg.especialidade || '';
  document.getElementById('cfg-valor').value        = cfg.valor_sessao_padrao || 180;
  document.getElementById('cfg-duracao').value      = cfg.duracao_sessao || 50;
  document.getElementById('cfg-inicio').value          = cfg.horario_inicio    || '08:00';
  document.getElementById('cfg-fim').value             = cfg.horario_fim       || '18:00';
  document.getElementById('cfg-bloqueio-inicio').value  = cfg.bloqueio_inicio  || '';
  document.getElementById('cfg-bloqueio-fim').value     = cfg.bloqueio_fim     || '';
  document.getElementById('cfg-bloqueio2-inicio').value = cfg.bloqueio2_inicio || '';
  document.getElementById('cfg-bloqueio2-fim').value    = cfg.bloqueio2_fim    || '';
  document.getElementById('cfg-zoom-account').value        = cfg.zoom_account_id      || '';
  document.getElementById('cfg-zoom-client-id').value      = cfg.zoom_client_id       || '';
  document.getElementById('cfg-zoom-client-secret').value  = cfg.zoom_client_secret   || '';
  document.getElementById('cfg-zoom-webhook-secret').value = cfg.zoom_webhook_secret  || '';
  document.getElementById('cfg-chave-pix').value           = cfg.chave_pix            || '';
  document.getElementById('cfg-chave-pix-cnpj').value      = cfg.chave_pix_cnpj       || '';
  document.getElementById('cfg-link-cartao').value         = cfg.link_cartao           || '';
  document.getElementById('cfg-nfse-url').value            = cfg.nfse_url             || 'https://webapp1-boituva.cidade360.cloud/NFSe.Portal/';
  document.getElementById('cfg-nfse-solicitacao').value    = cfg.nfse_solicitacao      || '';
  document.getElementById('cfg-nfse-cpf').value            = cfg.nfse_cpf             || '';
  document.getElementById('cfg-nfse-senha').value          = cfg.nfse_senha           || '';
  document.getElementById('cfg-nfse-contribuinte').value   = cfg.nfse_contribuinte    || '';
  document.getElementById('cfg-nfse-ramal').value          = cfg.nfse_ramal           || '';
  document.getElementById('cfg-focusnfe-token').value      = cfg.focusnfe_token             || '';
  document.getElementById('cfg-focusnfe-cnpj-cpf').value   = cfg.focusnfe_cnpj_cpf         || '';
  document.getElementById('cfg-focusnfe-inscricao').value  = cfg.focusnfe_inscricao_municipal || '';
  document.getElementById('cfg-focusnfe-ambiente').value   = cfg.focusnfe_ambiente           || 'homologacao';
  document.getElementById('cfg-focusnfe-simples').value    = cfg.focusnfe_simples_nacional   || '3';
  document.getElementById('cfg-focusnfe-aliquota').value   = cfg.focusnfe_aliquota_iss       || '3.62';
}

async function loadAuditLog() {
  const el = document.getElementById('audit-log-table');
  if (!el) return;
  el.innerHTML = '<em style="color:var(--text-mid)">Carregando...</em>';
  const rows = await api('GET', '/audit-log?limite=200');
  if (!rows?.length) { el.innerHTML = '<em style="color:var(--text-mid)">Nenhum registro ainda.</em>'; return; }
  const acaoLabel = { login:'Login', prontuario_visualizado:'Prontuário visualizado', prontuario_criado:'Prontuário criado', prontuario_atualizado:'Prontuário atualizado', prontuario_excluido:'Prontuário excluído', paciente_excluido:'Paciente desativado', dados_excluidos_lgpd:'⚠ Exclusão LGPD', backup_realizado:'Backup baixado' };
  el.innerHTML = `<table style="width:100%;border-collapse:collapse">
    <thead><tr style="background:var(--bg)">
      <th style="padding:4px 8px;text-align:left;border-bottom:1px solid var(--border)">Data/Hora</th>
      <th style="padding:4px 8px;text-align:left;border-bottom:1px solid var(--border)">Ação</th>
      <th style="padding:4px 8px;text-align:left;border-bottom:1px solid var(--border)">ID</th>
      <th style="padding:4px 8px;text-align:left;border-bottom:1px solid var(--border)">IP</th>
    </tr></thead>
    <tbody>${rows.map(r => `<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:3px 8px;white-space:nowrap">${r.created_at}</td>
      <td style="padding:3px 8px">${acaoLabel[r.acao] || r.acao}</td>
      <td style="padding:3px 8px">${r.recurso_id || '-'}</td>
      <td style="padding:3px 8px;color:var(--text-mid)">${r.ip || '-'}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

async function preencherEnderecosPorCep() {
  const log = document.getElementById('cep-bulk-log');
  const btn = document.querySelector('[onclick="preencherEnderecosPorCep()"]');
  log.style.display = 'block';
  log.innerHTML = '⏳ Processando no servidor...';
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Processando...'; }

  const addLog = (msg) => { log.innerHTML += '<br>' + msg; log.scrollTop = log.scrollHeight; };

  try {
    const r = await api('POST', '/admin/enrich-cep');
    addLog(`📋 ${r.total} clientes · ${r.processados} sem CEP estruturado`);
    r.log.forEach(l => {
      if (l.status === 'ok')       addLog(`✅ ${l.nome} — ${l.logradouro}, ${l.cidade}/${l.uf} (${l.cep})`);
      else if (l.status === 'invalido') addLog(`⚠️ ${l.nome} — CEP ${l.cep} não encontrado`);
      else if (l.status === 'erro')     addLog(`❌ ${l.nome} — ${l.msg}`);
    });
    addLog(`<br><strong>✔ Concluído:</strong> ${r.atualizados} atualizados · ${r.sem_cep} sem CEP no endereço`);
  } catch(e) {
    addLog('❌ Erro: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🔍 Executar novamente'; }
  }
}

async function salvarConfiguracoes() {
  const valorAntigo = parseFloat(_config.valor_sessao_padrao) || 0;
  const novoValor   = parseFloat(document.getElementById('cfg-valor').value) || 0;

  const body = {
    nome_psicologa:       document.getElementById('cfg-nome').value.trim(),
    crp:                  document.getElementById('cfg-crp').value.trim(),
    especialidade:        document.getElementById('cfg-especialidade').value.trim(),
    valor_sessao_padrao:  novoValor,
    duracao_sessao:       document.getElementById('cfg-duracao').value,
    horario_inicio:       document.getElementById('cfg-inicio').value,
    horario_fim:          document.getElementById('cfg-fim').value,
    bloqueio_inicio:      document.getElementById('cfg-bloqueio-inicio').value  || '',
    bloqueio_fim:         document.getElementById('cfg-bloqueio-fim').value     || '',
    bloqueio2_inicio:     document.getElementById('cfg-bloqueio2-inicio').value || '',
    bloqueio2_fim:        document.getElementById('cfg-bloqueio2-fim').value    || '',
    zoom_account_id:      document.getElementById('cfg-zoom-account').value.trim(),
    zoom_client_id:       document.getElementById('cfg-zoom-client-id').value.trim(),
    zoom_client_secret:   document.getElementById('cfg-zoom-client-secret').value.trim(),
    zoom_webhook_secret:  document.getElementById('cfg-zoom-webhook-secret').value.trim(),
    chave_pix:            document.getElementById('cfg-chave-pix').value.trim(),
    chave_pix_cnpj:       document.getElementById('cfg-chave-pix-cnpj').value.trim(),
    link_cartao:          document.getElementById('cfg-link-cartao').value.trim(),
    nfse_url:             document.getElementById('cfg-nfse-url').value.trim(),
    nfse_solicitacao:     document.getElementById('cfg-nfse-solicitacao').value.trim(),
    nfse_cpf:             document.getElementById('cfg-nfse-cpf').value.trim(),
    nfse_senha:           document.getElementById('cfg-nfse-senha').value.trim(),
    nfse_contribuinte:    document.getElementById('cfg-nfse-contribuinte').value.trim(),
    nfse_ramal:           document.getElementById('cfg-nfse-ramal').value.trim(),
    focusnfe_token:              document.getElementById('cfg-focusnfe-token').value.trim(),
    focusnfe_cnpj_cpf:           document.getElementById('cfg-focusnfe-cnpj-cpf').value.trim(),
    focusnfe_inscricao_municipal:document.getElementById('cfg-focusnfe-inscricao').value.trim(),
    focusnfe_ambiente:           document.getElementById('cfg-focusnfe-ambiente').value,
    focusnfe_simples_nacional:   document.getElementById('cfg-focusnfe-simples').value,
    focusnfe_aliquota_iss:       document.getElementById('cfg-focusnfe-aliquota').value,
  };
  try {
    await api('POST', '/configuracoes', body);
    _config = { ..._config, ...body };
    atualizarBrand();
    toast('Configurações salvas!');

    // Se o valor padrão mudou, oferece atualizar pacientes que ainda usam o valor antigo
    if (novoValor !== valorAntigo && valorAntigo > 0) {
      const pacientes = await api('GET', '/pacientes');
      const desatualizadas = pacientes.filter(p => parseFloat(p.valor_sessao) === valorAntigo);
      if (desatualizadas.length > 0) {
        openModal('Atualizar Valor dos Clientes', `
          <p style="margin-bottom:14px">O valor padrão mudou de <strong>${BRL(valorAntigo)}</strong> para <strong>${BRL(novoValor)}</strong>.</p>
          <p style="margin-bottom:10px"><strong>${desatualizadas.length}</strong> cliente(s) ainda usam o valor antigo:</p>
          <ul style="margin:0 0 14px 18px;line-height:2;font-size:13.5px">
            ${desatualizadas.map(p => `<li>${p.nome}</li>`).join('')}
          </ul>
          <p style="color:var(--muted);font-size:13px">Deseja atualizar todas para ${BRL(novoValor)}?</p>
        `, async () => {
          for (const p of desatualizadas) {
            await api('PUT', `/pacientes/${p.id}`, { ...p, valor_sessao: novoValor });
          }
          toast(`${desatualizadas.length} cliente(s) atualizado(s)!`);
          closeModal();
        }, { saveLabel: 'Sim, atualizar clientes' });
      }
    }
  } catch(e) { toast(e.message, 'error'); }
}

function atualizarBrand() {
  document.getElementById('brand-nome').textContent = _config.nome_psicologa || 'Consultório';
  document.getElementById('brand-crp').textContent  = _config.crp || '';
}

// ============================================================
// ============================================================
// ── CONTRATOS ────────────────────────────────────────────────
// ============================================================
let _contratos = [];

async function novoLinkAgenda() {
  openModal('Link de Agendamento', `
    <p style="font-size:12.5px;color:var(--muted);margin-bottom:14px">Gere um link público onde o cliente escolhe o horário e assina o contrato em seguida.</p>
    <div class="form-group" style="margin-bottom:14px">
      <label>Dias disponíveis</label>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px" id="dias-btns">
        ${[['1','Seg'],['2','Ter'],['3','Qua'],['4','Qui'],['5','Sex'],['6','Sáb']].map(([v,l]) =>
          `<button type="button" class="btn btn-outline btn-sm dia-toggle" data-dia="${v}"
            style="min-width:48px" onclick="toggleDia(this)">${l}</button>`
        ).join('')}
      </div>
    </div>
    <div class="form-group" style="margin-bottom:10px">
      <label>Horários disponíveis</label>
      <div id="horarios-list" style="display:flex;flex-direction:column;gap:6px;margin-top:6px"></div>
      <button type="button" class="btn btn-ghost btn-sm" style="margin-top:6px;align-self:flex-start"
        onclick="addHorarioLink()">+ Adicionar horário</button>
    </div>
    <div class="form-group">
      <label>Exibir vagas para os próximos</label>
      <select id="ag-semanas" style="max-width:180px">
        <option value="1">1 semana</option>
        <option value="2" selected>2 semanas</option>
        <option value="3">3 semanas</option>
        <option value="4">4 semanas</option>
      </select>
    </div>
    <div id="link-agenda-box" style="display:none;margin-top:16px">
      <div style="font-size:12px;font-weight:700;color:var(--text-mid);margin-bottom:6px">Link gerado:</div>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="text" id="link-agenda-input" readonly style="flex:1;font-size:12px;background:#f5f0fa">
        <button class="btn btn-primary btn-sm" onclick="copiarLinkAgenda()">📋 Copiar</button>
      </div>
    </div>
  `, async () => {
    const dias = [...document.querySelectorAll('.dia-toggle.ativo')].map(b => parseInt(b.dataset.dia));
    if (!dias.length) return toast('Selecione ao menos um dia', 'error') || false;
    const horarios = [...document.querySelectorAll('.horario-link-input')].map(i => i.value).filter(Boolean);
    if (!horarios.length) return toast('Adicione ao menos um horário', 'error') || false;
    const semanas = parseInt(document.getElementById('ag-semanas').value);
    try {
      const res = await api('POST', '/agendamento-links', { dias, horarios, semanas });
      document.getElementById('link-agenda-input').value = res.link;
      document.getElementById('link-agenda-box').style.display = 'block';
      document.getElementById('modal-save-btn').style.display = 'none';
      navigator.clipboard.writeText(res.link).catch(() => {});
      toast('Link de agenda gerado e copiado! 🗓');
      loadContratos();
    } catch(e) { toast(e.message, 'error'); }
  }, { saveLabel: '🗓 Gerar Link de Agenda' });

  // Adiciona um horário padrão ao abrir
  setTimeout(() => addHorarioLink('09:00'), 50);
}

function toggleDia(btn) {
  btn.classList.toggle('ativo');
  btn.style.background    = btn.classList.contains('ativo') ? 'var(--rose)' : '';
  btn.style.color         = btn.classList.contains('ativo') ? '#fff' : '';
  btn.style.borderColor   = btn.classList.contains('ativo') ? 'var(--rose)' : '';
}

function addHorarioLink(valor = '') {
  const list = document.getElementById('horarios-list');
  if (!list) return;
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;align-items:center;gap:8px';
  div.innerHTML = `
    <input type="time" class="horario-link-input" value="${valor}"
      style="padding:7px 10px;border:1.5px solid var(--border);border-radius:7px;font-size:14px;width:110px">
    <button type="button" class="btn btn-ghost btn-xs" style="color:var(--red)"
      onclick="this.parentElement.remove()">✕</button>
  `;
  list.appendChild(div);
}

function copiarLinkAgenda() {
  const link = document.getElementById('link-agenda-input')?.value;
  if (link) navigator.clipboard.writeText(link).then(() => toast('Link copiado! 📋'));
}

function renderLinksAgenda(links) {
  if (!links.length) return;
  let el = document.getElementById('links-agenda-panel');
  if (!el) {
    el = document.createElement('div');
    el.id = 'links-agenda-panel';
    el.style.marginBottom = '16px';
    document.getElementById('section-contratos').prepend(el);
  }
  el.innerHTML = `
    <div class="card" style="border-left:3px solid var(--lavender)">
      <div class="card-header">
        <span class="card-title">🗓 Links de Agendamento Ativos</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Dias</th><th>Horários</th><th>Vagas</th><th>Link</th><th></th></tr></thead>
          <tbody>
            ${links.map(l => {
              const DIAS_LABEL = {1:'Seg',2:'Ter',3:'Qua',4:'Qui',5:'Sex',6:'Sáb'};
              const dias = JSON.parse(l.dias).map(d => DIAS_LABEL[d]).join(', ');
              const horas = JSON.parse(l.horarios).join(' · ');
              return `<tr>
                <td><strong>${dias}</strong></td>
                <td style="font-size:12.5px">${horas}</td>
                <td style="font-size:12.5px">${l.semanas} sem.</td>
                <td>
                  <button class="btn btn-outline btn-xs" onclick="copiarLinkAgendaItem('${l.token}')">
                    <span class="btn-copiar-icon">📋</span><span class="btn-copiar-label"> Copiar Link</span>
                  </button>
                </td>
                <td><button class="btn btn-ghost btn-xs" style="color:var(--red)" onclick="desativarLinkAgenda(${l.id})">🗑</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function copiarLinkAgendaItem(token) {
  const link = `${location.origin}/agendar/?token=${token}`;
  navigator.clipboard.writeText(link).then(() => toast('Link copiado! 📋'));
}

async function desativarLinkAgenda(id) {
  if (!confirm('Desativar este link de agendamento?')) return;
  await api('DELETE', `/agendamento-links/${id}`);
  toast('Link desativado');
  loadContratos();
}

async function loadContratos() {
  const [contratos, convites, linksAgenda] = await Promise.all([
    api('GET', '/contratos'),
    api('GET', '/convites'),
    api('GET', '/agendamento-links')
  ]);
  _contratos = contratos;
  renderLinksAgenda(linksAgenda);
  renderConvitesPendentes(convites);
  filtrarContratos();
  renderModeloPreview();
  // Marca todos como vistos e limpa badge/dashboard
  try {
    await api('POST', '/contratos/marcar-vistos');
    const badge = document.getElementById('badge-contratos');
    if (badge) { badge.textContent = ''; badge.style.display = 'none'; }
    const el = document.getElementById('dash-novidades');
    if (el) el.style.display = 'none';
  } catch(e) {}
}

function renderConvitesPendentes(convites) {
  const pendentes = convites.filter(c => !c.usado && new Date(c.expires_at) > new Date());
  const expirados = convites.filter(c => !c.usado && new Date(c.expires_at) <= new Date());

  let el = document.getElementById('convites-pendentes');
  if (!el) {
    el = document.createElement('div');
    el.id = 'convites-pendentes';
    el.style.marginBottom = '16px';
    document.getElementById('section-contratos').prepend(el);
  }

  if (!pendentes.length && !expirados.length) { el.innerHTML = ''; return; }

  el.innerHTML = `
    <div class="card">
      <div class="card-header">
        <span class="card-title">📨 Convites Enviados</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Cliente</th><th>Enviado em</th><th>Expira em</th><th>Status</th><th>Link</th><th></th></tr></thead>
          <tbody>
            ${[...pendentes, ...expirados].map(c => {
              const exp = new Date(c.expires_at);
              const expirado = exp <= new Date();
              const diasRestantes = Math.ceil((exp - new Date()) / 86400000);
              return `
                <tr>
                  <td><strong>${c.nome_paciente || '—'}</strong></td>
                  <td>${fmtData(c.created_at?.split(' ')[0])}</td>
                  <td>${fmtData(c.expires_at?.split(' ')[0])}</td>
                  <td>${expirado
                    ? '<span style="color:var(--red);font-size:12px;font-weight:700">Expirado</span>'
                    : `<span style="color:var(--sage);font-size:12px;font-weight:700">Pendente · ${diasRestantes}d</span>`}
                  </td>
                  <td>
                    ${!expirado ? `<button class="btn btn-outline btn-xs" onclick="copiarLinkConvite('${c.token}')"><span class="btn-copiar-icon">📋</span><span class="btn-copiar-label"> Copiar Link</span></button>` : '—'}
                  </td>
                  <td>
                    <button class="btn btn-ghost btn-xs" style="color:var(--red)" onclick="cancelarConvite(${c.id})">🗑</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function copiarLinkConvite(token) {
  const link = `${location.origin}/contratos/?token=${token}`;
  navigator.clipboard.writeText(link).then(() => toast('Link copiado! 📋'));
}

async function cancelarConvite(id) {
  if (!confirm('Cancelar este convite?')) return;
  await api('DELETE', `/convites/${id}`);
  toast('Convite cancelado');
  loadContratos();
}

function calcularDatas(inicio, diaSemana, qtd) {
  const datas = [];
  const d = new Date(inicio + 'T12:00:00');
  while (d.getDay() !== diaSemana) d.setDate(d.getDate() + 1);
  for (let i = 0; i < qtd; i++) {
    datas.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 7);
  }
  return datas;
}

async function novoConvite() {
  openModal('Novo Contrato', `
    <div class="form-group" style="margin-bottom:14px">
      <label>Nome completo do cliente</label>
      <input type="text" id="conv-nome" placeholder="Nome completo" autofocus>
    </div>
    <div class="form-grid">
      <div class="form-group">
        <label>Data de início</label>
        <input type="date" id="conv-inicio" value="${HOJE()}">
      </div>
      <div class="form-group">
        <label>Valor da sessão (R$)</label>
        <input type="number" id="conv-valor" placeholder="Ex: 350,00" min="0" step="0.01" value="${parseFloat(_config?.valor_sessao_padrao) || ''}">
      </div>
    </div>
    <div id="conv-link-box" style="display:none;margin-top:18px">
      <div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:6px">Link gerado (envie ao cliente):</div>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="text" id="conv-link-input" readonly style="flex:1;font-size:12px;background:#f5f0fa">
        <button class="btn btn-primary btn-sm" onclick="copiarLinkGerado()">📋 Copiar</button>
      </div>
      <p style="font-size:12px;color:var(--muted);margin-top:8px">⏱ Válido por 7 dias · uso único</p>
    </div>
  `, async () => {
    const nome  = document.getElementById('conv-nome')?.value.trim();
    if (!nome) return toast('Informe o nome do cliente', 'error') || false;
    const valor      = parseFloat(document.getElementById('conv-valor')?.value) || 0;
    const data_inicio = document.getElementById('conv-inicio')?.value;

    try {
      const res = await api('POST', '/convites', { nome_paciente: nome, valor, data_inicio });
      document.getElementById('conv-link-input').value = res.link;
      document.getElementById('conv-link-box').style.display = 'block';
      document.getElementById('modal-save-btn').style.display = 'none';
      navigator.clipboard.writeText(res.link).catch(() => {});
      toast('Link gerado e copiado! 📋');
      loadContratos();
    } catch(e) { toast(e.message, 'error'); }
  }, { saveLabel: 'Gerar Link' });
}

// ── versão antiga do corpo que tinha agendamento automático (mantida para referência) ──
async function _novoConviteLegado_agendarSessoes(nome, inicio, dia, hora, qtd) {
    try {
        const agendarSessoes = dia && hora && inicio && qtd > 0;
        if (agendarSessoes) {
        // Cria ou localiza o paciente
        const todos = await api('GET', '/pacientes');
        let pac = todos.find(p => p.nome.toLowerCase() === nome.toLowerCase());
        if (!pac) {
          const criado = await api('POST', '/pacientes', { nome });
          pac = { id: criado.id, nome, valor_sessao: null };
        }
        _pacientesCache = [...todos.filter(p => p.id !== pac.id), pac];

        const valor = pac.valor_sessao || _config?.valor_sessao_padrao || 180;
        const datas = calcularDatas(inicio, dia, qtd);
        let criadas = 0;
        for (const data of datas) {
          try {
            await api('POST', '/agendamentos', {
              paciente_id: pac.id, data, hora,
              tipo: 'sessao', status: 'agendado', valor
            });
            criadas++;
          } catch(e) {}
        }
        toast(`${criadas} sessão(ões) agendada(s)!`);
      }
    } catch(e) { toast(e.message, 'error'); }
}

function copiarLinkGerado() {
  const link = document.getElementById('conv-link-input')?.value;
  if (link) navigator.clipboard.writeText(link).then(() => toast('Link copiado! 📋'));
}

// ── Modelo do contrato ────────────────────────────────────────
const MODELO_DEFAULT = {
  intro: `Seja bem-vindo(a)!\n\nApresento aqui algumas informações importantes para darmos início ao seu processo de Orientação Profissional e de Carreira.\n\nEssas informações têm como objetivo auxiliar o processo, esclarecendo os acordos necessários para um bom funcionamento do nosso trabalho em conjunto.\n\nPeço que leia com atenção cada ponto e sinalize com "ciente" caso esteja de acordo. Caso tenha alguma dúvida, fique à vontade para entrar em contato.\n\nAo final deste termo você encontrará algumas perguntas sobre seus dados pessoais. Essas informações são importantes para o seu prontuário, bem como para emissão de notas fiscais referentes aos serviços prestados.`,
  secoes: [
    { titulo: "Sobre o Processo de Orientação Profissional e de Carreira", itens: [
      "O foco específico do processo de orientação profissional e de carreira será definido durante a primeira sessão, a partir da compreensão das necessidades, expectativas, momento profissional e objetivos apresentados pelo(a) cliente. A partir desse levantamento inicial, será elaborado um plano de trabalho personalizado, que poderá ser ajustado ao longo do acompanhamento conforme a evolução do processo e o surgimento de novas demandas.",
      "Por se tratar de um serviço psicológico, não há garantia ou promessa de resultados específicos. O resultado do processo está diretamente relacionado ao comprometimento e à participação ativa do contratante nas reflexões e atividades propostas."
    ]},
    { titulo: "Sobre as Sessões", itens: [
      "A frequência do processo será acordada entre as partes, preferencialmente acontecerá semanal, ou seja, uma vez por semana.",
      "Havendo necessidade, a frequência dos encontros semanais poderá ser aumentada ou espaçada, sendo isso previamente combinado entre as partes.",
      "Cada sessão terá duração de 50 minutos, sendo realizada em horário previamente combinado.",
      "O número de sessões pode variar de acordo com a necessidade do cliente, o nível de maturidade em relação ao objetivo trabalhado e a evolução do cliente ao longo das etapas."
    ]},
    { titulo: "Sigilo e Confidencialidade", itens: [
      "Todas as informações compartilhadas durante o processo são protegidas pelo sigilo profissional, conforme o Código de Ética Profissional do Psicólogo.",
      "O sigilo poderá ser quebrado apenas nas situações previstas legalmente e pelo Código de Ética Profissional do Psicólogo.",
      "Caso seja necessário contato com familiares, responsáveis ou outros profissionais, ocorrerá somente com consentimento do cliente, exceto nas situações previstas em lei."
    ]},
    { titulo: "Horários, Desmarcações e Remarcações", itens: [
      "O horário das sessões será previamente combinado entre as partes.",
      "Cancelamentos ou pedidos de alteração deverão ocorrer com antecedência mínima de 24 horas.",
      "Quando avisadas dentro desse prazo, as sessões poderão ser remarcadas conforme disponibilidade de agenda.",
      "Mudanças de horário estarão sujeitas à disponibilidade da agenda."
    ]},
    { titulo: "Faltas", itens: [
      "Sessões canceladas com menos de 24 horas de antecedência serão cobradas normalmente.",
      "Sessões em que houver ausência sem aviso prévio serão cobradas normalmente.",
      "Situações excepcionais, como problemas de saúde, instabilidade de internet ou outras intercorrências relevantes, serão avaliadas individualmente."
    ]},
    { titulo: "Honorários", itens: [
      "__VALOR_SESSAO__",
      "O pagamento poderá ocorrer por sessão — realizado no mesmo dia da sessão — ou de forma mensal, em parcela única até o 5º dia útil do mês em que ocorrerão as sessões.",
      "O pagamento poderá ser realizado via Pix, transferência ou cartão de crédito.",
      "Os dados para pagamento serão disponibilizados pela psicóloga."
    ]},
    { titulo: "Atividades Entre Sessões", itens: [
      "Algumas etapas do processo poderão incluir pesquisas, leituras, exercícios, entrevistas com profissionais ou outras atividades relacionadas à construção do projeto profissional.",
      "A qualidade das reflexões e decisões construídas durante o processo depende também da realização dessas atividades.",
      "O comprometimento com as atividades propostas contribui para um melhor aproveitamento do processo."
    ]},
    { titulo: "Encerramento do Processo", itens: [
      "O processo poderá ser encerrado por qualquer das partes mediante comunicação prévia.",
      "Caso o encerramento seja realizado por iniciativa do cliente, não haverá devolução de valores referentes a sessões já realizadas ou pagamentos já efetuados.",
      "Sempre que possível, o encerramento será realizado de forma planejada e discutido durante os encontros."
    ]}
  ]
};

function _getModelo() {
  const raw = _config?.modelo_contrato;
  if (!raw) return MODELO_DEFAULT;
  try { return JSON.parse(raw); } catch(_) { return MODELO_DEFAULT; }
}

function renderModeloPreview() {
  const el = document.getElementById('contrato-modelo-preview');
  if (!el) return;
  const m = _getModelo();
  const introHtml = (m.intro || '').split('\n\n').map(p =>
    `<p style="margin-bottom:12px;font-size:14px;color:#5a3a5a;line-height:1.75">${p.replace(/\n/g,'<br>')}</p>`
  ).join('');
  const valorPadrao = Number(_config?.valor_sessao_padrao) || 0;
  function _valorExtenso(v) {
    if (!v) return '(a combinar com a psicóloga)';
    const brl = v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const un=['','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
    const dz=['','dez','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];
    const ct=['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos'];
    const dez=x=>x<20?un[x]:dz[Math.floor(x/10)]+(x%10?' e '+un[x%10]:'');
    const cem=x=>x===100?'cem':ct[Math.floor(x/100)]+(x%100?' e '+dez(x%100):'');
    const w=x=>x<100?dez(x):cem(x);
    const n=Math.round(v*100),r=Math.floor(n/100),c=n%100;
    const pr=r>0?w(r)+(r===1?' real':' reais'):'';
    const pc=c>0?w(c)+(c===1?' centavo':' centavos'):'';
    return brl + ' (' + ((pr&&pc)?pr+' e '+pc:(pr||pc||'zero reais')) + ')';
  }
  const secoesHtml = (m.secoes || []).map((s, si) => `
    <div style="margin-bottom:22px">
      <div style="font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;color:var(--rose,#c2657a);background:linear-gradient(90deg,#fce8f2,#fff);padding:7px 12px;border-left:3px solid var(--rose,#c2657a);border-radius:4px;margin-bottom:10px">
        ${s.titulo}
      </div>
      <ol type="a" style="padding-left:20px">
        ${(s.itens||[]).map(it => {
          if (it === '__VALOR_SESSAO__') return `<li style="font-size:13.5px;color:#3d2b3d;margin-bottom:8px;line-height:1.65">O valor da sessão é de <strong>${_valorExtenso(valorPadrao)}</strong>.</li>`;
          return `<li style="font-size:13.5px;color:#3d2b3d;margin-bottom:8px;line-height:1.65">${it}</li>`;
        }).join('')}
      </ol>
    </div>
  `).join('');
  el.innerHTML = `
    <div style="background:#fdf6fb;border-left:4px solid #d4869b;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:22px">
      ${introHtml}
    </div>
    ${secoesHtml}
  `;
}

function editarModeloContrato() {
  const m = _getModelo();
  const renderSecaoEditor = (s, si) => `
    <div class="secao-bloco" data-si="${si}" style="background:#fafafa;border:1.5px solid var(--border);border-radius:10px;padding:16px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <input class="sec-titulo-inp" type="text" value="${s.titulo.replace(/"/g,'&quot;')}"
          style="flex:1;font-weight:700;font-size:13px;padding:7px 10px;border:1.5px solid var(--border);border-radius:7px">
        <button class="btn btn-ghost btn-xs" style="color:var(--red,#c0425d)" onclick="removerSecao(this)" title="Remover seção">🗑</button>
      </div>
      <div class="itens-lista">
        ${(s.itens||[]).map((it,ii) => renderItemEditor(it, si, ii)).join('')}
      </div>
      <button class="btn btn-outline btn-xs" style="margin-top:8px" onclick="addItem(this)">+ Adicionar item</button>
    </div>
  `;
  const renderItemEditor = (txt, si, ii) => {
    if (txt === '__VALOR_SESSAO__') return `
      <div class="item-bloco" style="display:flex;gap:6px;margin-bottom:8px;align-items:center">
        <div style="flex:1;font-size:13px;padding:8px 10px;border:1.5px solid #d4a76a;border-radius:7px;background:#fff8f0;color:#7a5a2a">
          💰 <strong>Valor da sessão</strong> — vinculado às Configurações (R$ ${Number(_config?.valor_sessao_padrao||0).toLocaleString('pt-BR',{minimumFractionDigits:2})})
          <input type="hidden" class="item-txt" value="__VALOR_SESSAO__">
        </div>
      </div>
    `;
    return `
      <div class="item-bloco" style="display:flex;gap:6px;margin-bottom:8px;align-items:flex-start">
        <textarea class="item-txt" rows="3"
          style="flex:1;font-size:13px;padding:8px 10px;border:1.5px solid var(--border);border-radius:7px;resize:vertical;line-height:1.6"
        >${txt.replace(/</g,'&lt;')}</textarea>
        <button class="btn btn-ghost btn-xs" style="color:var(--red,#c0425d);margin-top:4px" onclick="removerItem(this)">×</button>
      </div>
    `;
  };
  const html = `
    <div style="max-height:65vh;overflow-y:auto;padding-right:4px">
      <div style="margin-bottom:16px">
        <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);display:block;margin-bottom:6px">Texto de introdução</label>
        <textarea id="mod-intro" rows="8" style="width:100%;font-size:13px;padding:10px;border:1.5px solid var(--border);border-radius:8px;resize:vertical;line-height:1.65">${m.intro||''}</textarea>
      </div>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);margin-bottom:10px">Cláusulas</div>
      <div id="secoes-editor">
        ${(m.secoes||[]).map((s,si) => renderSecaoEditor(s,si)).join('')}
      </div>
      <button class="btn btn-outline btn-sm" style="width:100%;margin-top:4px" onclick="addSecao()">+ Nova seção</button>
    </div>
  `;
  openModal('✏️ Editar Modelo do Contrato', html, salvarModeloContrato, { saveLabel: 'Salvar Modelo', wide: true });
}

function addSecao() {
  const ed = document.getElementById('secoes-editor');
  const si = ed.querySelectorAll('.secao-bloco').length;
  const div = document.createElement('div');
  div.className = 'secao-bloco';
  div.dataset.si = si;
  div.style.cssText = 'background:#fafafa;border:1.5px solid var(--border);border-radius:10px;padding:16px;margin-bottom:14px';
  div.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <input class="sec-titulo-inp" type="text" value="Nova Seção"
        style="flex:1;font-weight:700;font-size:13px;padding:7px 10px;border:1.5px solid var(--border);border-radius:7px">
      <button class="btn btn-ghost btn-xs" style="color:var(--red,#c0425d)" onclick="removerSecao(this)">🗑</button>
    </div>
    <div class="itens-lista"></div>
    <button class="btn btn-outline btn-xs" style="margin-top:8px" onclick="addItem(this)">+ Adicionar item</button>
  `;
  ed.appendChild(div);
}

function addItem(btn) {
  const lista = btn.closest('.secao-bloco').querySelector('.itens-lista');
  const div = document.createElement('div');
  div.className = 'item-bloco';
  div.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;align-items:flex-start';
  div.innerHTML = `
    <textarea class="item-txt" rows="2"
      style="flex:1;font-size:13px;padding:8px 10px;border:1.5px solid var(--border);border-radius:7px;resize:vertical;line-height:1.6"
    ></textarea>
    <button class="btn btn-ghost btn-xs" style="color:var(--red,#c0425d);margin-top:4px" onclick="removerItem(this)">×</button>
  `;
  lista.appendChild(div);
  div.querySelector('textarea').focus();
}

function removerItem(btn) {
  btn.closest('.item-bloco').remove();
}

function removerSecao(btn) {
  if (!confirm('Remover esta seção?')) return;
  btn.closest('.secao-bloco').remove();
}

async function salvarModeloContrato() {
  const intro = document.getElementById('mod-intro')?.value || '';
  const secoes = [...document.querySelectorAll('#secoes-editor .secao-bloco')].map(bloco => ({
    titulo: bloco.querySelector('.sec-titulo-inp')?.value.trim() || '',
    itens: [...bloco.querySelectorAll('.item-txt')].map(t => t.value.trim()).filter(Boolean)
  }));
  const modelo = { intro, secoes };
  await api('POST', '/configuracoes', { modelo_contrato: JSON.stringify(modelo) });
  if (_config) _config.modelo_contrato = JSON.stringify(modelo);
  toast('Modelo salvo!');
  renderModeloPreview();
}

function filtrarContratos() {
  const q = (document.getElementById('cont-search')?.value || '').toLowerCase();
  const filtrados = _contratos.filter(c =>
    !q ||
    (c.nome || '').toLowerCase().includes(q) ||
    (c.cpf  || '').includes(q) ||
    (c.email || '').toLowerCase().includes(q)
  );
  renderContratosTable(filtrados);
}

function _renderContratoRow(c) {
  const pgtoLabel = { mensal: 'Mensal', 'por sessão': 'Por Sessão', Mensal: 'Mensal', 'Por sessão': 'Por Sessão' };
  const [a, m, d] = (c.created_at || '').split(' ')[0]?.split('-') || [];
  const dataFmt = d ? `${d}/${m}/${a}` : '—';
  const valorFmt = c.valor_sessao ? `R$ ${Number(c.valor_sessao).toFixed(2).replace('.',',')}` : '—';
  const _ft = localStorage.getItem('token') || '';
  const arquivoHtml = c.arquivo
    ? `<a href="/uploads/contratos/${c.arquivo}?t=${_ft}" target="_blank" class="btn btn-outline btn-sm" style="margin-right:8px">📄 Ver contrato assinado</a>`
    : `<span style="color:var(--muted);font-size:12px">Sem arquivo anexo</span>`;

  // Agendamento escolhido pelo cliente
  const agendFmt = (() => {
    if (!c.agend_data) return '—';
    const [aa, mm, dd] = c.agend_data.split('-');
    const DIAS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    const dow  = DIAS[new Date(c.agend_data + 'T12:00:00').getDay()];
    return `<span style="font-weight:700;color:var(--plum)">${dow} ${dd}/${mm}/${aa}</span><br><span style="font-size:11px;color:var(--rose)">${c.agend_hora || ''}</span>`;
  })();

  return `
    <tr style="cursor:pointer" onclick="toggleContratoDetalhe(${c.id})">
      <td style="white-space:nowrap">${dataFmt}</td>
      <td>
        <strong>${c.nome}</strong>
        ${c.nome_responsavel ? `<br><span style="font-size:11px;color:var(--muted)">Resp: ${c.nome_responsavel}</span>` : ''}
      </td>
      <td>${c.cpf || '—'}</td>
      <td>${c.email || '—'}</td>
      <td>${c.celular || '—'}</td>
      <td>${c.forma_pgto ? `<span class="badge badge-confirmado">${pgtoLabel[c.forma_pgto] || c.forma_pgto}</span>` : '—'}</td>
      <td style="white-space:nowrap">${valorFmt}</td>
      <td style="white-space:nowrap;line-height:1.4">${agendFmt}</td>
      <td style="white-space:nowrap" onclick="event.stopPropagation()">
        <button class="btn btn-ghost btn-xs" style="color:var(--red)" onclick="deleteContratoItem(${c.id})">🗑</button>
      </td>
    </tr>
    <tr id="detalhe-contrato-${c.id}" style="display:none">
      <td colspan="9" style="background:#faf7f4;padding:12px 20px;border-bottom:2px solid var(--border)">
        <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">
          ${c.agend_data ? (() => {
            const [aa,mm,dd] = c.agend_data.split('-');
            const DIAS_FULL = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
            const dow = DIAS_FULL[new Date(c.agend_data+'T12:00:00').getDay()];
            return `<span style="font-size:13px;color:var(--plum);font-weight:700">📅 ${dow}, ${dd}/${mm}/${aa} às ${c.agend_hora || '—'}</span>`;
          })() : '<span style="color:var(--muted);font-size:12px">Sem agendamento vinculado</span>'}
          ${arquivoHtml}
          <button class="btn btn-outline btn-sm" onclick="gerarTermoCompromisso(${c.id})">📋 Gerar Termo</button>
        </div>
      </td>
    </tr>
  `;
}

function gerarTermoCompromisso(id) {
  const c = _contratos.find(x => x.id === id);
  if (!c) return;
  const cfg = _config || {};
  const psi   = cfg.nome_psicologa || 'Psi. Elissa Catarina Lorenzi';
  const crp   = cfg.crp || 'CRP 06/91616';
  const valor = c.valor_sessao ? `R$ ${Number(c.valor_sessao).toFixed(2).replace('.',',')}` : '___________';
  const pgto  = ({ mensal: 'mensal', 'por sessão': 'por sessão' }[c.forma_pgto] || c.forma_pgto || 'a combinar');
  const hoje  = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });

  const fmtNasc = (() => {
    if (!c.data_nascimento) return '___________';
    const [a,m,d] = c.data_nascimento.split('-');
    return `${d}/${m}/${a}`;
  })();

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Termo de Compromisso — ${c.nome}</title>
<style>
  @page { size: A4; margin: 2.5cm 2cm; }
  * { box-sizing: border-box; }
  body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.7; color: #222; }
  h1 { text-align: center; font-size: 14pt; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
  h2 { text-align: center; font-size: 11pt; font-weight: normal; margin-top: 0; margin-bottom: 24px; color: #555; }
  .section { margin-bottom: 10px; }
  .section strong { display: block; margin-bottom: 2px; }
  table.dados { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  table.dados td { padding: 4px 8px; border: 1px solid #ccc; font-size: 11pt; vertical-align: top; }
  table.dados td:first-child { width: 38%; background: #f5f5f5; font-weight: bold; }
  .clausula { margin-bottom: 12px; text-align: justify; }
  .clausula-num { font-weight: bold; }
  .assinaturas { margin-top: 50px; display: flex; justify-content: space-between; gap: 40px; }
  .assin-bloco { flex: 1; text-align: center; }
  .assin-linha { border-top: 1px solid #333; margin-bottom: 6px; }
  .assin-nome { font-size: 11pt; }
  .assin-crp { font-size: 10pt; color: #666; }
  .rodape { margin-top: 40px; text-align: center; font-size: 9pt; color: #999; border-top: 1px solid #ddd; padding-top: 8px; }
  @media print { button { display: none; } }
</style>
</head>
<body>
<div style="text-align:center;margin-bottom:24px">
  <h1>Termo de Compromisso</h1>
  <h2>Prestação de Serviços de Psicologia</h2>
</div>

<p class="clausula">Pelo presente instrumento, as partes abaixo identificadas celebram o presente Termo de Compromisso de Prestação de Serviços de Psicologia, que se regerá pelas seguintes cláusulas e condições:</p>

<p style="font-weight:bold;margin-bottom:6px">IDENTIFICAÇÃO DAS PARTES</p>
<table class="dados">
  <tr><td>Psicóloga</td><td>${psi}</td></tr>
  <tr><td>Registro profissional</td><td>${crp}</td></tr>
  <tr><td>Cliente</td><td>${c.nome || '___________'}</td></tr>
  <tr><td>CPF</td><td>${c.cpf || '___________'}</td></tr>
  <tr><td>Data de nascimento</td><td>${fmtNasc}</td></tr>
  <tr><td>E-mail</td><td>${c.email || '___________'}</td></tr>
  <tr><td>Telefone/WhatsApp</td><td>${c.celular || '___________'}</td></tr>
  <tr><td>Endereço</td><td>${c.endereco || '___________'}</td></tr>
  ${c.nome_responsavel ? `<tr><td>Responsável legal</td><td>${c.nome_responsavel}${c.cpf_responsavel ? ' — CPF: '+c.cpf_responsavel : ''}</td></tr>` : ''}
</table>

<p class="clausula"><span class="clausula-num">1. DO OBJETO.</span> A psicóloga se compromete a prestar atendimento psicológico ao(à) cliente, em regime de sessões individuais, conforme as diretrizes éticas do Conselho Federal de Psicologia (CFP) e do Código de Ética Profissional do Psicólogo.</p>

<p class="clausula"><span class="clausula-num">2. DA PERIODICIDADE E DURAÇÃO.</span> As sessões terão duração de aproximadamente 50 (cinquenta) minutos, com frequência e horário a serem definidos de comum acordo entre as partes. Alterações de horário devem ser comunicadas com antecedência mínima de 24 (vinte e quatro) horas.</p>

<p class="clausula"><span class="clausula-num">3. DO CANCELAMENTO.</span> Cancelamentos com menos de 24 horas de antecedência implicarão a cobrança integral da sessão, salvo em casos de força maior, comprovados e comunicados à psicóloga. Faltas sem aviso prévio também serão cobradas integralmente.</p>

<p class="clausula"><span class="clausula-num">4. DOS HONORÁRIOS.</span> O valor acordado por sessão é de <strong>${valor}</strong>, com pagamento <strong>${pgto}</strong>. O não pagamento na data ajustada poderá acarretar a suspensão dos atendimentos até a regularização.</p>

<p class="clausula"><span class="clausula-num">5. DO SIGILO PROFISSIONAL.</span> A psicóloga está vinculada ao sigilo profissional, nos termos do Art. 9º do Código de Ética do Psicólogo, somente podendo revelá-lo nas hipóteses previstas em lei ou quando necessário para prevenir grave ameaça à vida do(a) cliente ou de terceiros.</p>

<p class="clausula"><span class="clausula-num">6. DOS REGISTROS.</span> A psicóloga manterá prontuário atualizado conforme exigido pelas Resoluções do CFP. Os dados pessoais do(a) cliente serão tratados em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018).</p>

<p class="clausula"><span class="clausula-num">7. DO ENCERRAMENTO.</span> Qualquer das partes poderá encerrar o acompanhamento, sendo recomendável comunicar a decisão com antecedência para que seja realizado o processo de encerramento terapêutico adequado.</p>

<p class="clausula"><span class="clausula-num">8. DO FORO.</span> Eventuais conflitos serão resolvidos prioritariamente por meio de diálogo. Na impossibilidade, as partes elegem o foro da Comarca de Boituva/SP.</p>

<p style="margin-top:28px">Boituva/SP, ${hoje}.</p>

<div class="assinaturas">
  <div class="assin-bloco">
    <div class="assin-linha"></div>
    <div class="assin-nome">${psi}</div>
    <div class="assin-crp">${crp}</div>
  </div>
  <div class="assin-bloco">
    <div class="assin-linha"></div>
    <div class="assin-nome">${c.nome || 'Cliente'}</div>
    <div class="assin-crp">CPF: ${c.cpf || '___________'}</div>
  </div>
  ${c.nome_responsavel ? `
  <div class="assin-bloco">
    <div class="assin-linha"></div>
    <div class="assin-nome">${c.nome_responsavel}</div>
    <div class="assin-crp">Responsável legal</div>
  </div>` : ''}
</div>

<div class="rodape">Documento gerado em ${hoje} · ${psi} · ${crp}</div>

<div style="text-align:center;margin-top:20px">
  <button onclick="window.print()" style="padding:10px 28px;background:#7c4e7e;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer">🖨️ Imprimir / Salvar PDF</button>
</div>
</body>
</html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
}

function renderContratosTable(data) {
  if (!data.length) {
    document.getElementById('contratos-tbody').innerHTML = `<tr><td colspan="9"><div class="empty-state"><span class="empty-icon">📝</span><p>Nenhum contrato assinado ainda.<br>Clique em <strong>+ Novo Contrato</strong> para enviar o link ao cliente.</p></div></td></tr>`;
    _sortState['contratos-tbody'] = null;
    return;
  }
  _sortInit('contratos-tbody', data, _renderContratoRow, 'created_at');
  _sortState['contratos-tbody'].asc = false;
  _sortRender('contratos-tbody');
}

function toggleContratoDetalhe(id) {
  const row = document.getElementById(`detalhe-contrato-${id}`);
  if (!row) return;
  row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
}

async function salvarValorContrato(id) {
  const input = document.getElementById(`valor-contrato-${id}`);
  const valor = parseFloat(input.value) || 0;
  await api('PUT', `/contratos/${id}`, { valor_sessao: valor });
  toast('Valor atualizado');
  refreshAll();
}

async function deleteContratoItem(id) {
  if (!confirm('Excluir este contrato? Esta ação não pode ser desfeita.')) return;
  await api('DELETE', `/contratos/${id}`);
  toast('Contrato removido');
  loadContratos();
}

// ── INIT ─────────────────────────────────────────────────────
// ============================================================
async function loadNotificacoes() {
  try {
    const { count, contratos } = await api('GET', '/contratos/novos');
    const badge = document.getElementById('badge-contratos');
    if (badge) {
      badge.textContent = count || '';
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
    const el = document.getElementById('dash-novidades');
    if (!el) return;
    if (!count) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    el.innerHTML = `
      <div class="card" style="border-left:3px solid var(--rose)">
        <div class="card-header">
          <span class="card-title">🔔 ${count} novo${count > 1 ? 's' : ''} contrato${count > 1 ? 's' : ''} assinado${count > 1 ? 's' : ''}</span>
          <button class="btn btn-primary btn-sm" onclick="navigate('contratos')">Ver contratos</button>
        </div>
        <div class="card-body" style="padding-top:4px">
          ${contratos.slice(0, 5).map(c => `
            <div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px">
              <span style="font-size:20px">📝</span>
              <div>
                <div style="font-weight:700;font-size:13.5px">${c.nome}</div>
                <div style="font-size:12px;color:var(--muted)">${fmtData(c.created_at?.split(' ')[0])} · ${c.origem === 'whatsapp' ? 'WhatsApp' : 'Online'}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch(e) {}
}

// ── BIBLIOTECA DE ATIVIDADES ─────────────────────────────────
let _bibCards = null;

function _getBibCards() {
  if (!_bibCards) {
    _bibCards = JSON.parse(localStorage.getItem('bib_cards_extra') || '[]');
  }
  return [...BIB_CARDS, ..._bibCards];
}

function bibRenderHome() {
  const cards = _getBibCards();
  const bc = document.getElementById('bib-breadcrumb');
  const ct = document.getElementById('bib-conteudo');
  if (!bc || !ct) return;
  bc.style.display = 'none';
  ct.innerHTML = `<div class="bib-grid">${cards.map(c => `
    <div class="bib-card">
      <div class="bib-card-header ${c.cor || 'bib-op'}">
        <span class="bib-icon">${c.icone}</span>
        <div>
          <div class="bib-titulo">${c.titulo}</div>
          <div class="bib-subtitulo">${c.subtitulo}</div>
        </div>
      </div>
      <div class="bib-card-body">
        <p class="bib-desc">${c.desc || ''}</p>
        <div class="bib-acoes">
          <button class="btn btn-primary btn-sm" onclick="abrirBiblioteca('${c.id}')">Ver Atividades</button>
        </div>
      </div>
    </div>`).join('')}</div>`;
}

function abrirBiblioteca(areaId) {
  const cards  = _getBibCards();
  const card   = cards.find(c => c.id === areaId);
  if (!card) return;

  if (!card.semAtalho) {
    // Se tiver exatamente 1 pasta com 1 atividade, vai direto para ela
    if (card.pastas?.length === 1 && card.pastas[0].atividades?.length === 1) {
      abrirAtividade(areaId, card.pastas[0].id, card.pastas[0].atividades[0].id);
      return;
    }
    // Se tiver exatamente 1 pasta, vai direto para a lista de atividades
    if (card.pastas?.length === 1) {
      abrirPasta(areaId, card.pastas[0].id);
      return;
    }
  }

  const bc = document.getElementById('bib-breadcrumb');
  const ct = document.getElementById('bib-conteudo');

  bc.style.display = 'flex';
  bc.innerHTML = `
    <span class="bib-bc-link" onclick="bibRenderHome()">Biblioteca</span>
    <span class="bib-bc-sep">›</span>
    <span class="bib-bc-cur">${card.icone} ${card.titulo} — ${card.subtitulo}</span>`;

  if (!card.pastas || !card.pastas.length) {
    ct.innerHTML = `<div class="empty-state"><span class="empty-icon">📂</span><p>Nenhuma pasta cadastrada ainda.</p></div>`;
    return;
  }

  ct.innerHTML = `<div class="bib-grid">${card.pastas.map(p => `
    <div class="bib-card bib-pasta" onclick="abrirPasta('${areaId}','${p.id}')">
      <div class="bib-card-header ${card.cor || 'bib-op'}" style="cursor:pointer">
        <span class="bib-icon">${p.icone || '📁'}</span>
        <div>
          <div class="bib-titulo">${p.nome}</div>
          <div class="bib-subtitulo">${p.atividades.length} atividade${p.atividades.length !== 1 ? 's' : ''}</div>
        </div>
      </div>
    </div>`).join('')}</div>`;
}

function abrirPasta(areaId, pastaId) {
  const cards  = _getBibCards();
  const card   = cards.find(c => c.id === areaId);
  const pasta  = card?.pastas.find(p => p.id === pastaId);
  if (!card || !pasta) return;

  if (pasta.atividades?.length === 1) {
    abrirAtividade(areaId, pastaId, pasta.atividades[0].id);
    return;
  }

  const bc = document.getElementById('bib-breadcrumb');
  const ct = document.getElementById('bib-conteudo');

  bc.style.display = 'flex';
  bc.innerHTML = `
    <span class="bib-bc-link" onclick="bibRenderHome()">Biblioteca</span>
    <span class="bib-bc-sep">›</span>
    <span class="bib-bc-link" onclick="abrirBiblioteca('${areaId}')">${card.icone} ${card.titulo}</span>
    <span class="bib-bc-sep">›</span>
    <span class="bib-bc-cur">${pasta.icone || '📁'} ${pasta.nome}</span>`;

  if (!pasta.atividades?.length) {
    ct.innerHTML = `<div class="empty-state"><span class="empty-icon">📂</span><p>Nenhuma profissão cadastrada ainda.</p></div>`;
    return;
  }

  ct.innerHTML = `
    <input type="text" id="bib-pasta-busca" placeholder="🔍 Buscar profissão..." oninput="bibFiltrarPasta(this)" style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;outline:none;margin-bottom:16px;display:block">
    <div class="bib-grid" id="bib-pasta-grid">${pasta.atividades.map(a => `
    <div class="bib-card bib-atv-card" onclick="abrirAtividade('${areaId}','${pastaId}','${a.id}')">
      <div class="bib-card-header ${card.cor || 'bib-op'}" style="cursor:pointer;min-height:72px">
        <span class="bib-icon" style="font-size:26px">${a.icone || '📄'}</span>
        <div>
          <div class="bib-titulo" style="font-size:13px">${a.titulo}</div>
          <div class="bib-subtitulo">${a.subtitulo || ''}</div>
        </div>
      </div>
    </div>`).join('')}</div>`;
}

function bibFiltrarPasta(input) {
  const v = input.value.toLowerCase().trim();
  document.querySelectorAll('#bib-pasta-grid .bib-atv-card').forEach(card => {
    const titulo = card.querySelector('.bib-titulo')?.textContent.toLowerCase() || '';
    card.style.display = (!v || titulo.includes(v)) ? '' : 'none';
  });
}

function abrirAtividade(areaId, pastaId, atvId) {
  const cards  = _getBibCards();
  const card   = cards.find(c => c.id === areaId);
  const pasta  = card?.pastas.find(p => p.id === pastaId);
  const atv    = pasta?.atividades.find(a => a.id === atvId);
  if (!card || !pasta || !atv) return;
  const bc = document.getElementById('bib-breadcrumb');
  const ct = document.getElementById('bib-conteudo');

  bc.style.display = 'flex';
  bc.innerHTML = `
    <span class="bib-bc-link" onclick="bibRenderHome()">Biblioteca</span>
    <span class="bib-bc-sep">›</span>
    <span class="bib-bc-link" onclick="abrirBiblioteca('${areaId}')">${card.icone} ${card.titulo}</span>
    <span class="bib-bc-sep">›</span>
    <span class="bib-bc-link" onclick="abrirPasta('${areaId}','${pastaId}')">${pasta.icone || '📁'} ${pasta.nome}</span>
    <span class="bib-bc-sep">›</span>
    <span class="bib-bc-cur">${atv.icone || '📄'} ${atv.titulo}</span>`;

  ct.innerHTML = `
    <div class="bib-atv-view">
      <div class="bib-atv-header ${card.cor || 'bib-op'}">
        <span style="font-size:36px">${atv.icone || '📄'}</span>
        <div style="flex:1">
          <h2 class="bib-atv-titulo">${atv.titulo}</h2>
          <p class="bib-atv-sub">${atv.subtitulo || ''}</p>
        </div>
        <button class="bib-btn-copiar" onclick="copiarAtividade()" title="Copiar conteúdo">
          📋 Copiar
        </button>
      </div>
      <div class="bib-atv-corpo" id="bib-atv-corpo-atual">${atv.conteudo}</div>
    </div>`;

  _bibAdicionarIndicadoresExpandir(ct.querySelector('.bib-atv-corpo'));
}

function _bibAdicionarIndicadoresExpandir(container) {
  if (!container) return;
  container.querySelectorAll('details > summary').forEach(s => {
    if (s.textContent.includes('expandir') || s.textContent.includes('clique')) return;
    const ind = document.createElement('span');
    ind.style.cssText = 'font-size:10px;font-weight:400;color:#999;margin-left:auto;padding-left:10px;white-space:nowrap;pointer-events:none;flex-shrink:0';
    ind.textContent = '▼ expandir';
    s.style.display = 'flex';
    s.style.justifyContent = 'space-between';
    s.style.alignItems = 'center';
    s.appendChild(ind);
    s.parentElement.addEventListener('toggle', function() {
      ind.textContent = this.open ? '▲ fechar' : '▼ expandir';
    });
  });
}

function copiarAtividade() {
  const corpo = document.getElementById('bib-atv-corpo-atual');
  if (!corpo) return;

  // ── Texto estruturado (fallback plain text) ──────────────
  function noParaTexto(node) {
    if (node.nodeType === 3) return node.textContent;
    const tag = node.tagName?.toLowerCase();
    const filhos = () => Array.from(node.childNodes).map(noParaTexto).join('');
    if (tag === 'h3')     return '\n\n' + node.textContent.toUpperCase() + '\n' + '─'.repeat(36) + '\n';
    if (tag === 'p')      return '\n' + filhos() + '\n';
    if (tag === 'strong') return filhos();
    if (tag === 'em')     return filhos();
    if (tag === 'ul')     return '\n' + Array.from(node.children).map(li => '• ' + li.textContent).join('\n') + '\n';
    if (tag === 'ol')     return '\n' + Array.from(node.children).map((li, i) => (i+1) + '. ' + li.textContent).join('\n') + '\n';
    if (tag === 'li')     return filhos();
    if (tag === 'div')    return filhos() + '\n';
    return filhos();
  }
  const textoPlano = Array.from(corpo.childNodes).map(noParaTexto).join('').replace(/\n{3,}/g, '\n\n').trim();

  // ── HTML rico com estilos inline para colar em Word/Docs ─
  const htmlRico = `
    <html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#1a1a1a">
    <style>
      h3{font-size:15px;font-weight:700;color:#14392F;margin:18px 0 6px;border-bottom:1px solid #ccc;padding-bottom:4px}
      p{margin:0 0 8px}
      ul,ol{margin:6px 0 10px;padding-left:22px}
      li{margin-bottom:4px}
      strong{font-weight:700}
      .atv-bloco{background:#F0E8E0;border-left:3px solid #75553C;padding:10px 14px;margin:10px 0;border-radius:4px}
      .atv-destaque{background:#DFF0E7;border-left:3px solid #2A6B4A;padding:10px 14px;margin:10px 0;border-radius:4px}
      .atv-verbos{background:#f5f5f5;border:1px solid #ddd;padding:12px;border-radius:6px;line-height:2;margin:10px 0}
      .curtigrama-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}
      .curtigrama-celula{padding:10px;border-radius:6px;border:1px solid #ccc}
    </style>
    ${corpo.innerHTML}
    </body></html>`;

  const ok = () => showToast('Atividade copiada com formatação!', 'success');
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = textoPlano;
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    ok();
  };

  if (navigator.clipboard && window.ClipboardItem) {
    navigator.clipboard.write([new ClipboardItem({
      'text/html':  new Blob([htmlRico],    { type: 'text/html'  }),
      'text/plain': new Blob([textoPlano],  { type: 'text/plain' })
    })]).then(ok).catch(() => navigator.clipboard.writeText(textoPlano).then(ok).catch(fallback));
  } else {
    navigator.clipboard?.writeText(textoPlano).then(ok).catch(fallback) ?? fallback();
  }
}

function bibNovoCard() {
  document.getElementById('bib-new-icone').value   = '';
  document.getElementById('bib-new-titulo').value  = '';
  document.getElementById('bib-new-subtitulo').value = '';
  document.getElementById('bib-new-desc').value    = '';
  document.getElementById('modal-bib-card').style.display = 'flex';
}

function fecharModalBibCard() {
  document.getElementById('modal-bib-card').style.display = 'none';
}

function salvarNovoBibCard() {
  const icone    = document.getElementById('bib-new-icone').value.trim()    || '📚';
  const titulo   = document.getElementById('bib-new-titulo').value.trim();
  const subtitulo= document.getElementById('bib-new-subtitulo').value.trim();
  const desc     = document.getElementById('bib-new-desc').value.trim();
  const cor      = document.getElementById('bib-new-cor').value;
  if (!titulo) { showToast('Informe o título do card', 'error'); return; }

  const extra = JSON.parse(localStorage.getItem('bib_cards_extra') || '[]');
  extra.push({ id: 'custom-' + Date.now(), icone, titulo, subtitulo, desc, cor, pastas: [] });
  localStorage.setItem('bib_cards_extra', JSON.stringify(extra));
  _bibCards = null;
  fecharModalBibCard();
  bibRenderHome();
  showToast('Card criado com sucesso!', 'success');
}

// ── TAREFAS ──────────────────────────────────────────────────
let _tarefas = [];

async function loadTarefas() {
  _tarefas = await api('GET', '/tarefas');
  renderTarefas();
}

function renderTarefas() {
  const pendentes  = _tarefas.filter(t => !t.concluida);
  const concluidas = _tarefas.filter(t =>  t.concluida);

  const renderItem = (t) => `
    <div class="tarefa-item${t.concluida ? ' tarefa-done' : ''}" id="tarefa-${t.id}">
      <label style="display:flex;align-items:center;gap:10px;flex:1;cursor:pointer;min-width:0">
        <input type="checkbox" ${t.concluida ? 'checked' : ''} onchange="toggleTarefa(${t.id},this.checked)"
          style="width:17px;height:17px;accent-color:var(--rose);flex-shrink:0;cursor:pointer">
        <span class="tarefa-titulo">${t.titulo}</span>
        ${t.diaria ? '<span class="tarefa-badge">🔄 diária</span>' : ''}
      </label>
      <div class="tarefa-acoes">
        <button class="btn-icon" onclick="editarTarefa(${t.id})" title="Editar">✏️</button>
        <button class="btn-icon" onclick="deletarTarefa(${t.id})" title="Excluir" style="color:var(--muted)">🗑️</button>
      </div>
    </div>`;

  const html = [
    pendentes.length  ? pendentes.map(renderItem).join('') : '<p style="text-align:center;color:var(--muted);padding:20px 0;font-size:13px">Nenhuma tarefa pendente 🎉</p>',
    concluidas.length ? `<div style="margin-top:8px;border-top:1px solid var(--border);padding-top:8px">
      <div style="font-size:11px;font-weight:700;color:var(--muted);padding:4px 16px 8px;letter-spacing:.5px">CONCLUÍDAS</div>
      ${concluidas.map(renderItem).join('')}
    </div>` : ''
  ].join('');

  document.getElementById('tarefas-lista').innerHTML = html;
}

async function toggleTarefa(id, concluida) {
  await api('PUT', `/tarefas/${id}`, { concluida });
  _tarefas = _tarefas.map(t => t.id === id ? { ...t, concluida: concluida ? 1 : 0 } : t);
  renderTarefas();
}

function editarTarefa(id) {
  const t = _tarefas.find(t => t.id === id);
  if (!t) return;
  openModal('Editar Tarefa', `
    <div class="form-group">
      <label>Título</label>
      <input type="text" id="tarefa-edit-titulo" value="${t.titulo.replace(/"/g,'&quot;')}" style="width:100%">
    </div>
    <div class="form-group" style="display:flex;align-items:center;gap:10px;margin-top:12px">
      <input type="checkbox" id="tarefa-edit-diaria" ${t.diaria ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--rose)">
      <label for="tarefa-edit-diaria" style="cursor:pointer;font-size:13px">Tarefa diária (reinicia todo dia)</label>
    </div>
  `, async () => {
    const titulo = document.getElementById('tarefa-edit-titulo').value.trim();
    if (!titulo) { toast('Informe o título', 'error'); return false; }
    const diaria = document.getElementById('tarefa-edit-diaria').checked;
    await api('PUT', `/tarefas/${id}`, { titulo, diaria });
    await loadTarefas();
  });
  setTimeout(() => document.getElementById('tarefa-edit-titulo')?.focus(), 100);
}

function novaTarefa() {
  openModal('Nova Tarefa', `
    <div class="form-group">
      <label>Título</label>
      <input type="text" id="tarefa-nova-titulo" placeholder="Ex: Enviar relatório..." style="width:100%">
    </div>
    <div class="form-group" style="display:flex;align-items:center;gap:10px;margin-top:12px">
      <input type="checkbox" id="tarefa-nova-diaria" checked style="width:16px;height:16px;accent-color:var(--rose)">
      <label for="tarefa-nova-diaria" style="cursor:pointer;font-size:13px">Tarefa diária (reinicia todo dia)</label>
    </div>
  `, async () => {
    const titulo = document.getElementById('tarefa-nova-titulo').value.trim();
    if (!titulo) { toast('Informe o título', 'error'); return false; }
    const diaria = document.getElementById('tarefa-nova-diaria').checked;
    await api('POST', '/tarefas', { titulo, diaria });
    await loadTarefas();
  });
  setTimeout(() => document.getElementById('tarefa-nova-titulo')?.focus(), 100);
}

async function deletarTarefa(id) {
  if (!confirm('Excluir esta tarefa?')) return;
  await api('DELETE', `/tarefas/${id}`);
  _tarefas = _tarefas.filter(t => t.id !== id);
  renderTarefas();
}

// ============================================================
// SOCIAL MEDIA
// ============================================================
let _socialViewMode = 'calendario';
let _socialPosts = [];

const REDE_COR = {
  instagram: { bg: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', label: 'Instagram', icon: '📸' },
  facebook:  { bg: '#1877F2', label: 'Facebook',  icon: '👥' },
  tiktok:    { bg: '#010101', label: 'TikTok',     icon: '🎵' },
};
const STATUS_SOCIAL = {
  rascunho:  { label: 'Rascunho',  cor: '#9e9e9e' },
  agendado:  { label: 'Agendado',  cor: '#1976d2' },
  publicado: { label: 'Publicado', cor: '#388e3c' },
};

function socialView(mode) {
  _socialViewMode = mode;
  [['btn-social-cal','calendario'],['btn-social-lista','lista'],['btn-social-estilo','estilo']].forEach(([id, m]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.background = mode === m ? 'var(--plum)' : '';
    el.style.color      = mode === m ? '#fff' : '';
  });
  const filtros = document.getElementById('social-filtros');
  if (filtros) filtros.style.display = mode === 'estilo' ? 'none' : '';
  renderSocial();
}

async function loadSocial() {
  const rede   = document.getElementById('social-filtro-rede')?.value   || '';
  const status = document.getElementById('social-filtro-status')?.value || '';
  const params = new URLSearchParams();
  if (rede)   params.set('rede', rede);
  if (status) params.set('status', status);
  _socialPosts = await api('GET', `/posts-sociais?${params}`);
  renderSocial();
}

function renderSocial() {
  const el = document.getElementById('social-content');
  if (!el) return;
  if (_socialViewMode === 'calendario') {
    el.innerHTML = renderSocialCalendario();
  } else if (_socialViewMode === 'estilo') {
    el.innerHTML = renderSocialEstilo();
  } else {
    el.innerHTML = renderSocialLista();
  }
}

function renderSocialEstilo() {
  const estilo = _config.social_estilo || '';
  const importados = _config.social_instagram_posts ? JSON.parse(_config.social_instagram_posts) : [];
  const midias = _config.social_estilo_midias ? JSON.parse(_config.social_estilo_midias) : [];

  const miniMidias = midias.map(m => `
    <div style="position:relative;display:inline-block">
      ${m.tipo === 'video'
        ? `<video src="${m.url}" style="width:110px;height:110px;object-fit:cover;border-radius:10px;border:2px solid var(--border)" muted></video>
           <span style="position:absolute;bottom:4px;left:4px;background:rgba(0,0,0,.6);color:#fff;font-size:10px;padding:2px 5px;border-radius:4px">🎥 vídeo</span>`
        : `<img src="${m.url}" style="width:110px;height:110px;object-fit:cover;border-radius:10px;border:2px solid var(--border)">`}
      <button onclick="removerEstiloMidia('${m.url}')" style="position:absolute;top:-6px;right:-6px;background:#e53935;color:#fff;border:none;border-radius:50%;width:22px;height:22px;font-size:13px;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center">×</button>
    </div>`).join('');

  return `<div style="display:flex;flex-direction:column;gap:16px;max-width:720px">

    <!-- Mídias de referência visual -->
    <div class="card" style="border-left:4px solid var(--plum)">
      <h3 style="margin:0 0 6px;color:var(--plum)">🖼 Imagens e Vídeos de Referência</h3>
      <p style="font-size:13px;color:var(--muted);margin:0 0 12px">Fixe imagens e vídeos dos seus posts para a IA analisar o seu estilo visual e manter o padrão ao gerar novos conteúdos.</p>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px">
        ${miniMidias || '<span style="font-size:13px;color:var(--muted)">Nenhuma mídia fixada ainda</span>'}
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input type="file" id="estilo-midia-input" accept="image/*,video/*" multiple style="flex:1;font-size:12px;border:1px solid var(--border);border-radius:8px;padding:6px;background:#fff">
        <button onclick="adicionarEstiloMidia()" style="padding:8px 16px;border-radius:8px;border:none;background:var(--plum);color:#fff;font-size:13px;cursor:pointer;white-space:nowrap">📌 Fixar Mídia</button>
      </div>
      ${midias.length ? `<div style="margin-top:8px;font-size:12px;color:var(--muted)">✅ ${midias.length} mídia(s) fixada(s) — a IA usa até 3 imagens como referência visual</div>` : ''}
    </div>

    <!-- Importar JSON do Instagram -->
    <div class="card" style="border-left:4px solid #e1306c">
      <h3 style="margin:0 0 6px;color:#e1306c">📥 Importar Histórico do Instagram</h3>
      <p style="font-size:13px;color:var(--muted);margin:0 0 12px">Exporte seus dados no Instagram (Configurações → Privacidade → Baixar seus dados → JSON) e faça upload do arquivo <strong>posts_1.json</strong> aqui.</p>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input type="file" id="ig-import-file" accept=".json" style="flex:1;font-size:12px;border:1px solid var(--border);border-radius:8px;padding:6px;background:#fff">
        <button onclick="importarPostsInstagram()" style="padding:8px 16px;border-radius:8px;border:none;background:#e1306c;color:#fff;font-size:13px;cursor:pointer;white-space:nowrap">📥 Importar Posts</button>
      </div>
      ${importados.length ? `<div style="margin-top:10px;font-size:12px;color:var(--muted)">✅ ${importados.length} posts importados — usados como referência de estilo pela IA</div>` : ''}
    </div>

    <!-- Estilo manual -->
    <div class="card">
      <h3 style="margin:0 0 6px;color:var(--plum)">✍️ Referência de Estilo (manual)</h3>
      <p style="font-size:13px;color:var(--muted);margin:0 0 12px">Cole aqui exemplos dos seus melhores posts (3 a 5). A IA usa isso como referência de tom e linguagem em todas as gerações.</p>
      <textarea id="social-estilo-input" rows="10" placeholder="Exemplo de post 1:
Você sabia que a ansiedade pode se manifestar no corpo antes mesmo de aparecer nos pensamentos? 🌿
#psicologia #ansiedade #saudemental

Exemplo de post 2:
..." style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;box-sizing:border-box;resize:vertical;font-family:inherit;font-size:13px;line-height:1.6">${estilo}</textarea>
      <div style="display:flex;gap:10px;margin-top:12px;align-items:center">
        <button onclick="salvarEstiloInstagram()" class="btn btn-primary">💾 Salvar</button>
        <span style="font-size:12px;color:var(--muted)">Usado como contexto em todas as gerações com IA</span>
      </div>
    </div>

  </div>`;
}

function renderSocialCalendario() {
  // Descobrir mês/ano a exibir (mês atual ou primeiro post futuro)
  const hoje = new Date();
  const mesAtual = hoje.getFullYear() * 100 + (hoje.getMonth() + 1);

  // Agrupar posts por data
  const porData = {};
  _socialPosts.forEach(p => {
    if (p.data_publicacao) {
      porData[p.data_publicacao] = porData[p.data_publicacao] || [];
      porData[p.data_publicacao].push(p);
    }
  });

  // Gerar 2 meses (atual + próximo)
  let html = '';
  for (let m = 0; m < 2; m++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + m, 1);
    const ano = d.getFullYear();
    const mes = d.getMonth();
    const nomeMes = MESES[mes];
    const primeiroDia = new Date(ano, mes, 1).getDay();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();

    html += `<div class="card" style="margin-bottom:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <h3 style="margin:0;color:var(--plum)">${nomeMes} ${ano}</h3>
        <span style="font-size:12px;color:var(--muted)">${_socialPosts.filter(p => p.data_publicacao?.startsWith(ano+'-'+(String(mes+1).padStart(2,'0')))).length} posts</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center">
        ${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => `<div style="font-size:11px;font-weight:600;color:var(--muted);padding:4px">${d}</div>`).join('')}
        ${Array(primeiroDia).fill('<div></div>').join('')}
        ${Array.from({length: diasNoMes}, (_,i) => {
          const dia = i + 1;
          const dataStr = `${ano}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
          const postsHoje = porData[dataStr] || [];
          const isHoje = dataStr === HOJE();
          return `<div onclick="openModalPost(null,'${dataStr}')" style="min-height:54px;border-radius:8px;border:1px solid ${isHoje?'var(--plum)':'var(--border)'};background:${isHoje?'#f3eaff':'#fff'};padding:3px;cursor:pointer;transition:box-shadow .15s" onmouseover="this.style.boxShadow='0 2px 8px rgba(0,0,0,.12)'" onmouseout="this.style.boxShadow=''">
            <div style="font-size:11px;font-weight:${isHoje?'700':'400'};color:${isHoje?'var(--plum)':'inherit'};margin-bottom:2px">${dia}</div>
            ${postsHoje.map(p => {
              const r = REDE_COR[p.rede] || {};
              return `<div onclick="event.stopPropagation();openModalPost(${p.id})" title="${p.tema||''}" style="font-size:9px;border-radius:4px;padding:1px 3px;margin-bottom:1px;background:${r.bg||'#eee'};color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer">${r.icon||'📱'} ${p.tema||p.rede}</div>`;
            }).join('')}
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  // Posts sem data
  const semData = _socialPosts.filter(p => !p.data_publicacao);
  if (semData.length) {
    html += `<div class="card"><h4 style="margin:0 0 10px;color:var(--muted)">📋 Sem data definida (${semData.length})</h4>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${semData.map(p => socialCardMini(p)).join('')}
      </div></div>`;
  }
  return html;
}

function renderSocialLista() {
  if (!_socialPosts.length) return '<div class="card" style="text-align:center;color:var(--muted);padding:40px">Nenhum post cadastrado ainda.</div>';
  return `<div style="display:flex;flex-direction:column;gap:12px">
    ${_socialPosts.map(p => {
      const r = REDE_COR[p.rede] || { bg:'#eee', label: p.rede, icon:'📱' };
      const s = STATUS_SOCIAL[p.status] || { label: p.status, cor:'#aaa' };
      return `<div class="card" style="display:flex;gap:14px;align-items:flex-start;cursor:pointer" onclick="openModalPost(${p.id})">
        <div style="width:44px;height:44px;border-radius:10px;background:${r.bg};display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${r.icon}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
            <strong style="font-size:14px">${p.tema || '(sem tema)'}</strong>
            <span style="font-size:11px;padding:2px 8px;border-radius:20px;background:${s.cor}20;color:${s.cor};border:1px solid ${s.cor}40">${s.label}</span>
            <span style="font-size:11px;color:var(--muted)">${r.label}</span>
            ${{estatico:'🖼',carrossel:'🎠',reels:'🎬',stories:'⭕'}[p.formato] ? `<span style="font-size:11px;color:var(--muted)">${{estatico:'🖼 Estático',carrossel:'🎠 Carrossel',reels:'🎬 Reels',stories:'⭕ Stories'}[p.formato]}</span>` : ''}
          </div>
          <div style="font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.texto || '—'}</div>
          ${p.data_publicacao ? `<div style="font-size:11px;color:var(--plum);margin-top:3px">📅 ${formatarData(p.data_publicacao)}</div>` : ''}
        </div>
        <button onclick="event.stopPropagation();deletePostSocial(${p.id})" style="background:none;border:none;cursor:pointer;font-size:16px;color:var(--muted);padding:4px" title="Excluir">🗑</button>
      </div>`;
    }).join('')}
  </div>`;
}

function socialCardMini(p) {
  const r = REDE_COR[p.rede] || { bg:'#eee', icon:'📱' };
  return `<div onclick="openModalPost(${p.id})" style="padding:8px 12px;border-radius:8px;background:${r.bg};color:#fff;cursor:pointer;font-size:12px;max-width:160px">
    ${r.icon} ${p.tema || p.rede}
  </div>`;
}

function formatarData(s) {
  if (!s) return '—';
  const [y,m,d] = s.split('-');
  return `${d}/${m}/${y}`;
}

function openModalPost(id, dataPreenchida) {
  const p = id ? _socialPosts.find(x => x.id === id) : null;
  const titulo = p ? 'Editar Post' : 'Novo Post';
  const html = `
    <div style="display:flex;flex-direction:column;gap:14px">

      <!-- Analisar mídia -->
      <div style="border:1px solid var(--border);border-radius:10px;padding:12px;background:#fff8f0">
        <label style="font-size:12px;font-weight:600;color:#e65100;display:block;margin-bottom:8px">📎 Analisar Imagem ou Vídeo com IA</label>
        ${(() => {
          const midias = _config.social_estilo_midias ? JSON.parse(_config.social_estilo_midias) : [];
          if (!midias.length) return '';
          return `<div style="margin-bottom:10px">
            <div style="font-size:11px;color:var(--muted);margin-bottom:6px">Suas mídias fixadas — clique para selecionar e analisar:</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px">
              ${midias.map(m => `
                <div onclick="selecionarMidiaFixada('${m.url}','${m.tipo}')" style="cursor:pointer;border-radius:8px;overflow:hidden;border:2px solid transparent;transition:border .15s" onmouseover="this.style.border='2px solid #e65100'" onmouseout="this.style.border='2px solid transparent'" id="mid-fix-${m.url.split('/').pop().replace(/\./g,'_')}">
                  ${m.tipo === 'video'
                    ? `<video src="${m.url}" style="width:80px;height:80px;object-fit:cover;display:block" muted></video>`
                    : `<img src="${m.url}" style="width:80px;height:80px;object-fit:cover;display:block">`}
                </div>`).join('')}
            </div>
          </div>`;
        })()}
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <input type="file" id="sp-midia" accept="image/*,video/*" onchange="previewMidia(this)" style="flex:1;font-size:12px;border:1px solid var(--border);border-radius:8px;padding:6px;background:#fff">
          <button onclick="analisarMidia()" style="padding:7px 14px;border-radius:8px;border:none;background:#e65100;color:#fff;font-size:13px;cursor:pointer;white-space:nowrap">🔍 Analisar e Preencher</button>
        </div>
        <div id="midia-preview" style="margin-top:8px"></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div>
          <label style="font-size:12px;font-weight:600;color:var(--muted)">Rede Social</label>
          <select id="sp-rede" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;margin-top:4px">
            <option value="instagram" ${(!p||p.rede==='instagram')?'selected':''}>📸 Instagram</option>
            <option value="facebook"  ${(p?.rede==='facebook')?'selected':''}>👥 Facebook</option>
            <option value="tiktok"    ${(p?.rede==='tiktok')?'selected':''}>🎵 TikTok</option>
          </select>
        </div>
        <div>
          <label style="font-size:12px;font-weight:600;color:var(--muted)">Status</label>
          <select id="sp-status" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;margin-top:4px">
            <option value="rascunho"  ${(!p||p.status==='rascunho')?'selected':''}>Rascunho</option>
            <option value="agendado"  ${(p?.status==='agendado')?'selected':''}>Agendado</option>
            <option value="publicado" ${(p?.status==='publicado')?'selected':''}>Publicado</option>
          </select>
        </div>
      </div>

      <div>
        <label style="font-size:12px;font-weight:600;color:var(--muted);display:block;margin-bottom:6px">Formato do Post</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap" id="sp-formato-btns">
          ${[
            {v:'estatico',  icon:'🖼',  label:'Estático'},
            {v:'carrossel', icon:'🎠',  label:'Carrossel'},
            {v:'reels',     icon:'🎬',  label:'Reels'},
            {v:'stories',   icon:'⭕',  label:'Stories'},
          ].map(f => {
            const sel = (p?.formato || 'estatico') === f.v;
            return `<button type="button" onclick="selectFormato('${f.v}')" id="fmt-${f.v}" style="padding:7px 14px;border-radius:20px;border:2px solid ${sel?'var(--plum)':'var(--border)'};background:${sel?'var(--plum)':'#fff'};color:${sel?'#fff':'inherit'};font-size:13px;cursor:pointer;transition:all .15s">${f.icon} ${f.label}</button>`;
          }).join('')}
        </div>
        <input type="hidden" id="sp-formato" value="${p?.formato || 'estatico'}">
      </div>

      <div style="display:flex;gap:8px;align-items:flex-end">
        <div style="flex:1">
          <label style="font-size:12px;font-weight:600;color:var(--muted)">Tema / Título</label>
          <input id="sp-tema" type="text" placeholder="Ex: Dicas para lidar com a ansiedade" value="${p?.tema||''}" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;margin-top:4px;box-sizing:border-box">
        </div>
        <button onclick="gerarTextoPost()" title="Gerar texto pelo tema" style="padding:8px 12px;border-radius:8px;border:none;background:#7b5ea7;color:#fff;font-size:13px;cursor:pointer;white-space:nowrap;margin-bottom:1px">✨ Gerar Texto</button>
      </div>

      <div>
        <label style="font-size:12px;font-weight:600;color:var(--muted)">Texto do post</label>
        <textarea id="sp-texto" rows="5" placeholder="Escreva o conteúdo do post aqui..." style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;margin-top:4px;box-sizing:border-box;resize:vertical;font-family:inherit">${p?.texto||''}</textarea>
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;color:var(--muted)">Hashtags</label>
        <input id="sp-hashtags" type="text" placeholder="#psicologia #saudemental #bemestar" value="${p?.hashtags||''}" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;margin-top:4px;box-sizing:border-box">
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;color:var(--muted)">Data de publicação</label>
        <input id="sp-data" type="date" value="${p?.data_publicacao||dataPreenchida||''}" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;margin-top:4px;box-sizing:border-box">
      </div>

      <!-- Preview -->
      <div style="text-align:center">
        <button onclick="previewPost()" style="padding:9px 24px;border-radius:8px;border:2px solid var(--plum);background:#fff;color:var(--plum);font-size:13px;font-weight:600;cursor:pointer">👁 Pré-visualizar Post</button>
      </div>
      <div id="post-preview-area"></div>

      <!-- Gerar Arte -->
      <div style="border:1px solid var(--border);border-radius:10px;padding:12px;background:#f9f5ff">
        <label style="font-size:12px;font-weight:600;color:var(--plum);display:block;margin-bottom:8px">🎨 Gerar Arte com IA (DALL-E 3)</label>
        <input id="sp-prompt" type="text" placeholder="Descreva a arte desejada (ex: imagem calma com tons de lavanda sobre ansiedade)" value="${p?.imagem_prompt||''}" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;box-sizing:border-box;margin-bottom:8px">
        <button onclick="gerarArtePost()" style="padding:7px 16px;border-radius:8px;border:none;background:var(--plum);color:#fff;font-size:13px;cursor:pointer">🖼 Gerar Arte</button>
        <div id="arte-preview" style="margin-top:10px">${p?.imagem_url ? `<img src="${p.imagem_url}" style="max-width:100%;border-radius:8px">` : ''}</div>
      </div>
    </div>`;

  openModal(titulo, html, async () => {
    await salvarPost(p);
  }, { large: true, saveLabel: p ? 'Salvar' : 'Criar Post' });

  // Injeta botão extra no footer do modal após renderizar
  setTimeout(() => {
    const footer = document.querySelector('#modal-box .modal-footer, #modal-box .modal-actions');
    const saveBtn = document.getElementById('modal-save-btn');
    if (saveBtn && !document.getElementById('btn-salvar-agenda')) {
      const btn = document.createElement('button');
      btn.id = 'btn-salvar-agenda';
      btn.className = 'btn';
      btn.style.cssText = 'background:#e8f5e9;color:#2e7d32;border:1px solid #a5d6a7;margin-right:8px';
      btn.textContent = '📅 Salvar em minha agenda';
      btn.onclick = async () => { await salvarPost(p, true); closeModal(); };
      saveBtn.parentNode.insertBefore(btn, saveBtn);
    }
  }, 50);
}

async function salvarPost(p, adicionarAgenda = false) {
  const body = {
    rede:            document.getElementById('sp-rede').value,
    status:          document.getElementById('sp-status').value,
    tema:            document.getElementById('sp-tema').value.trim(),
    texto:           document.getElementById('sp-texto').value.trim(),
    hashtags:        document.getElementById('sp-hashtags').value.trim(),
    data_publicacao: document.getElementById('sp-data').value || null,
    imagem_prompt:   document.getElementById('sp-prompt').value.trim(),
    imagem_url:      document.getElementById('arte-preview')?.dataset?.url || p?.imagem_url || null,
    formato:         document.getElementById('sp-formato')?.value || 'estatico',
  };
  let postId = p?.id;
  if (p) {
    await api('PUT', `/posts-sociais/${p.id}`, body);
    toast('Post atualizado!');
  } else {
    const r = await api('POST', '/posts-sociais', body);
    postId = r.id;
    toast('Post criado!');
  }
  if (adicionarAgenda && body.data_publicacao) {
    const fmtLabel = {estatico:'🖼 Estático',carrossel:'🎠 Carrossel',reels:'🎬 Reels',stories:'⭕ Stories'}[body.formato] || body.formato;
    const redeLabel = {instagram:'📸 Instagram',facebook:'👥 Facebook',tiktok:'🎵 TikTok'}[body.rede] || body.rede;
    await api('POST', '/agendamentos', {
      paciente_id: null,
      data: body.data_publicacao,
      hora: '09:00',
      duracao: 30,
      tipo: 'outro',
      status: 'agendado',
      valor: 0,
      obs: `${redeLabel} · ${fmtLabel}\n${body.tema || ''}`,
    });
    toast('📅 Adicionado à agenda!');
  }
  loadSocial();
}

function previewPost() {
  const rede      = document.getElementById('sp-rede')?.value || 'instagram';
  const tema      = document.getElementById('sp-tema')?.value || '';
  const texto     = document.getElementById('sp-texto')?.value || '';
  const hashtags  = document.getElementById('sp-hashtags')?.value || '';
  const imgEl     = document.querySelector('#arte-preview img');
  const imgUrl    = imgEl?.src || document.getElementById('arte-preview')?.dataset?.url || '';
  const cfg       = _config || {};
  const nome      = cfg.nome_psicologa || 'Elissa Lorenzi';
  const r         = REDE_COR[rede] || { label: 'Instagram', icon: '📸', bg: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' };

  const textoFull = [texto, hashtags].filter(Boolean).join('\n\n');

  const estilosRede = {
    instagram: {
      wrap: 'background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:400px;margin:0 auto;border:1px solid #dbdbdb;border-radius:12px;overflow:hidden',
      header: `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid #efefef">
        <div style="width:36px;height:36px;border-radius:50%;background:${r.bg};display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px">E</div>
        <div><div style="font-weight:600;font-size:13px">${nome.toLowerCase().replace(/ /g,'.')}</div><div style="font-size:11px;color:#8e8e8e">Psicóloga</div></div>
        <div style="margin-left:auto;font-size:18px;color:#262626">⋯</div></div>`,
      img: imgUrl ? `<img src="${imgUrl}" style="width:100%;aspect-ratio:1;object-fit:cover;display:block">` : `<div style="width:100%;aspect-ratio:1;background:#efefef;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:13px">Sem imagem</div>`,
      actions: `<div style="padding:8px 12px;display:flex;gap:14px;font-size:22px"><span>🤍</span><span>💬</span><span>📤</span><span style="margin-left:auto">🔖</span></div>`,
      caption: `<div style="padding:0 12px 12px;font-size:13px;line-height:1.5;color:#262626"><strong>${nome.split(' ')[0].toLowerCase()}</strong> ${textoFull.replace(/\n/g,'<br>').replace(/#(\w+)/g,'<span style="color:#00376b">#$1</span>')}</div>`,
    },
    facebook: {
      wrap: 'background:#fff;font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:400px;margin:0 auto;border:1px solid #ddd;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)',
      header: `<div style="display:flex;align-items:center;gap:10px;padding:12px">
        <div style="width:40px;height:40px;border-radius:50%;background:#1877F2;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px">E</div>
        <div><div style="font-weight:600;font-size:14px">${nome}</div><div style="font-size:12px;color:#65676b">🌐 Público · Agora</div></div>
        <div style="margin-left:auto;font-size:18px;color:#65676b">⋯</div></div>`,
      img: imgUrl ? `<img src="${imgUrl}" style="width:100%;display:block">` : '',
      actions: `<div style="padding:8px 12px;border-top:1px solid #efefef;display:flex;gap:4px"><button style="flex:1;background:none;border:none;cursor:pointer;padding:8px;border-radius:8px;font-size:13px;color:#65676b">👍 Curtir</button><button style="flex:1;background:none;border:none;cursor:pointer;padding:8px;border-radius:8px;font-size:13px;color:#65676b">💬 Comentar</button><button style="flex:1;background:none;border:none;cursor:pointer;padding:8px;border-radius:8px;font-size:13px;color:#65676b">↗ Compartilhar</button></div>`,
      caption: `<div style="padding:8px 12px 4px;font-size:14px;line-height:1.5;color:#050505">${textoFull.replace(/\n/g,'<br>').replace(/#(\w+)/g,'<span style="color:#1877F2">#$1</span>')}</div>`,
    },
    tiktok: {
      wrap: 'background:#000;font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:280px;margin:0 auto;border-radius:12px;overflow:hidden;position:relative;aspect-ratio:9/16',
      header: '',
      img: imgUrl ? `<img src="${imgUrl}" style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0">` : `<div style="width:100%;height:100%;background:#111;position:absolute;top:0;left:0;display:flex;align-items:center;justify-content:center;color:#555;font-size:13px">Sem imagem</div>`,
      actions: `<div style="position:absolute;bottom:80px;right:10px;display:flex;flex-direction:column;gap:16px;align-items:center;color:#fff;font-size:11px">
        <div style="text-align:center"><div style="font-size:26px">❤️</div><div>0</div></div>
        <div style="text-align:center"><div style="font-size:26px">💬</div><div>0</div></div>
        <div style="text-align:center"><div style="font-size:26px">↗</div><div>0</div></div></div>`,
      caption: `<div style="position:absolute;bottom:20px;left:10px;right:50px;color:#fff;font-size:12px;line-height:1.4">
        <div style="font-weight:700;margin-bottom:4px">@${nome.split(' ')[0].toLowerCase()}</div>
        <div style="opacity:.9">${(texto.slice(0,120) + (texto.length>120?'...':'')).replace(/#(\w+)/g,'<span style="font-weight:600">#$1</span>')}</div></div>`,
    }
  };

  const s = estilosRede[rede];
  const area = document.getElementById('post-preview-area');
  if (!area) return;

  area.innerHTML = `
    <div style="margin-top:4px;padding:12px;background:#f5f5f5;border-radius:10px">
      <div style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:10px;text-align:center">${r.icon} Pré-visualização — ${r.label}</div>
      <div style="${s.wrap};position:${rede==='tiktok'?'relative':'static'}">
        ${s.header}
        ${s.img}
        ${s.caption}
        ${s.actions}
      </div>
    </div>`;

  area.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function deletePostSocial(id) {
  if (!confirm('Excluir este post?')) return;
  await api('DELETE', `/posts-sociais/${id}`);
  toast('Post excluído');
  loadSocial();
}

async function gerarArtePost() {
  const prompt = document.getElementById('sp-prompt')?.value?.trim();
  if (!prompt) { toast('Descreva a arte antes de gerar', 'error'); return; }
  const btn = document.querySelector('#modal-body button[onclick="gerarArtePost()"]');
  const prev = document.getElementById('arte-preview');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Gerando…'; }
  if (prev) prev.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:10px">Gerando imagem, aguarde ~15s…</div>';
  try {
    const r = await api('POST', '/gerar-arte', { prompt });
    if (prev) prev.innerHTML = `<img src="${r.url}" style="max-width:100%;border-radius:8px;margin-top:4px">
      <div style="font-size:11px;color:var(--muted);margin-top:4px">Clique em Salvar para guardar este post com a arte gerada.</div>`;
    // Guarda URL temporariamente para salvar junto com o post
    if (prev) prev.dataset.url = r.url;
  } catch(e) {
    toast('Erro ao gerar arte: ' + e.message, 'error');
    if (prev) prev.innerHTML = '';
  }
  if (btn) { btn.disabled = false; btn.textContent = '🖼 Gerar Arte'; }
}

function selectFormato(v) {
  document.getElementById('sp-formato').value = v;
  [['estatico','🖼 Estático'],['carrossel','🎠 Carrossel'],['reels','🎬 Reels'],['stories','⭕ Stories']].forEach(([val]) => {
    const btn = document.getElementById('fmt-' + val);
    if (!btn) return;
    const sel = val === v;
    btn.style.border    = `2px solid ${sel ? 'var(--plum)' : 'var(--border)'}`;
    btn.style.background = sel ? 'var(--plum)' : '#fff';
    btn.style.color      = sel ? '#fff' : 'inherit';
  });
}

async function selecionarMidiaFixada(url, tipo) {
  // Marca visualmente como selecionada
  document.querySelectorAll('[id^="mid-fix-"]').forEach(el => {
    el.style.border = '2px solid transparent';
  });
  const id = 'mid-fix-' + url.split('/').pop().replace(/\./g, '_');
  const el = document.getElementById(id);
  if (el) el.style.border = '2px solid #e65100';

  // Mostra preview
  const prev = document.getElementById('midia-preview');
  if (prev) {
    prev.innerHTML = tipo === 'video'
      ? `<video src="${url}" style="max-height:120px;border-radius:8px;border:1px solid var(--border)" controls muted></video>`
      : `<img src="${url}" style="max-height:120px;border-radius:8px;border:1px solid var(--border)">`;
  }

  // Busca a imagem como base64 do servidor e dispara análise
  const btn = document.querySelector('#modal-body button[onclick="analisarMidia()"]');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Analisando…'; }
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    const base64 = await new Promise(r => {
      const reader = new FileReader();
      reader.onload = e => r(e.target.result.split(',')[1]);
      reader.readAsDataURL(blob);
    });
    const mimeType = blob.type || 'image/jpeg';
    const rede = document.getElementById('sp-rede')?.value || '';
    const estilo = _config.social_estilo || '';
    const r = await api('POST', '/analisar-midia', { base64, mimeType, rede, estilo });
    if (r.tema)       document.getElementById('sp-tema').value     = r.tema;
    if (r.texto)      document.getElementById('sp-texto').value    = r.texto;
    if (r.hashtags)   document.getElementById('sp-hashtags').value = r.hashtags;
    if (r.prompt_arte) document.getElementById('sp-prompt').value  = r.prompt_arte;
    // Usa a imagem fixada como arte do post
    const artePrev = document.getElementById('arte-preview');
    if (artePrev && tipo === 'imagem') {
      artePrev.innerHTML = `<img src="${url}" style="max-width:100%;border-radius:8px">`;
      artePrev.dataset.url = url;
    }
    toast('✅ Campos preenchidos pela IA!');
  } catch(e) {
    toast('Erro ao analisar: ' + e.message, 'error');
  }
  if (btn) { btn.disabled = false; btn.textContent = '🔍 Analisar e Preencher'; }
}

function previewMidia(input) {
  const file = input.files[0];
  const prev = document.getElementById('midia-preview');
  if (!file || !prev) return;
  const url = URL.createObjectURL(file);
  if (file.type.startsWith('image/')) {
    prev.innerHTML = `<img src="${url}" style="max-height:120px;border-radius:8px;border:1px solid var(--border)">`;
  } else if (file.type.startsWith('video/')) {
    prev.innerHTML = `<video src="${url}" style="max-height:120px;border-radius:8px;border:1px solid var(--border)" controls muted></video>`;
  }
}

async function analisarMidia() {
  const input = document.getElementById('sp-midia');
  const file = input?.files[0];
  if (!file) { toast('Selecione uma imagem ou vídeo primeiro', 'error'); return; }

  const btn = document.querySelector('#modal-body button[onclick="analisarMidia()"]');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Analisando…'; }

  try {
    let base64, mimeType;
    if (file.type.startsWith('video/')) {
      // Extrai frame do vídeo via canvas
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      await new Promise(r => { video.onloadeddata = r; video.load(); });
      video.currentTime = Math.min(2, video.duration / 2);
      await new Promise(r => { video.onseeked = r; });
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      base64 = canvas.toDataURL('image/jpeg').split(',')[1];
      mimeType = 'image/jpeg';
    } else {
      base64 = await new Promise(r => {
        const reader = new FileReader();
        reader.onload = e => r(e.target.result.split(',')[1]);
        reader.readAsDataURL(file);
      });
      mimeType = file.type;
    }

    const estilo = _config.social_estilo || '';
    const rede = document.getElementById('sp-rede')?.value || '';
    const r = await api('POST', '/analisar-midia', { base64, mimeType, rede, estilo });

    if (r.tema)      document.getElementById('sp-tema').value     = r.tema;
    if (r.texto)     document.getElementById('sp-texto').value    = r.texto;
    if (r.hashtags)  document.getElementById('sp-hashtags').value = r.hashtags;
    if (r.prompt_arte) document.getElementById('sp-prompt').value = r.prompt_arte;
    toast('✅ Campos preenchidos pela IA!');
  } catch(e) {
    toast('Erro ao analisar: ' + e.message, 'error');
  }
  if (btn) { btn.disabled = false; btn.textContent = '🔍 Analisar e Preencher'; }
}

async function gerarTextoPost() {
  const tema = document.getElementById('sp-tema')?.value?.trim();
  if (!tema) { toast('Digite um tema primeiro', 'error'); return; }
  const btn = document.querySelector('#modal-body button[onclick="gerarTextoPost()"]');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Gerando…'; }
  try {
    const rede = document.getElementById('sp-rede')?.value || '';
    const estilo = _config.social_estilo || '';
    const r = await api('POST', '/gerar-texto-post', { tema, rede, estilo });
    if (r.texto)     document.getElementById('sp-texto').value    = r.texto;
    if (r.hashtags)  document.getElementById('sp-hashtags').value = r.hashtags;
    if (r.prompt_arte) document.getElementById('sp-prompt').value = r.prompt_arte;
    toast('✅ Texto gerado!');
  } catch(e) {
    toast('Erro ao gerar texto: ' + e.message, 'error');
  }
  if (btn) { btn.disabled = false; btn.textContent = '✨ Gerar Texto'; }
}

async function importarPostsInstagram() {
  const input = document.getElementById('ig-import-file');
  const file = input?.files[0];
  if (!file) { toast('Selecione o arquivo posts_1.json', 'error'); return; }

  const btn = document.querySelector('#social-content button[onclick="importarPostsInstagram()"]');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Importando…'; }

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // Instagram exporta em vários formatos — tenta os dois mais comuns
    let posts = [];
    if (Array.isArray(data)) {
      // formato: [{media:[{title, creation_timestamp}]}]
      posts = data;
    } else if (data.ig_media) {
      posts = data.ig_media;
    }

    const extraidos = [];
    for (const item of posts) {
      const medias = item.media || [item];
      for (const m of medias) {
        const caption = m.title || m.caption || '';
        const ts = m.creation_timestamp;
        if (caption.trim()) {
          extraidos.push({
            texto: caption.trim(),
            data: ts ? new Date(ts * 1000).toISOString().slice(0, 10) : null,
          });
        }
      }
    }

    if (!extraidos.length) {
      toast('Nenhum post com texto encontrado no arquivo', 'error');
      if (btn) { btn.disabled = false; btn.textContent = '📥 Importar Posts'; }
      return;
    }

    // Salva lista completa para uso como referência de estilo
    await api('POST', '/configuracoes', { chave: 'social_instagram_posts', valor: JSON.stringify(extraidos) });
    _config.social_instagram_posts = JSON.stringify(extraidos);

    // Monta texto de estilo com os 10 mais recentes
    const recentes = extraidos.slice(0, 10);
    const estiloTexto = recentes.map((p, i) => `Post ${i+1}:\n${p.texto}`).join('\n\n---\n\n');
    await api('POST', '/configuracoes', { chave: 'social_estilo', valor: estiloTexto });
    _config.social_estilo = estiloTexto;

    // Importa como posts publicados no sistema
    let criados = 0;
    for (const p of extraidos) {
      const hashtags = (p.texto.match(/#\w+/g) || []).join(' ');
      const textoSemHash = p.texto.replace(/#\w+/g, '').trim();
      await api('POST', '/posts-sociais', {
        rede: 'instagram', status: 'publicado',
        tema: textoSemHash.split('\n')[0].slice(0, 80) || 'Post importado',
        texto: textoSemHash, hashtags,
        data_publicacao: p.data,
      });
      criados++;
    }

    toast(`✅ ${criados} posts importados com sucesso!`);
    await loadSocial();
    renderSocial();
  } catch(e) {
    toast('Erro ao importar: ' + e.message, 'error');
  }
  if (btn) { btn.disabled = false; btn.textContent = '📥 Importar Posts'; }
}

async function adicionarEstiloMidia() {
  const input = document.getElementById('estilo-midia-input');
  const files = [...(input?.files || [])];
  if (!files.length) { toast('Selecione pelo menos uma imagem ou vídeo', 'error'); return; }
  const btn = document.querySelector('#social-content button[onclick="adicionarEstiloMidia()"]');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Enviando…'; }
  let ok = 0;
  for (const file of files) {
    const form = new FormData();
    form.append('file', file);
    try {
      const r = await fetch('/api/social/estilo-midia', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + getToken() },
        body: form,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      ok++;
    } catch(e) { toast('Erro ao enviar ' + file.name + ': ' + e.message, 'error'); }
  }
  if (ok) {
    toast(`✅ ${ok} mídia(s) fixada(s)!`);
    _config = await api('GET', '/configuracoes');
    renderSocial();
  }
  if (btn) { btn.disabled = false; btn.textContent = '📌 Fixar Mídia'; }
}

async function removerEstiloMidia(url) {
  await api('DELETE', '/social/estilo-midia', { url });
  _config = await api('GET', '/configuracoes');
  toast('Mídia removida');
  renderSocial();
}

async function salvarEstiloInstagram() {
  const val = document.getElementById('social-estilo-input')?.value || '';
  await api('POST', '/configuracoes', { chave: 'social_estilo', valor: val });
  _config.social_estilo = val;
  toast('Estilo salvo! A IA vai usar isso como referência.');
}

async function iniciarApp() {
  _config = await api('GET', '/configuracoes');
  atualizarBrand();
  loadNotificacoes();
  refreshAll();
  navigate('agenda');
  fetch('/api/admin/normalizar-fones', { method: 'POST' }).catch(() => {});
  iniciarPollingZoom();
}

// ── NOTIFICAÇÕES ZOOM ─────────────────────────────────────────
const _notifsMostradas = new Set();

function iniciarPollingZoom() {
  verificarNotifsZoom();
  setInterval(verificarNotifsZoom, 30000);
}

async function verificarNotifsZoom() {
  try {
    const lista = await api('GET', '/notificacoes?nao_lidas=1');
    lista.filter(n => n.tipo === 'zoom_ended' && !_notifsMostradas.has(n.id))
         .forEach(n => { _notifsMostradas.add(n.id); mostrarBannerZoom(n); });
  } catch(_) {}
}

function mostrarBannerZoom(notif) {
  if (document.getElementById('notif-zoom-' + notif.id)) return;
  const d = document.createElement('div');
  d.id = 'notif-zoom-' + notif.id;
  d.className = 'notif-zoom-banner';
  d.innerHTML = `
    <span style="font-size:18px">📋</span>
    <span style="flex:1">${notif.mensagem}</span>
    ${notif.dados?.paciente_id
      ? `<button class="notif-zoom-btn notif-zoom-btn-primary" onclick="abrirProntuarioZoom(${notif.dados.paciente_id},${notif.id})">Abrir Prontuário</button>`
      : ''}
    <button class="notif-zoom-btn" onclick="fecharBannerZoom(${notif.id})">✕</button>
  `;
  document.body.appendChild(d);
  setTimeout(() => fecharBannerZoom(notif.id), 120000);
}

async function abrirProntuarioZoom(pacienteId, notifId) {
  fecharBannerZoom(notifId);
  navigate('prontuarios');
  await api('POST', `/notificacoes/${notifId}/lida`).catch(() => {});
  setTimeout(() => {
    const sel = document.getElementById('pront-paciente-select');
    if (sel) { sel.value = pacienteId; loadProntuariosSection(); }
  }, 150);
}

async function fecharBannerZoom(notifId) {
  document.getElementById('notif-zoom-' + notifId)?.remove();
  await api('POST', `/notificacoes/${notifId}/lida`).catch(() => {});
}

// Bootstrap: verifica token ou exibe login
(async () => {
  const token = getToken();
  if (token) {
    try {
      const r = await fetch('/api/auth/verificar', { method: 'POST', headers: { Authorization: 'Bearer ' + token } });
      if (r.ok) { ocultarLogin(); iniciarApp(); return; }
    } catch(_) {}
    clearToken();
  }
  mostrarLogin();
})();
