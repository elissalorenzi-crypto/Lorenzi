const BASE = 'https://lorenzi-production.up.railway.app';
const api = (m,p,b) => fetch(BASE+p,{method:m,headers:{'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined}).then(r=>r.json());

const FREQUENCIAS = {
  // semanal — 1x por semana
  'cecilia higino':                               'semanal',
  'gabriela ribeiro frança dias':                 'semanal',
  'amanda antunes fancelli':                      'semanal',
  'isabelli de cássia santos dias':               'semanal',
  'maria luiza scardovelli melo':                 'semanal',
  'fábio aita farias':                            'semanal',
  'thaiane danielle silva oliveira':              'semanal',
  'helena de alencar christofidis':               'semanal',
  'catarina':                                     'semanal',
  'fernanda wolff':                               'semanal',
  'andréa karollyna de azevedo antunes marques':  'semanal',
  'mariana nangino barcelos azevedo simões':      'semanal',
  'sophia schiavetti de souza':                   'semanal',
  'cristina maria herrero friedman':              'semanal',
  'guilherme oliveira talge carvalho':            'semanal',
  'ana paula de oliveira':                        'semanal',
  'marina kokanj santana':                        'semanal',
  'julia yaryd perez':                            'semanal',
  'isabelle mori beleze':                         'semanal',
  'helena rosana oliveira degang':                'semanal',
  'nicole vecino nastri':                         'semanal',
  'joão alessandro dutra elias':                  'semanal',
  'eduardo portela siqueira':                     'semanal',
  'juliana nascimento zanchettin':                'semanal',

  // quinzenal — a cada 2 semanas
  'aline aparecida santana':                      'quinzenal',
  'pamela roberta esposte':                       'quinzenal',
  'jose augusto ayuso':                           'quinzenal',

  // mensal
  'joão bosco de freitas júnior':                 'mensal',
};

const LABEL = { semanal:'Semanal', quinzenal:'Quinzenal', mensal:'Mensal' };

(async () => {
  const todos = await api('GET', '/api/pacientes?todos=1');
  let atualizados = 0;
  for (const p of todos) {
    const freq = FREQUENCIAS[p.nome.toLowerCase().trim()];
    if (!freq) { console.log(`   —  ${p.nome} (sem dado)`); continue; }
    await api('PUT', '/api/pacientes/'+p.id, { ...p, frequencia: freq });
    console.log(`✅ ${LABEL[freq].padEnd(12)} ${p.nome}`);
    atualizados++;
  }
  console.log(`\n✅ ${atualizados} clientes atualizados!`);
})();
