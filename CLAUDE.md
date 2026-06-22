# Projeto Consultório Psi. Elissa Catarina Lorenzi

Portal de gestão de consultório de psicologia com página pública de agendamento.

## Stack

- **Runtime:** Node.js v24 + Express
- **Banco:** SQLite via `node:sqlite` (nativo, sem ORM)
- **Frontend:** Vanilla JS + HTML + CSS (SPA — sem framework)
- **Deploy:** Railway — auto-deploy via `git push` (~90s para subir)
- **Repositório:** `https://github.com/elissalorenzi-crypto/Lorenzi.git`
- **URL produção:** `https://lorenzi-production.up.railway.app`

## Estrutura de arquivos

```
server.js              → API Express (todas as rotas /api/*)
src/db.js              → Todas as queries SQLite (schema + CRUD)
public/
  index.html           → Admin SPA (portal da psicóloga)
  css/style.css        → Estilos globais
  js/app.js            → Lógica principal do admin
  js/biblioteca.js     → Dados das atividades da biblioteca
  agenda-cliente/
    index.html         → Página pública de agendamento (clientes)
  uploads/contratos/   → PDFs dos contratos assinados
```

## Banco de dados (SQLite)

Arquivo: `psicologa.db` (Railway usa `DATABASE_PATH` env var)

### Tabelas principais

**pacientes**
- `id, nome, apelido, cpf, data_nascimento, sexo, telefone, whatsapp, email`
- `endereco, ocupacao, convenio, num_convenio, responsavel, tel_responsavel`
- `queixa_principal, encaminhamento, valor_sessao, obs`
- `nota_fiscal, forma_pgto, frequencia, freq_pgto, ativo, created_at`

**agendamentos**
- `id, paciente_id, data, hora, duracao, tipo, status`
- `valor, pago, forma_pgto, obs, zoom_link, created_at`

**contratos**
- `id, nome, data_nascimento, cpf, email, celular, endereco`
- `forma_pgto, nome_responsavel, cpf_responsavel, arquivo`
- `valor_sessao, origem, aceite, visto, created_at`

**prontuarios** — anotações clínicas por sessão

**configuracoes** — chave/valor (nome_psicologa, crp, zoom_*, horario_*, etc.)

**links_agendamento** — tokens para a página pública de agenda

### Migrações

Colunas novas são adicionadas via `ALTER TABLE` protegido por `try/catch` no início de `src/db.js`, sem quebrar bancos existentes.

```js
const migrations = [
  "ALTER TABLE pacientes ADD COLUMN apelido TEXT",
  "ALTER TABLE contratos ADD COLUMN valor_sessao REAL DEFAULT 0",
];
for (const m of migrations) {
  try { db.exec(m); } catch(_) {}
}
```

## Admin SPA (`public/index.html` + `public/js/app.js`)

### Seções (navegação lateral)

| Link sidebar | section id | loader |
|---|---|---|
| 🌐 Agenda Cliente | abre `/agenda-cliente/` em nova aba | — |
| 📅 Agenda | `section-agenda` | `loadAgenda()` |
| 📝 Contratos | `section-contratos` | `loadContratos()` |
| 👥 Clientes | `section-pacientes` | `loadPacientes()` |
| 📋 Prontuários | `section-prontuarios` | `loadProntuariosPage()` |
| 📚 Biblioteca | `section-biblioteca` | `bibRenderHome()` |
| 💰 Financeiro | `section-financeiro` | `loadFinanceiro()` |
| ⚙ Configurações | `section-configuracoes` | `loadConfiguracoes()` |

### Grade de Horários (Agenda)

- **Manhã:** 08:00–11:00 a cada **30 min**
- **Tarde:** 14:00–21:00 a cada **60 min** (só horas cheias)
- Entre os blocos: separador "— Intervalo —" + barra repetida de dias da semana
- Domingo: coluna estreita (`width: 40px`)
- Duplo agendamento: mostra só o primeiro + badge `×N` em vermelho
- Clique em célula vazia → `openModalAgendamento(null, data, null, hora)`

Função: `renderAgendaHorario()` em `app.js`

### WhatsApp / Zoom

```js
// Normaliza número para wa.me (remove 55 duplicado, adiciona 9º dígito antigo)
function toWaNum(fone) { ... }

// Formata para exibição: +55 (11) 99999-9999
function exibirFone(fone) { ... }

// Gera URL wa.me com mensagem de lembrete
function zoomWaUrl(nome, link, fone, data, hora, apelido) { ... }
```

Mensagem enviada:
> Bom dia, **[Apelido ou PrimeiroNome]**! Segue lembrete da nossa sessão
> **[dia da semana], [DD] de [mês] às [HH:MM]** e link para acesso:
> [zoom_link]
> Até lá!

### Formulário de Cliente

- **Apelido** fica ao lado do **Nome completo** (proporção 2:1)
- Telefone salvo via `normalizarFone()` → formato `(DDD) NNNNN-NNNN`
- WhatsApp salvo normalizado, exibido com `toWaNum()` nos links

### Biblioteca de Atividades

- Dados em `public/js/biblioteca.js` (`const BIB_CARDS = [...]`)
- Estrutura: Área → Pasta → Atividade (conteúdo HTML)
- `localStorage` persiste cards novos adicionados pelo admin
- Botão "Copiar" usa `ClipboardItem` com `text/html` + `text/plain` para preservar formatação

## Página pública (`public/agenda-cliente/index.html`)

- **Toggle:** Grade (padrão) | Cards
- **Grade:** 08:00–21:00 somente horas cheias, separador de almoço
- **Slots:** verde "Disponível" clicável → modal de agendamento; cinza "🔒 Ocupado"
- **Auto-avanço:** se a semana retornada já passou toda (domingos), avança automaticamente
- API: `GET /api/agenda-publica?semana=YYYY-MM-DD`
- Reserva: `POST /api/agenda-publica/reservar` → redireciona para contrato

## Contratos

- Clicar na linha da tabela expande faixa com:
  - Link para PDF assinado (`/uploads/contratos/[arquivo]`)
  - Campo **Valor da Sessão** + botão Salvar (`PUT /api/contratos/:id`)

## Configurações importantes (painel ⚙)

- `nome_psicologa`, `crp`
- `zoom_account_id`, `zoom_client_id`, `zoom_client_secret`
- `horario_inicio`, `horario_fim`, `duracao_sessao`
- `bloqueio_inicio/fim`, `bloqueio2_inicio/fim` (intervalos bloqueados na agenda pública)

## Padrões de desenvolvimento

- Sempre fazer `git push` após cada mudança — Railway faz deploy automático
- Verificar no site em produção antes de marcar como concluído (~90s após push)
- Nunca usar frameworks JS — apenas Vanilla
- Novas colunas no banco sempre via migration com `try/catch`
- CSS em `public/css/style.css` (variáveis: `--plum`, `--rose`, `--lavender`, `--sage`, `--muted`, `--border`, `--bg`)
- Toasts: `toast('mensagem')` ou `toast('mensagem', 'error')`
- API calls: `api('GET'|'POST'|'PUT'|'DELETE', '/rota', body?)`
- Modais: `openModal(titulo, htmlCorpo, callbackSalvar)`
