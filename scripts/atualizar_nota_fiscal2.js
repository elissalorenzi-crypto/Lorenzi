const BASE = 'https://lorenzi-production.up.railway.app';
const api = (m,p,b) => fetch(BASE+p,{method:m,headers:{'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined}).then(r=>r.json());

const NAO_EMITE = [
  'joão alessandro dutra elias',
  'amanda antunes fancelli',
  'isabelli de cássia santos dias',
  'fábio aita farias',
  'fernanda wolff',
  'joão bosco de freitas júnior',
  'ana paula de oliveira',
  'guilherme oliveira talge carvalho',
];

(async () => {
  const todos = await api('GET', '/api/pacientes?todos=1');
  for (const p of todos) {
    const nao = NAO_EMITE.includes(p.nome.toLowerCase().trim());
    const nf = nao ? 'nao' : 'sim';
    await api('PUT', '/api/pacientes/'+p.id, { ...p, nota_fiscal: nf });
    console.log(`${nao ? '   Não' : '✅ Sim '}  ${p.nome}`);
  }
  console.log('\n✅ Nota fiscal atualizada!');
})();
