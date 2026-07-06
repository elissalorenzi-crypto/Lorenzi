const BASE = 'https://lorenzi-production.up.railway.app';
const api = (m,p,b) => fetch(BASE+p,{method:m,headers:{'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined}).then(r=>r.json());

(async () => {
  const pacientes = await api('GET', '/api/pacientes?todos=1');
  const hoje = new Date().toISOString().slice(0,10);

  let totalSessoes = 0;
  for (const p of pacientes) {
    if (!p.valor_sessao) continue;
    const ags = await api('GET', `/api/pacientes/${p.id}/agendamentos`);
    const pendentes = (ags || []).filter(a =>
      a.data >= hoje && ['agendado','confirmado'].includes(a.status) && a.valor !== p.valor_sessao
    );
    if (!pendentes.length) continue;
    for (const ag of pendentes) {
      await api('PUT', `/api/agendamentos/${ag.id}`, { ...ag, valor: p.valor_sessao });
    }
    console.log(`✅ ${p.nome.padEnd(45)} R$${p.valor_sessao}  (${pendentes.length} sessão/ões)`);
    totalSessoes += pendentes.length;
  }
  console.log(`\n✅ ${totalSessoes} sessões atualizadas!`);
})();
