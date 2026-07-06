const BASE = 'https://lorenzi-production.up.railway.app';
const api = (m,p,b) => fetch(BASE+p,{method:m,headers:{'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined}).then(r=>r.json());

const CELULARES = {
  'agata calderaro':                              '(91) 99304-1436',
  'juliana nascimento zanchettin':                '(11) 94177-6364',
  'joão alessandro dutra elias':                  '(48) 99630-8555',
  'cecilia higino':                               '(11) 96330-0770',
  'eduardo portela siqueira':                     '(11) 97431-7031',
  'gabriela ribeiro frança dias':                 '(31) 99459-0840',
  'amanda antunes fancelli':                      '(67) 99880-6575',
  'isabelli de cássia santos dias':               '+351 935 222 747',
  'maria luiza scardovelli melo':                 '(31) 99641-2030',
  'fábio aita farias':                            '+353 83 885 7384',
  'thaiane danielle silva oliveira':              '(11) 99920-4006',
  'helena de alencar christofidis':               '(61) 99577-2020',
  'catarina':                                     '(11) 99473-8962',
  'aline aparecida santana':                      '(31) 98863-0691',
  'fernanda wolff':                               '(11) 99936-2064',
  'andréa karollyna de azevedo antunes marques':  '(41) 99676-8936',
  'pamela roberta esposte':                       '(19) 98442-3955',
  'mariana nangino barcelos azevedo simões':      '(11) 97275-2202',
  'julia yaryd perez':                            '(11) 97428-2309',
  'helena rosana oliveira degang':                '(11) 99363-8692',
  'cristina maria herrero friedman':              '(11) 98318-2529',
  'guilherme oliveira talge carvalho':            '(12) 98182-6212',
  'joão bosco de freitas júnior':                 '(11) 98415-0113',
  'jose augusto ayuso':                           '(11) 97585-6709',
  'ana paula de oliveira':                        '(67) 99247-8044',
};

(async () => {
  const todos = await api('GET', '/api/pacientes?todos=1');
  let atualizados = 0;
  for (const p of todos) {
    const cel = CELULARES[p.nome.toLowerCase().trim()];
    if (!cel) continue;
    await api('PUT', '/api/pacientes/'+p.id, { ...p, whatsapp: cel });
    console.log(`✅ ${p.nome.padEnd(45)} → ${cel}`);
    atualizados++;
  }
  console.log(`\n✅ ${atualizados} clientes atualizados!`);
})();
