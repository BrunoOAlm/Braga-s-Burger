# Post LinkedIn — Braga's Burger Deploy MVP

> Versão escolhida: **Jornada do Dev** + todas as sugestões aplicadas. Pronto pra copiar e colar.

---

## ✅ Antes de postar — checklist

- [ ] **Print 1:** home com cardápio carregado (https://braga-s-burger.vercel.app — abre em janela anônima, scroll até o cardápio, captura full page com o nome de uns 3 burgers visíveis)
- [ ] **Print 2:** painel admin `/admin/pedidos` com 1+ pedido na fila (se não tiver pedido real, cria um fake durante o smoke)
- [ ] **(Opcional) Vídeo 15s:** grava com Loom ou tela do celular fazendo cardápio → carrinho → checkout
- [ ] Confere que o link da demo abre normal (Render acordado via UptimeRobot)
- [ ] Posta numa **terça/quarta entre 9h-11h** ou **quinta 18h-20h** (maior engagement no LinkedIn BR)
- [ ] Responde os comentários nas primeiras 2h pra impulsionar alcance

---

## 📝 Texto final (3000 chars cap do LinkedIn — está em ~2200)

```
🍔 Tirei do papel a plataforma de pedidos da Braga's Burger.

Há uns 2 meses comecei um projeto freelance pra uma hamburgueria do RJ que queria sair do "pedido por WhatsApp" e ter um site próprio com cardápio, checkout, painel admin — o pacote completo.

Hoje o sistema tá no ar: 👉 https://braga-s-burger.vercel.app

Foi muita coisa pra encaixar:

🧱 Frontend — Next.js 16 + React 19 + TypeScript + Tailwind v4. App Router com Server Components, ISR de 5min no cardápio, PWA, animação de intro só uma vez por sessão.

⚙️ Backend — Spring Boot 4 + Java 21 + PostgreSQL 16. JWT em cookie httpOnly, rate limit com Bucket4j, audit log, 159 testes (JUnit + Testcontainers).

☁️ Deploy zero-custo — Vercel (front) + Render Free (back via Docker) + Neon (Postgres) + Brevo (SMTP). UptimeRobot pingando a cada 5min pra evitar o cold start do Render.

A decisão arquitetural que mais me orgulha foi usar Vercel rewrites como proxy pra dois backends ficarem first-party. Resultado: cookies funcionam no Safari/iPhone sem dor de cabeça com SameSite=None.

E claro, bugs reais que enfrentei (e que me fizeram aprender muito):

🪲 Render auto-detectou o package.json do frontend na raiz e ignorou o Dockerfile do backend → primeiro build subiu o Next.js no lugar do Spring.

🪲 Imagem gradle:8.10-jdk21-alpine do Docker Hub vem com Gradle 8.10.2, mas Spring Boot 4 exige ≥8.14. Fix: usar ./gradlew do projeto (que sobe Gradle 9.4.1).

🪲 Cardápio sumiu em produção porque o menu-api.ts rodava em SSR mas ainda apontava pra localhost:8080 como default — tinha esquecido que NEXT_PUBLIC_* não existe em server-side.

🪲 Vercel buildou do master em vez da feature branch → frontend em prod sem as mudanças do deploy. Fix: mergear antecipado.

Cada bug desses virou aprendizado que vai pro próximo projeto.

Próximo passo: SP6b — CI no GitHub Actions, IP allowlist no admin, WAF, backup automatizado do banco, fuso horário correto, domínio próprio.

Código no GitHub (livre pra clonar e estudar): https://github.com/BrunoOAlm/Braga-s-Burger

#desenvolvimento #fullstack #nextjs #springboot #java #typescript #freelancer #devbrasileiro #postgresql #devops
```

---

## 🏷️ Hashtags por nicho (escolha 5-10, evite spam)

- **Geral:** `#desenvolvimento` `#fullstack` `#portfolio` `#devbrasileiro`
- **Backend:** `#java` `#springboot` `#postgresql` `#javadeveloper`
- **Frontend:** `#nextjs` `#react` `#typescript` `#tailwindcss`
- **DevOps:** `#deploy` `#docker` `#vercel` `#render` `#cloudnative`
- **Carreira:** `#freelancer` `#devjr` `#portfoliodev` `#oportunidades`

> ⚠️ LinkedIn algoritmo penaliza posts com >10 hashtags. Fica em 8-10 max.

---

## 💬 Respostas prontas pra comentários

Sugestões de respostas rápidas pra primeiras interações (mantém o post quente):

- **"Massa, tô estudando Spring tbm"** → "Boa! Recomendo começar pelo Spring Boot 4 que mudou várias coisas (Jackson 3, Gradle 8.14+). Posso te indicar uns recursos se quiser."
- **"Quanto custou hospedar isso?"** → "Zero! 😄 Vercel free + Render free + Neon free + Brevo free + UptimeRobot free. Trade-off é cold start do Render (mitigado pelo UptimeRobot)."
- **"Tem repo?"** → Já tá no post, mas reforça: "Sim, link no fim do post. README tem instruções de rodar local + deploy."
- **"E o pagamento online?"** → "Cliente decidiu MVP sem gateway — cobrança é na entrega/retirada. Próxima fase considera Stripe/Mercado Pago."

---

## 🔁 Pós-post (1-2 semanas depois)

Considera um **follow-up** com:

- Print de métricas do site (Vercel Analytics ou Google Analytics se subir)
- Aprendizados específicos de manter algo em produção
- Update do SP6b (quando rolar)

Repostar o link às vezes ajuda a achar quem perdeu o original.
