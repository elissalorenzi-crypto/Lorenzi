const BASE = 'https://lorenzi-production.up.railway.app';

async function api(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  return r.json();
}

const FORMAS = {
  'julia yaryd perez':                   'credito',
  'isabelle mori beleze':                'pix',
  'helena rosana oliveira degang':       'credito',
  'nicole vecino nastri':                'pix',
  'joão alessandro dutra elias':         'credito',
  'eduardo portela siqueira':            'pix',
  'isabela ferranti berté':              'pix',
  'juliana nascimento zanchettin':       'pix',
  'guilherme oliveira talge carvalho':   'pix',
};

const LABEL = { pix:'PIX', credito:'Cartão de Crédito', debito:'Cartão de Débito', dinheiro:'Dinheiro', transferencia:'Transferência' };

(async () => {
  const todos = await api('GET', '/api/pacientes?todos=1');
  console.log(`Total de clientes: ${todos.length}\n`);

  let atualizados = 0;
  for (const p of todos) {
    const chave = p.nome.toLowerCase().trim();
    const forma = FORMAS[chave];
    if (!forma) {
      console.log(`   —  ${p.nome}`);
      continue;
    }
    await api('PUT', `/api/pacientes/${p.id}`, { ...p, forma_pgto: forma });
    console.log(`✅ ${LABEL[forma].padEnd(18)} ${p.nome}`);
    atualizados++;
  }

  console.log(`\n✅ ${atualizados} clientes atualizados!`);
})();
