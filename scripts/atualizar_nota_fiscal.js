const BASE = 'https://lorenzi-production.up.railway.app';

async function api(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  return r.json();
}

const EMITE_NF = [
  'julia yaryd perez',
  'guilherme oliveira talge carvalho',
  'juliana nascimento zanchettin',
];

(async () => {
  const todos = await api('GET', '/api/pacientes?todos=1');
  console.log(`Total de clientes: ${todos.length}\n`);

  for (const p of todos) {
    const chave = p.nome.toLowerCase().trim();
    const nota_fiscal = EMITE_NF.includes(chave) ? 'sim' : 'nao';
    await api('PUT', `/api/pacientes/${p.id}`, { ...p, nota_fiscal });
    const label = nota_fiscal === 'sim' ? '✅ Sim' : '   Não';
    console.log(`${label}  ${p.nome}`);
  }

  console.log('\n✅ Nota fiscal atualizada!');
})();
