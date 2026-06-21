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

function modalSave() {
  if (_modalSaveFn) _modalSaveFn();
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
    financeiro:   loadFinanceiro,
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
          ${p.whatsapp ? `<a href="https://wa.me/55${p.whatsapp.replace(/\D/g,'')}" target="_blank" class="btn btn-sage btn-xs" style="margin-left:auto">💬</a>` : ''}
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
                             ${a.paciente_whatsapp ? `<a href="${zoomWaUrl(a.paciente_nome, a.zoom_link, a.paciente_whatsapp)}" target="_blank" onclick="fecharZoomMenus()" style="color:#25d366">💬 Enviar no WhatsApp</a>` : ''}
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
                   ${a.paciente_whatsapp ? `<a href="${zoomWaUrl(a.paciente_nome, a.zoom_link, a.paciente_whatsapp)}" target="_blank" onclick="fecharZoomMenus()" style="color:#25d366">💬 Enviar no WhatsApp</a>` : ''}
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

  // Slots base: 08:00–11:00 e 14:00–21:00 a cada 30 min
  const toMin  = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
  const toStr  = n => `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
  const baseSet = new Set();
  for (let m = 480; m <= 660; m += 30) baseSet.add(toStr(m));   // 08:00–11:00
  for (let m = 840; m <= 1260; m += 30) baseSet.add(toStr(m));  // 14:00–21:00

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

    // Separador antes de 14:00
    if (!almocoDone && min >= 840) {
      almocoDone = true;
      html += `<tr class="hor-break"><td colspan="${dias.length + 1}">— Intervalo —</td></tr>`;
    }

    const cells = dias.map(d => {
      const dom   = new Date(d + 'T12:00:00').getDay() === 0;
      const domCl = dom ? ' dom' : '';
      const lista = idx[`${d}|${t}`] || [];
      if (!lista.length) {
        return `<td class="hor-cell${domCl}" onclick="openModalAgendamento(null,'${d}',null,'${t}')"><span class="hor-add">+</span></td>`;
      }
      const blocos = lista.map(a => {
        const sc = a.status || 'agendado';
        const zoomBtn = a.zoom_link
          ? `<div class="zoom-menu-wrap">
               <button class="appt-btn appt-btn-zoom appt-btn-zoom-ok" onclick="toggleZoomMenu(event,${a.id})" title="Zoom">🎥</button>
               <div class="zoom-menu" id="zmenu-${a.id}">
                 <button onclick="copiarZoom('${a.zoom_link}')">📋 Copiar link</button>
                 <a href="${a.zoom_link}" target="_blank" onclick="fecharZoomMenus()">🚀 Abrir sessão</a>
                 ${a.paciente_whatsapp ? `<a href="${zoomWaUrl(a.paciente_nome,a.zoom_link,a.paciente_whatsapp)}" target="_blank" onclick="fecharZoomMenus()" style="color:#25d366">💬 WhatsApp</a>` : ''}
               </div>
             </div>`
          : `<button class="appt-btn appt-btn-zoom" onclick="gerarZoom(${a.id})" title="Zoom">📹</button>`;
        return `<div class="hor-appt ${sc}" style="${lista.length>1?'margin-bottom:3px':''}">
          <span class="hor-nome">${a.paciente_nome || '—'}</span>
          <div class="hor-actions">
            ${zoomBtn}
            <button class="appt-btn appt-btn-ok"  onclick="marcarRealizado(${a.id})"       title="Finalizar">✓</button>
            <button class="appt-btn appt-btn-edit" onclick="editAgendamento(${a.id})"       title="Alterar">✏</button>
            <button class="appt-btn appt-btn-del"  onclick="deleteAgendamentoItem(${a.id})" title="Excluir">✕</button>
          </div>
        </div>`;
      }).join('');
      return `<td class="hor-cell has-appt${domCl}">${blocos}</td>`;
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
    if (!body.data || !body.hora) return toast('Data e hora são obrigatórios', 'error');
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

function zoomWaUrl(nome, link, fone) {
  const primeiroNome = (nome || '').split(' ')[0];
  const msg = `Olá, bom dia ${primeiroNome}! 😊\nSegue o link da nossa sessão de hoje:\n${link}`;
  const num = '55' + (fone || '').replace(/\D/g, '');
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
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
        ${p.whatsapp ? `<a href="https://wa.me/55${p.whatsapp.replace(/\D/g,'')}" target="_blank" style="color:var(--sage);font-size:12px">💬 ${p.whatsapp}</a>` : '—'}
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
              <div class="info-value">${p.whatsapp ? `<a href="https://wa.me/55${p.whatsapp.replace(/\D/g,'')}" target="_blank" style="color:var(--sage)">💬 ${p.whatsapp}</a>` : '—'}</div>
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
      <div class="form-group full">
        <label>Nome completo *</label>
        <input type="text" id="fp-nome" value="${p.nome||''}" placeholder="Nome do cliente">
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
      cpf:             document.getElementById('fp-cpf').value.trim(),
      data_nascimento: document.getElementById('fp-nasc').value,
      sexo:            document.getElementById('fp-sexo').value,
      whatsapp:        document.getElementById('fp-wpp').value.trim(),
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
    if (!body.nome) return toast('Nome é obrigatório', 'error');
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
          <button class="btn btn-outline btn-xs" onclick="event.stopPropagation();editProntuario(${r.id},${pacId})">✏️</button>
          <button class="btn btn-ghost btn-xs" style="color:var(--red)" onclick="event.stopPropagation();deleteProntuarioItem(${r.id},${pacId})">🗑</button>
          <span style="color:var(--muted);font-size:18px" id="pront-chevron-${r.id}">›</span>
        </div>
      </div>
      <div class="pront-body" id="pront-body-${r.id}">
        ${r.conteudo ? `<div class="pront-field"><div class="pront-field-label">Relato da Sessão</div><div class="pront-field-value">${r.conteudo}</div></div>` : ''}
        ${r.humor ? `<div class="pront-field"><div class="pront-field-label">Humor / Estado Emocional</div><div class="pront-field-value">${r.humor}</div></div>` : ''}
        ${r.tecnicas ? `<div class="pront-field"><div class="pront-field-label">Técnicas Utilizadas</div><div class="pront-field-value">${r.tecnicas}</div></div>` : ''}
        ${r.tarefas ? `<div class="pront-field"><div class="pront-field-label">Tarefas / Homework</div><div class="pront-field-value">${r.tarefas}</div></div>` : ''}
      </div>
    </div>
  `).join('');
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

function syncDataPront() {
  const sel = document.getElementById('pr-agendamento');
  const data = sel?.options[sel.selectedIndex]?.dataset?.data;
  if (data) document.getElementById('pr-data').value = data;
}

async function openModalProntuario(r = {}) {
  const pacId = document.getElementById('pront-paciente-select')?.value;
  if (!pacId) return toast('Selecione um cliente primeiro', 'error');

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
    if (!body.data) return toast('Data é obrigatória', 'error');
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
    if (!dias.length) return toast('Selecione ao menos um dia', 'error');
    const horarios = [...document.querySelectorAll('.horario-link-input')].map(i => i.value).filter(Boolean);
    if (!horarios.length) return toast('Adicione ao menos um horário', 'error');
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
    <div class="form-group" style="margin-bottom:12px">
      <label>Nome do Cliente</label>
      <input type="text" id="conv-nome" placeholder="Nome completo" autofocus>
    </div>
    <hr style="border:none;border-top:1px solid var(--border);margin:14px 0 12px">
    <div style="font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);margin-bottom:10px">📅 Sessões na agenda (opcional)</div>
    <div class="form-grid">
      <div class="form-group">
        <label>Dia da semana</label>
        <select id="conv-dia">
          <option value="">— Não agendar —</option>
          <option value="1">Segunda-feira</option>
          <option value="2">Terça-feira</option>
          <option value="3">Quarta-feira</option>
          <option value="4">Quinta-feira</option>
          <option value="5">Sexta-feira</option>
          <option value="6">Sábado</option>
        </select>
      </div>
      <div class="form-group">
        <label>Horário</label>
        <input type="time" id="conv-hora" value="09:00">
      </div>
      <div class="form-group">
        <label>Data de início</label>
        <input type="date" id="conv-inicio" value="${HOJE()}">
      </div>
      <div class="form-group">
        <label>Qtd. de sessões</label>
        <input type="number" id="conv-qtd" min="1" max="30" placeholder="Ex: 8">
      </div>
    </div>
    <div id="conv-link-box" style="display:none;margin-top:16px">
      <div style="font-size:12px;font-weight:700;color:var(--text-mid);margin-bottom:6px">Link gerado:</div>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="text" id="conv-link-input" readonly style="flex:1;font-size:12px;background:#f5f0fa">
        <button class="btn btn-primary btn-sm" onclick="copiarLinkGerado()">📋 Copiar</button>
      </div>
      <p style="font-size:12px;color:var(--muted);margin-top:8px">⏱ Válido por 7 dias · uso único</p>
    </div>
  `, async () => {
    const nome   = document.getElementById('conv-nome')?.value.trim();
    if (!nome) return toast('Informe o nome do cliente', 'error');

    const dia    = parseInt(document.getElementById('conv-dia')?.value) || 0;
    const hora   = document.getElementById('conv-hora')?.value;
    const inicio = document.getElementById('conv-inicio')?.value;
    const qtd    = parseInt(document.getElementById('conv-qtd')?.value) || 0;
    const agendarSessoes = dia && hora && inicio && qtd > 0;

    try {
      const res = await api('POST', '/convites', { nome_paciente: nome });
      document.getElementById('conv-link-input').value = res.link;
      document.getElementById('conv-link-box').style.display = 'block';
      document.getElementById('modal-save-btn').style.display = 'none';
      navigator.clipboard.writeText(res.link).catch(() => {});

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
        toast(`Link gerado + ${criadas} sessão(ões) agendada(s)!`);
      } else {
        toast('Link gerado e copiado! 📋');
      }

      loadContratos();
    } catch(e) { toast(e.message, 'error'); }
  }, { saveLabel: 'Gerar Link' });
}

function copiarLinkGerado() {
  const link = document.getElementById('conv-link-input')?.value;
  if (link) navigator.clipboard.writeText(link).then(() => toast('Link copiado! 📋'));
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
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><span class="empty-icon">📝</span><p>Nenhum contrato assinado ainda.<br>Clique em <strong>+ Novo Contrato</strong> para enviar o link ao cliente.</p></div></td></tr>`;
    return;
  }
  const pgtoLabel = { mensal: 'Mensal', 'por sessão': 'Por Sessão', Mensal: 'Mensal', 'Por sessão': 'Por Sessão' };
  tbody.innerHTML = data.map(c => {
    const [a, m, d] = (c.created_at || '').split(' ')[0]?.split('-') || [];
    const dataFmt = d ? `${d}/${m}/${a}` : '—';
    return `
      <tr>
        <td style="white-space:nowrap">${dataFmt}</td>
        <td>
          <strong>${c.nome}</strong>
          ${c.nome_responsavel ? `<br><span style="font-size:11px;color:var(--muted)">Resp: ${c.nome_responsavel}</span>` : ''}
          ${c.celular ? `<span class="only-mobile" style="font-size:11px;color:var(--muted)">📞 ${c.celular}</span>` : ''}
          ${c.email ? `<span class="only-mobile" style="font-size:11px;color:var(--muted)">✉ ${c.email}</span>` : ''}
        </td>
        <td>${c.cpf || '—'}</td>
        <td>${c.email || '—'}</td>
        <td>${c.celular || '—'}</td>
        <td>${c.forma_pgto ? `<span class="badge badge-confirmado">${pgtoLabel[c.forma_pgto] || c.forma_pgto}</span>` : '—'}</td>
        <td>
          <button class="btn btn-ghost btn-xs" style="color:var(--red)" onclick="deleteContratoItem(${c.id})">🗑</button>
        </td>
      </tr>
    `;
  }).join('');
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
        <div>
          <h2 class="bib-atv-titulo">${atv.titulo}</h2>
          <p class="bib-atv-sub">${atv.subtitulo || ''}</p>
        </div>
      </div>
      <div class="bib-atv-corpo">${atv.conteudo}</div>
    </div>`;
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
}

init();
