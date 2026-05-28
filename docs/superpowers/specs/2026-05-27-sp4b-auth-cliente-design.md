# Spec de Design — Auth do Cliente (Sub-projeto 4b)

**Data:** 2026-05-27
**Sub-projeto:** 4b de 6 — Auth do cliente (parte 2 do "Integração + Login" do roadmap original)
**Spec anterior:** `2026-05-21-integracao-front-backend-design.md` (SP4a, mergeado em master via PR #5)
**Status:** aprovado para virar plano de implementação

---

## 1. Contexto

Sub-projetos 1, 2, 3 e 4a estão concluídos e mergeados em master:

- **SP1+SP2** — front Next.js com cardápio, carrinho, checkout, `OrderStatusScreen.v2`.
- **SP3** — backend Java/Spring com 4 endpoints REST e schema de pedidos no Postgres.
- **SP4a** — front consome a API; pedido criado é gravado no banco e a tela de status faz polling em `GET /orders/:id`. **Sem autenticação** — cliente digita nome + telefone a cada pedido; "Meus pedidos" não existe.

Este sub-projeto entrega a **autenticação do cliente final**: signup, login, sessão por cookie, "Meus pedidos", perfil, recuperação de senha por e-mail. Login é **opcional** — guest checkout continua funcionando.

O auth do **admin** continua via `X-Admin-Token` (substituído por sessão admin em SP5). Este spec não toca nisso.

### Escopo

**Dentro:**

- Backend: pacote `auth/` em Spring (User entity, JWT, cookie httpOnly, filter, rate limit, e-mail de reset).
- Backend: tabela `users`, tabela `password_reset_tokens`, coluna `orders.user_id` (nullable).
- Backend: endpoints `POST /auth/signup`, `/login`, `/logout`, `/forgot`, `/reset`; `GET /me`, `PATCH /me`, `POST /me/change-password`, `GET /me/orders`.
- Backend: `MailService` com MailHog em dev (serviço extra no `docker-compose.yml`).
- Backend: `RateLimitFilter` (Bucket4j in-memory) nas rotas `/auth/*`.
- Front: `AuthProvider` + `useAuth()` hook; `api-client` estendido com funções de auth; todas as chamadas com `credentials: 'include'`.
- Front: telas `/cadastro`, `/entrar`, `/esqueci-senha`, `/redefinir-senha`, `/meus-pedidos`, `/perfil`.
- Front: `<HeaderUserMenu/>` adaptando o header (Entrar/Cadastrar vs nome + dropdown).
- Front: checkout pré-preenche nome/telefone do logado (editável).
- Front: testes Vitest + RTL para todas as novas peças.

**Fora do escopo:**

- **Vinculação retroativa** de pedidos guest antigos pelo telefone — decisão consciente (telefone não é prova de identidade).
- **Verificação de e-mail** no signup — conta ativa imediatamente.
- **Refresh token** — token de 7 dias vale enquanto vale; sem rotação.
- **Token de "logout em todos os dispositivos"** — exigiria `token_version` no users; fica para SP5/6.
- **Mudar e-mail** no `/perfil` — envolveria re-verificação; fora.
- **OAuth (Google/Facebook)** — só e-mail+senha no MVP.
- **Painel admin** com tela de gestão de usuários — SP5.
- **HTTPS em prod, TLS no SMTP, secrets management** — SP6.
- **Rate limit distribuído (Redis)** — SP6.
- **Job de limpeza de tokens de reset expirados** — desprezível no MVP, SP6.
- **Refatoração dos pedidos antigos no banco** — `user_id` fica `null` para sempre neles.

### Decisões travadas no brainstorming (2026-05-27)

| # | Tema | Decisão |
|---|------|---------|
| 1 | Login no checkout | **Opcional** — guest e logado convivem |
| 2 | Identificador | **E-mail + senha** |
| 3 | Sessão | **Cookie httpOnly** com JWT HS256, validade 7 dias, sem refresh token |
| 4 | Pedidos guest antigos | **Não vincular retroativo** |
| 5 | Esqueci a senha | **Reset por e-mail** com link/token |
| 6 | Verificação de e-mail no signup | **Não verificar** — conta ativa direto |
| 7 | Escopo de telas | Cadastro, login, esqueci/redefinir, "Meus pedidos", header adaptado, pré-preenchimento checkout, **perfil** (editar dados + trocar senha) |
| 8 | Rate limit | **In-memory por IP** (Bucket4j) nas rotas de auth |
| 9 | Hash de senha | `BCryptPasswordEncoder(strength = 10)` |
| 10 | SMTP em dev | **MailHog** via `docker-compose.yml` (UI em `localhost:8025`) |
| 11 | CSRF | **Desabilitado** (SameSite=Lax + cookie de same-site cobrem o risco real) |
| 12 | Security audit | **Pós-SP4b** em sessão separada (skill `security-review`) |

---

## 2. Stack adicional

| Componente | Versão | Função |
|---|---|---|
| `io.jsonwebtoken:jjwt-api`, `jjwt-impl`, `jjwt-jackson` | 0.12.x | Emissão/validação de JWT HS256 |
| `com.bucket4j:bucket4j-core` | 8.x | Rate limit in-memory |
| `spring-boot-starter-mail` | (do BOM) | SMTP via JavaMailSender |
| MailHog | latest | SMTP de dev + UI web |
| `spring-security-crypto` | (já no projeto) | `BCryptPasswordEncoder` |

Front: nenhuma dependência nova.

---

## 3. Arquitetura

### 3.1 Backend — novos arquivos no pacote `auth/`

```
backend/src/main/java/com/bragas/api/auth/
├── AuthController.java           ← POST /auth/signup, /login, /logout, /forgot, /reset
├── MeController.java             ← GET /me, PATCH /me, POST /me/change-password, GET /me/orders
├── AuthService.java              ← signup, login, changePassword, triggerReset, applyReset
├── JwtService.java               ← issue(userId) + verifyAndExtractUserId(jwt)
├── JwtCookieAuthFilter.java      ← OncePerRequestFilter; lê cookie, valida, popula SecurityContext
├── CurrentUser.java              ← anotação meta @AuthenticationPrincipal helper
├── RateLimitFilter.java          ← Bucket4j por IP+rota, aplica nas rotas /auth/*
├── MailService.java              ← interface
├── SpringMailService.java        ← impl com JavaMailSender + @Async
├── PasswordResetService.java     ← gera token (32B base64url), grava SHA-256, valida, expira (TTL 1h)
├── UserRepository.java           ← findByEmail, existsByEmail
├── PasswordResetTokenRepository.java
├── domain/
│   ├── User.java                 ← @Entity (id ULID `usr_`, email UNIQUE, passwordHash, name, phone)
│   └── PasswordResetToken.java   ← @Entity (tokenHash, userId FK, expiresAt, usedAt)
└── dto/
    ├── SignupRequest.java
    ├── LoginRequest.java
    ├── ForgotRequest.java
    ├── ResetRequest.java
    ├── ChangePasswordRequest.java
    ├── UpdateMeRequest.java
    ├── MeResponse.java
    ├── OrderSummaryResponse.java
    └── OrdersPageResponse.java
```

Modificações em arquivos existentes:

- `common/SecurityConfig.java` — adiciona `JwtCookieAuthFilter` antes do `AdminTokenFilter`; `RateLimitFilter` antes de tudo; autoriza `/auth/**` e configura `AuthenticationEntryPoint` que devolve Problem Details em 401; mantém CSRF desabilitado.
- `common/ApiExceptionHandler.java` — acrescenta handlers para `EmailAlreadyTakenException`, `InvalidCredentialsException`, `UnauthenticatedException`, `ResetTokenInvalidException`, `RateLimitExceededException`.
- `order/domain/Order.java` — adiciona `@ManyToOne(fetch = LAZY) User user` + getter; getter usado pelo mapper.
- `order/OrderController.java` / `OrderService.java` — `createOrder` extrai user do `SecurityContext` (pode ser null) e seta antes de salvar.
- `order/dto/OrderResponse.java` — adiciona `String userId` (nullable).

### 3.2 Frontend — novos arquivos e mudanças

```
app/
├── cadastro/page.tsx                 ← <SignupForm/>
├── entrar/page.tsx                   ← <LoginForm/>
├── esqueci-senha/page.tsx            ← <ForgotForm/>
├── redefinir-senha/page.tsx          ← <ResetForm/> (lê ?token=...)
├── meus-pedidos/page.tsx             ← <MyOrdersList/>
├── perfil/page.tsx                   ← <ProfileForm/> + <ChangePasswordForm/>
├── checkout/page.tsx                 ← MODIFICAR: pré-preenche; aceita ?orderId=... para abrir status
└── layout.tsx                        ← MODIFICAR: envolve children em <AuthProvider/>

components/
├── auth/
│   ├── SignupForm.tsx
│   ├── LoginForm.tsx
│   ├── ForgotForm.tsx
│   ├── ResetForm.tsx
│   └── ChangePasswordForm.tsx
├── account/
│   ├── MyOrdersList.tsx
│   └── ProfileForm.tsx
└── layout/
    └── HeaderUserMenu.tsx            ← plug no header existente (anonymous vs authenticated)

lib/
├── api-client.ts                     ← MODIFICAR: adiciona signup/login/logout/forgot/reset/me/updateMe/changePassword/listMyOrders; todas com credentials: 'include'
├── auth-context.tsx                  ← <AuthProvider/> + useAuth() hook
├── humanize-auth.ts                  ← mapa ApiError.type → pt-BR (paralelo ao humanize do checkout)
└── types-api.ts                      ← MODIFICAR: adiciona User, SignupRequest, LoginRequest, etc.
```

### 3.3 Fluxo de auth (visão geral)

```
Browser                              Backend (Spring)
────────                             ──────────────────
POST /auth/signup {email,pwd,name,phone}
                              ─→
                                     valida → bcrypt(pwd) → INSERT users → JWT(sub=usr_id, 7d)
                              ←─    201 + Set-Cookie: bb_session=<JWT>; HttpOnly; Secure; SameSite=Lax; Max-Age=604800
                                    body: MeResponse

GET /me  (próxima request automática, cookie anexo)
                              ─→
                                     RateLimitFilter (passa) → JwtCookieAuthFilter (autentica) → controller
                              ←─    200 MeResponse

POST /orders {...}  (guest OU logado)
                              ─→
                                     OrderService.create(user = ctx.user ?? null, ...)
                              ←─    201 OrderResponse (com userId)

POST /auth/logout            ─→
                              ←─    204 + Set-Cookie: bb_session=; Max-Age=0
```

---

## 4. API REST — contratos

Prefixo `/api/v1`. Erros em Problem Details (RFC 7807), iguais ao SP3.

### 4.1 `POST /auth/signup`

**Request:**
```json
{ "email": "joao@example.com", "password": "senha-forte-123", "name": "João Silva", "phone": "(21) 99999-0000" }
```

**Validações:** `email` formato + lowercase + trim + máx 200; `password` 8–100; `name` 2–120; `phone` 8–40.

**Response 201:**
```json
{ "id": "usr_01HXYZ...", "email": "joao@example.com", "name": "João Silva", "phone": "(21) 99999-0000", "createdAt": "2026-05-27T18:00:00Z" }
```
+ `Set-Cookie: bb_session=<JWT>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`.

**Erros:** `400 validation-failed` · `409 email-already-taken` · `429 too-many-requests`.

### 4.2 `POST /auth/login`

**Request:** `{ "email": "...", "password": "..." }`
**Response 204** + mesmo `Set-Cookie` do signup.
**Erros:** `401 invalid-credentials` (mensagem genérica — anti-enumeração) · `429 too-many-requests`.

### 4.3 `POST /auth/logout`

Sem body. **Response 204** + `Set-Cookie: bb_session=; Max-Age=0; Path=/`. Idempotente.

### 4.4 `POST /auth/forgot`

**Request:** `{ "email": "..." }`
**Response 204 SEMPRE** (anti-enumeração).

Por trás: rate limit por IP; se o e-mail existe, gera token aleatório de 32 bytes (base64url), grava SHA-256 hex em `password_reset_tokens` com TTL 1h, dispara e-mail assíncrono com link `${MAIL_RESET_BASE_URL}?token=<token-plain>`.

### 4.5 `POST /auth/reset`

**Request:** `{ "token": "...", "newPassword": "..." }`
**Response 204** + `Set-Cookie` (já loga).

**Erros:** `400 validation-failed` · `401 reset-token-invalid` (cobre token inexistente, expirado ou já usado — uma mensagem única).

Por trás: hash SHA-256 do token entra na busca; marca `used_at` na hora; bcrypt na nova senha; emite JWT novo.

### 4.6 `GET /me`

Requer cookie válido (`401 unauthenticated` se ausente/inválido).
**Response 200:** `MeResponse` (mesmo shape do signup).

### 4.7 `PATCH /me`

**Request:** `{ "name"?: "...", "phone"?: "..." }` — só campos enviados são atualizados.
**Response 200:** `MeResponse`.

E-mail não é editável no MVP. Não retorna senha.

### 4.8 `POST /me/change-password`

**Request:** `{ "currentPassword": "...", "newPassword": "..." }`
**Response 204.**

**Erros:** `400 validation-failed` · `401 invalid-credentials` (currentPassword errada).

Não revoga sessão atual nem outras (decisão consciente; sem `token_version` no MVP).

### 4.9 `GET /me/orders?limit=20&offset=0`

Requer cookie. `limit` default 20, máx 50. Ordenação fixa `created_at DESC`.

**Response 200:**
```json
{
  "items": [
    { "id": "ord_...", "displayId": "#3417", "status": "DELIVERED",
      "total": 100.12, "itemsCount": 3, "createdAt": "2026-05-25T20:14:00Z" }
  ],
  "total": 7,
  "limit": 20,
  "offset": 0
}
```

Resumo (sem items, address, etc.) — clicar abre a `OrderStatusScreen` existente via `GET /orders/:id`.

### 4.10 Mudança em `POST /api/v1/orders`

Sem mudança no shape do request. `OrderResponse` ganha `userId: string | null`. Internamente:

- Se cookie válido vem na request → `orders.user_id = userId` extraído do SecurityContext.
- Sem cookie / cookie inválido → `orders.user_id = null` (guest, igual hoje).

### 4.11 Novos erros no `ApiExceptionHandler`

| Exception | Status | `type` slug |
|---|---|---|
| `EmailAlreadyTakenException` | 409 | `email-already-taken` |
| `InvalidCredentialsException` | 401 | `invalid-credentials` |
| `UnauthenticatedException` | 401 | `unauthenticated` |
| `ResetTokenInvalidException` | 401 | `reset-token-invalid` |
| `RateLimitExceededException` | 429 | `too-many-requests` (com header `Retry-After`) |

---

## 5. Schema do banco — Flyway

### 5.1 `V2__create_users_and_password_resets.sql`

```sql
CREATE TABLE users (
  id              TEXT PRIMARY KEY,                  -- "usr_01HXYZ..."
  email           VARCHAR(200) NOT NULL UNIQUE,      -- lowercase, trimmed antes do INSERT
  password_hash   VARCHAR(72)  NOT NULL,             -- bcrypt $2a$... (~60 chars; 72 dá folga)
  name            VARCHAR(120) NOT NULL,
  phone           VARCHAR(40)  NOT NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER users_touch_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();  -- função já criada em V1

CREATE TABLE password_reset_tokens (
  id          BIGSERIAL PRIMARY KEY,
  token_hash  VARCHAR(64) NOT NULL UNIQUE,           -- SHA-256 hex (64 chars)
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,                            -- null = ainda válido
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_password_reset_tokens_user_id    ON password_reset_tokens (user_id);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens (expires_at);
```

**Notas:**
- `email UNIQUE` já cria índice — sem `idx_users_email` redundante.
- Token plain nunca entra no banco; só o SHA-256 hex.
- `used_at` ao invés de DELETE (auditoria).
- `CASCADE` no FK do reset token: se o user some, tokens vão junto.

### 5.2 `V3__add_user_id_to_orders.sql`

```sql
ALTER TABLE orders
  ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_orders_user_id ON orders (user_id);
```

**Notas:**
- `user_id` nullable: guest convive com logado; pedidos antigos ficam null para sempre.
- `ON DELETE SET NULL` (não CASCADE): pedido é registro operacional, sobrevive ao usuário. O MVP nem expõe deletar conta.
- Migrations V2 e V3 separadas para legibilidade do `flyway_schema_history`.

### 5.3 Race condition na unicidade de e-mail

Dois POSTs `/auth/signup` simultâneos com o mesmo e-mail: ambos passam o `existsByEmail`, o segundo `save` viola `users_email_key` → `DataIntegrityViolationException` → `ApiExceptionHandler` traduz para `EmailAlreadyTakenException` (409). Constraint do banco é a defesa real.

---

## 6. Auth — detalhes técnicos

### 6.1 JWT

- **Algoritmo:** HS256.
- **Biblioteca:** `io.jsonwebtoken:jjwt` 0.12.x.
- **Segredo:** `app.auth.jwtSecret` lido de env var `JWT_SECRET`, sem default. App falha rápido no startup se ausente ou < 32 bytes.
  - `.env.example`: `JWT_SECRET=<output de: openssl rand -base64 48>`.
- **Claims mínimas:** `sub=userId`, `iat`, `exp`, `iss=bragas-api`. Sem email/name no token — dados do user vêm do banco a cada request (1 SELECT por request; cache fica para depois).
- **Validade:** 7 dias (604800 s). Sem refresh token.

`JwtService`:
```java
String issue(String userId);
Optional<String> verifyAndExtractUserId(String jwt);
```

### 6.2 Cookie de sessão

Nome: `bb_session`.

| Atributo | Valor |
|---|---|
| `HttpOnly` | sim |
| `Secure` | `true` em prod, `false` em dev (via `app.auth.cookieSecure`) |
| `SameSite` | `Lax` |
| `Path` | `/` |
| `Max-Age` | `604800` |
| `Domain` | não setar (usa host da response) |

**CORS:** `SecurityConfig` mantém `allowedOrigins` do SP3 e adiciona/confirma `allowCredentials = true`. Front faz `fetch(..., { credentials: 'include' })` em **toda** chamada.

### 6.3 `JwtCookieAuthFilter`

Toda request passa por aqui:

1. Lê cookie `bb_session`. Ausente → segue cadeia (anonymous).
2. Presente → `JwtService.verify`. Inválido/expirado → segue como anonymous (**não retorna 401 no filter**).
3. Válido → carrega `User` do banco. Não existe (deletado) → anonymous.
4. Popula `SecurityContext` com `Authentication(user, [ROLE_USER])`.
5. Segue cadeia.

Quem decide 401 é o `SecurityConfig` (`AuthenticationEntryPoint` customizado) quando a rota exige `ROLE_USER` (ex.: `/me/**`) e o contexto está anonymous.

### 6.4 `SecurityConfig` — autorização por rota

| Rota | Auth |
|---|---|
| `POST /api/v1/auth/**` | público |
| `GET /api/v1/orders/**` | público |
| `POST /api/v1/orders` | público (mas anexa user se logado) |
| `GET /api/v1/me/**`, `PATCH /api/v1/me`, `POST /api/v1/me/change-password` | `ROLE_USER` |
| `PATCH /api/v1/admin/**` | header `X-Admin-Token` (SP3, intocado) |
| `GET /actuator/**` | público |

Ordem dos filtros: `RateLimitFilter` → `JwtCookieAuthFilter` → `AdminTokenFilter` → resto.

**CSRF desabilitado.** Justificativa: API REST + `SameSite=Lax` + front/back same-site em prod. Risco real (login CSRF) é teórico aqui; o custo de CSRF token em todo POST não compensa.

### 6.5 Rate limit — `RateLimitFilter`

- **Lib:** Bucket4j 8.x in-memory.
- **Chave:** IP do cliente (`X-Forwarded-For` se presente, senão `request.getRemoteAddr()`).
- **Buckets** (`ConcurrentHashMap<String, Bucket>` no filter singleton):

| Rota | Limite |
|---|---|
| `POST /auth/login` | 5/min por IP |
| `POST /auth/signup` | 3/min por IP |
| `POST /auth/forgot` | 2/min por IP |
| `POST /auth/reset` | 5/min por IP |

Estouro → 429 com header `Retry-After: <segundos>`. Reseta no restart (1 instância no MVP).

Não rate-limita `POST /orders` no SP4b.

### 6.6 E-mail — `MailService`

```java
public interface MailService {
    void sendPasswordReset(String to, String resetLink);
}
```

**Impl `SpringMailService`** usa `JavaMailSender` + `@Async`. Para o `@Async` funcionar, `BragasApiApplication.java` precisa de `@EnableAsync` na classe (anotação nova — adicionar no plano).

**Config (`application.yml`):**
```yaml
spring:
  mail:
    host: ${MAIL_HOST:localhost}
    port: ${MAIL_PORT:1025}
    username: ${MAIL_USERNAME:}
    password: ${MAIL_PASSWORD:}
    properties:
      mail.smtp.auth: ${MAIL_AUTH:false}
      mail.smtp.starttls.enable: ${MAIL_TLS:false}
app:
  mail:
    from: ${MAIL_FROM:no-reply@bragas.local}
    resetBaseUrl: ${MAIL_RESET_BASE_URL:http://localhost:3000/redefinir-senha}
  auth:
    jwtSecret: ${JWT_SECRET}
    cookieSecure: ${COOKIE_SECURE:false}
```

**Dev — MailHog (no `docker-compose.yml`):**
```yaml
mailhog:
  image: mailhog/mailhog:latest
  ports:
    - "1025:1025"   # SMTP
    - "8025:8025"   # UI web — http://localhost:8025
```

**Template (texto simples):**
```
Olá,

Recebemos um pedido para redefinir sua senha na Braga's Burger.

Clique no link abaixo (válido por 1 hora):
%s

Se não foi você, ignore este e-mail.

— Equipe Braga's Burger
```

Sem HTML, sem Thymeleaf no MVP. Falha no envio: log + segue (sem retry; cliente pede reset de novo).

### 6.7 Anti-enumeração

- **Login:** 401 genérico — não diferencia user inexistente de senha errada.
- **Forgot:** 204 sempre, exista ou não o e-mail.
- **Signup:** 409 quando e-mail já existe (aceito — alternativa impede signup honesto; mitigado por rate limit).

### 6.8 Hashing

`BCryptPasswordEncoder(strength = 10)` como `@Bean`. ~100 ms por hash em hardware moderno.

---

## 7. Frontend — detalhes

### 7.1 `lib/api-client.ts` — extensões

Todas as funções de auth e as **já existentes** (`createOrder`, `getOrder`) passam a usar `credentials: 'include'`. Pequeno refactor: adicionar a opção no `request<T>` interno (uma linha).

```ts
export interface User { id: string; email: string; name: string; phone: string; createdAt: string }
export interface SignupRequest { email: string; password: string; name: string; phone: string }
export interface LoginRequest  { email: string; password: string }
export interface ForgotRequest { email: string }
export interface ResetRequest  { token: string; newPassword: string }
export interface ChangePasswordRequest { currentPassword: string; newPassword: string }
export interface UpdateMeRequest { name?: string; phone?: string }
export interface OrderSummary { id: string; displayId: string; status: OrderStatus; total: number; itemsCount: number; createdAt: string }
export interface OrdersPage   { items: OrderSummary[]; total: number; limit: number; offset: number }

export async function signup(body: SignupRequest): Promise<User>
export async function login(body: LoginRequest): Promise<void>
export async function logout(): Promise<void>
export async function forgotPassword(body: ForgotRequest): Promise<void>
export async function resetPassword(body: ResetRequest): Promise<void>
export async function getMe(): Promise<User>                       // 401 → throw ApiError
export async function updateMe(body: UpdateMeRequest): Promise<User>
export async function changePassword(body: ChangePasswordRequest): Promise<void>
export async function listMyOrders(limit?: number, offset?: number): Promise<OrdersPage>
```

`OrderResponse` ganha `userId: string | null` (back-compat; front ignora por enquanto).

### 7.2 `lib/auth-context.tsx`

```tsx
type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: User };

interface AuthContextValue {
  state: AuthState;
  login: (body: LoginRequest) => Promise<void>;
  signup: (body: SignupRequest) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element
export function useAuth(): AuthContextValue
```

No mount do provider: `getMe()`; sucesso → `authenticated`; 401 → `anonymous`. Estado inicial: `loading`. Plugado em `app/layout.tsx` envolvendo `{children}`.

**Como o AuthContext orquestra os endpoints:**
- `signup(body)` → `await api.signup(body)` (retorna `User`) → `setState({ status: 'authenticated', user })`. Cookie já setado pela API.
- `login(body)` → `await api.login(body)` (204, sem body) → `const user = await api.getMe()` → `setState({ status: 'authenticated', user })`. Custo: 1 RTT extra; aceitável.
- `logout()` → `await api.logout()` → `setState({ status: 'anonymous' })`.
- `refresh()` → `const user = await api.getMe()` → atualiza o `user` em `authenticated`. Chamado após `updateMe`.

**Otimização futura (não bloqueia o MVP):** ler cookie no Server Component via `cookies()` e injetar `user` inicial para evitar o flash de loading. Anotado.

### 7.3 `lib/humanize-auth.ts`

| `type` | Mensagem |
|---|---|
| `email-already-taken` | "Este e-mail já está cadastrado. Use **Entrar** ou redefina a senha." |
| `invalid-credentials` | "E-mail ou senha incorretos." |
| `unauthenticated` | "Sua sessão expirou. Faça login de novo." |
| `reset-token-invalid` | "Link de redefinição inválido ou expirado. Peça um novo." |
| `too-many-requests` | "Muitas tentativas. Aguarde um pouco e tente de novo." |
| `validation-failed` | "Confira os campos preenchidos." |
| default | `err.detail` |

### 7.4 Padrão dos forms

```tsx
const [submitting, setSubmitting] = useState(false);
const [errorMessage, setErrorMessage] = useState<string | null>(null);

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  setSubmitting(true); setErrorMessage(null);
  try {
    await api.login({ email, password });
    router.push(searchParams.get('next') ?? '/meus-pedidos');
  } catch (err) {
    setErrorMessage(err instanceof ApiError ? humanizeAuth(err) : 'Algo deu errado. Tente de novo.');
  } finally { setSubmitting(false); }
};
```

### 7.5 Telas

- **`/cadastro`** — `<SignupForm/>` (nome, e-mail, telefone, senha). Sucesso → `router.push('/')` + toast.
- **`/entrar`** — `<LoginForm/>` (e-mail, senha). Sucesso → `?next=` ou `/meus-pedidos`. Links: "Esqueci a senha", "Criar conta".
- **`/esqueci-senha`** — `<ForgotForm/>` (e-mail). Sempre mostra "Se este e-mail estiver cadastrado, enviamos um link...".
- **`/redefinir-senha`** — `<ResetForm/>` lê `?token=` via `useSearchParams()`. Sem token → erro + link. Senhas diferentes → erro client. Sucesso → `auth.refresh()` + `router.push('/meus-pedidos')`.
- **`/meus-pedidos`** — `<MyOrdersList/>`. `useEffect` → `listMyOrders(20, 0)`. Cards com `displayId`, data, status badge (mesma paleta do `OrderStatusScreen`), total. Cada card linka para `/checkout?orderId=ord_...`. Botão "Carregar mais" incrementa offset. Empty state com CTA para o cardápio.
- **`/perfil`** — dois formulários: `<ProfileForm/>` (nome, telefone; e-mail read-only) e `<ChangePasswordForm/>` (senha atual, nova, confirmar). Botão "Sair" no rodapé.

### 7.6 Header — `<HeaderUserMenu/>`

Plugado no header existente.

- `loading` → skeleton chip.
- `anonymous` → links "Entrar" / "Criar conta".
- `authenticated` → dropdown "Olá, [primeiroNome]" com "Meus pedidos", "Perfil", "Sair".

Dropdown caseiro (`useState` + posicionamento absoluto + click-outside). Sem nova dependência.

### 7.7 Checkout — pré-preenchimento

```tsx
const { state } = useAuth();
const [identification, setIdentification] = useState<Identification>(() =>
  state.status === 'authenticated'
    ? { name: state.user.name, phone: state.user.phone }
    : { name: '', phone: '' }
);

useEffect(() => {
  if (state.status === 'authenticated' && !identification.name) {
    setIdentification({ name: state.user.name, phone: state.user.phone });
  }
}, [state]);
```

Campos permanecem **editáveis**. Editar não altera `users.name` — pedido reflete venda; perfil reflete conta.

**Ajuste adicional:** `app/checkout/page.tsx` aceita `?orderId=ord_...` no query. Se presente, pula para `step = 'sent'` e usa esse id no `OrderStatusScreen` — permite reaproveitar a tela quando vier de `/meus-pedidos`.

### 7.8 Testes (Vitest + RTL)

| Arquivo | Cobertura |
|---|---|
| `lib/api-client.test.ts` (estende) | Todas as novas funções: paths, bodies, `credentials: 'include'`, 401/409/429 → `ApiError` com `type` certo |
| `lib/auth-context.test.tsx` | Mount → loading → getMe sucesso → authenticated; getMe 401 → anonymous; login()/logout() transições |
| `components/auth/SignupForm.test.tsx` | Submit chama signup; 409 → mensagem; 429 → mensagem |
| `components/auth/LoginForm.test.tsx` | Submit chama login; 401 → genérica; redireciona com `?next=` |
| `components/auth/ForgotForm.test.tsx` | Sempre mesma mensagem genérica após submit |
| `components/auth/ResetForm.test.tsx` | Sem token → erro; senhas diferentes → erro client; reset-token-invalid → mensagem |
| `components/auth/ChangePasswordForm.test.tsx` | Submit chama changePassword; 401 → "senha atual incorreta" |
| `components/account/MyOrdersList.test.tsx` | Renderiza cards; empty state; "Carregar mais" incrementa offset |
| `components/account/ProfileForm.test.tsx` | Submit chama updateMe; e-mail read-only |
| `components/layout/HeaderUserMenu.test.tsx` | Anonymous → links; authenticated → menu; logout → estado anonymous |
| `app/checkout/page.test.tsx` (estende) | Logado → pré-preenche; `?orderId=` → pula para `step='sent'` |

Estimativa: ~25-30 testes novos. Mantém >180 testes verdes (régua do SP4a).

### 7.9 Acessibilidade

- `<label htmlFor>` em todo input; erros vinculados via `aria-describedby`.
- Botões com `aria-busy` + texto visível ("Entrando...") no submitting.
- Dropdown do header com `role="menu"`, foco controlado, fechamento por ESC e click-outside.

---

## 8. Configuração — variáveis de ambiente

Adicionar ao `backend/.env.example`:

```
# JWT (obrigatório)
JWT_SECRET=<output de: openssl rand -base64 48>

# Cookie (dev: false; prod via SP6: true)
COOKIE_SECURE=false

# SMTP (dev: MailHog default; prod via SP6)
MAIL_HOST=localhost
MAIL_PORT=1025
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_AUTH=false
MAIL_TLS=false
MAIL_FROM=no-reply@bragas.local
MAIL_RESET_BASE_URL=http://localhost:3000/redefinir-senha
```

`.env.local.example` do front: sem mudança (`NEXT_PUBLIC_API_URL` já basta — cookie é gerenciado pelo browser).

---

## 9. Testes do backend

### 9.1 Unitários (sem Spring)

| Classe | Cobertura |
|---|---|
| `JwtServiceTest` | issue + verify happy path; assinatura inválida; expirado; segredo curto falha no construtor |
| `PasswordResetServiceTest` | gera token; hash determinístico; valida hash batendo; expira após TTL; reuso retorna erro |
| `RateLimitFilterTest` | mais de N requests em <1min → 429; reseta após janela; chave por IP distinta |
| `BcryptPasswordEncoderConfigTest` | bean configurado com strength=10 |

### 9.2 Integração (`@SpringBootTest` + Testcontainers)

| Classe | Cobertura |
|---|---|
| `AuthControllerIT` | signup happy path → 201 + cookie; signup com e-mail duplicado → 409; login OK → 204 + cookie; login senha errada → 401 genérico; logout → 204 + cookie expirado; forgot inexistente → 204 silencioso; forgot existente → 204 + e-mail enviado (`GreenMail` ou stub do `MailService`); reset com token válido → 204 + cookie; reset com token reusado → 401; reset com token expirado → 401 |
| `MeControllerIT` | GET /me sem cookie → 401; GET /me com cookie → 200; PATCH /me atualiza nome/telefone; change-password com senha atual errada → 401; change-password OK → 204 |
| `OrderUserLinkIT` | POST /orders com cookie de user → orders.user_id preenchido; POST /orders sem cookie → orders.user_id null; GET /me/orders retorna só do user logado; paginação respeita limit/offset; estranho não vê pedidos do outro |
| `RateLimitIT` | 6º POST /auth/login no mesmo minuto → 429 com `Retry-After` |
| `JwtCookieAuthFilterIT` | cookie com JWT de user inexistente (deletado) → trata como anonymous |
| `FlywayV2V3IT` | migrations aplicam em banco limpo; user_id é nullable em orders |

Stub do `MailService` numa `@TestConfiguration` evita SMTP real nos testes (substitui por implementação que acumula `(to, link)` em lista).

---

## 10. Critérios de sucesso

- `cd backend && docker compose up -d` sobe Postgres + MailHog (UI em http://localhost:8025).
- `./gradlew test` verde — unitários + integração (>SP3+SP4a).
- `npm test` no front verde — >180 testes (régua SP4a).
- `npm run lint`, `npm run build` verdes.
- Fluxos manuais com a stack rodando:
  - Cadastro em `/cadastro` → cookie setado → header mostra "Olá, [nome]" → `/meus-pedidos` mostra "Você ainda não fez pedidos...".
  - Logout no menu → header volta para "Entrar/Cadastrar".
  - Pedido logado → grava `orders.user_id`. `psql ... -c "SELECT id, user_id FROM orders ORDER BY created_at DESC LIMIT 1"` mostra o ULID do user.
  - Pedido guest (anonymous) → `user_id` null.
  - `/meus-pedidos` lista o pedido recém-criado; clicar abre `OrderStatusScreen` com polling.
  - `/perfil` edita nome/telefone (vê refletido no header e no próximo pedido). Trocar senha funciona; usar a senha antiga falha (401).
  - "Esqueci a senha" com e-mail cadastrado → MailHog (http://localhost:8025) mostra o e-mail com link → clicar abre `/redefinir-senha?token=...` → trocar senha → já loga.
  - "Esqueci a senha" com e-mail desconhecido → mesma mensagem genérica; MailHog não recebe nada.
  - 6 logins errados em <1min do mesmo IP → 429 com `Retry-After`.
  - `curl` sem cookie em `GET /api/v1/me` → 401 Problem Details `unauthenticated`.

---

## 11. Pendências para sub-projetos seguintes

| Item | Sub-projeto |
|---|---|
| Server-side rendering com cookie (eliminar flash de loading no AuthProvider) | 5/6 |
| Painel admin com sessão (substitui `X-Admin-Token`) | 5 |
| Token de "deslogar de todos os dispositivos" (`token_version` em users) | 5/6 |
| Mudar e-mail no perfil (com re-verificação) | 5/6 |
| Verificação obrigatória de e-mail no signup | 5/6 |
| OAuth (Google) | 6 |
| HTTPS, `Secure=true` em prod, TLS no SMTP | 6 |
| Rate limit distribuído (Redis) | 6 |
| Job de limpeza de tokens de reset expirados | 6 |
| SMTP de produção (SendGrid/SES) | 6 |
| **Security review do projeto inteiro** | sessão dedicada pós-SP4b |
