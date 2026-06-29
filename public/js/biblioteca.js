// Dados da Biblioteca de Atividades
const BIB_CARDS = [
  {
    id: 'op-primeira-escolha',
    titulo: 'Orientação Profissional',
    subtitulo: 'Primeira Escolha',
    icone: '🎯',
    cor: 'bib-op',
    pastas: [
      {
        id: 'autoconhecimento',
        nome: 'Autoconhecimento Profissional',
        icone: '🧭',
        atividades: [
          {
            id: 'emep',
            titulo: 'EMEP – Escala de Maturidade para Escolha Profissional',
            subtitulo: 'Pré-OP · Instrumento de avaliação',
            icone: '📊',
            conteudo: `
              <h3>O que é a EMEP?</h3>
              <p>A <strong>Escala de Maturidade para a Escolha Profissional (EMEP)</strong> é um instrumento utilizado no processo de orientação profissional com o objetivo de avaliar o nível de maturidade do jovem frente à escolha profissional, bem como identificar quais aspectos que compõem essa maturidade se encontram mais ou menos desenvolvidos.</p>
              <p>A maturidade para a escolha profissional refere-se à <em>prontidão do indivíduo para realizar a escolha da profissão</em>. Esse constructo é compreendido a partir de duas dimensões principais: <strong>Atitudes</strong> e <strong>Conhecimentos</strong>, que, em conjunto, influenciam a forma como o jovem se posiciona frente ao processo de decisão profissional.</p>

              <h3>Dimensão: Atitudes</h3>
              <p>Envolve aspectos relacionados à postura do indivíduo diante da escolha e é composta pelas subdimensões:</p>
              <ul>
                <li><strong>Determinação</strong> — grau de definição da escolha</li>
                <li><strong>Responsabilidade</strong> — engajamento em ações responsáveis para sua efetivação</li>
                <li><strong>Independência</strong> — capacidade de conduzir o processo de forma autônoma, considerando influências externas de maneira crítica</li>
              </ul>

              <h3>Dimensão: Conhecimentos</h3>
              <p>Contempla as subdimensões:</p>
              <ul>
                <li><strong>Autoconhecimento</strong> — percepção que o indivíduo possui sobre suas próprias características pessoais, interesses, habilidades e valores</li>
                <li><strong>Conhecimento da Realidade Educativa e Socioprofissional</strong> — nível de informação e compreensão sobre profissões, mercado de trabalho, possibilidades de formação e contextos educacionais</li>
              </ul>

              <p>No processo de orientação profissional, essas dimensões são consideradas de forma integrada, contribuindo para a compreensão do momento de desenvolvimento do jovem em relação à escolha profissional e para o planejamento das intervenções realizadas ao longo do acompanhamento.</p>
            `
          },
          {
            id: 'desenhos-estorias',
            titulo: 'Desenhos e Estórias Profissionais',
            subtitulo: 'Técnica projetiva',
            icone: '🎨',
            conteudo: `
              <h3>O que é?</h3>
              <p>A técnica <strong>Desenhos e Estórias Profissionais</strong> é um instrumento projetivo utilizado no processo de orientação profissional com o objetivo de <em>investigar conteúdos subjetivos relacionados à escolha e à construção da carreira</em>. Por meio da produção de desenhos e narrativas, o jovem pode expressar aspectos de sua vivência interna, como características pessoais, desejos, fantasias, medos, valores e expectativas em relação ao futuro profissional.</p>

              <h3>Objetivos</h3>
              <p>Mais do que identificar uma profissão específica, essa técnica busca compreender como o indivíduo se posiciona frente ao mundo do trabalho, contribuindo para a identificação de:</p>
              <ul>
                <li>Imagens internas de futuro e de sucesso profissional</li>
                <li>Influências familiares, sociais e culturais sobre as escolhas</li>
                <li>Conflitos, inseguranças e formas de enfrentamento frente à tomada de decisão</li>
                <li>Desejos idealizados ou fantasias profissionais</li>
              </ul>

              <h3>Instruções</h3>
              <p>Faça <strong>4 desenhos</strong>, cada um em uma folha separada:</p>
              <ol>
                <li>Desenhe um <strong>profissional</strong> fazendo alguma coisa.</li>
                <li>Desenhe um <strong>profissional em crise</strong> fazendo alguma coisa.</li>
                <li>Desenhe um <strong>profissional bem-sucedido</strong> fazendo alguma coisa.</li>
                <li>Desenhe <strong>você na sua profissão futura</strong>, fazendo alguma coisa.</li>
              </ol>
              <p>Para cada desenho, escreva uma pequena estória sobre a cena representada.</p>
            `
          },
          {
            id: 'mapeando-caracteristicas',
            titulo: 'Mapeando Minhas Características',
            subtitulo: 'Autoconhecimento de forças e dificuldades',
            icone: '🗺️',
            conteudo: `
              <h3>Objetivo</h3>
              <p>O mapeamento de características tem como objetivo favorecer o <strong>reconhecimento de suas principais qualidades e aspectos em desenvolvimento</strong>. Esse processo contribui para a ampliação do autoconhecimento, proporcionando uma visão mais equilibrada de si mesmo, considerando tanto forças quanto dificuldades, favorecendo escolhas mais conscientes e conectadas às suas forças.</p>

              <h3>Etapa 1 – Minhas qualidades e dificuldades</h3>
              <p>Descreva suas qualidades/forças e suas dificuldades/fraquezas, a partir de sua própria percepção, considerando também comentários e observações previamente recebidos de pessoas de seu convívio, como familiares e amigos:</p>

              <div class="atv-bloco">
                <strong>Quais são minhas qualidades/fortalezas?</strong>
                <p>Selecione <strong>3 forças/qualidades</strong> que você gostaria muito de utilizar na sua profissão futura e explique por quê.</p>
              </div>

              <div class="atv-bloco">
                <strong>Quais são minhas dificuldades/fraquezas?</strong>
                <p>Selecione <strong>2 dificuldades</strong> que, na sua visão, mais podem atrapalhar sua vida profissional futura. Para cada dificuldade escolhida, responda:</p>
                <ol>
                  <li>O que você poderia começar a fazer ainda este mês para desenvolver essa habilidade ou reduzir essa dificuldade?</li>
                  <li>Existe alguma atividade, hábito, curso, experiência ou desafio que poderia ajudá-lo(a) a melhorar nesse aspecto?</li>
                  <li>Quem poderia ajudar você nesse desenvolvimento? (Pais, professores, amigos, psicólogo, mentor, treinador, etc.)</li>
                  <li>Qual seria um pequeno passo realista que você pode colocar em prática?</li>
                </ol>
              </div>
            `
          },
          {
            id: 'lista-verbos',
            titulo: 'Habilidades e Interesses – Lista de Verbos',
            subtitulo: 'Mapeamento de motivações e potenciais',
            icone: '📝',
            conteudo: `
              <h3>Objetivo</h3>
              <p>O mapeamento das habilidades e interesses possibilita maior clareza sobre suas motivações, auxiliando na construção de escolhas mais alinhadas aos seus potenciais, interesses e habilidades.</p>

              <h3>Etapa 1 – Seleção dos verbos</h3>
              <p>Leia atentamente a lista de verbos abaixo e selecione aqueles que mais têm a ver com você. Para isso, pense nas atividades que você costuma fazer, gosta de fazer, tem facilidade, ou ainda gostaria de ser ou fazer:</p>

              <div class="atv-verbos">
                AJUDAR · ANALISAR · ASSISTIR · ANDAR · APRENDER · ARRUMAR · BRINCAR · BORDAR · BUSCAR · CANTAR · COSTURAR · CONSTRUIR · COORDENAR · CONSERTAR · CONVENCER · CALCULAR · COMPETIR · CRIAR · COMPRAR · COMUNICAR · CONHECER · COZINHAR · COMPOR · CUIDAR · CONQUISTAR · CONTAR · CAVALGAR · DESMONTAR · DANÇAR · DESENVOLVER · COLHER · COOPERAR · DESENHAR · DIRIGIR · ENFEITAR · ENSINAR · ENTREVISTAR · ESTUDAR · ESCREVER · FACILITAR · FAZER · FALAR · FILMAR · FOTOGRAFAR · INFLUENCIAR · INVENTAR · INVESTIGAR · INTERPRETAR · IMITAR · GUIAR · JOGAR · LER · LIDAR · LIDERAR · LUTAR · MANDAR · MELHORAR · MONTAR · PROTEGER · PESCAR · MUDAR · MOLDAR · MAQUIAR · PLANEJAR · PRODUZIR · NADAR · OUVIR · ORGANIZAR · OBSERVAR · PRATICAR · PESQUISAR · POSAR · PINTAR · PENTEAR · PLANTAR · QUERER · RELACIONAR · REPRESENTAR · RESOLVER · SURFAR · TRABALHAR · TOCAR · TECER · VENDER · VIAJAR
              </div>
              <p>Existe algum verbo que gostaria de acrescentar? Qual(is)?</p>
              <p>Em seguida, forme com cada verbo uma frase curta — por exemplo: <em>"Jogo vôlei. Toco violão. Gosto de imitar os outros. Tenho facilidade de criar objetos com as mãos."</em></p>

              <h3>Etapa 2 – Perspectiva de quem te conhece</h3>
              <p>Vamos buscar a percepção de pessoas que convivem com você. Muitas vezes, familiares e amigos observam habilidades, qualidades e interesses que podem passar despercebidos por nós.</p>

              <div class="atv-bloco">
                <strong>Perguntas para os pais:</strong>
                <p><em>"Oi, estou participando de um processo de orientação profissional e pensei em você para me ajudar em uma das atividades. Sua opinião é muito importante para mim, por isso, responda de forma mais sincera possível:"</em></p>
                <ul>
                  <li>Em que situações você percebe que eu me destaco?</li>
                  <li>Em que você costuma pedir a minha ajuda?</li>
                  <li>Em que atividades você acha que eu demonstro mais interesse ou prazer?</li>
                  <li>Se tivesse que escolher uma profissão que combinaria comigo, qual ou quais seriam e por quê?</li>
                  <li>Do que eu gostava de brincar quando criança, que não era comum a outras crianças?</li>
                </ul>
              </div>

              <div class="atv-bloco">
                <strong>Perguntas para amigos/parentes:</strong>
                <ul>
                  <li>Em que situações você percebe que eu me destaco?</li>
                  <li>Em que você costuma pedir a minha ajuda?</li>
                  <li>Em que atividades você acha que eu demonstro mais interesse ou prazer?</li>
                  <li>Se tivesse que escolher uma profissão que combinaria comigo, qual ou quais seriam e por quê?</li>
                </ul>
              </div>

              <h3>Etapa 3 – O que levar para a vida profissional?</h3>
              <p>Após criar sua lista-resumo de habilidades e interesses, avalie o quanto cada um deles faz sentido levar para sua vida profissional. Para cada habilidade ou interesse, responda com <strong>SIM ou NÃO</strong>:</p>
              <ol>
                <li>Eu quero aplicar esse conhecimento na minha vida ou na vida de outras pessoas?</li>
                <li>Quero aprofundar meus conhecimentos nesse assunto e faço questão de ter contato com ele com frequência, possivelmente todos os dias?</li>
                <li>Estou disposto(a) a lidar com as exigências, responsabilidades, dificuldades e desafios que envolvem transformar esse interesse ou habilidade em uma profissão?</li>
              </ol>
              <p>Se você respondeu <strong>NÃO</strong> para uma ou mais das perguntas, esse interesse pode fazer mais sentido como parte da sua vida pessoal. Se respondeu <strong>SIM</strong> para as três, esse interesse pode representar uma pista importante para sua construção profissional.</p>
            `
          },
          {
            id: 'curtigrama',
            titulo: 'Curtigrama das Profissões',
            subtitulo: 'Mapeamento de interesse × disposição',
            icone: '🗂️',
            conteudo: `
              <h3>Objetivo</h3>
              <p>A atividade <strong>Curtigrama das Profissões</strong> tem como objetivo ajudar a organizar uma primeira visão sobre os caminhos profissionais que mais combinam com os elementos do autoconhecimento, considerando dois critérios centrais: <strong>interesse</strong> ("gosto" ou "não gosto") e <strong>disposição</strong> para exercer a profissão ("faria" ou "não faria").</p>

              <h3>As quatro categorias</h3>
              <p>A partir da combinação desses dois eixos, as profissões são distribuídas em quatro categorias:</p>

              <div class="curtigrama-grid">
                <div class="curtigrama-celula curtigrama-sim">
                  <strong>✅ Gosto e Faria</strong>
                  <p>Áreas que despertam interesse e nas quais você se imagina atuando profissionalmente.</p>
                </div>
                <div class="curtigrama-celula curtigrama-talvez">
                  <strong>💭 Gosto e Não Faria</strong>
                  <p>Áreas que geram interesse, mas que, por diferentes motivos, não são percebidas como opções viáveis.</p>
                </div>
                <div class="curtigrama-celula curtigrama-talvez2">
                  <strong>🤔 Não Gosto e Faria</strong>
                  <p>Áreas que não despertam interesse, mas que poderiam ser consideradas por outros fatores (retorno financeiro, mercado, expectativas externas).</p>
                </div>
                <div class="curtigrama-celula curtigrama-nao">
                  <strong>❌ Não Gosto e Não Faria</strong>
                  <p>Áreas que não despertam interesse nem intenção de atuação profissional.</p>
                </div>
              </div>

              <p>Essa organização permite tornar mais clara a diferença entre curiosidade, afinidade, identificação e disposição real para investir em uma formação e carreira. Além disso, contribui para reduzir dúvidas, descartar opções e fortalecer aquelas que apresentam maior coerência com seus interesses, características e critérios de escolha.</p>

              <h3>Como fazer</h3>
              <p>Liste as profissões que você conhece ou que já considerou e distribua-as nos quatro quadrantes acima, de acordo com seu nível de interesse e disposição real para exercê-las.</p>
            `
          },
          {
            id: 'dia-ideal',
            titulo: 'Um Dia Ideal',
            subtitulo: 'Projeção de futuro e imaginação guiada',
            icone: '☀️',
            conteudo: `
              <h3>Objetivo</h3>
              <p>A atividade <strong>Um Dia Ideal</strong> tem como objetivo favorecer a <em>projeção de futuro</em> e a reflexão sobre como você imagina sua vida pessoal e profissional em um cenário de realização e bem-estar. Por meio de um exercício de imaginação guiada, você é convidado(a) a se visualizar em uma fase futura da vida, já inserido(a) em uma profissão e com maior autonomia, descrevendo de forma livre e detalhada um dia comum em que se sente feliz e realizado(a).</p>
              <p>Essa atividade permite acessar <strong>expectativas, desejos, valores e necessidades</strong> que nem sempre aparecem de forma objetiva em questionários diretos.</p>

              <h3>Instruções</h3>
              <div class="atv-destaque">
                <p>Feche os olhos por um momento e imagine que você está com <strong>cerca de 25 anos</strong>. Você já escolheu uma profissão, tem uma rotina mais independente e acorda em uma quarta-feira comum, em uma fase da sua vida em que se sente <strong>feliz e realizado(a)</strong>.</p>
                <p>Agora escreva um texto (baseando-se nas perguntas abaixo), com liberdade para imaginar todos os detalhes. <em>Não se preocupe se parecer fantasia.</em></p>
              </div>

              <h3>Perguntas para guiar a escrita</h3>
              <ul>
                <li>Como é o lugar onde você acorda? Com quem você mora?</li>
                <li>Qual é a sua profissão? O que você faz no trabalho?</li>
                <li>Como é o ambiente onde você trabalha? (escritório, campo, laboratório, escola, casa, rua...)</li>
                <li>Com quem você trabalha? Como são essas relações?</li>
                <li>O que você sente ao realizar o seu trabalho?</li>
                <li>Qual o impacto do seu trabalho na vida de outras pessoas ou da sociedade?</li>
                <li>Como você ocupa o tempo fora do trabalho?</li>
                <li>O que torna esse dia ideal para você?</li>
              </ul>

              <div class="atv-bloco">
                <strong>Escreva seu Dia Ideal abaixo:</strong>
                <p><em>(Use folha à parte ou anote aqui suas reflexões)</em></p>
              </div>
            `
          },
          {
            id: 'criterios-escolha',
            titulo: 'Meus Critérios para Escolhas Profissionais',
            subtitulo: 'Identificação e hierarquização de valores',
            icone: '⚖️',
            conteudo: `
              <h3>Objetivo</h3>
              <p>A atividade <strong>Meus Critérios para Escolhas Profissionais</strong> tem como objetivo auxiliá-lo(a) a <em>identificar, organizar e hierarquizar</em> os aspectos que considera mais relevantes ao pensar sobre sua escolha profissional. A proposta é favorecer a reflexão consciente sobre o que se busca em uma profissão, considerando não apenas interesses pontuais, mas também valores, necessidades, estilo de vida e expectativas em relação ao trabalho.</p>

              <h3>Instruções</h3>
              <ol>
                <li>Acesse o link enviado para o seu e-mail: <strong>Jogo de Critérios para Escolhas Profissionais</strong>.</li>
                <li>Siga o passo a passo das instruções.</li>
                <li>Ao longo da atividade, selecione todos os elementos que você gostaria de encontrar em seu trabalho futuro.</li>
              </ol>

              <div class="atv-destaque">
                <p>💡 <strong>Não pense apenas em uma profissão específica.</strong> Reflita sobre:</p>
                <ul>
                  <li>O que é importante para você em um <strong>ambiente de trabalho</strong></li>
                  <li>Nos <strong>assuntos</strong> que gostaria de lidar</li>
                  <li>Nas <strong>atividades</strong> que deseja realizar</li>
                  <li>Na <strong>rotina</strong> que deseja ter</li>
                  <li>Nos <strong>frutos</strong> que deseja colher ao executar o seu trabalho</li>
                </ul>
              </div>

              <h3>Finalização</h3>
              <p>Após concluir a seleção:</p>
              <ol>
                <li><strong>Classifique os critérios em ordem de importância</strong>, do mais importante para o menos importante.</li>
                <li><strong>Mapeie as profissões</strong> que combinem com seus critérios.</li>
              </ol>
            `
          },
          {
            id: 'comando-ia-caminhos',
            titulo: 'Comando de IA para Mapear Caminhos Profissionais',
            subtitulo: 'Mapeamento de profissões por habilidades e interesses',
            icone: '🤖',
            conteudo: `
              <h3>Como usar</h3>
              <p>Copie o comando abaixo e cole em uma ferramenta de IA (ChatGPT, Gemini, Claude etc.). Em seguida, adicione as habilidades e interesses mapeados com o(a) cliente durante o processo de orientação profissional.</p>

              <div class="atv-destaque">
                <p>💡 <strong>Dica:</strong> Use esse comando após a atividade <em>Habilidades e Interesses – Lista de Verbos</em> para aproveitar os dados já mapeados.</p>
              </div>

              <h3>Comando</h3>
              <blockquote style="white-space:pre-wrap;font-family:inherit;font-size:13px;line-height:1.7;background:#f8f4ff;border-left:4px solid #a07cc0;padding:16px 18px;border-radius:0 8px 8px 0;color:#3a2a50">Você é um especialista em orientação profissional, carreira e mercado de trabalho, com experiência em ajudar jovens na primeira escolha profissional.
Vou fornecer abaixo as habilidades e os interesses mapeados durante um processo de orientação profissional.
Sua tarefa é identificar quais profissões de nível superior que apresentam maior compatibilidade com esse perfil.
Considere principalmente:
as habilidades que a pessoa deseja utilizar diariamente no trabalho;
os interesses que ela gostaria de manter presentes ao longo da carreira;
a forma como ela imagina aplicar essas habilidades e interesses em um trabalho futuro;
o mercado de trabalho atual;
diferentes possibilidades de atuação dentro de cada profissão.
Importante:
Sugira apenas profissões cuja formação principal seja uma graduação.
Não sugira cargos, especializações, pós-graduações ou funções específicas (por exemplo: Product Manager, UX Research, Customer Success, Trader, Growth Marketing etc.). Priorize profissões que possam ser escolhidas como primeira formação universitária.
Considere tanto profissões tradicionais quanto áreas mais recentes
Sempre que uma mesma graduação permitir diferentes áreas de atuação que combinem com o perfil, explique essas possibilidades.
Para cada profissão sugerida, informe:
Nome da graduação.
Por que essa profissão combina com o perfil apresentado.
Quais habilidades e interesses do perfil seriam utilizados nessa profissão.
Em quais ambientes essa pessoa poderia trabalhar.
Quais são as principais áreas de atuação dessa graduação.
O que provavelmente mais atrairia essa pessoa nessa profissão.
Nível de compatibilidade com o perfil (0 a 10), justificando a nota.</blockquote>
            `
          }
        ]
      },
      {
        id: 'mapeando-profissoes',
        nome: 'Mapeando as Profissões',
        icone: '🗺️',
        atividades: [
          {
            id: 'lista-profissoes',
            titulo: 'Lista de Profissões',
            subtitulo: 'Marque as profissões que te atraem',
            icone: '📋',
            conteudo: `<style>
.mp-cl{background:#fff3e0;color:#e65100;padding:1px 7px;border-radius:10px;font-size:11px;font-weight:700;display:inline-block;margin:1px;white-space:nowrap}
.mp-ct{background:#e3f2fd;color:#0d47a1;padding:1px 7px;border-radius:10px;font-size:11px;font-weight:700;display:inline-block;margin:1px;white-space:nowrap}
.mp-g{background:#f3e5f5;color:#4a148c;padding:1px 7px;border-radius:10px;font-size:11px;font-weight:700;display:inline-block;margin:1px;white-space:nowrap}
.mp-pg{background:#fce4ec;color:#b71c1c;padding:1px 7px;border-radius:10px;font-size:11px;font-weight:700;display:inline-block;margin:1px;white-space:nowrap}
.mp-sf{background:#e8f5e9;color:#1b5e20;padding:1px 7px;border-radius:10px;font-size:11px;font-weight:700;display:inline-block;margin:1px;white-space:nowrap}
#mp-tbl tr[data-mp]:hover td{background:#faf5ff}
</style>
<h3>📋 Lista de Profissões</h3>
<p style="font-size:13px;color:#666;margin:4px 0 14px">Explore mais de 380 profissões com tipo de formação. Marque as que te atraem e use a busca para filtrar.</p>
<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap">
  <input type="search" id="mp-busca" placeholder="🔍 Buscar profissão…" style="flex:1;min-width:200px;padding:8px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:14px"
    oninput="(function(v){var r=document.querySelectorAll('#mp-tbl [data-mp]'),c=0;r.forEach(function(x){var ok=x.dataset.mp.includes(v);x.style.display=ok?'':'none';if(ok)c++});var el=document.getElementById('mp-cnt');if(el)el.textContent=c+' profissões'})(this.value.toLowerCase())">
  <button onclick="document.getElementById('mp-busca').value='';document.querySelectorAll('#mp-tbl [data-mp]').forEach(function(r){r.style.display=''});var el=document.getElementById('mp-cnt');if(el)el.textContent='385 profissões'" style="padding:8px 14px;border:1.5px solid #ddd;border-radius:8px;background:#fff;cursor:pointer;font-size:13px">✕ Limpar</button>
</div>
<div id="mp-cnt" style="font-size:12px;color:#888;margin-bottom:8px">385 profissões</div>
<div style="overflow-y:auto;max-height:520px;border:1px solid #e0e0e0;border-radius:8px">
<table id="mp-tbl" style="width:100%;border-collapse:collapse">
<thead><tr style="background:#f8f0ff;position:sticky;top:0;z-index:1">
<th style="width:36px;padding:8px 4px;text-align:center;border-bottom:2px solid #e0d0ff;font-size:12px">☑</th>
<th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e0d0ff;font-size:12px">Profissão</th>
<th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e0d0ff;font-size:12px">Formação</th>
</tr></thead>
<tbody>
<tr data-mp="adestramento de animais"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Adestramento de animais</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span></td></tr>
<tr data-mp="administração"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Administração</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="administração pública"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Administração pública</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="aeronauta"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Aeronauta</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span></td></tr>
<tr data-mp="agenciamento de viagem"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Agenciamento de viagem</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="agente comunitário de saúde"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Agente comunitário de saúde</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span></td></tr>
<tr data-mp="agricultura"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Agricultura</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="agricultura familiar e sustentabilidade"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Agricultura familiar e sustentabilidade</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="agrimensura"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Agrimensura</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="agroecologia"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Agroecologia</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="agroindústria"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Agroindústria</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="agronegócio"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Agronegócio</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="agronomia"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Agronomia</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="agropecuária"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Agropecuária</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="alimentação escolar"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Alimentação escolar</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span></td></tr>
<tr data-mp="alimentos"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Alimentos</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="análise de big data"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Análise de big data</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="análise de e-commerce"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Análise de e-commerce</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="análise de testes de softwares"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Análise de testes de softwares</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="análise e desenvolvimento de sistemas"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Análise e desenvolvimento de sistemas</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="análise e produção de açúcar e álcool"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Análise e produção de açúcar e álcool</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="análises clínicas"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Análises clínicas</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="análises químicas"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Análises químicas</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="animação"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Animação</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="animação de festa e evento"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Animação de festa e evento</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="antropologia"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Antropologia</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="apicultura"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Apicultura</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="apresentador de tv"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Apresentador de TV</td><td style="padding:6px 8px"><span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="aquicultura"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Aquicultura</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="árbitro de futebol"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Árbitro de futebol</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span></td></tr>
<tr data-mp="arqueologia e conservação de arte rupestre"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Arqueologia e conservação de arte rupestre</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="arquitetura"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Arquitetura e Urbanismo</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="arquitetura de redes"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Arquitetura de redes</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="arquivista arquivologia"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Arquivologia</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="arte circense"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Arte circense</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="arte história crítica e curadoria"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Arte: história, crítica e curadoria</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="artes cênicas teatro"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Artes cênicas / Teatro</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="artes do corpo"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Artes do corpo</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="artes plásticas visuais"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Artes plásticas / Artes visuais</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="artesanato"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Artesanato</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="assessoria de investimentos"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Assessoria de investimentos</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="assessoria empresarial"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Assessoria empresarial</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="assistente financeiro"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Assistente financeiro</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="astrologia"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Astrologia</td><td style="padding:6px 8px"><span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="astronauta astronomia"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Astronauta / Astronomia</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="atleta esporte"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Atleta / Esporte</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="atuário ciências atuariais"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Atuário / Ciências atuariais</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="audiovisual cinema e audiovisual produção audiovisual"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Audiovisual / Cinema e audiovisual</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="automação industrial predial"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Automação industrial / predial</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="auxiliar administrativo"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Auxiliar administrativo</td><td style="padding:6px 8px"><span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="babá cuidador"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Babá</td><td style="padding:6px 8px"><span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="bailarino dança"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Bailarino / Dança</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="banco de dados"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Banco de dados</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="barbeiro cabelereiro"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Barbeiro / Cabelereiro</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span></td></tr>
<tr data-mp="biblioteconomia"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Biblioteconomia</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="biocombustíveis bioenergia"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Biocombustíveis / Bioenergia</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="biodiversidade e florestas silvicultura florestas"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Biodiversidade e florestas / Silvicultura</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="biofísica bioquímica biossistemas biotecnologia biologia ciências biológicas biomedicina"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Biologia / Biofísica / Bioquímica / Biomedicina</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="biotecnologia microbiologia e imunologia"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Biotecnologia / Microbiologia e imunologia</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="bombeiro"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Bombeiro</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="business intelligence inteligência de negócios"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Business intelligence (Inteligência de negócios)</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="cafeicultura"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Cafeicultura</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="canto música"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Canto</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="carpintaria marcenaria móveis"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Carpintaria / Marcenaria</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="carreira militar exército marinha aeronáutica polícia"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Carreira militar (Exército / Marinha / Aeronáutica / Polícia)</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="cartunista ilustrador"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Cartunista / Ilustrador</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="celulose e papel papel e celulose"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Celulose e papel</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="cenógrafo cenotécnico contra-regra"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Cenografia / Cenotécnico</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="cerâmica"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Cerâmica</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="cervejaria"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Cervejaria</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="cibersegurança segurança da informação"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Cibersegurança / Segurança da informação</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="ciência de dados data science"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Ciência de dados</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="ciências agrárias"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Ciências agrárias</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="ciências ambientais gestão ambiental meio ambiente"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Ciências ambientais / Gestão ambiental</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="ciências biológicas biologia"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Ciências biológicas / Biologia</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="ciências contábeis contabilidade"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Ciências contábeis / Contabilidade</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="ciências da computação"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Ciências da computação</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="ciências econômicas economia"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Ciências econômicas / Economia</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="ciências humanas humanidades"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Ciências humanas / Humanidades</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="ciências políticas sociologia ciências sociais"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Ciências políticas / Sociologia / Ciências sociais</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="cinema animação cinegrafista"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Cinema / Cinema e animação / Cinegrafista</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="comércio"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Comércio</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="comércio exterior"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Comércio exterior</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="comissário de bordo aeronauta"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Comissário de bordo</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span></td></tr>
<tr data-mp="comunicação em mídias digitais social media marketing digital"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Comunicação em mídias digitais / Social media</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="comunicação institucional organizacional"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Comunicação institucional / organizacional</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="comunicação visual design gráfico"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Comunicação visual / Design gráfico</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="confeitaria panificação cozinha gastronomia"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Confeitaria / Panificação</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span></td></tr>
<tr data-mp="conservação e restauro história da arte curadoria"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Conservação e restauro / História da arte</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="construção civil edificações"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Construção civil / Edificações</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="construção naval"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Construção naval</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="consultoria de imagem personal stylist imagem pessoal"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Consultoria de imagem / Personal stylist</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="consultoria de negócios"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Consultoria de negócios</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="controladoria e finanças"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Controladoria e finanças</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="controle ambiental"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Controle ambiental</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="controle de tráfego aéreo aviação"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Controle de tráfego aéreo</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="cooperativismo"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Cooperativismo</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="coreografia dança"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Coreografia</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="corretor imobiliário negócios imobiliários"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Corretor imobiliário / Negócios imobiliários</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="corretor de seguros"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Corretor de seguros</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="cosmetologia estética"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Cosmetologia / Estética e cosmetologia</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="costura moda vestuário modelagem"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Costura / Modelagem do vestuário</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="cozinha gastronomia chef"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Cozinha / Gastronomia</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="cuidador de animais veterinária adestramento"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Cuidador de animais</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span></td></tr>
<tr data-mp="defesa e gestão estratégica internacional diplomacia relações internacionais"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Defesa e gestão estratégica / Diplomacia / Relações internacionais</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="depilação estética"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Depilação</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span></td></tr>
<tr data-mp="desenho industrial design de produto"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Desenho industrial / Design de produto</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="desenvolvimento de games jogos digitais mobile aplicativos"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Desenvolvimento de games / Mobile / Aplicativos</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="design"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Design</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="design de animação"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Design de animação</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="design de games jogos"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Design de games</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="design de interface ui ux"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Design de interface (UI/UX)</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="design de interiores design de móveis"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Design de interiores / Design de móveis</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="design de joias acessórios gemologia joalheria"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Design de joias / Gemologia / Joalheria</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="design de moda calçados embalagens"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Design de moda / calçados / embalagens</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="design digital educacional aprendizagem"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Design digital / educacional</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="detetive particular investigação"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Detetive particular</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="digital manager gerente digital marketing"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Digital manager (gerente digital)</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="direito"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Direito</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="direção de cinema teatro"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Direção de cinema / Direção de teatro</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="dj música entretenimento"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">DJ</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="doula obstetrícia"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Doula</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span></td></tr>
<tr data-mp="dublagem dublê ator atriz"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Dublagem / Dublê</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="ecologia ciências ambientais natureza"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Ecologia</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="economia doméstica ambiental ecológica"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Economia (ambiental / doméstica / ecológica)</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="editor de vídeo produção audiovisual"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Editor de vídeo</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="editoração gráfica impressão"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Editoração gráfica</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="educação artística educação física pedagogia professor"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Educação artística / Educação física</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="educação do campo intercultural especial"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Educação do campo / intercultural / especial</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="educomunicação comunicação educação"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Educomunicação</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="eletricista eletroeletrônica eletromecânica eletrotécnica"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Eletricista / Eletroeletrônica / Eletrotécnica</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="empreendedor empreendedorismo negócios"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Empreendedorismo</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="energia sustentabilidade energias renováveis"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Energia e sustentabilidade / Energias renováveis</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="enfermagem"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Enfermagem</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="engenharia acústica"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Engenharia acústica</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="engenharia aeroespacial aeronáutica"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Engenharia aeroespacial / aeronáutica</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="engenharia agrícola agroindustrial agronômica"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Engenharia agrícola / agroindustrial / agronômica</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="engenharia ambiental sanitária"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Engenharia ambiental e sanitária</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="engenharia biomédica"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Engenharia biomédica</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="engenharia bioquímica bioprocessos biotecnologia biossistemas"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Engenharia bioquímica / bioprocessos / biotecnologia</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="engenharia cartográfica geodésia agrimensura"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Engenharia cartográfica / Geodésia e cartografia</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="engenharia civil"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Engenharia civil</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="engenharia computação ciências da computação"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Engenharia de computação</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="engenharia de controle automação industrial"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Engenharia de controle e automação</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="engenharia de energia"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Engenharia de energia</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="engenharia de inovação sistemas software hardware"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Engenharia de inovação / software / sistemas</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="engenharia de materiais manufatura"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Engenharia de materiais e manufatura</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="engenharia de minas mineração"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Engenharia de minas / Mineração</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="engenharia de pesca aquicultura"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Engenharia de pesca / Aquicultura</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="engenharia de petróleo gás"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Engenharia de petróleo e gás</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="engenharia de produção"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Engenharia de produção</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="engenharia de robôs robótica inteligência artificial ia"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Engenharia de robôs / Robótica e IA</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="engenharia de segurança do trabalho"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Engenharia de segurança do trabalho</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="engenharia de telecomunicações redes"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Engenharia de telecomunicações</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="engenharia de transportes mobilidade"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Engenharia de transportes e mobilidade</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="engenharia elétrica eletrônica"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Engenharia elétrica / eletrônica</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="engenharia ferroviária metroviária transporte"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Engenharia ferroviária e metroviária</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="engenharia física nuclear"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Engenharia física / nuclear</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="engenharia florestal florestas"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Engenharia florestal</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="engenharia hídrica naval portuária"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Engenharia hídrica / naval / portuária</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="engenharia mecânica mecatrônica automação"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Engenharia mecânica / mecatrônica</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="engenharia metalúrgica química têxtil urbana"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Engenharia metalúrgica / química / têxtil / urbana</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="escrita criativa escritor roteirista produtor de conteúdo"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Escrita criativa / Escritor / Roteirista</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="especialista em seo marketing digital"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Especialista em SEO / Marketing digital</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="estatística"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Estatística</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="estudos de gênero diversidade"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Estudos de gênero e diversidade</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="estudos de mídia comunicação"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Estudos de mídia / Comunicação</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="estudos literários letras crítico literário"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Estudos literários / Letras</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="eventos organização"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Eventos / Organização de eventos</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="fabricação mecânica mecânica de precisão"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Fabricação mecânica / Mecânica de precisão</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="farmácia"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Farmácia</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="filosofia"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Filosofia</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="finanças gestão financeira controladoria"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Finanças / Gestão financeira</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="física matemática exatas"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Física / Matemática / Ciências exatas</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="fisioterapia terapia ocupacional reabilitação"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Fisioterapia / Terapia ocupacional</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="fonoaudiologia"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Fonoaudiologia</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="fotografia"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Fotografia</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="fruticultura horticultura agricultura"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Fruticultura / Horticultura</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="gastronomia cozinha culinária chef"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Gastronomia</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="geodésia geofísica geologia geociências"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Geodésia / Geofísica / Geologia</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="geografia geoprocessamento"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Geografia / Geoprocessamento</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="gerontologia geriatria saúde do idoso"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Gerontologia</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="gestão comercial vendas marketing"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Gestão comercial / Marketing e vendas</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="gestão da informação dados"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Gestão da informação / Sistemas de informação</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="gestão da produção qualidade industrial"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Gestão da produção / Qualidade</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="gestão da tecnologia da informação ti"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Gestão da tecnologia da informação (TI)</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="gestão de agronegócios empresa rural cooperativas"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Gestão de agronegócios / empresa rural / cooperativas</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="gestão de empreendedorismo inovação negócios"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Gestão de empreendedorismo e inovação</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="gestão de pequenos negócios empresarial"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Gestão empresarial / Pequenos negócios</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="gestão de políticas públicas administração pública governo"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Gestão de políticas públicas</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="gestão de recursos humanos rh"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Gestão de recursos humanos (RH)</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="gestão de saúde coletiva pública hospitalar"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Gestão em saúde (coletiva / pública / hospitalar)</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="gestão de segurança do trabalho pública privada"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Gestão de segurança (do trabalho / pública / privada)</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="gestão de seguros previdenciária finanças"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Gestão de seguros e previdenciária</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="gestão de telecomunicações telecomunicações"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Gestão de telecomunicações</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="gestão de turismo lazer desportiva"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Gestão de turismo / lazer / desportiva</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="gestão de varejo comércio"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Gestão de varejo</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="gestão fiscal tributária contabilidade"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Gestão fiscal e tributária</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="gestão portuária portos"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Gestão portuária</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="gestão pública administração pública governo"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Gestão pública</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="higiene dental saúde bucal odontologia"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Higiene dental / Saúde bucal</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="história"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">História</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="hotelaria hospedagem turismo"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Hotelaria / Hospedagem</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="influencer youtuber podcaster produtor de conteúdo"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Influencer / Youtuber / Podcaster</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="informática tecnologia da informação ti"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Informática / Tecnologia da informação (TI)</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="investigação forense perícia criminal judicial"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Investigação forense / Perícia criminal / judicial</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="jardinagem paisagismo"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Jardinagem / Paisagismo</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="jogador de futebol atleta esporte"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Jogador de futebol / Atleta profissional</td><td style="padding:6px 8px"><span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="jogador profissional de games e-sports"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Jogador profissional de games (e-sports)</td><td style="padding:6px 8px"><span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="jornalismo rádio tv imprensa"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Jornalismo / Rádio e TV</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="laticínios alimentos produção de bebidas"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Laticínios / Produção de bebidas / Cervejaria</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="lazer turismo recreação"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Lazer e turismo</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="libras língua de sinais intérprete"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Libras / Intérprete de LIBRAS</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="línguas estrangeiras tradução interpretação"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Línguas estrangeiras / Tradução e interpretação</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="linguística"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Linguística</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="logística cadeia de suprimentos"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Logística / Cadeia de suprimentos</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="manutenção aeronáutica aviação"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Manutenção aeronáutica</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="manutenção automotiva mecânica"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Manutenção automotiva / Mecânica</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="manutenção industrial eletromecânica"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Manutenção industrial / Eletromecânica</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="maquiagem beleza estética"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Maquiagem</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span></td></tr>
<tr data-mp="massoterapia fisioterapia terapia"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Massoterapia</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span></td></tr>
<tr data-mp="mecatrônica mecânica industrial automação"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Mecatrônica / Mecânica industrial</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="medicina"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Medicina</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="medicina veterinária zootecnia animais"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Medicina veterinária / Zootecnia</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="metalurgia metalúrgica soldagem"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Metalurgia / Soldagem</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="meteorologia oceanografia ciências atmosféricas"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Meteorologia / Oceanografia</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="moda design de moda fashion"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Moda / Negócios e gestão de moda</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="motorista motoboy entregador transporte"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Motorista / Motoboy / Entregador</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="museologia patrimônio cultural"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Museologia</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="música musicoterapia composição regência"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Música / Musicoterapia / Composição musical</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="nanotecnologia biotecnologia"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Nanotecnologia</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="naturologia terapias integrativas alternativas"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Naturologia / Terapias integrativas</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="nutrição dietética nutricionista"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Nutrição e dietética</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="obstetrícia enfermagem maternidade"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Obstetrícia</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="odontologia dentista"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Odontologia</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="óptica optometria oftalmologia"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Óptica / Optometria / Tecnologia oftálmica</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="orientação profissional educacional psicologia"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Orientação profissional / educacional</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="papel celulose indústria gráfica"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Papel e celulose / Processos gráficos</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="pecuária agropecuária fazendeiro vaqueiro"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Pecuária / Agropecuária</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="pedagogia professor educação"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Pedagogia / Formação de professores</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="personal organizer organização"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Personal organizer</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="pesca aquicultura pescador"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Pesca / Aquicultura</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="pesquisa ciência pós-graduação"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Pesquisa científica</td><td style="padding:6px 8px"><span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="pilotagem profissional de aeronaves aviação piloto"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Pilotagem profissional de aeronaves</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="podologia manicure pedicure"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Podologia / Manicure</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span></td></tr>
<tr data-mp="poeta escritor literatura"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Poeta / Escritor</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="policial segurança pública investigação"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Policial / Segurança pública</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="processos gerenciais gestão processos"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Processos gerenciais</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="processos químicos metalúrgicos industriais"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Processos químicos / metalúrgicos / industriais</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="produção agropecuária agrícola rural"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Produção agropecuária</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="produção cultural editorial fonográfica musical"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Produção cultural / editorial / fonográfica</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="produção multimídia digital conteúdo"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Produção multimídia / conteúdo digital</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="produção publicitária publicidade propaganda"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Produção publicitária / Publicidade e propaganda</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="produção têxtil calçados moda vestuário"><td style="text-align:center;padding:6px 4pd">☐</td><td style="padding:6px 12px;font-size:13px">Produção têxtil / calçados</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="professor ensino educação"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Professor / Docência</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="programação desenvolvimento web software"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Programação / Desenvolvimento de software / Web</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="psicologia psicoterapia saúde mental"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Psicologia</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="psicopedagogia psicomotricidade"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Psicopedagogia / Psicomotricidade</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="qa quality assurance teste de software qualidade"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">QA (Quality assurance) / Testes de software</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="química química ambiental forense industrial"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Química (ambiental / forense / industrial)</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="quiropraxia fisioterapia coluna"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Quiropraxia</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="radiologia imagem saúde diagnóstico"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Radiologia / Diagnóstico por imagem</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="redes de computadores telecomunicações internet"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Redes de computadores / Telecomunicações</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="relações públicas comunicação"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Relações públicas</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="representante comercial vendas"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Representante comercial / Vendas</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="recursos humanos gestão de pessoas rh"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Recursos humanos / Gestão de pessoas</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="saneamento ambiental controle ambiental"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Saneamento e controle ambiental</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="saúde coletiva pública serviço social"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Saúde coletiva / pública / Serviço social</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="secretariado executivo assistente administrativo"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Secretariado / Secretariado executivo</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="segurança do trabalho saúde ocupacional"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Segurança do trabalho</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="serviços judiciários notoriais cartório direito"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Serviços judiciários e notoriais</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="sistemas de informação computação internet"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Sistemas de informação / Computação / Internet</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="sommelier enologia vitivinicultura gastronomia bebidas"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Sommelier / Enologia / Viticultura</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="storyteller criador de histórias escritor narrativa"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Storyteller (criador de histórias)</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="tatuagem body art"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Tatuagem</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="tecnologia industrial manufatura"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Tecnologia industrial / Manufatura</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="teologia filosofia religião"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Teologia</td><td style="padding:6px 8px"><span class="mp-g">Graduação</span></td></tr>
<tr data-mp="têxtil moda produção têxtil"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Têxtil e moda</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="transporte logística rodoviário ferroviário aquaviário"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Transporte (rodoviário / ferroviário / aquaviário)</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span></td></tr>
<tr data-mp="treinador esportivo educação física"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Treinador esportivo</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span> <span class="mp-pg">Pós-grad.</span></td></tr>
<tr data-mp="turismo guia turístico receptivo"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Turismo / Guia turístico</td><td style="padding:6px 8px"><span class="mp-ct">Técnico</span> <span class="mp-g">Graduação</span> <span class="mp-sf">Sem req.</span></td></tr>
<tr data-mp="web design desenvolvimento front-end"><td style="text-align:center;padding:6px 4px">☐</td><td style="padding:6px 12px;font-size:13px">Web design / Desenvolvimento front-end</td><td style="padding:6px 8px"><span class="mp-cl">Livre</span> <span class="mp-g">Graduação</span></td></tr>
</tbody></table></div>
<p style="font-size:11px;color:#aaa;margin-top:10px;text-align:right">Fontes: PNLD Profissões · Guia do Estudante · SENAI · MEC</p>`
          }
        ]
      }
    ]
  },
  {
    id: 'oc-adulto',
    titulo: 'Orientação de Carreira',
    subtitulo: 'Adulto',
    icone: '💼',
    cor: 'bib-oc',
    pastas: []
  }
];
