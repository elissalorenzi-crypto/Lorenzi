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
    pacientes: 'Pacientes', prontuarios: 'Prontuários',
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
    financeiro:   loadFinanceiro,
    configuracoes:loadConfiguracoes
  };
  loaders[name]?.();
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
      <h2 style="font-size:22px;font-weight:800;color:var(--plum)">${saudacao}, ${primeiroNome} 🌸</h2>
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
    <div class="stat-card sage stat-clickable" onclick="navigate('pacientes')" title="Ver pacientes">
      <span class="stat-icon">👤</span>
      <div class="stat-label">Pacientes Ativos</div>
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
          <div class="timeline-nome">${a.paciente_nome || 'Sem paciente'}</div>
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
          <div class="timeline-nome">${a.paciente_nome || 'Sem paciente'}</div>
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
let _agendaSemana = getSegundaFeira(HOJE());
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
}

function agendaNavSemana(delta) {
  _agendaSemana = addDays(_agendaSemana, delta * 7);
  fetchAgendaSemana();
}

function agendaIrHoje() {
  _agendaSemana = getSegundaFeira(HOJE());
  fetchAgendaSemana();
}

function renderAgendaGrid() {
  const label = document.getElementById('agenda-week-label');
  const grid  = document.getElementById('agenda-week-grid');
  const hoje  = HOJE();

  const fim = addDays(_agendaSemana, 6);
  const [, mI, dI] = _agendaSemana.split('-');
  const [, mF, dF] = fim.split('-');
  label.textContent = mI === mF
    ? `${parseInt(dI)} – ${parseInt(dF)} de ${MESES[parseInt(mI)-1]}`
    : `${parseInt(dI)} ${MESES[parseInt(mI)-1].slice(0,3)} – ${parseInt(dF)} ${MESES[parseInt(mF)-1].slice(0,3)}`;

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
                <div class="appt-chip ${a.status}" onclick="editAgendamento(${a.id})" title="${a.paciente_nome||''}">
                  <div class="appt-hora">${a.hora}</div>
                  <div class="appt-nome">${a.paciente_nome || 'Sem paciente'}</div>
                  <div class="appt-tipo">${TIPO_LABEL[a.tipo]||a.tipo}</div>
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
          <button class="btn btn-outline btn-xs" onclick="editAgendamento(${a.id})">✏️</button>
          <button class="btn btn-ghost btn-xs" style="color:var(--red)" onclick="deleteAgendamentoItem(${a.id})">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ── Modal Agendamento ─────────────────────────────────────────
let _pacientesCache = [];

async function openModalAgendamento(ag = null, dataPreset = null, pacienteIdPreset = null) {
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
        <label>Paciente</label>
        <select id="ag-paciente" onchange="autoPreencherAgendamento()">
          <option value="">Sem paciente (bloquear horário)</option>
          ${pacOptions}
        </select>
      </div>
      <div class="form-group">
        <label>Data</label>
        <input type="date" id="ag-data" value="${ag?.data || defaultDate}">
      </div>
      <div class="form-group">
        <label>Hora</label>
        <input type="time" id="ag-hora" value="${ag?.hora || '09:00'}">
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
      else        { await api('POST', '/agendamentos', body);          toast('Sessão agendada! 🌸'); }
      closeModal();
      if (_currentSection === 'agenda')    fetchAgendaSemana();
      if (_currentSection === 'dashboard') loadDashboard();
      if (_currentSection === 'financeiro') loadFinanceiro();
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

async function deleteAgendamentoItem(id) {
  if (!confirm('Remover este agendamento?')) return;
  await api('DELETE', `/agendamentos/${id}`);
  toast('Agendamento removido');
  fetchAgendaSemana();
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
            <thead><tr><th>Paciente</th><th>Data</th><th>Hora</th><th>Status</th><th></th></tr></thead>
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
    toast(`${salvos} sessão(ões) atualizada(s)! 🌸`);
    closeModal();
    fetchAgendaSemana();
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
    fetchAgendaSemana();
  } catch(e) { toast(e.message, 'error'); }
}

// ============================================================
// ── PACIENTES ────────────────────────────────────────────────
// ============================================================
let _pacientes = [];

async function loadPacientes() {
  _pacientes = await api('GET', '/pacientes');
  document.getElementById('pacientes-list-view').style.display = '';
  document.getElementById('pacientes-detail-view').style.display = 'none';
  filtrarPacientes();
  populateProntSelect();
}

function filtrarPacientes() {
  const q = (document.getElementById('pac-search')?.value || '').toLowerCase();
  const filtered = _pacientes.filter(p =>
    !q || p.nome.toLowerCase().includes(q) ||
    (p.cpf||'').includes(q) ||
    (p.convenio||'').toLowerCase().includes(q) ||
    (p.email||'').toLowerCase().includes(q)
  );
  renderPacientesTable(filtered);
}

function renderPacientesTable(data) {
  const tbody = document.getElementById('pacientes-tbody');
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><span class="empty-icon">👤</span><p>Nenhuma paciente encontrada</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(p => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--rose),var(--lavender));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:12px;flex-shrink:0">${iniciais(p.nome)}</div>
          <div>
            <div style="font-weight:700;color:var(--plum)">${p.nome}</div>
            ${p.cpf ? `<div style="font-size:11px;color:var(--muted)">${p.cpf}</div>` : ''}
          </div>
        </div>
      </td>
      <td>${fmtNascimento(p.data_nascimento)}</td>
      <td>
        ${p.whatsapp ? `<a href="https://wa.me/55${p.whatsapp.replace(/\D/g,'')}" target="_blank" style="color:var(--sage);font-size:12px">💬 ${p.whatsapp}</a>` : '—'}
      </td>
      <td>${p.convenio || '<span class="text-muted">Particular</span>'}</td>
      <td class="text-right fw-bold">${BRL(p.valor_sessao)}</td>
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
        <input type="text" id="fp-nome" value="${p.nome||''}" placeholder="Nome da paciente">
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
  openModal(p.id ? 'Editar Paciente' : 'Nova Paciente', pacienteFormHtml(p), async () => {
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
      obs:             document.getElementById('fp-obs').value.trim()
    };
    if (!body.nome) return toast('Nome é obrigatório', 'error');
    try {
      if (p.id) { await api('PUT', `/pacientes/${p.id}`, body); toast('Paciente atualizada! 🌸'); }
      else      { await api('POST', '/pacientes', body);         toast('Paciente cadastrada! 🌸'); }
      closeModal();
      loadPacientes();
    } catch(e) { toast(e.message, 'error'); }
  }, { large: true });
}

async function editPaciente(id) {
  const p = await api('GET', `/pacientes/${id}`);
  openModalPaciente(p);
}

async function deletePacienteItem(id) {
  if (!confirm('Desativar esta paciente? Seus dados serão mantidos.')) return;
  await api('DELETE', `/pacientes/${id}`);
  toast('Paciente desativada');
  loadPacientes();
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
  sel.innerHTML = '<option value="">Selecione uma paciente...</option>' +
    pList.map(p => `<option value="${p.id}" ${p.id == current ? 'selected' : ''}>${p.nome}</option>`).join('');
}

async function loadProntuariosSection() {
  const pacId = document.getElementById('pront-paciente-select')?.value;
  const btnNovo = document.getElementById('btn-novo-pront');
  if (!pacId) {
    btnNovo.style.display = 'none';
    document.getElementById('pront-content').innerHTML = `
      <div class="empty-state"><span class="empty-icon">📋</span><p>Selecione uma paciente para ver os prontuários</p></div>`;
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
      <label>Humor / Estado Emocional da Paciente</label>
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
  if (!pacId) return toast('Selecione uma paciente primeiro', 'error');

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

async function loadFinanceiro() {
  updateFinMesLabel();
  const data = await api('GET', `/financeiro?ano=${_finAno}&mes=${_finMes}`);

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
  `;

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
        <strong>${ag.paciente_nome || 'Paciente'}</strong> — ${fmtData(ag.data)} às ${ag.hora}<br>
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
    loadFinanceiro();
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
  document.getElementById('cfg-inicio').value       = cfg.horario_inicio || '08:00';
  document.getElementById('cfg-fim').value          = cfg.horario_fim || '18:00';
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
    horario_fim:          document.getElementById('cfg-fim').value
  };
  try {
    await api('POST', '/configuracoes', body);
    _config = { ..._config, ...body };
    atualizarBrand();
    toast('Configurações salvas! 🌸');

    // Se o valor padrão mudou, oferece atualizar pacientes que ainda usam o valor antigo
    if (novoValor !== valorAntigo && valorAntigo > 0) {
      const pacientes = await api('GET', '/pacientes');
      const desatualizadas = pacientes.filter(p => parseFloat(p.valor_sessao) === valorAntigo);
      if (desatualizadas.length > 0) {
        openModal('Atualizar Valor das Pacientes', `
          <p style="margin-bottom:14px">O valor padrão mudou de <strong>${BRL(valorAntigo)}</strong> para <strong>${BRL(novoValor)}</strong>.</p>
          <p style="margin-bottom:10px"><strong>${desatualizadas.length}</strong> paciente(s) ainda usam o valor antigo:</p>
          <ul style="margin:0 0 14px 18px;line-height:2;font-size:13.5px">
            ${desatualizadas.map(p => `<li>${p.nome}</li>`).join('')}
          </ul>
          <p style="color:var(--muted);font-size:13px">Deseja atualizar todas para ${BRL(novoValor)}?</p>
        `, async () => {
          for (const p of desatualizadas) {
            await api('PUT', `/pacientes/${p.id}`, { ...p, valor_sessao: novoValor });
          }
          toast(`${desatualizadas.length} paciente(s) atualizada(s)! 🌸`);
          closeModal();
        }, { saveLabel: 'Sim, atualizar pacientes' });
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

async function loadContratos() {
  const [contratos, convites] = await Promise.all([
    api('GET', '/contratos'),
    api('GET', '/convites')
  ]);
  _contratos = contratos;
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
          <thead><tr><th>Paciente</th><th>Enviado em</th><th>Expira em</th><th>Status</th><th>Link</th><th></th></tr></thead>
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
      <label>Nome do Paciente</label>
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
    if (!nome) return toast('Informe o nome do paciente', 'error');

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
        toast(`Link gerado + ${criadas} sessão(ões) agendada(s)! 🌸`);
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

async function init() {
  _config = await api('GET', '/configuracoes');
  atualizarBrand();
  loadDashboard();
  loadNotificacoes();
}

init();
