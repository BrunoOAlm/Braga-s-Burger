# SP6a — Deploy MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Colocar a aplicação no ar gratuitamente — Vercel (front) + Render free (back) + Neon (DB) + Vercel rewrites como proxy + UptimeRobot pra keep-alive — e validar com smoke real em iPhone.

**Architecture:** Vercel hospeda o Next.js e usa rewrites para proxiar `/api/v1/*` ao Render. Browser nunca enxerga `onrender.com`, então cookies `bb_session` / `bb_admin` ficam first-party em `vercel.app` e funcionam em Safari/iPhone. Brevo provê SMTP free para o reset de senha do SP4b. UptimeRobot pinga `/health` a cada 5min pra evitar sleep do Render.

**Tech Stack:** Next.js 16 + React 19 (front), Spring Boot 4 + Java 21 + Flyway + Postgres (back), Vercel + Render + Neon + Brevo + UptimeRobot (infra).

**Spec:** `docs/superpowers/specs/2026-06-09-sp6a-deploy-mvp-design.md`

**Pre-requisitos manuais (você precisa ter):**
- Conta GitHub (já tem)
- Conta Vercel (criar grátis com login GitHub)
- Conta Render (criar grátis com login GitHub)
- Conta Neon (criar grátis com login GitHub)
- Conta Brevo (criar grátis, sem cartão)
- Conta UptimeRobot (criar grátis, sem cartão)
- iPhone real pra smoke (não simulador)

---

### Task 0: Branch + worktree

**Files:** nenhum.

- [ ] **Step 1: Criar e checkar branch**

```bash
git checkout master
git pull
git checkout -b feat/sp6a-deploy-mvp
```

Expected: `Switched to a new branch 'feat/sp6a-deploy-mvp'`

---

### Task 1: Criar projeto no Neon e copiar connection string

**Files:** nenhum (UI externa). Salve as credenciais num gerenciador de senhas — você vai usar em Task 5.

- [ ] **Step 1: Criar projeto Neon**

1. https://console.neon.tech → Login com GitHub
2. New Project:
   - Name: `bragas-burger-prod`
   - Postgres version: latest (16+)
   - Region: **AWS us-east-1** (mais perto do Render Oregon/Ohio)
3. Após criar, em **Connection Details**, escolher:
   - Connection type: **Pooled connection** (importante — Neon free recomenda pooler pra apps Java por causa de connection limits)
   - SSL: enabled (default)

- [ ] **Step 2: Salvar 3 valores**

Copiar e salvar:
- `DB_URL`: pegar o **JDBC URL** mostrado pelo Neon, formato `jdbc:postgresql://ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=require`
- `DB_USER`: o user mostrado (ex.: `neondb_owner`)
- `DB_PASSWORD`: a senha. Neon só mostra **uma vez** — salve agora.

Expected: 3 strings salvas no seu password manager (1Password, Bitwarden, etc).

- [ ] **Step 3: Testar conexão via psql (opcional mas recomendado)**

Se tiver psql instalado localmente:
```bash
psql "postgresql://<user>:<pwd>@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
```
Expected: prompt `neondb=>`. Digite `\q` pra sair.

Se não tiver psql, pula — vamos validar via app no Task 5.

---

### Task 2: Criar conta Brevo e SMTP credentials

**Files:** nenhum (UI externa).

- [ ] **Step 1: Criar conta Brevo**

1. https://www.brevo.com → Sign up free
2. Confirma email
3. Onboarding pergunta o tipo de uso — escolhe "Transactional emails"

- [ ] **Step 2: Criar SMTP key**

1. Menu → **SMTP & API** → aba **SMTP**
2. Anotar: `MAIL_HOST=smtp-relay.brevo.com`, `MAIL_PORT=587`
3. `MAIL_USERNAME` = o login Brevo (geralmente o email)
4. Clicar **Generate a new SMTP key** → copiar a chave gerada como `MAIL_PASSWORD` (única chance de ver)

- [ ] **Step 3: (Opcional, recomendado) Verificar um sender**

Sem domínio próprio, você pode usar o email pessoal como `MAIL_FROM`. Brevo exige verificação:
1. **Senders & IP** → Add sender → email do Bruno
2. Brevo envia link de confirmação no email → clicar
3. Usar esse email como `MAIL_FROM` em Task 5

Se você quiser usar `no-reply@<algo>`, vai precisar de domínio próprio — adia pra SP6b.

Expected: 4 strings salvas (host, port, user, key) + 1 email verificado.

---

### Task 3: Backend — env-driven CORS e port no `application.yml`

**Files:**
- Modify: `backend/src/main/resources/application.yml`

- [ ] **Step 1: Editar application.yml**

Abrir e localizar a seção `app:` e `server:`. Atualmente:
```yaml
server:
  port: 8080
```
```yaml
app:
  cors:
    allowedOrigins:
      - "http://localhost:3000"
```

Trocar `server` para:
```yaml
server:
  port: ${PORT:8080}
```

Trocar `app.cors` para:
```yaml
app:
  cors:
    allowedOrigins: ${CORS_ALLOWED_ORIGINS:http://localhost:3000}
```
(Spring converte CSV pra `List<String>` automaticamente. Em dev sem env, default `http://localhost:3000` mantém comportamento atual.)

- [ ] **Step 2: Rodar testes backend pra garantir que mudança não quebrou ninguém**

```bash
cd backend
./gradlew test --tests "*Cors*" --tests "*SecurityConfig*"
```
Expected: BUILD SUCCESSFUL. Se não houver test que case com esses padrões, rodar suite completa:
```bash
./gradlew test
```
Expected: 159 testes passando (baseline pós-SP5c). Se falhar com timeout em algum IT Testcontainers, é flake conhecido — rerun o IT isolado.

- [ ] **Step 3: Commit**

```bash
cd ..
git add backend/src/main/resources/application.yml
git commit -m "feat(sp6a): server.port e CORS allowedOrigins via env

Render injeta \$PORT em runtime. CORS_ALLOWED_ORIGINS lido como CSV
(default http://localhost:3000 mantém dev intacto)."
```

---

### Task 4: Backend — Dockerfile multi-stage

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`

- [ ] **Step 1: Criar `backend/Dockerfile`**

```dockerfile
# syntax=docker/dockerfile:1.7

# ---- Build stage ----
FROM gradle:8.10-jdk21-alpine AS build
WORKDIR /app
COPY --chown=gradle:gradle build.gradle.kts settings.gradle.kts gradle.properties* ./
COPY --chown=gradle:gradle gradle ./gradle
COPY --chown=gradle:gradle src ./src
RUN gradle --no-daemon bootJar -x test

# ---- Runtime stage ----
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8080
# -Xmx400m: deixa folga no Render free (512MB total). XX:+UseSerialGC: menor footprint.
ENTRYPOINT ["sh", "-c", "java -Xmx400m -XX:+UseSerialGC -jar app.jar"]
```

- [ ] **Step 2: Criar `backend/.dockerignore`**

```
build/
.gradle/
gradle-app.setting
.idea/
*.iml
.vscode/
src/test/
README*.md
*.log
```

- [ ] **Step 3: Testar build local (opcional mas recomendado)**

Se você tem Docker Desktop:
```bash
cd backend
docker build -t bragas-api:test .
```
Expected: build completa em ~3-5min na primeira vez (Gradle baixa deps). Imagem final ~250MB.

Se não tem Docker, pula — Render vai buildar do zero, e se houver erro de Dockerfile você verá nos logs deles.

- [ ] **Step 4: Commit**

```bash
cd ..
git add backend/Dockerfile backend/.dockerignore
git commit -m "feat(sp6a): Dockerfile multi-stage pro Render free

Build stage com gradle:8.10-jdk21-alpine; runtime com
eclipse-temurin:21-jre-alpine. Xmx400m + SerialGC pra caber
em 512MB do Render free."
```

---

### Task 5: Deploy backend no Render

**Files:** nenhum (UI externa). Você vai precisar das 19 env vars listadas no spec §5.

- [ ] **Step 1: Criar Web Service**

1. https://dashboard.render.com → New + → **Web Service**
2. **Connect a repository** → autorizar GitHub se necessário → escolher `BrunoOAlm/Braga-s-Burger`
3. Settings:
   - **Name:** `bragas-burger-api`
   - **Region:** Oregon (US West) ou Ohio (US East) — mais perto do Neon us-east-1: **Ohio**
   - **Branch:** `feat/sp6a-deploy-mvp` (depois mudaremos pra `master` após merge)
   - **Root Directory:** `backend`
   - **Runtime:** Docker (Render detecta o Dockerfile)
   - **Instance Type:** Free
4. **NÃO clique deploy ainda** — primeiro setar env vars

- [ ] **Step 2: Setar env vars no Render**

Em **Environment** → **Add Environment Variable**, adicionar **todas** as 19 da tabela §5 do spec. Resumo:

| Nome | Valor |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `DB_URL` | (do Task 1) |
| `DB_USER` | (do Task 1) |
| `DB_PASSWORD` | (do Task 1) — marcar como **Secret** |
| `JWT_SECRET` | gerar com `openssl rand -base64 64` localmente — marcar **Secret** |
| `COOKIE_SECURE` | `true` |
| `COOKIE_SAME_SITE` | `Lax` |
| `CORS_ALLOWED_ORIGINS` | `https://bragas-burger.vercel.app` (vamos atualizar no Task 9 se Vercel der nome diferente) |
| `ADMIN_BOOTSTRAP_EMAIL` | seu email admin |
| `ADMIN_BOOTSTRAP_PASSWORD` | senha forte ≥12 chars — **Secret** |
| `ADMIN_BOOTSTRAP_NAME` | `Admin` |
| `MAIL_HOST` | `smtp-relay.brevo.com` |
| `MAIL_PORT` | `587` |
| `MAIL_USERNAME` | (do Task 2) |
| `MAIL_PASSWORD` | (do Task 2) — **Secret** |
| `MAIL_AUTH` | `true` |
| `MAIL_TLS` | `true` |
| `MAIL_FROM` | email verificado no Brevo (Task 2) |
| `MAIL_RESET_BASE_URL` | `https://bragas-burger.vercel.app/redefinir-senha` |

Comando pra gerar `JWT_SECRET` localmente:
```bash
openssl rand -base64 64
```
Cole o output como valor.

- [ ] **Step 3: Disparar deploy**

Clicar **Create Web Service** (ou **Deploy** se já criou).

Aguardar build (10-15min na primeira vez por causa do download de deps do Gradle).

- [ ] **Step 4: Verificar logs do Render**

Em **Logs**, procurar:
- `Flyway Community Edition X.Y by Redgate` — Flyway iniciou
- `Successfully applied N migrations to schema "public"` — V1..V6 rodaram
- `Started BragasApplication in X seconds` — Spring subiu
- `Tomcat started on port(s): NNNN (http)` — porta correta (Render injeta um $PORT random tipo 10000)

Se aparecer erro Flyway tipo "unable to connect" → problema na `DB_URL`. Conferir formato JDBC.

- [ ] **Step 5: Anotar a URL do Render**

No topo do dashboard do service vai aparecer algo como `https://bragas-burger-api-XXXX.onrender.com`. Anotar — vai usar no Vercel. (Se o nome `bragas-burger-api` estava disponível, vem sem hash.)

- [ ] **Step 6: Smoke do backend direto**

```bash
curl https://bragas-burger-api-XXXX.onrender.com/api/v1/health
```
Expected: `{"status":"UP"}` (Spring Boot Actuator). Pode demorar 30-60s na primeira call após sleep — é normal.

Também testar menu:
```bash
curl https://bragas-burger-api-XXXX.onrender.com/api/v1/menu | head
```
Expected: JSON com categorias e produtos (Flyway seedou via V4).

---

### Task 6: Frontend — Next.js rewrites como proxy

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Editar `next.config.ts`**

Substituir todo o conteúdo por:

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

`BACKEND_URL` é env **server-side** (sem `NEXT_PUBLIC_` — só Vercel/Node enxerga, não vaza pro browser).

- [ ] **Step 2: Commit**

```bash
git add next.config.ts
git commit -m "feat(sp6a): rewrites /api/v1 -> BACKEND_URL

Proxy server-side faz cookies bb_session/bb_admin ficarem first-party
em vercel.app (resolve bloqueio de third-party cookies no Safari/iPhone)."
```

---

### Task 7: Frontend — api-client default relativo

**Files:**
- Modify: `lib/api-client.ts:16`
- Modify: `lib/admin-api.ts:7`

- [ ] **Step 1: Editar `lib/api-client.ts:16`**

Atual:
```ts
const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';
```

Trocar para:
```ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';
```

- [ ] **Step 2: Editar `lib/admin-api.ts:7`**

Mesma mudança:
```ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';
```

- [ ] **Step 3: Criar `.env.local` para dev (NÃO commitar)**

Garantir que `.env.local` existe localmente com `BACKEND_URL=http://localhost:8080` pra dev seguir funcionando via mesmo rewrite:

```bash
echo "BACKEND_URL=http://localhost:8080" >> .env.local
```

Verificar que `.env.local` está no `.gitignore`:
```bash
grep -n ".env.local" .gitignore
```
Expected: encontra entrada existente. Se não, adicionar `.env.local` no final do `.gitignore`.

- [ ] **Step 4: Smoke local rapido**

```bash
npm run dev
# em outro terminal:
cd backend && ./gradlew bootRun
```
Abrir `http://localhost:3000` → cardápio carrega. Testar `/admin/entrar` com admin local (do `.env`). Validar que `/api/v1/menu` no Network tab aponta pra `localhost:3000/api/v1/menu` (não `localhost:8080` direto).

Se o admin local não funciona, OK — não bloqueia o deploy; smoke prod é o que vale.

Parar ambos processos com Ctrl+C.

- [ ] **Step 5: Rodar testes frontend**

```bash
npm test
```
Expected: 267/267 passando, 1 skipped (baseline pós-SP5c).

- [ ] **Step 6: Commit**

```bash
git add lib/api-client.ts lib/admin-api.ts .gitignore
git commit -m "feat(sp6a): api-client default relativo /api/v1

Em prod (Vercel), default usa o rewrite. Em dev local, .env.local
seta BACKEND_URL=http://localhost:8080 pro mesmo rewrite proxiar."
```

---

### Task 8: Deploy frontend no Vercel

**Files:** nenhum (UI externa). Você precisa da URL do Render (Task 5).

- [ ] **Step 1: Importar projeto**

1. https://vercel.com/new → Import Git Repository → escolher `BrunoOAlm/Braga-s-Burger`
2. **Framework Preset:** Next.js (auto-detecta)
3. **Root Directory:** `./` (default)
4. **Branch:** `feat/sp6a-deploy-mvp`
5. **Project Name:** `bragas-burger` (gerará `bragas-burger.vercel.app`)

- [ ] **Step 2: Setar env vars**

Em **Environment Variables**, adicionar:

| Nome | Valor | Environments |
|---|---|---|
| `BACKEND_URL` | `https://bragas-burger-api-XXXX.onrender.com` (do Task 5) | Production, Preview, Development |

- [ ] **Step 3: Deploy**

Clicar **Deploy**. Aguardar ~3-5min.

- [ ] **Step 4: Pegar a URL final**

Após deploy, Vercel mostra a URL principal (ex.: `https://bragas-burger.vercel.app`). Se for diferente, anote — usaremos no Task 9.

- [ ] **Step 5: Smoke rápido**

Abrir `https://bragas-burger.vercel.app` → cardápio carrega.

Abrir DevTools (F12) → Network → recarregar. Procurar request a `/api/v1/menu`:
- Status: 200
- URL Request: começa com `https://bragas-burger.vercel.app/api/v1/menu` (não `onrender.com`)

Se a URL for `onrender.com`, o rewrite não está pegando — checar `BACKEND_URL` no Vercel.

---

### Task 9: Atualizar CORS_ALLOWED_ORIGINS no Render com URL real do Vercel

**Files:** nenhum (UI externa).

- [ ] **Step 1: Atualizar env var no Render**

Mesmo que o Task 5 já tenha botado `https://bragas-burger.vercel.app`, a Vercel pode ter gerado um nome ligeiramente diferente (ex.: `bragas-burger-bruno.vercel.app` se o nome estava ocupado). Confirmar.

1. Render dashboard → service → **Environment**
2. Editar `CORS_ALLOWED_ORIGINS` para a URL **exata** mostrada pelo Vercel
3. Save Changes → Render auto-restart o service (~30s)

Mesmo com proxy isso é defesa em profundidade — se alguém um dia chamar Render direto (Postman, curl), CORS bloqueia origens não autorizadas.

- [ ] **Step 2: Aguardar restart e verificar logs**

Em Logs do Render, esperar ver `Started BragasApplication` de novo. Sem ERROR.

---

### Task 10: Smoke real (desktop + iPhone)

**Files:** nenhum.

- [ ] **Step 1: Desktop Chrome — fluxo cliente final**

1. Abrir `https://<sua-url-vercel>` em Chrome (janela anônima recomendado pra evitar cookies cached)
2. Cardápio carrega completo (7 categorias, ~83 produtos)
3. Adicionar 1 item ao carrinho → ir pro checkout
4. Cadastrar nova conta com **email real seu** (vai validar Brevo)
5. Confirmar pedido — tela de status de pedido aparece, **sem** abrir WhatsApp (smoke do SP5c)
6. Recarregar página — continua logado, status persiste
7. Logout → cadastro persistido (login funciona depois)

Se algum passo falhar, parar e debuggar antes de seguir.

- [ ] **Step 2: Desktop Chrome — fluxo admin**

1. Abrir `https://<sua-url-vercel>/admin/entrar`
2. Login com `ADMIN_BOOTSTRAP_EMAIL` + senha (do env do Render)
3. Ver o pedido criado no Step 1
4. Transicionar status: clicar "Aceitar" (RECEIVED→PREPARING) → card muda **imediatamente** (regressão D do SP5c — refetch funcionando)
5. PREPARING→OUT→DELIVERED — sumir da aba ativa
6. Aba "Histórico" → pedido aparece como DELIVERED
7. Voltar pra Ativos — verificar que **não toca som / não dispara toast** de "novo pedido" (regressão E do SP5c)
8. CRUDs: criar 1 produto, editar 1 categoria, criar 1 cupom — refetch após cada
9. Logout admin

- [ ] **Step 3: iPhone real — fluxo cliente (CRÍTICO)**

Usar Safari nativo do iPhone (não Chrome iOS — o Chrome iOS usa WebKit também, mas Safari é o pior caso por ITP estar mais agressivo).

1. Abrir `https://<sua-url-vercel>` no Safari
2. Repetir fluxo cliente Step 1 (1-7) inteiro
3. **Validação crítica:** após login, fechar a aba do Safari, abrir de novo, voltar pra mesma URL → cookie `bb_session` deve persistir (login mantido). Se for deslogado, **o proxy não está funcionando** → debug urgente.

- [ ] **Step 4: iPhone real — fluxo admin**

Repetir Step 2 (fluxo admin) no Safari iPhone. Mesmo critério: login persiste após fechar/abrir aba.

- [ ] **Step 5: Verificar email**

Conferir caixa de entrada do email cadastrado no Step 1:
- Email de welcome (se SP4b enviar)
- Pelo menos: tentar `/esqueci-senha` com esse email → deve chegar link de reset

Se for pra spam, vai pra SP6b configurar SPF/DKIM. Pra SP6a o critério é só **chegar** (mesmo que em spam).

- [ ] **Step 6: Documentar resultado**

Se passou nos 5 steps, marca como done. Se falhou em algum, anota qual no PR description antes de seguir pro Task 11.

---

### Task 11: UptimeRobot keep-alive

**Files:** nenhum.

- [ ] **Step 1: Criar conta e monitor**

1. https://uptimerobot.com → Register free (sem cartão)
2. Add New Monitor:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** `Bragas Burger API`
   - **URL:** `https://<sua-url-vercel>/api/v1/health` (importante: passar pelo Vercel pra também validar o proxy funcionando, não direto no Render)
   - **Monitoring Interval:** 5 minutes
3. **Alert Contacts:** seu email → salvar
4. **Create Monitor**

- [ ] **Step 2: Validar primeiro check**

Aguardar 5min e verificar que o monitor aparece como **Up** (verde). Se aparecer Down, debugar — pode ser que o `/api/v1/health` requeira auth (não requer no Spring Boot Actuator com defaults atuais, mas vale confirmar).

- [ ] **Step 3: Verificar Render permanece warm**

Após 1h, voltar no dashboard Render → service → **Events** → não deve haver "Service deployed" recente nem "Suspended due to inactivity". Logs devem mostrar GET `/api/v1/health` a cada 5min.

---

### Task 12: Push, PR, merge

**Files:** nenhum (git/GitHub).

- [ ] **Step 1: Push da branch**

```bash
git push -u origin feat/sp6a-deploy-mvp
```

- [ ] **Step 2: Atualizar `CORS_ALLOWED_ORIGINS` final**

Se a URL final do Vercel for diferente da assumida no Task 5, garantir que o env var do Render reflete a final.

- [ ] **Step 3: Abrir PR**

```bash
gh pr create --title "feat(sp6a): deploy MVP — Vercel + Render + Neon + UptimeRobot" --body "$(cat <<'EOF'
## Summary

- Vercel rewrites como proxy para Render (cookies first-party → funciona em Safari/iPhone)
- Dockerfile multi-stage no backend pro Render free (512MB cap)
- `application.yml`: server.port e CORS via env
- `api-client` e `admin-api` defaults relativos
- Smoke real validado em iPhone + desktop

Spec: `docs/superpowers/specs/2026-06-09-sp6a-deploy-mvp-design.md`
Plano: `docs/superpowers/plans/2026-06-09-sp6a-deploy-mvp.md`

## Test plan

- [x] Backend: 159/159 testes passando
- [x] Frontend: 267/267 testes passando (1 skipped)
- [x] Lint limpo
- [x] Smoke desktop Chrome — cliente + admin
- [x] Smoke iPhone Safari — login persiste após fechar/reabrir aba
- [x] Email de reset chega (mesmo que spam)
- [x] UptimeRobot: 1h sem suspend
EOF
)"
```

- [ ] **Step 4: Trocar branch do Render para master (opcional, recomendado)**

Antes de mergear, no Render dashboard → service → **Settings** → mudar **Branch** de `feat/sp6a-deploy-mvp` para `master`. Render passa a fazer auto-deploy de pushes em master.

(Se esquecer, não tem problema crítico — só significa que após o merge você precisa fazer manual deploy no Render uma vez.)

- [ ] **Step 5: Code review automatizado**

Rodar `/code-review` no Claude pra triple-check.

- [ ] **Step 6: Merge**

Após review limpo, no terminal:
```bash
gh pr merge <N> --repo BrunoOAlm/Braga-s-Burger --merge
```

- [ ] **Step 7: Cleanup**

```bash
git checkout master
git pull
git branch -d feat/sp6a-deploy-mvp
git push origin --delete feat/sp6a-deploy-mvp
```

- [ ] **Step 8: Atualizar memória**

Editar `C:/Users/guerr/.claude/projects/.../memory/sp6-next-session.md` e o `project-roadmap.md` pra marcar SP6a como MERGEADO e indicar que SP6b é o próximo (CI + hardening + IP allowlist + Cloudflare + alarmes Neon + runbook).

---

## Self-review checklist

- [x] **Spec coverage:** todos os 7 itens da spec §3 (arquitetura) + 19 env vars (§5) + 11 passos de smoke (§6) têm task correspondente.
- [x] **Sem placeholders:** todos os trechos de código completos. `<sua-url-vercel>` é placeholder de **dado real do usuário**, não de "TBD code".
- [x] **Type consistency:** `BACKEND_URL` (Vercel), `CORS_ALLOWED_ORIGINS` (Render), `BASE_URL` (código) usados consistentemente entre tasks.

## Riscos durante execução

1. **Render free build pode demorar 15-20min na primeira vez** — paciência. Logs vão aparecendo.
2. **iPhone smoke pode mostrar problema** — se cookies não persistirem, debug com Charles Proxy ou Safari Web Inspector (cabo USB Mac↔iPhone).
3. **Brevo pode pedir verificação adicional** — perfil novo pode precisar confirmar identidade. Se travar, fallback: deixar `MAIL_*` vazio em prod e desabilitar reset por enquanto (`spring.mail.test-connection: false`).
4. **JWT_SECRET mudou entre deploys?** — cookies dos admins existentes ficam inválidos. Esperado: relogar.
