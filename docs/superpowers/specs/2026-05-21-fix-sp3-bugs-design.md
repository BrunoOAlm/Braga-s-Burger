# Spec de Design — Correções do SP3 (Backend)

**Data:** 2026-05-21
**Sub-projeto:** correção do sub-projeto 3 (backend já mergeado em master via PR #4)
**Spec original do SP3:** `2026-05-20-backend-api-design.md`
**Origem:** bugs descobertos no smoke E2E do SP4a (PR #5 aberta em 2026-05-21)
**Status:** aprovado para virar plano de implementação

---

## 1. Contexto

O smoke E2E manual do SP4a (integração front↔backend) em 2026-05-21 revelou **quatro bugs no backend** que não bloquearam o merge do SP3 (testes passavam) mas impedem operação real:

1. **Clock em UTC** — `ClockConfig.clock()` usa `ZoneOffset.UTC` enquanto `application.yml` configura horários em BRT. A partir das 21h BRT (= 00h+ UTC do dia seguinte) o backend acredita que já é o próximo dia e a loja "fecha" cedo demais. Bug crítico — afeta operação real.
2. **Catálogos com amostra mínima** — `products.json` tem 5 itens (vs ~80 no front `data/menu.ts`); `delivery-areas.json` tem 3 bairros (vs ~39 no front `data/delivery.ts`). Qualquer item fora dos seeds dispara `product-not-found` ou `delivery-area-not-served`. Bug crítico — afeta operação real.
3. **`NoResourceFoundException` retorna 500** — quando bate em rota inexistente, o catch-all `@ExceptionHandler(Exception.class)` engole como erro interno e devolve 500. Deveria ser 404 com Problem Details. Bug menor — cosmético, mas confunde clientes/monitoring.
4. **`/api/v1/health` inexistente** — o plano original do SP4a assumia que essa rota existia; nunca foi criada no SP3. Health-check público é útil pra load balancer/observabilidade futura.

**Tudo numa única PR** (`fix/sp3-bugs`) saindo de `master`. Cada bug vira commit próprio em ordem: Clock → 404 handler → /health → catálogos (mais urgente primeiro, maior diff por último).

### Escopo

**Dentro:**
- `ClockConfig.java` em `America/Sao_Paulo` + teste de regressão.
- Novo `@ExceptionHandler(NoResourceFoundException.class)` em `ApiExceptionHandler.java` + IT.
- Novo `HealthController.java` expondo `GET /api/v1/health` + IT.
- `products.json` e `delivery-areas.json` espelhando o front 1:1.
- Atualização da memória `project-sp3-bugs-pendentes.md` removendo o que ficou resolvido.

**Fora do escopo:**
- **Migração do cardápio pro banco** — esse é o SP5. Por ora mantemos JSON estático duplicado entre front e backend; SP5 elimina a duplicação.
- **Outros endpoints do `actuator`** — só `/api/v1/health` no estilo da API. Quem quiser métricas/info pode habilitar `management.endpoints.web.exposure.include` depois.
- **Refatoração do `ApiExceptionHandler`** — só adicionamos um handler; o resto fica como está.
- **Internacionalização/i18n das mensagens de erro** — segue pt-BR hard-coded como o resto do SP3.
- **Test fixtures novos pros catálogos maiores** — os ITs existentes (`OrderControllerIT`, `OrderAdminControllerIT`) usam IDs que continuam existindo no JSON novo (ex.: `chicken`, `coca-cola-2l`). Não precisa de seed paralelo.

### Decisões travadas no brainstorming (2026-05-21)

| # | Tema | Decisão |
|---|------|---------|
| 1 | Escopo | 1 PR única com os 4 bugs. Cada bug em commit separado. |
| 2 | Catálogos | Copiar 1:1 do front (`data/menu.ts`, `data/delivery.ts`). SP5 elimina duplicação. |
| 3 | Testes | TDD por bug — teste falhante primeiro, depois o fix. Catálogos sem teste novo (Jackson valida no startup). |
| 4 | Branch base | `master` (não `feat/integration`, pra não acoplar com SP4a). |
| 5 | `/health` auth | Público (Spring Security já é `permitAll()`; só `/admin/**` filtrado). |

---

## 2. Stack adicional

Nenhuma dependência nova. Usa o que o backend já tem:

- JUnit 5 + AssertJ (testes unitários).
- `@SpringBootTest` + Testcontainers (ITs existentes).
- Jackson (deserialização dos JSON).
- Spring Web (controller).

---

## 3. Mudanças por arquivo

### Criar

- **`backend/src/main/java/com/bragas/api/common/HealthController.java`** — `GET /api/v1/health` retornando `Map.of("status","UP")`.
- **`backend/src/test/java/com/bragas/api/common/ClockConfigTest.java`** — valida `new ClockConfig().clock().getZone().equals(ZoneId.of("America/Sao_Paulo"))`. Sem `@SpringBootTest` — instancia direto.
- **`backend/src/test/java/com/bragas/api/common/HealthControllerIT.java`** — `@SpringBootTest` + `MockMvc` ou `TestRestTemplate`, `GET /api/v1/health` → 200 com `status=UP`.
- **`backend/src/test/java/com/bragas/api/common/NotFoundIT.java`** — `GET /api/v1/foo-inexistente` → 404 com Problem Details `type` terminando em `not-found`.

### Modificar

- **`backend/src/main/java/com/bragas/api/common/ClockConfig.java`** — substituir `Clock.system(ZoneOffset.UTC)` por `Clock.system(ZoneId.of("America/Sao_Paulo"))`. Trocar import.
- **`backend/src/main/java/com/bragas/api/common/ApiExceptionHandler.java`** — adicionar:
  ```java
  @ExceptionHandler(NoResourceFoundException.class)
  public ResponseEntity<ApiError> handleNoResource(NoResourceFoundException ex, HttpServletRequest req) {
      return problem(HttpStatus.NOT_FOUND,
          ApiError.of("not-found", "Rota não encontrada", 404,
              "Recurso não encontrado: " + req.getRequestURI(), req.getRequestURI()));
  }
  ```
  Segue o mesmo padrão dos handlers existentes (`ApiError.of(slug, title, status, detail, uri)` + helper `problem(HttpStatus, ApiError)`). Import: `org.springframework.web.servlet.resource.NoResourceFoundException`.
- **`backend/src/main/resources/data/products.json`** — reescrever com os ~80 produtos do front. Shape preservado: `id`, `categoryId`, `name`, `price`, `available`.
- **`backend/src/main/resources/data/delivery-areas.json`** — reescrever com os ~39 bairros do front. Shape: `neighborhood`, `fee`.

### Sem alteração

- `OrderService.java`, `StoreStatus.java`, `StoreStatusTest.java`, `OrderControllerIT.java`, `OrderAdminControllerIT.java`, demais DTOs, entidades JPA, migrations Flyway.
- Front (`data/menu.ts`, `data/delivery.ts`) — fonte da verdade do conteúdo.

---

## 4. Detalhe por bug

### #1 Clock BRT

`ClockConfig.java` fica:

```java
package com.bragas.api.common;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneId;

@Configuration
public class ClockConfig {
    @Bean
    public Clock clock() {
        return Clock.system(ZoneId.of("America/Sao_Paulo"));
    }
}
```

Teste em `ClockConfigTest`:

```java
@Test
void clockIsInSaoPauloZone() {
    Clock clock = new ClockConfig().clock();
    assertThat(clock.getZone()).isEqualTo(ZoneId.of("America/Sao_Paulo"));
}
```

Sem `@SpringBootTest` — testar a fábrica direto é suficiente e rápido. O teste **falha** com o estado atual (UTC).

### #2 Catálogos espelhando o front

Conversão dos arquivos TS pra JSON respeitando o shape do backend. O front exporta `products: Product[]` com campos `id, categoryId, name, description, price, priceFrom, imageUrl, featured, available`. O backend só precisa de `id, categoryId, name, price, available` — descartar o resto na conversão.

Processo manual aceitável (~80 entradas, ~5 min):
- Abrir `data/menu.ts` no editor.
- Selecionar o array `products`.
- Conversão regex/multi-cursor para o JSON minificado por campo.

OU script Node ad-hoc (commitar opcional em `scripts/sync-catalog.mjs` — fora do escopo se for usado só uma vez):
```js
import { products } from '../data/menu.ts';
import { deliveryAreas } from '../data/delivery.ts';
const slim = products.map(({ id, categoryId, name, price, available }) =>
  ({ id, categoryId, name, price, available }));
console.log(JSON.stringify(slim, null, 2));
```

Resultado em `products.json` deve ser um array com ~80 entradas, todas com `available: true` exceto os marcados como `false` no front. O `esgotado-test` do JSON atual pode ser **removido** — ele foi seed só pra testar o caminho `product-unavailable`, e o IT que cobria isso (`OrderControllerIT`) provavelmente já não depende dele. Se depender, manter `esgotado-test` no JSON novo (verificar antes de remover).

`delivery-areas.json` — mesma ideia: copiar `neighborhood, fee` de `data/delivery.ts`.

Verificar após edição:
- `npx jq length products.json` retorna ~80.
- `npx jq length delivery-areas.json` retorna ~39.
- `./gradlew test` continua verde (startup deserializa sem exception, ITs existentes ainda passam).

### #3 `NoResourceFoundException` → 404

`ApiExceptionHandler.java` ganha:

```java
@ExceptionHandler(NoResourceFoundException.class)
public ResponseEntity<ApiError> handleNoResource(
        NoResourceFoundException ex, HttpServletRequest req) {
    return problem(HttpStatus.NOT_FOUND,
        ApiError.of("not-found", "Rota não encontrada", 404,
            "Recurso não encontrado: " + req.getRequestURI(), req.getRequestURI()));
}
```

Mesmo padrão dos handlers existentes (`OrderNotFoundException` é o vizinho mais parecido). Import novo: `org.springframework.web.servlet.resource.NoResourceFoundException`.

Teste `NotFoundIT`:

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class NotFoundIT {
    @Autowired TestRestTemplate http;

    @Test
    void unknownRouteReturns404WithProblemDetails() {
        var res = http.getForEntity("/api/v1/foo-inexistente", String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(res.getBody()).contains("\"type\":\"https://bragas.com/errors/not-found\"");
        assertThat(res.getBody()).contains("\"status\":404");
    }
}
```

Falha atual: retorna 500. Após o handler: 404.

### #4 `/api/v1/health`

```java
package com.bragas.api.common;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class HealthController {
    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }
}
```

Teste `HealthControllerIT`:

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class HealthControllerIT {
    @Autowired TestRestTemplate http;

    @Test
    void healthReturns200AndStatusUp() {
        var res = http.getForEntity("/api/v1/health", Map.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).containsEntry("status", "UP");
    }
}
```

---

## 5. Testes

| Bug | Teste novo | Tipo | Falha atual |
|---|---|---|---|
| #1 Clock | `ClockConfigTest.clockIsInSaoPauloZone` | Unit | Zone é UTC, espera America/Sao_Paulo |
| #2 Catálogos | (nenhum novo) | — | Jackson valida shape no startup; ITs existentes continuam usando IDs que sobrevivem (`chicken`, `coca-cola-2l`) |
| #3 NoResource | `NotFoundIT.unknownRouteReturns404WithProblemDetails` | IT (Spring) | 500 com `type=internal-error` |
| #4 /health | `HealthControllerIT.healthReturns200AndStatusUp` | IT (Spring) | 404 (rota não existe) |

Total: **3 testes novos**. Alvo: suíte do backend continua verde após cada commit (TDD: teste primeiro falha, depois passa).

---

## 6. Critérios de sucesso

- `./gradlew test` — verde (testes antigos + 3 novos).
- `curl http://localhost:8080/api/v1/health` — `200 {"status":"UP"}`.
- `curl http://localhost:8080/api/v1/foo-nao-existe` — `404` com `type=https://bragas.com/errors/not-found`.
- Backend rodando às 22h BRT aceita pedidos sem `store-closed` (relógio do servidor em América/SP).
- `POST /orders` com `productId=braguinha` (não estava nos seeds antigos) — aceito.
- `POST /orders` com `address.neighborhood=Cachambi` (não estava nos seeds antigos) — aceito com `fee` calculada do JSON.
- Suíte do front (PR #5) continua verde — esse fix não toca front.

---

## 7. Branch e merge

Branch nova: `fix/sp3-bugs`, criada a partir de `master` (commit `e817d4a`).

PR #5 (SP4a, `feat/integration`) **não bloqueia** essa correção — ambas saem de `master` e podem ser mergeadas em qualquer ordem. Não há conflito de arquivo (essa branch só toca `backend/`).

Memória `project-sp3-bugs-pendentes.md` deve ser **removida** assim que essa PR mergear (vira histórico já corrigido).

---

## 8. Pendências explicitamente fora deste fix

| Item | Onde |
|------|------|
| Migrar cardápio pro banco | SP5 |
| Cupons editáveis pelo admin | SP5 |
| Substituir `X-Admin-Token` por sessão | SP5 |
| `/actuator/health` com auth | SP6 (observabilidade) |
| Rate limit e HTTPS | SP6 |
