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
  if (c.length === 6) {
    const yy = parseInt(c.slice(4,6));
    const yyyy = yy >= 30 ? `19${String(yy).padStart(2,'0')}` : `20${String(yy).padStart(2,'0')}`;
    return `${yyyy}-${c.slice(2,4)}-${c.slice(0,2)}`;
  }
  return null;
}

function nextDate(dow) { // 1=seg, 2=ter, 3=qua, 4=qui, 5=sex, 6=sab
  const d = new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+1);
  while (d.getDay() !== dow) d.setDate(d.getDate()+1);
  return d.toISOString().slice(0,10);
}

function addWeeks(dateStr, w) {
  const d = new Date(dateStr+'T12:00:00');
  d.setDate(d.getDate() + w*7);
  return d.toISOString().slice(0,10);
}

function buildDates(dow, freq) {
  const first = nextDate(dow);
  if (freq === 'biweekly') return [first, addWeeks(first,2)];
  if (freq === 'monthly')  return [first];
  return [first, addWeeks(first,1), addWeeks(first,2), addWeeks(first,3)];
}

async function register({ nome, nasc, cpf, rg, email, tel, end: endereco, obs, schedules }) {
  console.log(`\n→ ${nome}`);
  const pac = await api('POST', '/api/pacientes', {
    nome, cpf: cpf || null, email: email || null,
    data_nascimento: fmtDate(nasc),
    whatsapp: tel || null,
    endereco: endereco || null,
    obs: [rg, obs].filter(Boolean).join(' | ') || null
  });
  if (!pac?.id) { console.log('  ERRO ao criar paciente'); return; }
  console.log(`  Paciente ID: ${pac.id}`);
  if (!schedules?.length) return;
  for (const { dow, hora, freq = 'weekly' } of schedules) {
    for (const data of buildDates(dow, freq)) {
      await api('POST', '/api/agendamentos', {
        paciente_id: pac.id, data, hora, tipo: 'sessao', status: 'agendado'
      });
      console.log(`  Sessão: ${data} ${hora}`);
    }
  }
}

const pacientes = [
  { nome: 'Cecilia Higino',
    obs: 'Psicoterapia — início 2024',
    schedules: [{ dow:1, hora:'16:00' }] },

  { nome: 'Gabriela Ribeiro França Dias', nasc:'09/09/2002',
    cpf:'162.198.936-46', rg:'MG 19769762', email:'gabirfd@gmail.com', tel:'30421486',
    end:'Rua Professor Arthur Velloso 105, Jardim América, Belo Horizonte/MG',
    schedules: [{ dow:1, hora:'18:30' }] },

  { nome: 'Amanda Antunes Fancelli', nasc:'21/02/2009',
    cpf:'089.687.201-77', rg:'1944928', email:'amandafancelli123@gmail.com',
    end:'Rua Bogari, Casa 49, Damha 1 — CEP 79046114',
    schedules: [{ dow:1, hora:'20:00' }, { dow:6, hora:'13:00' }] },

  { nome: 'Isabelli de Cássia Santos Dias', nasc:'01/06/1998',
    cpf:'132.446.946-32', email:'isabellidiass@icloud.com',
    end:'Seestrasse 109, Berlin, Alemanha',
    schedules: [{ dow:2, hora:'15:00' }] },

  { nome: 'Maria Luiza Scardovelli Melo', nasc:'25/07/2026',
    cpf:'415.500.718-58', rg:'533987313', email:'malu.smelo08@gmail.com',
    end:'Rua Sylvio Nogueira, 33 — Residencial Baden — CEP 13049-391',
    schedules: [{ dow:2, hora:'16:00' }] },

  { nome: 'Fábio Aita Farias', nasc:'03/08/1994',
    cpf:'034.122.570-36', rg:'7103871931', email:'fabioaitafariass@gmail.com',
    end:'Rua Alzira Sarcone Martins 157 — Osório/RS — CEP 95520-000',
    schedules: [{ dow:2, hora:'17:00' }] },

  { nome: 'Thaiane Danielle Silva Oliveira', nasc:'29/07/1991',
    cpf:'407.118.198-23', rg:'47.794.155-2', email:'thaianne_thane@hotmail.com',
    end:'Rua André Bernardes, 75, Parque Cruzeiro do Sul, São Paulo/SP — CEP 08070-290',
    schedules: [{ dow:2, hora:'19:00' }] },

  { nome: 'Helena de Alencar Christofidis', nasc:'27/02/2009',
    cpf:'090.550.431-33', rg:'4.049.928', email:'helenachristofidis@gmail.com',
    end:'QI 29 Lote 2 Bloco D Apt 801 SQA — CEP 71065290',
    schedules: [{ dow:3, hora:'14:00' }] },

  { nome: 'Catarina',
    schedules: [{ dow:3, hora:'18:30' }] },

  { nome: 'Aline Aparecida Santana', nasc:'10/09/1979',
    cpf:'046.244.556-90', rg:'M8.616.182', email:'aline_ast@yahoo.com.br',
    end:'Rua Vanda de Carvalho, 535, Apto 301 — Ribeirão das Neves/MG — CEP 33805-510',
    schedules: [{ dow:3, hora:'20:00', freq:'biweekly' }] },

  { nome: 'Fernanda Wolff',
    schedules: [{ dow:4, hora:'07:30' }] },

  { nome: 'Andréa Karollyna de Azevedo Antunes Marques', nasc:'28/01/1993',
    cpf:'089.050.859-38', rg:'10.274.982-0', email:'akarollantunes@gmail.com',
    end:'Rua Renato Polatti 3537, Campo Comprido, Curitiba/PR — CEP 81230-170',
    schedules: [{ dow:4, hora:'15:00' }] },

  { nome: 'Mariana Nangino Barcelos Azevedo Simões',
    cpf:'548.149.028-59', rg:'69581972-0', email:'mariana.nbas@gmail.com',
    end:'Rua Juliano Arruda Tâmega, 120, M-15, Condomínio Reserva da Serra, Jundiaí/SP — CEP 13212139',
    schedules: [{ dow:4, hora:'16:00' }] },

  { nome: 'Pamela Roberta Esposte', nasc:'29/12/1995',
    cpf:'440.313.258-86', rg:'41.899.008-6', email:'pamela.esposte@gmail.com',
    end:'Rua Maria Nilza de Camargo Bento, 07 — Ondinhas — Piracicaba/SP — CEP 13403-679',
    schedules: [{ dow:4, hora:'15:00', freq:'biweekly' }] },

  { nome: 'Sophia Schiavetti de Souza', nasc:'25/09/2009',
    cpf:'901.203.198-29', rg:'69.183.063-0', email:'sophiaschi.souza@gmail.com',
    end:'Carrer de Carreras, 12-14, Barcelona — CEP 08034',
    schedules: [{ dow:5, hora:'10:00' }] },

  { nome: 'Cristina Maria Herrero Friedman', nasc:'22/06/1975',
    cpf:'246.658.578-22', rg:'24.214.829-3', email:'herrero.cristina@gmail.com',
    end:'Rua Comendador Eduardo Saccab, 222 — AP 41 — CEP 04601-070',
    schedules: [{ dow:5, hora:'16:00' }] },

  { nome: 'Guilherme Oliveira Talge Carvalho', nasc:'30/06/2008',
    cpf:'475.364.658-07', rg:'53.017.020-6', email:'guilhermetalge@gmail.com',
    end:'Rua Dona Maria Augusta Fagundes Gomes, 233 — CEP 12240740',
    schedules: [{ dow:5, hora:'17:00' }] },

  { nome: 'Ana Paula de Oliveira', nasc:'15/05/73',
    cpf:'609.927.941-53', rg:'759419 MS', email:'analitlle@gmail.com',
    end:'Rua João Carrato 2285, Três Lagoas/MS — CEP 79645-050',
    schedules: [{ dow:3, hora:'16:00' }] },

  { nome: 'Agata Calderaro' },

  { nome: 'João Bosco de Freitas Júnior', nasc:'16/06/1967',
    cpf:'590.916.226-87', rg:'3.628.259', email:'freitasjb44@gmail.com',
    end:'Av Sagitário, 198, Apto 182 — Sítio Tamboré — Barueri/SP — CEP 06473-073',
    obs: 'Frequência: uma vez ao mês' },

  { nome: 'Marina Kokanj Santana', nasc:'20/04/2010',
    cpf:'556.204.978-36', rg:'579774107', email:'mama.santana@icloud.com',
    end:'Rua Tuiuti, 680 — CEP 03081015',
    schedules: [{ dow:5, hora:'14:00' }] },

  { nome: 'Jose Augusto Ayuso', nasc:'28/11/1977',
    cpf:'267.974.518-33', rg:'22937816X', email:'jaaayuso@gmail.com',
    end:'Rua Faustolo 1450, AP 254-1, Lapa — São Paulo/SP — CEP 05041-001',
    schedules: [{ dow:2, hora:'14:00', freq:'biweekly' }] },
];

(async () => {
  for (const p of pacientes) await register(p);
  console.log('\n✅ Importação concluída!');
})();
