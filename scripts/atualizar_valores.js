const BASE = 'https://lorenzi-production.up.railway.app';

async function api(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  return r.json();
}

const VALORES_ESPECIAIS = {
  'agata calderaro':        350,
  'cecilia higino':         200,
  'catarina':               250,
  'marina kokanj santana':  250,
};

(async () => {
  const todos = await api('GET', '/api/pacientes?todos=1');
  console.log(`Total de clientes: ${todos.length}\n`);

  for (const p of todos) {
    const chave = p.nome.toLowerCase().trim();
    const valor = VALORES_ESPECIAIS[chave] ?? 300;
    await api('PUT', `/api/pacientes/${p.id}`, { ...p, valor_sessao: valor });
    console.log(`✓ ${p.nome.padEnd(45)} → R$ ${valor}`);
  }

  console.log('\n✅ Valores atualizados!');
})();
