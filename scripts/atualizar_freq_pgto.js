const BASE = 'https://lorenzi-production.up.railway.app';
const api = (m,p,b) => fetch(BASE+p,{method:m,headers:{'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined}).then(r=>r.json());

// Dados extraídos dos registros de importação
const FREQ_PGTO = {
  // Segunda leva — campo "pagamento" explícito
  'julia yaryd perez':                   'cada4',       // "A cada 4 sessões"
  'isabelle mori beleze':                'cada4',       // "A cada 4 sessões"
  'helena rosana oliveira degang':       'cada4',       // "A cada 4 sessões"
  'nicole vecino nastri':                'fp-semanal',  // "Pix — Semanal"
  'joão alessandro dutra elias':         'cada4',       // "A cada 4 sessões"
  'eduardo portela siqueira':            'cada4',       // pagou 8 sessões adiantadas (2x bloco 4)
  'isabela ferranti berté':              'cada4',       // "A cada 4 sessões"
  'juliana nascimento zanchettin':       'por-sessao',  // "Semanal (antes de cada sessão)"
  'guilherme oliveira talge carvalho':   'por-sessao',  // "Semanal (antes de cada sessão)"
};

const LABEL = { 'cada4':'A cada 4', 'fp-semanal':'Semanal', 'por-sessao':'Por sessão', 'fp-mensal':'Mensal' };

(async () => {
  const todos = await api('GET', '/api/pacientes?todos=1');
  let atualizados = 0;
  for (const p of todos) {
    const freq = FREQ_PGTO[p.nome.toLowerCase().trim()];
    if (!freq) { console.log(`   —  ${p.nome}`); continue; }
    await api('PUT', '/api/pacientes/'+p.id, { ...p, freq_pgto: freq });
    console.log(`✅ ${LABEL[freq].padEnd(14)} ${p.nome}`);
    atualizados++;
  }
  console.log(`\n✅ ${atualizados} clientes atualizados!`);
})();
