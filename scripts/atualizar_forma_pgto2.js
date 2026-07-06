const BASE = 'https://lorenzi-production.up.railway.app';

async function api(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  return r.json();
}

(async () => {
  const todos = await api('GET', '/api/pacientes?todos=1');
  console.log(`Total de clientes: ${todos.length}\n`);

  let atualizados = 0;
  for (const p of todos) {
    if (p.forma_pgto) { console.log(`   já tem  ${p.nome}`); continue; }
    await api('PUT', `/api/pacientes/${p.id}`, { ...p, forma_pgto: 'pix' });
    console.log(`✅ PIX  ${p.nome}`);
    atualizados++;
  }

  console.log(`\n✅ ${atualizados} clientes atualizados!`);
})();
