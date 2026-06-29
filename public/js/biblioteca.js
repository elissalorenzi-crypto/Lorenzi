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
        atividades: []
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
