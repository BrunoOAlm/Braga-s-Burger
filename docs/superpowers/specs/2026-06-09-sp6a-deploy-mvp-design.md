# SP6a — Deploy MVP: Design Spec

## 1. Contexto

A plataforma está funcionalmente completa após SP5c (cliente, admin, fila de pedidos, CRUDs). SP6 originalmente cobria "Integrações & Deploy" inteiro (HTTPS, secrets vault, IP allowlist, WAF, backup, CI). Para evitar PR gigante (lição do SP5c, 8.000+ linhas), SP6 fica dividido em:

- **SP6a (este doc):** colocar a aplicação no ar com hospedagem gratuita, validada por smoke real em iPhone.
- **SP6b (futuro):** hardening — CI lint+test+typecheck (lição direta do SP5c: 8 erros de lint passaram sem CI), IP allowlist `/admin/**`, Cloudflare na frente, alarmes Neon, runbook.

**Stakeholder:** Bruno (desenvolvedor) entrega para o cliente (hamburgueria Braga's Burger, Higienópolis-RJ). Cliente não tem domínio ainda; vamos com subdomínios gratuitos. Migração para domínio próprio é 5min de DNS depois.

## 2. Decisões (tomadas no brainstorming desta sessão)

| Decisão | Escolha | Motivo |
|---|---|---|
| Frontend | **Vercel free** | Next.js nativo, HTTPS automático, deploy via push. |
| Backend | **Render free** | Spring Boot suportado. Free dorme após 15min sem request — **UptimeRobot** pinga `/health` a cada 5min pra manter acordado. |
| Database | **Neon free** | Postgres gerenciado, sem expiração (Render free Postgres expira em 90 dias). Sleep do compute é sub-segundo, invisível na prática. |
| Domínio | **Subdomínios `.vercel.app` + `.onrender.com`** | Zero custo agora; cliente compra domínio depois. |
| Auth cross-origin | **Next.js rewrites como proxy** | Front chama `/api/*` (relativo), Vercel reencaminha para Render. Cookies viram first-party → funciona em Safari/iPhone. Trade-off: +50-100ms latência por request. |
| SMTP | **Brevo free (300/dia)** | SP4b tem password-reset que depende de email. Brevo aceita cadastro free sem cartão. |
| Keep-alive | **UptimeRobot free** | Plan free permite até 50 monitors a cada 5min. Sem cartão. |
| CI | **Adiado para SP6b** | Não bloqueia deploy. Adicionar como follow-up. |
| IP allowlist `/admin/**` | **Adiado para SP6b** | Cliente ainda é "todos os admins acessam de qualquer lugar". Sem requisito hoje. |

**Rejeitadas:**
- Oracle Always Free: user tentou e o pre-auth de $1 falhou (cartão brasileiro). Crônico.
- Fly.io / Railway: ~$5/mo. Pago.
- Cloud Run + GraalVM: cold start lento sem GraalVM, e GraalVM com Spring Boot 4 ainda exige tuning.

## 3. Arquitetura

```
┌──────────────────────────────────────────────────────────────┐
│ Browser (Safari/Chrome/Firefox no celular do cliente final) │
└────────────────────────────┬─────────────────────────────────┘
                             │ HTTPS
                             ▼
┌──────────────────────────────────────────────────────────────┐
│ bragas-burger.vercel.app  (Vercel CDN edge)                  │
│  - Next.js SSR/static                                        │
│  - next.config.ts:                                           │
│      rewrites: /api/v1/* → BACKEND_URL/api/v1/*              │
└────────────────────────────┬─────────────────────────────────┘
                             │ HTTPS (server-to-server, oculto)
                             ▼
┌──────────────────────────────────────────────────────────────┐
│ bragas-burger-api.onrender.com  (Render free Web Service)    │
│  - Spring Boot 4 + Java 21                                   │
│  - Flyway migra no boot                                      │
│  - Cookies bb_session / bb_admin (httpOnly, Secure, SameSite=None)│
└────────────────────────────┬─────────────────────────────────┘
                             │ TCP 5432 SSL
                             ▼
┌──────────────────────────────────────────────────────────────┐
│ Neon  (Postgres serverless, free tier)                       │
│  - schema gerado pelos V1..V6 do Flyway                      │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ UptimeRobot (free)                                           │
│   GET https://bragas-burger.vercel.app/api/v1/health  5min   │
│   → mantém Render acordado + monitora saúde                  │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Brevo (SMTP free, 300 emails/dia)                            │
│   ← backend chama via Spring Mail para password-reset        │
└──────────────────────────────────────────────────────────────┘
```

**Fluxo de request autenticado (cliente final, ex.: POST /api/v1/orders):**

1. Browser → `https://bragas-burger.vercel.app/api/v1/orders` (Set-Cookie `bb_session` será first-party para `vercel.app`)
2. Vercel edge intercepta via rewrite → `https://bragas-burger-api.onrender.com/api/v1/orders` (server-to-server, browser não vê)
3. Render → Neon (consulta/insert)
4. Resposta segue caminho inverso. Cookie no `Set-Cookie` da resposta é gravado pelo browser como first-party de `vercel.app`.

**Por que isso resolve o problema de Safari/iPhone:**
Browser nunca enxerga `onrender.com`. Do ponto de vista dele, toda comunicação é com `vercel.app` (mesma origem da página). Cookies `bb_session` e `bb_admin` ficam classificados como first-party → ITP (Safari) e ETP (Firefox) não bloqueiam.

## 4. Mudanças no código

### Backend (`backend/`)

#### `application-prod.yml`
Já existe e lê `DB_URL`/`DB_USER`/`DB_PASSWORD`. Adicionar:
- `app.cors.allowedOrigins` lendo de env `CORS_ALLOWED_ORIGINS` (CSV). Mesmo com proxy via Vercel, deixamos CORS configurável para flexibilidade (debugging local, futuro Postman).
- `spring.mail.*` lendo de envs `MAIL_*` (Brevo).
- `server.port: ${PORT:8080}` — Render injeta `$PORT` em runtime.

#### `Dockerfile` (criar na raiz do backend)
Render auto-detecta Gradle, mas Dockerfile dá controle determinístico do JDK e tamanho da imagem (importante no free tier 512MB RAM). Multi-stage:
- Stage 1: `gradle:8.10-jdk21` builda o jar
- Stage 2: `eclipse-temurin:21-jre-alpine` roda o jar
- Expõe `$PORT`, default 8080
- `CMD ["java", "-jar", "-Xmx400m", "app.jar"]` (deixa folga pra Render free)

#### `.dockerignore`
Excluir `build/`, `.gradle/`, `*.md`, `src/test/`.

#### `AppProperties.Cors` / `SecurityConfig.corsSource()`
Já lê de `app.cors.allowedOrigins`. Validar que vazio/null não quebra (precisa permitir vazio em prod com proxy). Se já trata, sem mudança.

### Frontend (raiz do repo)

#### `next.config.ts`
```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    const backend = process.env.BACKEND_URL;
    if (!backend) return [];
    return [{ source: '/api/v1/:path*', destination: `${backend}/api/v1/:path*` }];
  },
};

export default nextConfig;
```
`BACKEND_URL` é env server-side (sem `NEXT_PUBLIC_`). Em dev local, ausente → rewrites vazio → frontend bate direto em localhost via `NEXT_PUBLIC_API_URL`. Em Vercel, setamos `BACKEND_URL=https://bragas-burger-api.onrender.com`.

#### `lib/api-client.ts:16` e `lib/admin-api.ts:7`
Atual:
```ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';
```
Novo: o default em prod deve ser relativo (`/api/v1`), para usar o rewrite. Mas em dev local sem rewrite, precisamos do absoluto. Solução: ler `NEXT_PUBLIC_API_URL` apenas em dev; em prod sempre relativo.

```ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';
```
Em dev local com backend rodando, setar `NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1` no `.env.local`. Em prod (Vercel), não setar — usa default relativo + rewrite redireciona.

### Configuração externa (não-código)

#### Neon
1. Criar projeto `bragas-burger-prod` (região: AWS us-east-1 ou sa-east-1 — depende do Render)
2. Copiar connection string (pooled, com SSL)

#### Brevo
1. Criar conta free
2. Criar SMTP user, copiar host/port/user/key

#### Render
1. Criar Web Service apontando para `master` do GitHub
2. Setar **15** env vars (lista completa em §5)
3. Region: Frankfurt ou Oregon (mais próximo do Neon)

#### Vercel
1. Importar repo do GitHub
2. Root directory: `.` (default)
3. Setar 2 env vars:
   - `BACKEND_URL=https://bragas-burger-api.onrender.com`
   - (nenhum `NEXT_PUBLIC_*` necessário — default relativo)

#### UptimeRobot
1. Criar conta free
2. Monitor HTTP(s) GET `https://bragas-burger.vercel.app/api/v1/health` a cada 5 min
3. Alerta por email se 2 checks consecutivos falharem

## 5. Env vars (lista completa para Render)

Backend:
| Nome | Valor / Origem | Notas |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` | seleciona application-prod.yml |
| `PORT` | injetado pelo Render | Spring bind via `server.port: ${PORT:8080}` |
| `DB_URL` | `jdbc:postgresql://<host>/<db>?sslmode=require` | Neon |
| `DB_USER` | `<neon user>` | Neon |
| `DB_PASSWORD` | `<neon password>` | Neon, **secret** |
| `JWT_SECRET` | gerar com `openssl rand -base64 64` | **secret**, 64+ bytes |
| `COOKIE_SECURE` | `true` | obrigatório com HTTPS |
| `COOKIE_SAME_SITE` | `Lax` | rewrites tornam cookies first-party → Lax basta e é mais seguro que None |
| `CORS_ALLOWED_ORIGINS` | `https://bragas-burger.vercel.app` | CSV; vazio em prod estrito também aceitável |
| `ADMIN_BOOTSTRAP_EMAIL` | ex.: `bruno@bragasburger.com` | dispara seed via AdminBootstrap (SP5b.1) |
| `ADMIN_BOOTSTRAP_PASSWORD` | senha forte, ≥ 12 chars | **secret**, fica só em env do Render |
| `ADMIN_BOOTSTRAP_NAME` | `Admin` | display |
| `MAIL_HOST` | `smtp-relay.brevo.com` | Brevo |
| `MAIL_PORT` | `587` | TLS |
| `MAIL_USERNAME` | `<brevo smtp user>` | Brevo |
| `MAIL_PASSWORD` | `<brevo smtp key>` | **secret** |
| `MAIL_AUTH` | `true` | |
| `MAIL_TLS` | `true` | |
| `MAIL_FROM` | `no-reply@bragasburger.com.br` ou similar | precisa estar verificado no Brevo |
| `MAIL_RESET_BASE_URL` | `https://bragas-burger.vercel.app/redefinir-senha` | link no email de reset |
| `RATE_LIMIT_ENABLED` | `true` | default já é true |

Vercel:
| Nome | Valor | Notas |
|---|---|---|
| `BACKEND_URL` | `https://bragas-burger-api.onrender.com` | server-side, usado em `next.config.ts:rewrites()` |

## 6. Smoke test (validação manual após deploy)

Rodar em **2 dispositivos** mínimo: 1 desktop Chrome + **1 iPhone real** (não simulador — ITP do Safari só replica em hardware).

**Fluxo cliente final:**
1. Abrir `https://bragas-burger.vercel.app` → cardápio carrega
2. Adicionar item ao carrinho → checkout
3. Cadastrar nova conta com email real (testar deliverability do Brevo)
4. Confirmar pedido sem WhatsApp → tela de status
5. Recarregar → continua logado, status persiste
6. Logout → cadastro persistido

**Fluxo admin:**
1. Abrir `https://bragas-burger.vercel.app/admin/entrar`
2. Login com `ADMIN_BOOTSTRAP_EMAIL` / senha do env
3. Ver pedido criado no passo cliente
4. Transicionar status RECEIVED → PREPARING → OUT → DELIVERED (validar refetch após transição)
5. CRUD: criar/editar/desativar 1 produto, 1 categoria, 1 cupom
6. Tocar tab Histórico, voltar para Ativos — verificar que toast de novo pedido **não dispara espuriamente** (regressão do SP5c)

**Critérios pra considerar SP6a done:**
- Todos os 11 passos acima passam no iPhone
- UptimeRobot mostra 99%+ uptime após 24h
- Logs do Render sem ERROR no startup
- Email de signup/reset chega na caixa de entrada (não spam)

## 7. Fora de escopo (SP6b ou depois)

- CI workflow (lint+test+typecheck no GitHub Actions)
- IP allowlist em `/admin/**` (firewall de aplicação ou Cloudflare WAF)
- Cloudflare grátis na frente da Vercel
- Alarmes Neon (CPU, conexões)
- Runbook de incidentes
- Domínio próprio do cliente
- Backup automatizado adicional (Neon free já tem 7d PITR)
- Performance Lighthouse do SP1 (item pendente histórico)
- Race condition `triggerReset` `@Async` dentro de `@Transactional` (pendência SP4b, score 75 no review)

## 8. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Render free dorme apesar do UptimeRobot (ToS) | Plan free permite cron-style pings; é prática comum. Se Render mudar política, fallback é Fly.io ~$5/mo. |
| Brevo bloqueia emails da hamburgueria como spam | Configurar SPF/DKIM no Brevo. Para subdomínio `.vercel.app` é limitado; SP6b com domínio próprio resolve definitivo. |
| Neon free sleep causa primeiro request lento | Sub-segundo na prática. UptimeRobot mantém compute warm também. |
| Backend cold start de 30-60s na primeira request após sleep | UptimeRobot a cada 5min mantém warm. Se falhar, cliente vê loading inicial; aceitável. |
| Senha do ADMIN_BOOTSTRAP em env do Render exposta a quem tem acesso ao dashboard | Acesso ao dashboard Render é só do Bruno. Pós-bootstrap, mudar senha via UI admin (SP5b suporta). |
