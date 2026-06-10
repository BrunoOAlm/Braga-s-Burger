# Post LinkedIn — SP6a Deploy MVP

> Esboço para postar no LinkedIn. Revise tom, adicione print/vídeo curto da live demo, escolha hashtags do seu nicho.

---

## Versão A — Narrativa "jornada do dev" (mais autêntica)

🍔 **Tirei do papel a plataforma de pedidos da Braga's Burger.**

Há uns 2 meses comecei um projeto freelance pra uma hamburgueria do RJ que queria sair do "pedido por WhatsApp" e ter um site próprio com cardápio, checkout, painel admin — o pacote completo.

Hoje **o sistema tá no ar**: 👉 https://braga-s-burger.vercel.app

Foi muita coisa pra encaixar:

🧱 **Frontend** — Next.js 16 + React 19 + TypeScript + Tailwind v4. App Router com Server Components, ISR de 5min no cardápio, PWA, animação de intro só uma vez por sessão.

⚙️ **Backend** — Spring Boot 4 + Java 21 + PostgreSQL 16. JWT em cookie httpOnly, rate limit com Bucket4j, audit log, 159 testes (JUnit + Testcontainers).

☁️ **Deploy zero-custo** — Vercel (front) + Render Free (back via Docker) + Neon (Postgres) + Brevo (SMTP). UptimeRobot pingando a cada 5min pra evitar o cold start do Render.

A decisão arquitetural que mais me orgulha foi usar **Vercel rewrites como proxy** pra dois backends ficarem first-party. Resultado: cookies funcionam no Safari/iPhone sem dor de cabeça com `SameSite=None`.

E claro, **bugs reais que enfrentei** (e que me fizeram aprender muito):

🪲 Render auto-detectou o `package.json` do frontend na raiz e ignorou o Dockerfile do backend → primeiro build subiu o Next.js no lugar do Spring.

🪲 Imagem `gradle:8.10-jdk21-alpine` do Docker Hub vem com Gradle 8.10.2, mas Spring Boot 4 exige ≥8.14. Fix: usar `./gradlew` do projeto (que sobe Gradle 9.4.1).

🪲 Cardápio sumiu em produção porque o `menu-api.ts` rodava em SSR mas ainda apontava pra `localhost:8080` como default — tinha esquecido que `NEXT_PUBLIC_*` não existe em server-side.

🪲 Vercel buildou do `master` em vez da feature branch → frontend em prod sem as mudanças do deploy. Fix: mergear antecipado.

Cada bug desses virou aprendizado que vai pro próximo projeto.

**Próximo passo:** SP6b — CI no GitHub Actions, IP allowlist no admin, WAF, backup automatizado do banco, fuso horário correto, domínio próprio.

Código no GitHub (livre pra clonar e estudar): https://github.com/BrunoOAlm/Braga-s-Burger

#desenvolvimento #fullstack #nextjs #springboot #java #typescript #freelancer #devbrasileiro

---

## Versão B — Curta e direta (para quem quer um "drop")

✅ **Site no ar:** https://braga-s-burger.vercel.app

Plataforma de pedidos online completa que entreguei pra uma hamburgueria do RJ.

🛠️ Next.js 16 + Spring Boot 4 + PostgreSQL 16
☁️ Vercel + Render + Neon + Brevo — tudo em plano gratuito
🔐 Auth dupla (cliente e admin) com cookies httpOnly + JWT
📊 159 testes back + 268 testes front, todos passando
🐛 Bugs interessantes que enfrentei no deploy: detalhei no README

Código: https://github.com/BrunoOAlm/Braga-s-Burger

Aceito feedback técnico e contato pra novos projetos.

#fullstack #freelance #nextjs #java

---

## Versão C — Tom técnico/aprendizado (pra audiência dev)

**3 lições do deploy do meu projeto full-stack mais ambicioso até hoje:**

Acabei de subir em produção uma plataforma de pedidos com Next.js 16 + Spring Boot 4 + Postgres, deploy em Vercel + Render + Neon. Link: https://braga-s-burger.vercel.app

3 coisas que aprendi e que vão pro meu repertório:

**1. Vercel rewrites resolvem CORS e cookies cross-site de uma vez.**
Quando o frontend e o backend estão em domínios diferentes, cookies viram um pesadelo (especialmente Safari/iPhone com ITP). Em vez de lutar com `SameSite=None` + `Secure` + CORS complexo, usei rewrites do Next.js (`/api/v1/*` → backend no Render). Para o browser, é tudo same-origin. Cookies first-party. Funciona.

**2. Auto-detection do Render pode te dar a perna.**
Render lê o repo, vê um `package.json` na raiz, decide que é Node, ignora o Dockerfile do backend que tava em `backend/`. Resultado: subiu o frontend no service de API. Lição: **setar Root Directory ANTES de qualquer outra configuração**.

**3. `NEXT_PUBLIC_*` não vale em Server Components.**
Meu `menu-api.ts` rodava em SSR e tinha `process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'` como default. Em prod, o servidor Node da Vercel tentou conectar em `localhost:8080` (que não existe pra ele) → cardápio sumiu da home. Pattern correto: `typeof window === 'undefined' ? BACKEND_URL : '/api/v1'`.

Código aberto no GitHub se quiser ver: https://github.com/BrunoOAlm/Braga-s-Burger

Quem tá fazendo deploy similar e enfrentou problemas parecidos? Compartilha aí.

#nextjs #springboot #deploy #fullstack

---

## Sugestão de mídia

- 1 print da home com o cardápio aberto
- 1 print do painel admin com a fila de pedidos
- (Opcional) Vídeo de 15s navegando pelo fluxo: cardápio → carrinho → checkout

## Hashtags por nicho

- **Geral:** #desenvolvimento #fullstack #portfolio
- **Backend:** #java #springboot #postgresql
- **Frontend:** #nextjs #react #typescript #tailwindcss
- **DevOps:** #deploy #docker #vercel #render
- **Carreira:** #freelancer #devjr #portfoliodev #devbrasileiro

## Timing

- Postar **terça/quarta entre 9h-11h** ou **quinta 18h-20h** (maior engagement no LinkedIn BR)
- Responder comentários nas primeiras 2h pra impulsionar alcance
