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

// ── API ──────────────────────────────────────────────────────
async function api(method, path, body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
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
  document.getElementById('modal-overlay').classList.remove('open');
  _modalSaveFn = null;
}

async function modalSave() {
  if (!_modalSaveFn) return;
  const result = await _modalSaveFn();
  if (result !== false) closeModal();
}

// fechar ao clicar no overlay
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

// ── NAVIGATION ───────────────────────────────────────────────
let _currentSection = 'dashboard';
let _config = {};

function navigate(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
  const sec = document.getElementById('section-' + name);
  if (!sec) return;
  sec.classList.add('active');
  document.querySelector(`[data-section="${name}"]`)?.classList.add('active');

  const titles = {
    dashboard: 'Dashboard', contratos: 'Contratos Assinados', agenda: 'Agenda',
    pacientes: 'Clientes', prontuarios: 'Prontuários', biblioteca: 'Biblioteca de Atividades',
    financeiro: 'Financeiro', configuracoes: 'Configurações'
  };
  document.getElementById('topbar-title').textContent = titles[name] || name;
  _currentSection = name;

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
    configuracoes:loadConfiguracoes
  };
  loaders[name]?.();
}

async function refreshAll() {
  await Promise.all([
    loadDashboard(),
    loadPacientes(),
    loadFinanceiro(),
    fetchAgendaSemana(),
    loadContratos(),
  ]);
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
let _agendaSemana = HOJE();
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
  _agendaSemana = HOJE();
  fetchAgendaSemana();
}


function renderAgendaGrid() {
  const label = document.getElementById('agenda-week-label');
  const grid  = document.getElementById('agenda-week-grid');
  const hoje  = HOJE();

  const fim = addDays(_agendaSemana, 6);
  const [, mI, dI] = _agendaSemana.split('-');
  const [, mF, dF] = fim.split('-');
  const isHojeInicio = _agendaSemana === HOJE();
  const intervalo = mI === mF
    ? `${parseInt(dI)} – ${parseInt(dF)} de ${MESES[parseInt(mI)-1]}`
    : `${parseInt(dI)} ${MESES[parseInt(mI)-1].slice(0,3)} – ${parseInt(dF)} ${MESES[parseInt(mF)-1].slice(0,3)}`;
  label.textContent = isHojeInicio ? `Hoje · ${intervalo}` : intervalo;

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
                             ${a.paciente_whatsapp ? `<a href="${zoomWaUrl(a.paciente_nome, a.zoom_link, a.paciente_whatsapp, a.data, a.hora, a.paciente_apelido)}" target="_blank" onclick="fecharZoomMenus()" style="color:#25d366">💬 Enviar no WhatsApp <span style="font-size:10px;opacity:.7">${exibirFone(a.paciente_whatsapp)}</span></a>` : ''}
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

function renderAgendaLista() {
  const tbody  = document.getElementById('agenda-tbody');
  const filtro = document.getElementById('agenda-status-filter')?.value || '';
  const lista  = _agendaData.filter(a => !filtro || a.status === filtro);

  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><span class="empty-icon">📅</span><p>Nenhuma sessão nesta semana</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = lista.map(a => `
    <tr>
      <td>${fmtData(a.data)}</td>
      <td><strong>${a.hora}</strong></td>
      <td>${a.paciente_nome || '<span class="text-muted">—</span>'}</td>
      <td>${TIPO_LABEL[a.tipo]||a.tipo}</td>
      <td>${badgeStatus(a.status)}</td>
      <td class="text-right fw-bold">${BRL(a.valor)}</td>
      <td>${a.pago ? '<span style="color:var(--sage);font-size:16px">✓</span>' : '<span style="color:var(--peach);font-size:16px">○</span>'}</td>
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
                   ${a.paciente_whatsapp ? `<a href="${zoomWaUrl(a.paciente_nome, a.zoom_link, a.paciente_whatsapp, a.data, a.hora, a.paciente_apelido)}" target="_blank" onclick="fecharZoomMenus()" style="color:#25d366">💬 Enviar no WhatsApp</a>` : ''}
                 </div>
               </div>`
            : `<button class="btn btn-outline btn-xs" style="color:#1a6ff4;border-color:#1a6ff4" onclick="gerarZoom(${a.id})" title="Gerar link Zoom">📹</button>`
          }
        </div>
      </td>
    </tr>
  `).join('');
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
               ${a.paciente_whatsapp ? `<a href="${zoomWaUrl(a.paciente_nome,a.zoom_link,a.paciente_whatsapp,a.data,a.hora,a.paciente_apelido)}" target="_blank" onclick="fecharZoomMenus()" style="color:#25d366">💬 WhatsApp <span style="font-size:10px;opacity:.7">${exibirFone(a.paciente_whatsapp)}</span></a>` : ''}
             </div>
           </div>`
        : `<button class="appt-btn appt-btn-zoom" onclick="gerarZoom(${a.id})" title="Zoom">📹</button>`;
      const bloco = `<div class="hor-appt ${sc}">
        <span class="hor-nome">${a.paciente_nome || '—'}${duplo}</span>
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
      <div class="form-group full">
        <label>Observações</label>
        <textarea id="ag-obs" rows="2">${ag?.obs || ''}</textarea>
      </div>
    </div>
  `;

  openModal(isEdit ? 'Editar Agendamento' : 'Nova Sessão', html, async () => {
    const body = {
      paciente_id: document.getElementById('ag-paciente').value || null,
      data:        document.getElementById('ag-data').value,
      hora:        document.getElementById('ag-hora').value,
      duracao:     parseInt(document.getElementById('ag-duracao').value),
      tipo:        document.getElementById('ag-tipo').value,
      status:      document.getElementById('ag-status').value,
      valor:       parseFloat(document.getElementById('ag-valor').value) || 0,
      pago:        document.getElementById('ag-pago').checked ? 1 : 0,
      forma_pgto:  document.getElementById('ag-forma').value || null,
      obs:         document.getElementById('ag-obs').value.trim()
    };
    if (!body.data || !body.hora) return toast('Data e hora são obrigatórios', 'error') || false;
    try {
      if (isEdit) { await api('PUT', `/agendamentos/${ag.id}`, body); toast('Agendamento atualizado!'); }
      else        { await api('POST', '/agendamentos', body);          toast('Sessão agendada!'); }
      closeModal();
      refreshAll();
    } catch(e) { toast(e.message, 'error'); }
  });
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
  if (!isOpen) menu.classList.add('open');
}

function copiarZoom(link) {
  navigator.clipboard.writeText(link).then(() => toast('Link copiado! 📋'));
  fecharZoomMenus();
}

// Remove código de país e formata como (DDD) NNNNN-NNNN para armazenamento
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

function zoomWaUrl(nome, link, fone, data, hora, apelido) {
  const primeiroNome = (apelido || '').trim() || (nome || '').split(' ')[0];
  const DIAS  = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
  const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  let dataFmt = '';
  if (data) {
    const d = new Date(data + 'T12:00:00');
    dataFmt = `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
  }
  const horaFmt = hora ? ` às ${hora}` : '';
  const msg = `Bom dia, ${primeiroNome}! Segue lembrete da nossa sessão ${dataFmt}${horaFmt} e link para acesso:\n${link}\nAté lá!`;
  return `https://wa.me/${toWaNum(fone)}?text=${encodeURIComponent(msg)}`;
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

function renderPacientesTable(data) {
  const tbody = document.getElementById('pacientes-tbody');
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><span class="empty-icon">👤</span><p>Nenhum cliente encontrado</p></div></td></tr>`;
    return;
  }
  const contadorEl = document.getElementById('pac-contador');
  if (contadorEl) contadorEl.textContent = `${data.length} cliente${data.length !== 1 ? 's' : ''}`;
  tbody.innerHTML = data.map((p, i) => `
    <tr>
      <td style="text-align:center;color:var(--muted);font-size:11px;font-weight:600;width:28px;padding:0 4px">${i + 1}</td>
      <td>
        <div>
          <div style="font-weight:700;color:var(--plum)">${p.nome}</div>
          ${p.cpf ? `<div style="font-size:11px;color:var(--muted)">${p.cpf}</div>` : ''}
        </div>
      </td>
      <td>
        ${p.whatsapp ? `<a href="https://wa.me/${toWaNum(p.whatsapp)}" target="_blank" style="color:var(--sage);font-size:12px">💬 ${p.whatsapp}</a>` : '—'}
      </td>
      <td>
        ${p.frequencia ? `
        <select class="status-select ${p.frequencia}"
                onchange="this.className='status-select '+this.value;alterarFrequencia(${p.id},this.value)">
          <option value="semanal"   ${p.frequencia==='semanal'  ?'selected':''}>Semanal</option>
          <option value="quinzenal" ${p.frequencia==='quinzenal'?'selected':''}>Quinzenal</option>
          <option value="mensal"    ${p.frequencia==='mensal'   ?'selected':''}>Mensal</option>
        </select>` : `
        <select class="status-select mensal" style="opacity:.5"
                onchange="this.className='status-select '+this.value;this.style.opacity=1;alterarFrequencia(${p.id},this.value)">
          <option value="" disabled selected>—</option>
          <option value="semanal">Semanal</option>
          <option value="quinzenal">Quinzenal</option>
          <option value="mensal">Mensal</option>
        </select>`}
      </td>
      <td>
        ${p.freq_pgto ? `
        <select class="status-select ${p.freq_pgto}"
                onchange="this.className='status-select '+this.value;alterarFreqPgto(${p.id},this.value)">
          <option value="por-sessao" ${p.freq_pgto==='por-sessao'?'selected':''}>Por sessão</option>
          <option value="cada4"      ${p.freq_pgto==='cada4'     ?'selected':''}>A cada 4</option>
          <option value="fp-semanal" ${p.freq_pgto==='fp-semanal'?'selected':''}>Semanal</option>
          <option value="fp-mensal"  ${p.freq_pgto==='fp-mensal' ?'selected':''}>Mensal</option>
        </select>` : `
        <select class="status-select fp-mensal" style="opacity:.5"
                onchange="this.className='status-select '+this.value;this.style.opacity=1;alterarFreqPgto(${p.id},this.value)">
          <option value="" disabled selected>—</option>
          <option value="por-sessao">Por sessão</option>
          <option value="cada4">A cada 4</option>
          <option value="fp-semanal">Semanal</option>
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
          <button class="btn btn-ghost btn-xs" style="color:var(--red)" onclick="deletePacienteItem(${p.id})">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function verDetalhePaciente(id) {
  const p = await api('GET', `/pacientes/${id}`);
  const ags = await api('GET', `/pacientes/${id}/agendamentos`);

  document.getElementById('pacientes-list-view').style.display = 'none';
  document.getElementById('pacientes-detail-view').style.display = '';

  const total   = ags.length;
  const realiz  = ags.filter(a => a.status === 'realizado').length;
  const faturado = ags.filter(a => a.status === 'realizado').reduce((s, a) => s + (a.valor||0), 0);

  const ultimasAgs = ags.slice(-5).reverse();

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

      <!-- Stats e histórico -->
      <div>
        <div class="grid-3col-stats">
          <div class="stat-card rose" style="padding:14px">
            <div class="stat-label">Total Sessões</div>
            <div class="stat-value" style="font-size:22px">${total}</div>
          </div>
          <div class="stat-card sage" style="padding:14px">
            <div class="stat-label">Realizadas</div>
            <div class="stat-value" style="font-size:22px">${realiz}</div>
          </div>
          <div class="stat-card peach" style="padding:14px">
            <div class="stat-label">Faturado</div>
            <div class="stat-value" style="font-size:14px">${BRL(faturado)}</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">Últimas Sessões</span>
            <button class="btn btn-outline btn-sm" onclick="openModalAgendamento(null,null,${p.id})">+ Agendar</button>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Data</th><th>Hora</th><th>Tipo</th><th>Status</th><th class="text-right">Valor</th></tr></thead>
              <tbody>
                ${ultimasAgs.length ? ultimasAgs.map(a => `
                  <tr>
                    <td>${fmtData(a.data)}</td>
                    <td>${a.hora}</td>
                    <td>${TIPO_LABEL[a.tipo]||a.tipo}</td>
                    <td>${badgeStatus(a.status)}</td>
                    <td class="text-right">${BRL(a.valor)}</td>
                  </tr>
                `).join('') : `<tr><td colspan="5" class="text-muted" style="text-align:center;padding:16px">Nenhum agendamento</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div style="display:flex;gap:12px">
      <button class="btn btn-primary" onclick="editPaciente(${p.id})">✏️ Editar Dados</button>
      <button class="btn btn-lavender" onclick="navigate('prontuarios');setTimeout(()=>{document.getElementById('pront-paciente-select').value=${p.id};loadProntuariosSection();},100)">📋 Ver Prontuários</button>
    </div>
  `;
}

function voltarListaPacientes() {
  document.getElementById('pacientes-list-view').style.display = '';
  document.getElementById('pacientes-detail-view').style.display = 'none';
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
        <label>Endereço</label>
        <input type="text" id="fp-end" value="${p.endereco||''}" placeholder="Rua, número, bairro, cidade">
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
        <label>Frequência</label>
        <select id="fp-freq">
          <option value="">—</option>
          <option value="semanal"   ${p.frequencia==='semanal'  ?'selected':''}>Semanal</option>
          <option value="quinzenal" ${p.frequencia==='quinzenal'?'selected':''}>Quinzenal</option>
          <option value="mensal"    ${p.frequencia==='mensal'   ?'selected':''}>Mensal</option>
        </select>
      </div>
      <div class="form-group">
        <label>Freq. de Pagamento</label>
        <select id="fp-freqpgto">
          <option value="">—</option>
          <option value="por-sessao" ${p.freq_pgto==='por-sessao'?'selected':''}>Por sessão</option>
          <option value="cada4"      ${p.freq_pgto==='cada4'     ?'selected':''}>A cada 4 sessões</option>
          <option value="fp-semanal" ${p.freq_pgto==='fp-semanal'?'selected':''}>Semanal</option>
          <option value="fp-mensal"  ${p.freq_pgto==='fp-mensal' ?'selected':''}>Mensal</option>
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
      freq_pgto:       document.getElementById('fp-freqpgto').value  || null
    };
    if (!body.nome) return toast('Nome é obrigatório', 'error') || false;
    try {
      if (p.id) { await api('PUT', `/pacientes/${p.id}`, body); toast('Cliente atualizado!'); }
      else      { await api('POST', '/pacientes', body);         toast('Cliente cadastrado!'); }
      closeModal();
      refreshAll();
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

async function alterarFreqPgto(id, valor) {
  const p = await api('GET', `/pacientes/${id}`);
  if (!p?.id) return;
  await api('PUT', `/pacientes/${id}`, { ...p, freq_pgto: valor });
  const label = { 'por-sessao':'Por sessão', 'cada4':'A cada 4', 'fp-semanal':'Semanal', 'fp-mensal':'Mensal' }[valor] || valor;
  toast(`Freq. pagamento: ${label}`);
  loadFinanceiro();
}

async function alterarFormaPgto(id, valor) {
  const p = await api('GET', `/pacientes/${id}`);
  if (!p?.id) return;
  await api('PUT', `/pacientes/${id}`, { ...p, forma_pgto: valor });
  const label = { pix:'PIX', credito:'Crédito', debito:'Débito', dinheiro:'Dinheiro', transferencia:'Transferência' }[valor] || valor;
  toast(`Forma de pagamento: ${label}`);
  loadFinanceiro();
}

async function alterarFrequencia(id, valor) {
  const p = await api('GET', `/pacientes/${id}`);
  if (!p?.id) return;
  await api('PUT', `/pacientes/${id}`, { ...p, frequencia: valor });
  const label = { semanal:'Semanal', quinzenal:'Quinzenal', mensal:'Mensal' }[valor] || valor;
  toast(`Frequência: ${label}`);
  loadFinanceiro();
}

async function alterarNotaFiscal(id, valor) {
  const p = await api('GET', `/pacientes/${id}`);
  if (!p?.id) return;
  await api('PUT', `/pacientes/${id}`, { ...p, nota_fiscal: valor });
  toast(valor === 'sim' ? 'Nota fiscal: Sim ✓' : 'Nota fiscal: Não');
  loadFinanceiro();
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
  const pacs = await api('GET', '/pacientes');
  _pacientesCache = pacs;
  populateProntSelect(pacs);
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
        <div style="padding:12px 0 4px;border-top:1px solid var(--border);margin-top:12px;display:flex;gap:8px">
          <button class="btn btn-primary btn-sm" onclick="editProntuario(${r.id},${pacId})">✏️ Editar anotação</button>
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
    <div style="display:flex;justify-content:flex-end;margin-bottom:10px">
      <button type="button" class="btn btn-sm btn-outline" id="btn-corrigir-pront" onclick="corrigirProntuario()" title="Corrige ortografia e gramática automaticamente com IA">
        ✨ Corrigir texto com IA
      </button>
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
      <label>Técnicas / Intervenções Utilizadas</label>
      <textarea id="pr-tecnicas" rows="2" spellcheck="true" lang="pt-BR" placeholder="Ex: TCC, reestruturação cognitiva, mindfulness...">${r.tecnicas||''}</textarea>
    </div>
    <div class="form-group">
      <label>Tarefas / Homework</label>
      <textarea id="pr-tarefas" rows="2" spellcheck="true" lang="pt-BR" placeholder="Atividades propostas para a próxima semana...">${r.tarefas||''}</textarea>
    </div>
  `;
}

async function corrigirProntuario() {
  const btn = document.getElementById('btn-corrigir-pront');
  const ids = ['pr-conteudo', 'pr-humor', 'pr-tecnicas', 'pr-tarefas'];
  const originais = ids.map(id => document.getElementById(id)?.value || '');
  if (originais.every(t => !t.trim())) return toast('Nenhum texto para corrigir', 'error');

  btn.disabled = true;
  btn.textContent = '⏳ Corrigindo…';

  let corrigidos = 0;
  for (let i = 0; i < ids.length; i++) {
    const el = document.getElementById(ids[i]);
    if (!el || !originais[i].trim()) continue;
    try {
      const r = await api('POST', '/corrigir-texto', { texto: originais[i] });
      if (r.corrigido && r.corrigido !== originais[i]) {
        el.value = r.corrigido;
        el.style.background = '#f0fdf4';
        setTimeout(() => el.style.background = '', 2000);
        corrigidos++;
      }
    } catch(e) {
      toast('Erro ao corrigir: ' + e.message, 'error');
      break;
    }
  }

  btn.disabled = false;
  btn.textContent = '✨ Corrigir texto com IA';
  if (corrigidos > 0) toast(`✅ ${corrigidos} campo(s) corrigido(s)!`);
  else toast('Nenhuma correção necessária 👍');
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
      paciente_id:    pacId,
      agendamento_id: document.getElementById('pr-agendamento')?.value || null,
      data:           document.getElementById('pr-data').value,
      conteudo:       document.getElementById('pr-conteudo').value.trim(),
      humor:          document.getElementById('pr-humor').value.trim(),
      tecnicas:       document.getElementById('pr-tecnicas').value.trim(),
      tarefas:        document.getElementById('pr-tarefas').value.trim()
    };
    if (!body.data) return toast('Data é obrigatória', 'error') || false;
    try {
      if (r.id) { await api('PUT', `/prontuarios/${r.id}`, body); toast('Anotação atualizada!'); }
      else      { await api('POST', '/prontuarios', body);         toast('Anotação salva! 📋'); }
      closeModal();
      loadProntuariosSection();
    } catch(e) { toast(e.message, 'error'); }
  });
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
  document.getElementById('rel-top-tbody').innerHTML = d.topClientes.map((r, i) => `
    <tr>
      <td><strong style="color:var(--plum)">#${i+1}</strong></td>
      <td>${r.nome}</td>
      <td class="text-right">${r.total_sessoes}</td>
      <td class="text-right">${brl(r.receita_total)}</td>
      <td class="text-right">${brl(r.total_sessoes ? r.receita_total / r.total_sessoes : 0)}</td>
    </tr>
  `).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--muted)">Nenhuma sessão realizada ainda</td></tr>`;

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

async function loadFinanceiro() {
  updateFinMesLabel();
  const [data, prevPgto, proj] = await Promise.all([
    api('GET', `/financeiro?ano=${_finAno}&mes=${_finMes}`),
    api('GET', `/financeiro/previsao-pgto?hoje=${HOJE()}`),
    api('GET', `/financeiro/projecao-recorrente`)
  ]);
  _previsaoPgto = prevPgto;
  renderTabPgto();

  // Projeção recorrente baseada em clientes
  const projTbody  = document.getElementById('fin-proj-tbody');
  const projTotais = document.getElementById('fin-proj-totais');
  const freqLabel  = { semanal:'Semanal', quinzenal:'Quinzenal', mensal:'Mensal' };
  const fpLabel    = { 'fp-semanal':'Semanal', 'fp-mensal':'Mensal', 'cada4':'A cada 4', 'por-sessao':'Por sessão' };
  const fmLabel    = { pix:'PIX', credito:'Crédito', debito:'Débito', dinheiro:'Dinheiro', transferencia:'Transf.' };
  if (projTbody) {
    projTbody.innerHTML = (proj.itens || []).map(c => `
      <tr>
        <td style="font-weight:600">${c.nome}</td>
        <td><span style="font-size:11.5px">${freqLabel[c.frequencia] || c.frequencia || '—'}</span></td>
        <td><span style="font-size:11.5px">${fpLabel[c.freq_pgto] || c.freq_pgto || '—'}</span></td>
        <td><span style="font-size:11.5px">${fmLabel[c.forma_pgto] || c.forma_pgto || '—'}</span></td>
        <td class="text-right">${BRL(c.valor_sessao)}</td>
        <td class="text-right" style="color:var(--sage);font-weight:700">${BRL(c.receita_semana)}</td>
        <td class="text-right" style="color:var(--plum);font-weight:700">${BRL(c.receita_mes)}</td>
      </tr>`).join('') +
      `<tr style="border-top:2px solid var(--border);background:var(--bg-alt)">
        <td colspan="4" style="font-weight:700;font-size:12.5px">Total estimado (${proj.itens?.length || 0} clientes)</td>
        <td></td>
        <td class="text-right fw-bold" style="color:var(--sage)">${BRL(proj.totalSemana)}</td>
        <td class="text-right fw-bold" style="color:var(--plum)">${BRL(proj.totalMes)}</td>
      </tr>`;
  }
  if (projTotais) projTotais.textContent = `Semana: ${BRL(proj.totalSemana)} · Mês: ${BRL(proj.totalMes)}`;

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
  if (!data.pendentes.length) {
    pendTbody.innerHTML = `<tr><td colspan="4" class="text-muted" style="text-align:center;padding:20px">Sem pendências 🎉</td></tr>`;
  } else {
    pendTbody.innerHTML = data.pendentes.map(a => `
      <tr>
        <td>${fmtData(a.data)}</td>
        <td>${a.paciente_nome || '—'}</td>
        <td class="text-right fw-bold" style="color:var(--peach)">${BRL(a.valor)}</td>
        <td>
          <button class="btn btn-sage btn-xs" onclick="marcarPago(${a.id})">✓ Recebido</button>
        </td>
      </tr>
    `).join('');
  }

  // Lista completa
  const listaTbody = document.getElementById('fin-lista-tbody');
  if (!data.lista.length) {
    listaTbody.innerHTML = `<tr><td colspan="6" class="text-muted" style="text-align:center;padding:20px">Nenhuma sessão realizada neste mês</td></tr>`;
  } else {
    const formaLabel = { dinheiro:'Dinheiro', pix:'PIX', credito:'Crédito', debito:'Débito', convenio:'Convênio', transferencia:'TED/PIX' };
    listaTbody.innerHTML = data.lista.map(a => `
      <tr>
        <td>${fmtData(a.data)}</td>
        <td>${a.hora}</td>
        <td>${a.paciente_nome || '—'}</td>
        <td class="text-right fw-bold">${BRL(a.valor)}</td>
        <td>${a.pago ? '<span style="color:var(--sage);font-weight:700">Recebido ✓</span>' : '<span style="color:var(--peach)">Pendente</span>'}</td>
        <td>${formaLabel[a.forma_pgto] || a.forma_pgto || '—'}</td>
      </tr>
    `).join('');
  }
}

async function marcarPago(id) {
  const ag = await api('GET', `/agendamentos/${id}`);
  const formaAtual = ag.forma_pgto || 'pix';

  const html = `
    <div style="margin-bottom:16px">
      <div style="font-size:14px;color:var(--text-mid);margin-bottom:14px">
        <strong>${ag.paciente_nome || 'Cliente'}</strong> — ${fmtData(ag.data)} às ${ag.hora}<br>
        <span style="font-size:13px;color:var(--muted)">Valor: <strong style="color:var(--plum)">${BRL(ag.valor)}</strong></span>
      </div>
      <div class="form-group">
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
    </div>
  `;

  openModal('Confirmar Recebimento', html, async () => {
    const forma = document.getElementById('fin-forma').value;
    await api('PUT', `/agendamentos/${id}`, { ...ag, pago: 1, forma_pgto: forma });
    toast('Pagamento registrado! 💰');
    closeModal();
    refreshAll();
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
  document.getElementById('fin-mes-label').textContent = `${MESES[_finMes-1]} / ${_finAno}`;
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
  document.getElementById('cfg-zoom-account').value        = cfg.zoom_account_id     || '';
  document.getElementById('cfg-zoom-client-id').value      = cfg.zoom_client_id      || '';
  document.getElementById('cfg-zoom-client-secret').value  = cfg.zoom_client_secret  || '';
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
        <input type="number" id="conv-valor" placeholder="Ex: 350,00" min="0" step="0.01">
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
  intro: `Seja bem-vindo(a)!\n\nApresento aqui algumas informações importantes para darmos início ao seu processo de Orientação Profissional e de Carreira.\n\nEssas informações têm como objetivo auxiliar o processo, deixando claros os acordos necessários para um bom funcionamento do nosso trabalho em conjunto.\n\nPeço que leia com atenção cada ponto e sinalize com "ciente" caso esteja de acordo. Caso tenha alguma dúvida, fique à vontade para entrar em contato.\n\nAo final deste termo você encontrará algumas perguntas sobre seus dados pessoais. Essas informações são importantes para o seu prontuário, bem como para emissão de notas fiscais referentes aos serviços prestados.`,
  secoes: [
    { titulo: "Sobre o Processo de Orientação Profissional e de Carreira", itens: [
      "O foco específico do processo de orientação profissional e de carreira será definido durante a primeira sessão, a partir da compreensão das necessidades, expectativas, momento profissional e objetivos apresentados pelo(a) cliente. A partir desse levantamento inicial, será elaborado um plano de trabalho personalizado, que poderá ser ajustado ao longo do acompanhamento conforme a evolução do processo e o surgimento de novas demandas.",
      "Por se tratar de um serviço psicológico, não há garantia ou promessa de resultados específicos. O resultado do processo está diretamente relacionado ao comprometimento e à participação ativa do contratante nas reflexões e atividades propostas."
    ]},
    { titulo: "Sobre as Sessões", itens: [
      "A frequência do processo será acordada entre as partes, preferencialmente acontecerá semanal, uma vez por semana.",
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
      "O valor da sessão será definido no momento da contratação e informado no link enviado ao cliente.",
      "O pagamento poderá ocorrer por sessão — realizado no mesmo dia da sessão — ou de forma mensal, em parcela única até o 5º dia útil do mês em que ocorrerão as sessões.",
      "O pagamento deverá ser realizado via Pix, transferência ou depósito bancário.",
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
  const secoesHtml = (m.secoes || []).map((s, si) => `
    <div style="margin-bottom:22px">
      <div style="font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;color:var(--rose,#c2657a);background:linear-gradient(90deg,#fce8f2,#fff);padding:7px 12px;border-left:3px solid var(--rose,#c2657a);border-radius:4px;margin-bottom:10px">
        ${s.titulo}
      </div>
      <ol type="a" style="padding-left:20px">
        ${(s.itens||[]).map(it => `<li style="font-size:13.5px;color:#3d2b3d;margin-bottom:8px;line-height:1.65">${it}</li>`).join('')}
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
  const renderItemEditor = (txt, si, ii) => `
    <div class="item-bloco" style="display:flex;gap:6px;margin-bottom:8px;align-items:flex-start">
      <textarea class="item-txt" rows="3"
        style="flex:1;font-size:13px;padding:8px 10px;border:1.5px solid var(--border);border-radius:7px;resize:vertical;line-height:1.6"
      >${txt.replace(/</g,'&lt;')}</textarea>
      <button class="btn btn-ghost btn-xs" style="color:var(--red,#c0425d);margin-top:4px" onclick="removerItem(this)">×</button>
    </div>
  `;
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

function renderContratosTable(data) {
  const tbody = document.getElementById('contratos-tbody');
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><span class="empty-icon">📝</span><p>Nenhum contrato assinado ainda.<br>Clique em <strong>+ Novo Contrato</strong> para enviar o link ao cliente.</p></div></td></tr>`;
    return;
  }
  const pgtoLabel = { mensal: 'Mensal', 'por sessão': 'Por Sessão', Mensal: 'Mensal', 'Por sessão': 'Por Sessão' };
  tbody.innerHTML = data.map(c => {
    const [a, m, d] = (c.created_at || '').split(' ')[0]?.split('-') || [];
    const dataFmt = d ? `${d}/${m}/${a}` : '—';
    const valorFmt = c.valor_sessao ? `R$ ${Number(c.valor_sessao).toFixed(2).replace('.',',')}` : '—';
    const arquivoHtml = c.arquivo
      ? `<a href="/uploads/contratos/${c.arquivo}" target="_blank" class="btn btn-outline btn-sm" style="margin-right:8px">📄 Ver contrato assinado</a>`
      : `<span style="color:var(--muted);font-size:12px">Sem arquivo anexo</span>`;
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
        <td style="white-space:nowrap" onclick="event.stopPropagation()">
          <button class="btn btn-ghost btn-xs" style="color:var(--red)" onclick="deleteContratoItem(${c.id})">🗑</button>
        </td>
      </tr>
      <tr id="detalhe-contrato-${c.id}" style="display:none">
        <td colspan="8" style="background:#faf7f4;padding:16px 20px;border-bottom:2px solid var(--border)">
          <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap">
            ${arquivoHtml}
            <div style="display:flex;align-items:center;gap:8px">
              <label style="font-size:12px;font-weight:700;color:var(--muted);white-space:nowrap">Valor da Sessão:</label>
              <input type="number" id="valor-contrato-${c.id}" value="${c.valor_sessao || ''}"
                placeholder="0,00" min="0" step="0.01"
                style="width:110px;padding:6px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:13px">
              <button class="btn btn-primary btn-sm" onclick="salvarValorContrato(${c.id})">Salvar</button>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');
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
  loadContratos();
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
  const bc = document.getElementById('bib-breadcrumb');
  const ct = document.getElementById('bib-conteudo');

  bc.style.display = 'flex';
  bc.innerHTML = `
    <span class="bib-bc-link" onclick="bibRenderHome()">Biblioteca</span>
    <span class="bib-bc-sep">›</span>
    <span class="bib-bc-link" onclick="abrirBiblioteca('${areaId}')">${card.icone} ${card.titulo}</span>
    <span class="bib-bc-sep">›</span>
    <span class="bib-bc-cur">${pasta.icone || '📁'} ${pasta.nome}</span>`;

  ct.innerHTML = `<div class="bib-grid">${pasta.atividades.map(a => `
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

async function init() {
  _config = await api('GET', '/configuracoes');
  atualizarBrand();
  loadNotificacoes();
  refreshAll();
  // Normaliza telefones existentes no banco (remove código de país duplicado etc.)
  fetch('/api/admin/normalizar-fones', { method: 'POST' }).catch(() => {});
}

init();
