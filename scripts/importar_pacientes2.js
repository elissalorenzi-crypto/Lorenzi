const BASE = 'https://lorenzi-production.up.railway.app';

async function api(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  return r.json();
}

function fmtDate(s) {
  if (!s) return null;
  const c = s.replace(/\D/g, '');
  if (c.length === 8) return `${c.slice(4,8)}-${c.slice(2,4)}-${c.slice(0,2)}`;
  return null;
}

function nextDate(dow) {
  const d = new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+1);
  while (d.getDay() !== dow) d.setDate(d.getDate()+1);
  return d.toISOString().slice(0,10);
}

function addWeeks(dateStr, w) {
  const d = new Date(dateStr+'T12:00:00');
  d.setDate(d.getDate() + w*7);
  return d.toISOString().slice(0,10);
}

function buildDates(dow, count) {
  const first = nextDate(dow);
  return Array.from({ length: count }, (_, i) => addWeeks(first, i));
}

async function register({ nome, nasc, cpf, rg, email, tel, end: endereco, cep, responsavel, tel_resp, escolaridade, pagamento, obs, valor, schedules, sessoes = 4 }) {
  console.log(`\n→ ${nome}`);

  const obsCompleto = [
    rg           ? `RG: ${rg}`                 : null,
    escolaridade ? `Escolaridade: ${escolaridade}` : null,
    pagamento    ? `Pagamento: ${pagamento}`    : null,
    obs,
  ].filter(Boolean).join(' | ');

  const pac = await api('POST', '/api/pacientes', {
    nome,
    cpf:             cpf            || null,
    data_nascimento: fmtDate(nasc),
    email:           email          || null,
    whatsapp:        tel            || null,
    endereco:        [endereco, cep ? `CEP ${cep}` : null].filter(Boolean).join(' — ') || null,
    responsavel:     responsavel    || null,
    tel_responsavel: tel_resp       || null,
    valor_sessao:    valor          || 0,
    obs:             obsCompleto    || null,
  });

  if (!pac?.id) { console.log('  ERRO ao criar paciente'); return; }
  console.log(`  Paciente ID: ${pac.id}`);

  if (!schedules?.length) return;

  for (const { dow, hora } of schedules) {
    const dates = buildDates(dow, sessoes);
    for (const data of dates) {
      await api('POST', '/api/agendamentos', {
        paciente_id: pac.id, data, hora,
        tipo: 'sessao', status: 'agendado',
        valor: valor || 0,
      });
      console.log(`  Sessão: ${data} ${hora}`);
    }
  }
}

async function update(id, fields) {
  console.log(`\n→ Atualizando ID ${id}`);
  // Buscar dados existentes primeiro
  const existente = await api('GET', `/api/pacientes/${id}`);
  if (!existente?.id) { console.log('  Não encontrado'); return; }

  const merged = { ...existente, ...fields };
  const r = await api('PUT', `/api/pacientes/${id}`, merged);
  console.log(`  Atualizado: ${JSON.stringify(r)}`);
}

(async () => {
  // ── NOVOS PACIENTES ───────────────────────────────────────────

  await register({
    nome: 'Julia Yaryd Perez', nasc: '23/09/2009',
    cpf: '542.718.038-98', rg: '58.293.306-7',
    email: 'juliayperez2309@gmail.com', tel: '(11) 99818-8186',
    end: 'Rua Sapucaia, 326 – Apto 82, Bloco 4, Mooca – SP', cep: '03170-050',
    escolaridade: '2º ano do Ensino Médio',
    responsavel: 'Fernanda Yarydyd', tel_resp: '(11) 99818-8186',
    pagamento: 'Cartão de Crédito — A cada 4 sessões — Emite NF',
    obs: 'Contrato: Enviado e Assinado | Tipo: Orientação Profissional | Início: 26/03/2026',
    valor: 300,
    schedules: [{ dow: 4, hora: '19:00' }],
  });

  await register({
    nome: 'Isabelle Mori Beleze', nasc: '05/11/2002',
    cpf: '424.440.068-01', rg: '59.534.704-6',
    email: 'isabellemoribeleze@gmail.com',
    end: 'Handelskai 98, 1200 Viena, Áustria',
    pagamento: 'Pix — A cada 4 sessões — Não Emite NF',
    obs: 'Paciente residente no exterior | Contrato: Assinado | Tipo: Orientação Profissional | Início: 24/03/2026',
    valor: 300,
    schedules: [{ dow: 2, hora: '14:00' }],
  });

  await register({
    nome: 'Helena Rosana Oliveira Degang', nasc: '10/05/1969',
    cpf: '094.695.378-31', rg: '20.193.554-5',
    email: 'helenamkt@yahoo.com.br',
    end: 'Rua Jaci, 130 – Apto 34', cep: '04140-080',
    pagamento: 'Cartão de Crédito — A cada 4 sessões',
    obs: 'Tipo: Orientação Profissional | Início: 16/01/2026',
    valor: 300,
    schedules: [{ dow: 5, hora: '08:00' }],
  });

  await register({
    nome: 'Nicole Vecino Nastri',
    cpf: '542.930.868-46', rg: '64.335.680-0',
    email: 'nicolevnastri@gmail.com',
    end: 'Estrada da Serrinha, 291', cep: '18133-399',
    pagamento: 'Pix — Semanal',
    obs: 'Tipo: Orientação Profissional | Início: 20/01/2026 | ⚠️ CONFLITO: Juliana Zanchettin também tem Segunda 14:00',
    valor: 300,
    schedules: [{ dow: 1, hora: '14:00' }],
  });

  await register({
    nome: 'João Alessandro Dutra Elias', nasc: '08/04/2006',
    cpf: '115.316.649-62', rg: '6.089.503',
    email: 'joaoalessandroe@gmail.com',
    end: 'Rua Desembargador Ferreira Bastos, 120', cep: '88080-230',
    pagamento: 'Cartão de Crédito — A cada 4 sessões',
    obs: 'Tipo: Orientação Profissional | Início: 20/04/2026',
    valor: 300,
    schedules: [{ dow: 1, hora: '15:00' }],
  });

  // Eduardo pagou 8 sessões adiantadas → criamos 8 sessões
  await register({
    nome: 'Eduardo Portela Siqueira', nasc: '08/07/1982',
    cpf: '217.221.918-56', rg: '34.985.107-4',
    email: 'edu_portela@hotmail.com',
    end: 'Estrada do Pavone, 190 – Alpes dos Araçás – Cajamar/SP', cep: '07787-845',
    pagamento: 'Pix — Adiantado (8 sessões pagas)',
    obs: 'Já pagou 8 sessões adiantadas | Tipo: Orientação Profissional | Início: 09/03/2025',
    valor: 285,
    schedules: [{ dow: 1, hora: '17:00' }],
    sessoes: 8,
  });

  await register({
    nome: 'Isabela Ferranti Berté', nasc: '28/10/1995',
    cpf: '035.917.180-09', rg: '80.967.358-19',
    email: 'isabelabeerte@gmail.com',
    end: 'Rua Carlos Dreher Filho, 79 – Apto 201 – Bento Gonçalves/RS', cep: '95703-078',
    pagamento: 'Pix — A cada 4 sessões',
    obs: 'Tipo: Orientação Profissional | Início: 12/01/2026',
    valor: 100,
    // sem agenda definida
  });

  await register({
    nome: 'Juliana Nascimento Zanchettin', nasc: '06/10/2004',
    cpf: '410.983.918-10', rg: '52.865.865-7',
    email: 'juliana.zanchettin@gmail.com',
    end: 'Rua Expedicionário José Lopes, 118', cep: '12244-885',
    pagamento: 'Pix — Semanal (antes de cada sessão) — Emite NF ao final de cada mês',
    obs: 'Contrato: Assinado | Tipo: Orientação Profissional | Início: 20/04/2026 | ⚠️ CONFLITO: Nicole Nastri também tem Segunda 14:00',
    valor: 300,
    schedules: [{ dow: 1, hora: '14:00' }],
  });

  // ── ATUALIZAR GUILHERME (ID 20) com novos dados ───────────────
  await update(20, {
    data_nascimento: '2008-06-30',
    cpf: '475.364.658-07',
    email: 'guilhermetalge@gmail.com',
    endereco: 'Rua Dona Maria Augusta Fagundes Gomes, 233 — CEP 12240-740',
    responsavel: 'Luciane Dias de Oliveira',
    valor_sessao: 300,
    obs: 'RG: 53.017.020-6 | Responsável CPF: 255.432.818-89 | Pagamento: Pix — Semanal (antes de cada sessão) | Emite NF ao final de cada mês | Contrato: Assinado | Tipo: Orientação Profissional | Início: 17/04/2026',
  });

  console.log('\n✅ Importação 2ª leva concluída!');
})();
