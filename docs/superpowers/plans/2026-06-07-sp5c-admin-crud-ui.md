# SP5c — Admin CRUD UI: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar UI web admin sob `/admin/*` no mesmo Next.js: login, sidebar, fila de pedidos com polling 10s + tabs por status + notificação sonora, CRUDs (produtos/categorias/cupons) via modais inline. Adicionar 1 endpoint backend (`GET /api/v1/admin/orders`). Remover duplicação WhatsApp do checkout.

**Architecture:** Mesma codebase Next.js App Router. `AdminAuthProvider` paralelo ao `AuthProvider` cliente (cookies `bb_admin` e `bb_session` são isolados, validado em `CrossCookieIsolationIT`). Polling 10s com `AbortController` + pausa em `document.hidden`. CRUDs via refetch-após-mutação (sem otimismo). Backend ganha `GET /admin/orders` com paginação + filtro por status.

**Tech Stack:** Next.js 16 + React 19 + TypeScript + Tailwind v4 (frontend) · Java 21 + Spring Boot 4.0.6 + Spring Data JPA + JUnit 5 + AssertJ + Testcontainers Postgres + MockMvc (backend) · Vitest + Testing Library (testes front).

---

## File Structure (mapa)

**Criar — backend (3):**
- `backend/src/main/java/com/bragas/api/order/dto/OrderListResponse.java` — wrapper paginado
- `backend/src/test/java/com/bragas/api/order/OrderAdminControllerListIT.java` — 6 ITs
- (Audit `OrderResponse` pra `customerName` + `customerPhone`; adicionar se faltar)

**Modificar — backend (3):**
- `backend/src/main/java/com/bragas/api/order/OrderRepository.java` — +1 método derived
- `backend/src/main/java/com/bragas/api/order/OrderService.java` — +1 método de busca
- `backend/src/main/java/com/bragas/api/order/OrderAdminController.java` — +`@GetMapping`

**Criar — front primitivos UI (6):**
- `components/ui/Modal.tsx` + `.test.tsx`
- `components/ui/FormField.tsx` + `.test.tsx`
- `components/ui/ConfirmDialog.tsx` + `.test.tsx`
- `components/ui/Switch.tsx` + `.test.tsx`
- `components/ui/Select.tsx` + `.test.tsx`
- `components/ui/DateInput.tsx` + `.test.tsx`

**Criar — front lib admin (4):**
- `lib/admin-api.ts` + `.test.ts`
- `lib/admin-auth.tsx` + `.test.tsx`
- `lib/admin-orders.ts` + `.test.ts`
- `lib/admin-catalog.ts` + `.test.ts`

**Criar — front components/admin (16):**
- `AdminSidebar.tsx`, `AdminHeader.tsx`, `AdminAuthGate.tsx`, `AdminLoginForm.tsx`
- `AdminPageHeader.tsx`, `AdminTable.tsx`, `RowActions.tsx`, `InlineToggle.tsx`, `FormModal.tsx`
- `OrderQueueTabs.tsx`, `OrderCard.tsx`
- `ProductsTable.tsx`, `CategoriesTable.tsx`, `CouponsTable.tsx`
- `ProductFormModal.tsx`, `CategoryFormModal.tsx`, `CouponFormModal.tsx`
- (cada um com `.test.tsx`)

**Criar — front páginas (7):**
- `app/admin/entrar/page.tsx`
- `app/admin/layout.tsx`
- `app/admin/page.tsx` (redirect)
- `app/admin/pedidos/page.tsx` + `.test.tsx`
- `app/admin/produtos/page.tsx` + `.test.tsx`
- `app/admin/categorias/page.tsx` + `.test.tsx`
- `app/admin/cupons/page.tsx` + `.test.tsx`

**Criar — assets (1):**
- `public/admin/new-order.mp3` (curto ~0.5s, ~10–50KB)

**Modificar — front (3):**
- `app/checkout/page.tsx` — remove WhatsApp do submit
- `app/checkout/page.test.tsx` — atualiza asserts
- `components/checkout/OrderStatusScreen.tsx` — atualiza texto status RECEIVED
- `lib/order-message.ts` — remove `buildWhatsAppMessage` se não há outros consumidores

---

## Pré-requisitos

- Branch `feat/sp5c-admin-crud-ui` checkada (já criada a partir de master `06856ca`).
- Docker Desktop rodando (Testcontainers Postgres).
- `backend/.env` local com `ADMIN_BOOTSTRAP_EMAIL=admin@bragas.local`, `ADMIN_BOOTSTRAP_PASSWORD=SuaNovaSenha123`, `JWT_SECRET=<valor existente>`.
- Verificar:
  ```bash
  git branch --show-current     # esperado: feat/sp5c-admin-crud-ui
  git log --oneline -2          # esperado: spec commit + 06856ca
  docker info | head -3
  ```

---

### Task 1: Backend — endpoint GET /api/v1/admin/orders

**Files:**
- Modify: `backend/src/main/java/com/bragas/api/order/OrderRepository.java`
- Modify: `backend/src/main/java/com/bragas/api/order/OrderService.java`
- Modify: `backend/src/main/java/com/bragas/api/order/OrderAdminController.java`
- Modify: `backend/src/main/java/com/bragas/api/order/dto/OrderResponse.java` (se faltar customer fields)
- Create: `backend/src/main/java/com/bragas/api/order/dto/OrderListResponse.java`
- Create: `backend/src/test/java/com/bragas/api/order/OrderAdminControllerListIT.java`

- [ ] **Step 1: Auditar `OrderResponse` quanto a customerName/Phone**

Abra `backend/src/main/java/com/bragas/api/order/dto/OrderResponse.java`. Se NÃO expõe `customerName` e `customerPhone`, adicione esses 2 campos no record + popule em `from(Order)` puxando de `order.getCustomer().getName()` e `getPhone()`. Se já expõe, pule este step.

- [ ] **Step 2: Criar `OrderListResponse` wrapper paginado**

Crie `backend/src/main/java/com/bragas/api/order/dto/OrderListResponse.java`:

```java
package com.bragas.api.order.dto;

import java.util.List;

public record OrderListResponse(
    List<OrderResponse> items,
    int page,
    int size,
    long total
) {}
```

- [ ] **Step 3: Adicionar método derived no `OrderRepository`**

Edite `backend/src/main/java/com/bragas/api/order/OrderRepository.java`. Adicione (mantendo imports existentes):

```java
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.bragas.api.order.domain.OrderStatus;
import java.util.Set;

// dentro da interface:
Page<Order> findByStatusInOrderByCreatedAtDesc(Set<OrderStatus> statuses, Pageable pageable);
```

- [ ] **Step 4: Adicionar `searchByStatus` em `OrderService`**

Edite `backend/src/main/java/com/bragas/api/order/OrderService.java`. Adicione método:

```java
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.bragas.api.order.domain.OrderStatus;
import java.util.Set;

@org.springframework.transaction.annotation.Transactional(readOnly = true)
public Page<Order> searchByStatus(Set<OrderStatus> statuses, Pageable pageable) {
    return orderRepository.findByStatusInOrderByCreatedAtDesc(statuses, pageable);
}
```

(Use o nome do field do repository existente em `OrderService` — provavelmente `orderRepository` ou `repo`; ajuste se for diferente.)

- [ ] **Step 5: Escrever os 6 ITs ANTES de implementar o controller (TDD)**

Crie `backend/src/test/java/com/bragas/api/order/OrderAdminControllerListIT.java`:

```java
package com.bragas.api.order;

import com.bragas.api.auth.admin.AdminAuthTestHelper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class OrderAdminControllerListIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired MockMvc mvc;

    private Cookie adminCookie() throws Exception {
        return AdminAuthTestHelper.loginAndGetCookie(mvc);
    }

    private void createOrder(String displayId) throws Exception {
        // Mínimo viável de payload pra criar order: ajuste de acordo com a sua
        // existente OrderControllerIT helper. Provavelmente:
        String body = """
            {
              "customer": {"name":"Cli","phone":"(21) 99999-0000"},
              "items":[{"productId":"x-burguer","quantity":1}],
              "payment":"cash",
              "method":"delivery",
              "address":{"street":"R Teste","number":"1","district":"Centro","city":"Rio","reference":"-"}
            }
            """;
        mvc.perform(post("/api/v1/orders").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated());
    }

    @Test
    void returns_active_orders_by_default() throws Exception {
        createOrder("a"); createOrder("b"); createOrder("c"); // todos RECEIVED

        mvc.perform(get("/api/v1/admin/orders").cookie(adminCookie()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(3))
            .andExpect(jsonPath("$.total").value(3));
    }

    @Test
    void filters_by_status_csv() throws Exception {
        createOrder("a");
        // O 2o pedido seria PREPARING — ajuste se você tem helper pra mudar status

        mvc.perform(get("/api/v1/admin/orders?status=RECEIVED").cookie(adminCookie()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].status", org.hamcrest.Matchers.everyItem(
                org.hamcrest.Matchers.equalTo("RECEIVED"))));
    }

    @Test
    void paginates_with_page_and_size() throws Exception {
        for (int i = 0; i < 5; i++) createOrder("p" + i);

        mvc.perform(get("/api/v1/admin/orders?size=2&page=1").cookie(adminCookie()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(2))
            .andExpect(jsonPath("$.page").value(1))
            .andExpect(jsonPath("$.size").value(2))
            .andExpect(jsonPath("$.total").value(5));
    }

    @Test
    void rejects_invalid_status() throws Exception {
        mvc.perform(get("/api/v1/admin/orders?status=BANANA").cookie(adminCookie()))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.type").value("https://bragas.com/errors/validation-failed"));
    }

    @Test
    void unauthenticated_returns_401() throws Exception {
        mvc.perform(get("/api/v1/admin/orders"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.type").value("https://bragas.com/errors/unauthenticated"));
    }

    @Test
    void clamps_size_to_max_100() throws Exception {
        mvc.perform(get("/api/v1/admin/orders?size=500").cookie(adminCookie()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.size").value(100));
    }
}
```

- [ ] **Step 6: Rodar os ITs — devem falhar (endpoint não existe)**

```bash
cd backend && ./gradlew test --tests 'com.bragas.api.order.OrderAdminControllerListIT'
```

Esperado: compilation OK (helpers existem), mas testes falham com 404 ou erro do MockMvc.

- [ ] **Step 7: Implementar o endpoint no `OrderAdminController`**

Edite `backend/src/main/java/com/bragas/api/order/OrderAdminController.java`. Substitua a classe inteira por:

```java
package com.bragas.api.order;

import com.bragas.api.auth.admin.CurrentAdmin;
import com.bragas.api.common.DomainValidationException;
import com.bragas.api.order.domain.Order;
import com.bragas.api.order.domain.OrderStatus;
import com.bragas.api.order.dto.OrderListResponse;
import com.bragas.api.order.dto.OrderResponse;
import com.bragas.api.order.dto.UpdateStatusRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin/orders")
public class OrderAdminController {

    private static final Logger log = LoggerFactory.getLogger(OrderAdminController.class);
    private static final Set<OrderStatus> DEFAULT_STATUSES =
        Set.of(OrderStatus.RECEIVED, OrderStatus.PREPARING, OrderStatus.OUT);
    private static final int MAX_SIZE = 100;

    private final OrderService service;

    public OrderAdminController(OrderService service) {
        this.service = service;
    }

    @GetMapping
    public OrderListResponse list(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        if (page < 0) page = 0;
        if (size < 1) size = 1;
        if (size > MAX_SIZE) size = MAX_SIZE;

        Set<OrderStatus> statuses = parseStatuses(status);

        Page<Order> result = service.searchByStatus(statuses, PageRequest.of(page, size));
        List<OrderResponse> items = result.getContent().stream()
            .map(OrderResponse::from).toList();

        log.info("admin.action action=GET resource=orders status={} page={} size={} returned={} actor={}",
            statuses.stream().map(Enum::name).sorted().collect(Collectors.joining(",")),
            page, size, items.size(), CurrentAdmin.id());

        return new OrderListResponse(items, page, size, result.getTotalElements());
    }

    private Set<OrderStatus> parseStatuses(String raw) {
        if (raw == null || raw.isBlank()) return DEFAULT_STATUSES;
        Set<OrderStatus> out = EnumSet.noneOf(OrderStatus.class);
        for (String token : raw.split(",")) {
            String t = token.trim().toUpperCase();
            if (t.isEmpty()) continue;
            try {
                out.add(OrderStatus.valueOf(t));
            } catch (IllegalArgumentException e) {
                throw new DomainValidationException("validation-failed",
                    "Status inválido",
                    "Valores válidos: " + Arrays.toString(OrderStatus.values()));
            }
        }
        return out.isEmpty() ? DEFAULT_STATUSES : out;
    }

    @PatchMapping("/{id}/status")
    public OrderResponse updateStatus(@PathVariable String id, @RequestBody @Valid UpdateStatusRequest req) {
        return OrderResponse.from(service.transitionStatus(id, req.to()));
    }
}
```

- [ ] **Step 8: Rodar ITs — devem passar**

```bash
./gradlew test --tests 'com.bragas.api.order.OrderAdminControllerListIT'
```

Esperado: 6/6 PASS.

> **Se `filters_by_status_csv` falhar** porque não consegue criar pedido em PREPARING: confirme se há helper público que cria order em status arbitrário, ou faça via service direto (`@Autowired OrderService` + `transitionStatus()`).

- [ ] **Step 9: Suite completa backend**

```bash
./gradlew test
```

Esperado: baseline 153 + 6 novos = 159 verdes. (Flake conhecida `CrossCookieIsolationIT` pode aparecer — re-rodar isolado se necessário, é blame Testcontainers não nosso.)

- [ ] **Step 10: Commit**

```bash
git add backend/src/main/java/com/bragas/api/order/OrderRepository.java \
        backend/src/main/java/com/bragas/api/order/OrderService.java \
        backend/src/main/java/com/bragas/api/order/OrderAdminController.java \
        backend/src/main/java/com/bragas/api/order/dto/OrderListResponse.java \
        backend/src/main/java/com/bragas/api/order/dto/OrderResponse.java \
        backend/src/test/java/com/bragas/api/order/OrderAdminControllerListIT.java
git commit -m "$(cat <<'EOF'
feat(sp5c): GET /api/v1/admin/orders com filtro de status + paginacao

Endpoint admin lista pedidos com query params status (CSV opcional,
default RECEIVED+PREPARING+OUT), page (default 0), size (default 20,
clamp 100). Ordena por createdAt DESC. Audit log inclui status, page,
size, returned, actor. Status invalido = 400 validation-failed.
OrderRepository ganha findByStatusInOrderByCreatedAtDesc (derived).
OrderResponse expoe customerName + customerPhone pro painel admin
mostrar contato. OrderListResponse wrapper com items + page + size +
total.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Front — primitivos UI (Modal, FormField, ConfirmDialog, Switch, Select, DateInput)

**Files (6 components + 6 testes):**
- Create: `components/ui/Modal.tsx` + `.test.tsx`
- Create: `components/ui/FormField.tsx` + `.test.tsx`
- Create: `components/ui/ConfirmDialog.tsx` + `.test.tsx`
- Create: `components/ui/Switch.tsx` + `.test.tsx`
- Create: `components/ui/Select.tsx` + `.test.tsx`
- Create: `components/ui/DateInput.tsx` + `.test.tsx`

- [ ] **Step 1: `Modal.tsx` — implementação**

Crie `components/ui/Modal.tsx`:

```tsx
'use client';

import { ReactNode, useEffect, useRef } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  labelledBy: string; // id do elemento que tem o título
  children: ReactNode;
  closeOnOverlay?: boolean; // default true
};

export function Modal({ open, onClose, labelledBy, children, closeOnOverlay = true }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusables = dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    focusables[0]?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Tab' && focusables.length > 0) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (closeOnOverlay && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
      >
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `Modal.test.tsx`**

Crie `components/ui/Modal.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(
      <Modal open={false} onClose={vi.fn()} labelledBy="t">x</Modal>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders dialog with aria-labelledby when open', () => {
    render(
      <Modal open onClose={vi.fn()} labelledBy="t">
        <h2 id="t">Título</h2>
      </Modal>
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 't');
  });

  it('calls onClose on Escape', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} labelledBy="t"><h2 id="t">x</h2></Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose on overlay click', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} labelledBy="t"><h2 id="t">x</h2></Modal>);
    fireEvent.click(screen.getByRole('dialog').parentElement!);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not close on overlay when closeOnOverlay=false', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} labelledBy="t" closeOnOverlay={false}>
        <h2 id="t">x</h2>
      </Modal>
    );
    fireEvent.click(screen.getByRole('dialog').parentElement!);
    expect(onClose).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: `Switch.tsx` + teste**

Crie `components/ui/Switch.tsx`:

```tsx
'use client';

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  'aria-label'?: string;
  disabled?: boolean;
};

export function Switch({ checked, onChange, disabled, 'aria-label': ariaLabel }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
        checked ? 'bg-red-600' : 'bg-neutral-300'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
```

Crie `components/ui/Switch.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Switch } from './Switch';

describe('Switch', () => {
  it('renders with aria-checked reflecting checked', () => {
    render(<Switch checked onChange={vi.fn()} aria-label="X" />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('toggles on click', () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} aria-label="X" />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('does not fire when disabled', () => {
    const onChange = vi.fn();
    render(<Switch checked onChange={onChange} disabled aria-label="X" />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: `Select.tsx` + teste**

Crie `components/ui/Select.tsx`:

```tsx
'use client';

type Option = { value: string; label: string };

type Props = {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  'aria-label'?: string;
};

export function Select({ value, onChange, options, placeholder, id, disabled, 'aria-label': ariaLabel }: Props) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label={ariaLabel}
      className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-red-600 focus:outline-none disabled:opacity-50"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
```

Crie `components/ui/Select.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Select } from './Select';

describe('Select', () => {
  it('renders options and reflects value', () => {
    render(
      <Select
        value="b"
        onChange={vi.fn()}
        aria-label="X"
        options={[
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta' },
        ]}
      />
    );
    expect(screen.getByRole('combobox')).toHaveValue('b');
  });

  it('calls onChange on selection', () => {
    const onChange = vi.fn();
    render(
      <Select
        value="a"
        onChange={onChange}
        aria-label="X"
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ]}
      />
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } });
    expect(onChange).toHaveBeenCalledWith('b');
  });
});
```

- [ ] **Step 5: `FormField.tsx` + teste**

Crie `components/ui/FormField.tsx`:

```tsx
'use client';

import { ReactNode } from 'react';

type Props = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
};

export function FormField({ label, htmlFor, error, hint, required, children }: Props) {
  return (
    <div className="mb-4">
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-neutral-700">
        {label}
        {required && <span className="ml-1 text-red-600" aria-hidden>*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
    </div>
  );
}
```

Crie `components/ui/FormField.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormField } from './FormField';

describe('FormField', () => {
  it('renders label associated with input', () => {
    render(
      <FormField label="Nome" htmlFor="name">
        <input id="name" />
      </FormField>
    );
    expect(screen.getByLabelText('Nome')).toBeInTheDocument();
  });

  it('shows error with role=alert', () => {
    render(
      <FormField label="X" htmlFor="x" error="Obrigatório">
        <input id="x" />
      </FormField>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Obrigatório');
  });

  it('shows asterisk when required', () => {
    render(<FormField label="X" htmlFor="x" required><input id="x" /></FormField>);
    expect(screen.getByText('*')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: `ConfirmDialog.tsx` + teste**

Crie `components/ui/ConfirmDialog.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { Modal } from './Modal';

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  destructive, onConfirm, onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      // Foco inicial em Cancelar previne delete acidental por Enter
      requestAnimationFrame(() => cancelRef.current?.focus());
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onCancel} labelledBy="confirm-title">
      <h2 id="confirm-title" className="text-lg font-semibold text-neutral-900">{title}</h2>
      <p className="mt-2 text-sm text-neutral-700">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`rounded px-4 py-2 text-sm font-medium text-white ${
            destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-neutral-800 hover:bg-neutral-900'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
```

Crie `components/ui/ConfirmDialog.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  const props = {
    title: 'Excluir produto?',
    message: 'Esta ação não pode ser desfeita.',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('calls onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...props} open onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('Confirmar'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...props} open onCancel={onCancel} />);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onCancel).toHaveBeenCalled();
  });
});
```

- [ ] **Step 7: `DateInput.tsx` + teste**

Crie `components/ui/DateInput.tsx`:

```tsx
'use client';

type Props = {
  id?: string;
  value: string; // ISO YYYY-MM-DD
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
};

export function DateInput({ id, value, onChange, min, max, disabled }: Props) {
  return (
    <input
      id={id}
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min={min}
      max={max}
      disabled={disabled}
      className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-red-600 focus:outline-none disabled:opacity-50"
    />
  );
}
```

Crie `components/ui/DateInput.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DateInput } from './DateInput';

describe('DateInput', () => {
  it('emits ISO value on change', () => {
    const onChange = vi.fn();
    render(<DateInput value="" onChange={onChange} id="d" />);
    fireEvent.change(screen.getByDisplayValue(''), { target: { value: '2026-06-07' } });
    expect(onChange).toHaveBeenCalledWith('2026-06-07');
  });
});
```

- [ ] **Step 8: Rodar testes — devem passar**

```bash
cd .. # voltar pra raiz se ainda em backend/
npm test -- components/ui --run
```

Esperado: 6 arquivos novos verdes.

- [ ] **Step 9: Commit**

```bash
git add components/ui/Modal.tsx components/ui/Modal.test.tsx \
        components/ui/FormField.tsx components/ui/FormField.test.tsx \
        components/ui/ConfirmDialog.tsx components/ui/ConfirmDialog.test.tsx \
        components/ui/Switch.tsx components/ui/Switch.test.tsx \
        components/ui/Select.tsx components/ui/Select.test.tsx \
        components/ui/DateInput.tsx components/ui/DateInput.test.tsx
git commit -m "$(cat <<'EOF'
feat(sp5c): primitivos UI - Modal, FormField, ConfirmDialog, Switch, Select, DateInput

Componentes base acessiveis pra reuso no painel admin: Modal com focus
trap + Escape + overlay click, FormField com label + error + asterisk,
ConfirmDialog com foco inicial em Cancelar (evita delete acidental),
Switch com role=switch + aria-checked, Select estilizado, DateInput
nativo pt-BR. Cada um com testes unit (~15 testes novos).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Front — `admin-api` client + `AdminAuthProvider`

**Files:**
- Create: `lib/admin-api.ts` + `lib/admin-api.test.ts`
- Create: `lib/admin-auth.tsx` + `lib/admin-auth.test.tsx`

> **Padrões a seguir:** abra `lib/api-client.ts` e `lib/auth-context.tsx` antes — `admin-api` espelha `api-client` (mesma `ApiError`, mesmo `credentials: 'include'`), `admin-auth` espelha `auth-context` (mesmo formato de provider + hook).

- [ ] **Step 1: `lib/admin-api.ts`**

```typescript
import { ApiError, humanize } from './api-client';

// Re-exporta pra consumidores admin não precisarem importar de dois lugares
export { ApiError, humanize };

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

async function req<T>(path: string, init?: RequestInit & { signal?: AbortSignal }): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (res.status === 204) return undefined as T;

  let body: unknown = null;
  try { body = await res.json(); } catch { /* sem body */ }

  if (!res.ok) {
    const pd = (body as Record<string, unknown>) ?? {};
    throw new ApiError({
      type: String(pd.type ?? 'about:blank').split('/').pop() ?? 'unknown',
      title: String(pd.title ?? 'Erro'),
      status: res.status,
      detail: pd.detail ? String(pd.detail) : undefined,
    });
  }

  return body as T;
}

// === Tipos partilhados ===

export type OrderStatus = 'RECEIVED' | 'PREPARING' | 'OUT' | 'DELIVERED' | 'CANCELLED';

export type AdminOrder = {
  id: string;
  displayId: string;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  items: Array<{ productId: string; name: string; quantity: number; unitPrice: number; notes?: string }>;
  totals: { subtotal: number; discount: number; deliveryFee: number; total: number };
  createdAt: string;
};

export type AdminOrderList = {
  items: AdminOrder[];
  page: number;
  size: number;
  total: number;
};

export type AdminProduct = {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  priceFrom?: number;
  imageUrl?: string;
  featured: boolean;
  available: boolean;
  displayOrder: number;
};

export type AdminCategory = {
  id: string;
  name: string;
  displayOrder: number;
  layout: 'grid' | 'list';
};

export type AdminCoupon = {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minSubtotal?: number;
  validFrom?: string;
  validUntil?: string;
  active: boolean;
};

export type AdminUser = { id: string; email: string; name: string; createdAt: string };

// === Auth ===

export const me = (signal?: AbortSignal) => req<AdminUser>('/api/v1/auth/admin/me', { signal });
export const login = (email: string, password: string) =>
  req<void>('/api/v1/auth/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) });
export const logout = () => req<void>('/api/v1/auth/admin/logout', { method: 'POST' });

// === Orders ===

export type GetOrdersParams = { status?: string; page?: number; size?: number; signal?: AbortSignal };

export function getOrders({ status, page, size, signal }: GetOrdersParams = {}) {
  const qs = new URLSearchParams();
  if (status) qs.set('status', status);
  if (page !== undefined) qs.set('page', String(page));
  if (size !== undefined) qs.set('size', String(size));
  const suffix = qs.toString() ? `?${qs}` : '';
  return req<AdminOrderList>(`/api/v1/admin/orders${suffix}`, { signal });
}

export const updateOrderStatus = (id: string, to: OrderStatus) =>
  req<AdminOrder>(`/api/v1/admin/orders/${id}/status`, {
    method: 'PATCH', body: JSON.stringify({ to }),
  });

// === Products ===

export const listProducts = (params?: { categoryId?: string }, signal?: AbortSignal) => {
  const qs = params?.categoryId ? `?categoryId=${encodeURIComponent(params.categoryId)}` : '';
  return req<AdminProduct[]>(`/api/v1/admin/products${qs}`, { signal });
};
export const createProduct = (p: AdminProduct) =>
  req<AdminProduct>('/api/v1/admin/products', { method: 'POST', body: JSON.stringify(p) });
export const updateProduct = (id: string, patch: Partial<AdminProduct>) =>
  req<AdminProduct>(`/api/v1/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
export const deleteProduct = (id: string) =>
  req<void>(`/api/v1/admin/products/${id}`, { method: 'DELETE' });

// === Categories ===

export const listCategories = (signal?: AbortSignal) =>
  req<AdminCategory[]>('/api/v1/admin/categories', { signal });
export const createCategory = (c: AdminCategory) =>
  req<AdminCategory>('/api/v1/admin/categories', { method: 'POST', body: JSON.stringify(c) });
export const updateCategory = (id: string, patch: Partial<AdminCategory>) =>
  req<AdminCategory>(`/api/v1/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
export const deleteCategory = (id: string) =>
  req<void>(`/api/v1/admin/categories/${id}`, { method: 'DELETE' });

// === Coupons ===

export const listCoupons = (signal?: AbortSignal) =>
  req<AdminCoupon[]>('/api/v1/admin/coupons', { signal });
export const createCoupon = (c: AdminCoupon) =>
  req<AdminCoupon>('/api/v1/admin/coupons', { method: 'POST', body: JSON.stringify(c) });
export const updateCoupon = (code: string, patch: Partial<AdminCoupon>) =>
  req<AdminCoupon>(`/api/v1/admin/coupons/${code}`, { method: 'PATCH', body: JSON.stringify(patch) });
export const deleteCoupon = (code: string) =>
  req<void>(`/api/v1/admin/coupons/${code}`, { method: 'DELETE' });
```

- [ ] **Step 2: `lib/admin-api.test.ts`**

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as adminApi from './admin-api';
import { ApiError } from './admin-api';

const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = vi.fn();
});
afterEach(() => {
  global.fetch = originalFetch;
});

function mockFetchOk(body: unknown, status = 200) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: true, status,
    json: async () => body,
  });
}

function mockFetchError(status: number, body: unknown) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: false, status,
    json: async () => body,
  });
}

describe('admin-api', () => {
  it('me() does GET with credentials include', async () => {
    mockFetchOk({ id: 'adm_1', email: 'a@b', name: 'A', createdAt: '2026-06-07T00:00:00Z' });
    await adminApi.me();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/auth/admin/me'),
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('login() posts JSON body', async () => {
    mockFetchOk(null, 204);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true, status: 204, json: async () => null,
    });
    await adminApi.login('a@b', 'pwd');
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1].method).toBe('POST');
    expect(JSON.parse(call[1].body)).toEqual({ email: 'a@b', password: 'pwd' });
  });

  it('getOrders() builds query string', async () => {
    mockFetchOk({ items: [], page: 0, size: 20, total: 0 });
    await adminApi.getOrders({ status: 'RECEIVED', page: 1, size: 50 });
    const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(url).toContain('status=RECEIVED');
    expect(url).toContain('page=1');
    expect(url).toContain('size=50');
  });

  it('throws ApiError with parsed problem details on 401', async () => {
    mockFetchError(401, {
      type: 'https://bragas.com/errors/unauthenticated',
      title: 'Não autenticado',
      detail: 'Faça login.',
    });
    await expect(adminApi.me()).rejects.toMatchObject({
      name: 'ApiError', type: 'unauthenticated', status: 401,
    });
  });

  it('updateOrderStatus PATCHes with to', async () => {
    mockFetchOk({ id: 'o1', status: 'PREPARING' });
    await adminApi.updateOrderStatus('o1', 'PREPARING');
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1].method).toBe('PATCH');
    expect(JSON.parse(call[1].body)).toEqual({ to: 'PREPARING' });
  });

  it('exports ApiError reusing api-client class', () => {
    const e = new ApiError({ type: 'x', title: 'T', status: 500 });
    expect(e).toBeInstanceOf(ApiError);
  });
});
```

- [ ] **Step 3: `lib/admin-auth.tsx`**

```tsx
'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import * as adminApi from './admin-api';
import { ApiError } from './admin-api';

type AdminUser = adminApi.AdminUser;

type AdminAuthState = {
  admin: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AdminAuthState | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const u = await adminApi.me();
      setAdmin(u);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setAdmin(null);
      } else {
        // network/5xx: deixa admin como está; logout deliberado pra resetar
        setAdmin(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    await adminApi.login(email, password);
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try { await adminApi.logout(); } catch { /* segue */ }
    setAdmin(null);
  }, []);

  return (
    <Ctx.Provider value={{ admin, loading, login, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAdminAuth(): AdminAuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAdminAuth must be used inside <AdminAuthProvider>');
  return v;
}
```

- [ ] **Step 4: `lib/admin-auth.test.tsx`**

```tsx
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminAuthProvider, useAdminAuth } from './admin-auth';
import * as adminApi from './admin-api';
import { ApiError } from './admin-api';

function Probe() {
  const { admin, loading } = useAdminAuth();
  if (loading) return <span>loading</span>;
  return <span>{admin ? admin.email : 'guest'}</span>;
}

beforeEach(() => {
  vi.spyOn(adminApi, 'me').mockReset();
  vi.spyOn(adminApi, 'login').mockReset();
  vi.spyOn(adminApi, 'logout').mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe('AdminAuthProvider', () => {
  it('exposes admin after successful me()', async () => {
    vi.spyOn(adminApi, 'me').mockResolvedValue({
      id: 'adm_1', email: 'a@b', name: 'A', createdAt: '2026-06-07T00:00:00Z',
    });
    render(<AdminAuthProvider><Probe /></AdminAuthProvider>);
    expect(screen.getByText('loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('a@b')).toBeInTheDocument());
  });

  it('sets admin=null on 401', async () => {
    vi.spyOn(adminApi, 'me').mockRejectedValue(
      new ApiError({ type: 'unauthenticated', title: 'X', status: 401 })
    );
    render(<AdminAuthProvider><Probe /></AdminAuthProvider>);
    await waitFor(() => expect(screen.getByText('guest')).toBeInTheDocument());
  });

  it('login() refreshes admin state', async () => {
    vi.spyOn(adminApi, 'me')
      .mockRejectedValueOnce(new ApiError({ type: 'unauthenticated', title: 'X', status: 401 }))
      .mockResolvedValueOnce({ id: 'adm_1', email: 'a@b', name: 'A', createdAt: '' });
    vi.spyOn(adminApi, 'login').mockResolvedValue(undefined as unknown as void);

    function Caller() {
      const { admin, login } = useAdminAuth();
      return (
        <>
          <button onClick={() => login('a@b', 'pwd')}>go</button>
          <span data-testid="who">{admin?.email ?? 'guest'}</span>
        </>
      );
    }
    render(<AdminAuthProvider><Caller /></AdminAuthProvider>);
    await waitFor(() => expect(screen.getByTestId('who')).toHaveTextContent('guest'));
    await act(async () => { screen.getByText('go').click(); });
    await waitFor(() => expect(screen.getByTestId('who')).toHaveTextContent('a@b'));
  });
});
```

- [ ] **Step 5: Rodar testes**

```bash
npm test -- lib/admin-api lib/admin-auth --run
```

Esperado: ~10 testes verdes (admin-api 6 + admin-auth 3 + setup).

- [ ] **Step 6: Commit**

```bash
git add lib/admin-api.ts lib/admin-api.test.ts lib/admin-auth.tsx lib/admin-auth.test.tsx
git commit -m "$(cat <<'EOF'
feat(sp5c): admin-api client + AdminAuthProvider

lib/admin-api.ts espelha api-client (mesma ApiError + credentials
include) com wrappers tipados pra /admin/orders, /admin/products,
/admin/categories, /admin/coupons + auth admin (me/login/logout).
lib/admin-auth.tsx provider client-side analogo ao auth-context do
SP4b: mount chama me(), login() faz POST+refresh, logout() limpa
state. 401 marca admin=null pra AdminAuthGate interceptar.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Front — componentes admin shared

**Files (5 components + tests):**
- Create: `components/admin/AdminPageHeader.tsx` + `.test.tsx`
- Create: `components/admin/AdminTable.tsx` + `.test.tsx`
- Create: `components/admin/RowActions.tsx` + `.test.tsx`
- Create: `components/admin/InlineToggle.tsx` + `.test.tsx`
- Create: `components/admin/FormModal.tsx` + `.test.tsx`

- [ ] **Step 1: `AdminPageHeader.tsx` + teste**

```tsx
// components/admin/AdminPageHeader.tsx
'use client';
import { ReactNode } from 'react';

type Props = { title: string; action?: ReactNode };

export function AdminPageHeader({ title, action }: Props) {
  return (
    <header className="flex items-center justify-between border-b border-neutral-200 pb-4">
      <h1 className="text-2xl font-semibold text-neutral-900">{title}</h1>
      {action}
    </header>
  );
}
```

```tsx
// components/admin/AdminPageHeader.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdminPageHeader } from './AdminPageHeader';

describe('AdminPageHeader', () => {
  it('renders title and optional action', () => {
    render(<AdminPageHeader title="Produtos" action={<button>Novo</button>} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Produtos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Novo' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: `AdminTable.tsx` + teste**

```tsx
// components/admin/AdminTable.tsx
'use client';
import { ReactNode } from 'react';

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
};

export function AdminTable<T>({ columns, rows, rowKey, emptyMessage = 'Nada por aqui.' }: Props<T>) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-neutral-500">{emptyMessage}</p>;
  }
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-neutral-100 text-neutral-700">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`px-3 py-2 font-medium ${c.className ?? ''}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-t border-neutral-200 hover:bg-neutral-50">
              {columns.map((c) => (
                <td key={c.key} className={`px-3 py-2 ${c.className ?? ''}`}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

```tsx
// components/admin/AdminTable.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdminTable } from './AdminTable';

describe('AdminTable', () => {
  it('renders columns and rows', () => {
    render(
      <AdminTable
        columns={[
          { key: 'n', header: 'Nome', render: (r: { n: string }) => r.n },
        ]}
        rows={[{ n: 'A' }, { n: 'B' }]}
        rowKey={(r) => r.n}
      />
    );
    expect(screen.getByText('Nome')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('shows empty message when no rows', () => {
    render(
      <AdminTable
        columns={[{ key: 'n', header: 'X', render: () => null }]}
        rows={[]}
        rowKey={() => 'k'}
        emptyMessage="Vazio."
      />
    );
    expect(screen.getByText('Vazio.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: `RowActions.tsx` + teste**

```tsx
// components/admin/RowActions.tsx
'use client';

type Props = {
  onEdit: () => void;
  onDelete: () => void;
  editLabel?: string;
  deleteLabel?: string;
};

export function RowActions({ onEdit, onDelete, editLabel = 'Editar', deleteLabel = 'Excluir' }: Props) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onEdit}
        className="text-sm text-neutral-700 underline-offset-4 hover:underline"
      >
        {editLabel}
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="text-sm text-red-600 underline-offset-4 hover:underline"
      >
        {deleteLabel}
      </button>
    </div>
  );
}
```

```tsx
// components/admin/RowActions.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RowActions } from './RowActions';

describe('RowActions', () => {
  it('calls callbacks on click', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<RowActions onEdit={onEdit} onDelete={onDelete} />);
    fireEvent.click(screen.getByText('Editar'));
    fireEvent.click(screen.getByText('Excluir'));
    expect(onEdit).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: `InlineToggle.tsx` + teste**

```tsx
// components/admin/InlineToggle.tsx
'use client';
import { useState } from 'react';
import { Switch } from '@/components/ui/Switch';

type Props = {
  initial: boolean;
  onToggle: (next: boolean) => Promise<unknown>;
  label: string;
};

export function InlineToggle({ initial, onToggle, label }: Props) {
  const [checked, setChecked] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function handle(next: boolean) {
    setBusy(true);
    setError(false);
    setChecked(next); // optimistic
    try {
      await onToggle(next);
    } catch {
      setChecked(!next); // revert
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Switch checked={checked} onChange={handle} aria-label={label} disabled={busy} />
      {error && <span className="text-xs text-red-600" role="alert">Falhou</span>}
    </span>
  );
}
```

```tsx
// components/admin/InlineToggle.test.tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InlineToggle } from './InlineToggle';

describe('InlineToggle', () => {
  it('toggles optimistically and confirms on success', async () => {
    const onToggle = vi.fn().mockResolvedValue(undefined);
    render(<InlineToggle initial={false} onToggle={onToggle} label="X" />);
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true'));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('reverts on error and shows alert', async () => {
    const onToggle = vi.fn().mockRejectedValue(new Error('boom'));
    render(<InlineToggle initial={false} onToggle={onToggle} label="X" />);
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });
});
```

- [ ] **Step 5: `FormModal.tsx` + teste**

```tsx
// components/admin/FormModal.tsx
'use client';
import { FormEvent, ReactNode } from 'react';
import { Modal } from '@/components/ui/Modal';

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  submitting?: boolean;
  error?: string | null;
  children: ReactNode;
  submitLabel?: string;
};

export function FormModal({
  open, title, onClose, onSubmit, submitting, error, children, submitLabel = 'Salvar',
}: Props) {
  const titleId = 'form-modal-title';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await onSubmit();
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId}>
      <form onSubmit={handleSubmit}>
        <h2 id={titleId} className="text-lg font-semibold text-neutral-900">{title}</h2>
        {error && (
          <div className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}
        <div className="mt-4">{children}</div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {submitting ? 'Salvando…' : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
```

```tsx
// components/admin/FormModal.test.tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FormModal } from './FormModal';

describe('FormModal', () => {
  it('submits form on Salvar click', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <FormModal open title="X" onClose={vi.fn()} onSubmit={onSubmit}>
        <input />
      </FormModal>
    );
    fireEvent.click(screen.getByText('Salvar'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it('shows error banner when error prop set', () => {
    render(
      <FormModal open title="X" onClose={vi.fn()} onSubmit={vi.fn()} error="Falhou">
        <input />
      </FormModal>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Falhou');
  });

  it('disables buttons while submitting', () => {
    render(
      <FormModal open title="X" onClose={vi.fn()} onSubmit={vi.fn()} submitting>
        <input />
      </FormModal>
    );
    expect(screen.getByText('Salvando…')).toBeDisabled();
    expect(screen.getByText('Cancelar')).toBeDisabled();
  });
});
```

- [ ] **Step 6: Rodar**

```bash
npm test -- components/admin/Admin components/admin/Row components/admin/Inline components/admin/Form --run
```

Esperado: 5 arquivos novos verdes.

- [ ] **Step 7: Commit**

```bash
git add components/admin/AdminPageHeader.tsx components/admin/AdminPageHeader.test.tsx \
        components/admin/AdminTable.tsx components/admin/AdminTable.test.tsx \
        components/admin/RowActions.tsx components/admin/RowActions.test.tsx \
        components/admin/InlineToggle.tsx components/admin/InlineToggle.test.tsx \
        components/admin/FormModal.tsx components/admin/FormModal.test.tsx
git commit -m "$(cat <<'EOF'
feat(sp5c): admin shared components (header, table, actions, toggle, form modal)

5 componentes reusados pelas paginas admin: AdminPageHeader (titulo +
acao), AdminTable (generic table com columns config + empty state),
RowActions (botoes editar/excluir), InlineToggle (switch que faz
PATCH otimista com revert em erro), FormModal (modal pra forms com
loading + error banner).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Front — shell admin (sidebar, header, gate, login)

**Files:**
- Create: `components/admin/AdminSidebar.tsx` + `.test.tsx`
- Create: `components/admin/AdminHeader.tsx` + `.test.tsx`
- Create: `components/admin/AdminAuthGate.tsx` + `.test.tsx`
- Create: `components/admin/AdminLoginForm.tsx` + `.test.tsx`
- Create: `app/admin/entrar/page.tsx`
- Create: `app/admin/layout.tsx`
- Create: `app/admin/page.tsx`

> **Padrão de Form/Login:** abra `components/auth/LoginForm.tsx` antes de escrever `AdminLoginForm`. Mesmo padrão de form state + `humanize(err)`.

- [ ] **Step 1: `AdminSidebar.tsx` + teste**

```tsx
// components/admin/AdminSidebar.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/admin/pedidos', label: 'Pedidos' },
  { href: '/admin/produtos', label: 'Produtos' },
  { href: '/admin/categorias', label: 'Categorias' },
  { href: '/admin/cupons', label: 'Cupons' },
];

export function AdminSidebar() {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="hidden md:block w-56 shrink-0 bg-neutral-900 text-neutral-100 min-h-screen">
      <div className="px-4 py-4 text-lg font-semibold">Bragas Admin</div>
      <ul>
        {ITEMS.map((it) => {
          const active = path?.startsWith(it.href);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? 'page' : undefined}
                className={`block px-4 py-2 hover:bg-neutral-800 ${
                  active ? 'bg-neutral-800 font-semibold' : ''
                }`}
              >
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

```tsx
// components/admin/AdminSidebar.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminSidebar } from './AdminSidebar';

vi.mock('next/navigation', () => ({ usePathname: () => '/admin/produtos' }));

describe('AdminSidebar', () => {
  it('highlights active link via aria-current', () => {
    render(<AdminSidebar />);
    const active = screen.getByRole('link', { name: 'Produtos' });
    expect(active).toHaveAttribute('aria-current', 'page');
    const other = screen.getByRole('link', { name: 'Pedidos' });
    expect(other).not.toHaveAttribute('aria-current');
  });
});
```

- [ ] **Step 2: `AdminHeader.tsx` + teste**

```tsx
// components/admin/AdminHeader.tsx
'use client';
import { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/Switch';
import { useAdminAuth } from '@/lib/admin-auth';
import { useRouter } from 'next/navigation';

const SOUND_KEY = 'admin-sound-enabled';

export function AdminHeader() {
  const { admin, logout } = useAdminAuth();
  const router = useRouter();
  const [sound, setSound] = useState(true);

  useEffect(() => {
    setSound(localStorage.getItem(SOUND_KEY) !== 'false');
  }, []);

  function toggleSound(next: boolean) {
    setSound(next);
    localStorage.setItem(SOUND_KEY, next ? 'true' : 'false');
  }

  async function handleLogout() {
    await logout();
    router.replace('/admin/entrar');
  }

  return (
    <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
      <div className="text-sm text-neutral-600">
        {admin && <>Logado como <strong>{admin.email}</strong></>}
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          Som
          <Switch checked={sound} onChange={toggleSound} aria-label="Som" />
        </label>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
```

```tsx
// components/admin/AdminHeader.test.tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminHeader } from './AdminHeader';

const logoutMock = vi.fn().mockResolvedValue(undefined);
const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: replaceMock }) }));
vi.mock('@/lib/admin-auth', () => ({
  useAdminAuth: () => ({ admin: { email: 'a@b' }, logout: logoutMock }),
}));

describe('AdminHeader', () => {
  it('logs out and redirects', async () => {
    render(<AdminHeader />);
    fireEvent.click(screen.getByText('Sair'));
    await waitFor(() => expect(logoutMock).toHaveBeenCalled());
    expect(replaceMock).toHaveBeenCalledWith('/admin/entrar');
  });

  it('persists sound preference in localStorage', () => {
    render(<AdminHeader />);
    fireEvent.click(screen.getByRole('switch'));
    expect(localStorage.getItem('admin-sound-enabled')).toBe('false');
  });
});
```

- [ ] **Step 3: `AdminAuthGate.tsx` + teste**

```tsx
// components/admin/AdminAuthGate.tsx
'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import { useAdminAuth } from '@/lib/admin-auth';

export function AdminAuthGate({ children }: { children: ReactNode }) {
  const { admin, loading } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !admin) {
      const next = encodeURIComponent(pathname || '/admin');
      router.replace(`/admin/entrar?next=${next}`);
    }
  }, [admin, loading, pathname, router]);

  if (loading) {
    return <div className="p-8 text-center text-sm text-neutral-500">Carregando…</div>;
  }
  if (!admin) {
    return null; // Aguardando redirect
  }
  return <>{children}</>;
}
```

```tsx
// components/admin/AdminAuthGate.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminAuthGate } from './AdminAuthGate';

const replaceMock = vi.fn();
let mockAuth: { admin: unknown; loading: boolean } = { admin: null, loading: true };

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => '/admin/pedidos',
}));
vi.mock('@/lib/admin-auth', () => ({ useAdminAuth: () => mockAuth }));

describe('AdminAuthGate', () => {
  it('shows loading state', () => {
    mockAuth = { admin: null, loading: true };
    render(<AdminAuthGate><span>inside</span></AdminAuthGate>);
    expect(screen.getByText('Carregando…')).toBeInTheDocument();
  });

  it('redirects to entrar?next=path when unauthenticated', async () => {
    mockAuth = { admin: null, loading: false };
    render(<AdminAuthGate><span>inside</span></AdminAuthGate>);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith(
      '/admin/entrar?next=%2Fadmin%2Fpedidos'
    ));
  });

  it('renders children when authenticated', () => {
    mockAuth = { admin: { id: 'adm_1' }, loading: false };
    render(<AdminAuthGate><span>inside</span></AdminAuthGate>);
    expect(screen.getByText('inside')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: `AdminLoginForm.tsx` + teste**

```tsx
// components/admin/AdminLoginForm.tsx
'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin-auth';
import { ApiError, humanize } from '@/lib/admin-api';
import { FormField } from '@/components/ui/FormField';

export function AdminLoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { login } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      const next = search?.get('next') || '/admin/pedidos';
      router.replace(next);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Email ou senha incorretos.');
      } else if (err instanceof ApiError) {
        setError(humanize(err));
      } else {
        setError('Falha na conexão.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-20 max-w-sm rounded-lg bg-white p-8 shadow">
      <h1 className="mb-6 text-xl font-semibold text-neutral-900">Acesso admin</h1>
      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}
      <FormField label="Email" htmlFor="adm-email" required>
        <input
          id="adm-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </FormField>
      <FormField label="Senha" htmlFor="adm-pwd" required>
        <input
          id="adm-pwd"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </FormField>
      <button
        type="submit"
        disabled={submitting}
        className="mt-2 w-full rounded bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
      >
        {submitting ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
```

```tsx
// components/admin/AdminLoginForm.test.tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminLoginForm } from './AdminLoginForm';
import { ApiError } from '@/lib/admin-api';

const loginMock = vi.fn();
const replaceMock = vi.fn();
const searchMock = { get: vi.fn().mockReturnValue(null) };

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => searchMock,
}));
vi.mock('@/lib/admin-auth', () => ({ useAdminAuth: () => ({ login: loginMock }) }));

describe('AdminLoginForm', () => {
  it('submits and redirects to default on success', async () => {
    loginMock.mockResolvedValueOnce(undefined);
    render(<AdminLoginForm />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'pwd' } });
    fireEvent.click(screen.getByText('Entrar'));
    await waitFor(() => expect(loginMock).toHaveBeenCalledWith('a@b', 'pwd'));
    expect(replaceMock).toHaveBeenCalledWith('/admin/pedidos');
  });

  it('shows generic error on 401', async () => {
    loginMock.mockRejectedValueOnce(new ApiError({ type: 'invalid-credentials', title: 'X', status: 401 }));
    render(<AdminLoginForm />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByText('Entrar'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Email ou senha incorretos.'));
  });

  it('respects next param', async () => {
    searchMock.get.mockReturnValue('/admin/produtos');
    loginMock.mockResolvedValueOnce(undefined);
    render(<AdminLoginForm />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'pwd' } });
    fireEvent.click(screen.getByText('Entrar'));
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/admin/produtos'));
  });
});
```

- [ ] **Step 5: Páginas — entrar, layout, redirect**

```tsx
// app/admin/entrar/page.tsx
import { Suspense } from 'react';
import { AdminAuthProvider } from '@/lib/admin-auth';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';

export default function EntrarPage() {
  return (
    <AdminAuthProvider>
      <main className="min-h-screen bg-neutral-50">
        <Suspense>
          <AdminLoginForm />
        </Suspense>
      </main>
    </AdminAuthProvider>
  );
}
```

```tsx
// app/admin/layout.tsx
import { ReactNode } from 'react';
import { AdminAuthProvider } from '@/lib/admin-auth';
import { AdminAuthGate } from '@/components/admin/AdminAuthGate';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminAuthGate>
        <div className="flex min-h-screen bg-neutral-50">
          <AdminSidebar />
          <div className="flex flex-1 flex-col">
            <AdminHeader />
            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
      </AdminAuthGate>
    </AdminAuthProvider>
  );
}
```

```tsx
// app/admin/page.tsx
import { redirect } from 'next/navigation';

export default function AdminIndexPage() {
  redirect('/admin/pedidos');
}
```

> **Nota:** `app/admin/entrar/page.tsx` precisa do `AdminAuthProvider` envolvido localmente (porque é fora do `app/admin/layout.tsx` que já fornece o provider). Sem isso, `AdminLoginForm` quebra com "useAdminAuth must be used inside…".

> **Conflito de layout:** `app/admin/layout.tsx` envolve TODAS as rotas sob `/admin/*`, incluindo `/admin/entrar`. Como `AdminAuthGate` redireciona não-autenticados pra `/admin/entrar`, isso cria loop infinito. **Solução:** mover login pra **fora** do segmento `/admin` em `app/admin-entrar/page.tsx` OU usar route groups (`app/admin/(unauth)/entrar/page.tsx` + `app/admin/(unauth)/layout.tsx` sem o gate) **OU** o gate ignora pathname `/admin/entrar`. Vou pelo último (mais simples):

Atualize `components/admin/AdminAuthGate.tsx` (Step 3) para ignorar a página de login:

```tsx
// dentro do componente, no topo do effect:
useEffect(() => {
  if (pathname === '/admin/entrar') return; // não interfere no login
  if (!loading && !admin) { ... }
}, [admin, loading, pathname, router]);
```

E ajuste o teste correspondente pra cobrir esse caso (skip pra `/admin/entrar`).

- [ ] **Step 6: Rodar**

```bash
npm test -- components/admin/Admin --run
```

Esperado: testes novos passam.

- [ ] **Step 7: Commit**

```bash
git add components/admin/AdminSidebar.tsx components/admin/AdminSidebar.test.tsx \
        components/admin/AdminHeader.tsx components/admin/AdminHeader.test.tsx \
        components/admin/AdminAuthGate.tsx components/admin/AdminAuthGate.test.tsx \
        components/admin/AdminLoginForm.tsx components/admin/AdminLoginForm.test.tsx \
        app/admin/entrar/page.tsx app/admin/layout.tsx app/admin/page.tsx
git commit -m "$(cat <<'EOF'
feat(sp5c): shell admin (sidebar + header + gate + login) + paginas base

AdminSidebar fixa esquerda (mobile hidden por enquanto, drawer fica
pra iteracao futura), AdminHeader com switch de som + botao sair,
AdminAuthGate que redireciona non-autenticados pra /admin/entrar
preservando next param (ignora pathname /admin/entrar pra evitar
loop), AdminLoginForm reusa FormField + humanize. Paginas:
/admin/entrar (com provider local), /admin/layout (provider + gate +
shell), /admin (redirect pra /admin/pedidos).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Front — hooks (fila + catálogo)

**Files:**
- Create: `lib/admin-orders.ts` + `.test.ts`
- Create: `lib/admin-catalog.ts` + `.test.ts`

- [ ] **Step 1: `lib/admin-orders.ts`**

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import * as adminApi from './admin-api';
import { AdminOrder, ApiError } from './admin-api';

const POLL_MS = 10_000;

const ACTIVE = 'RECEIVED,PREPARING,OUT';
const HISTORY = 'DELIVERED,CANCELLED';

export function useOrderQueue(scope: 'active' | 'history') {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [newOrder, setNewOrder] = useState<AdminOrder | null>(null);
  const lastCountRef = useRef(0);
  const firstPollDoneRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let abortCtrl: AbortController | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function poll() {
      if (document.hidden) return;
      abortCtrl?.abort();
      abortCtrl = new AbortController();
      try {
        const status = scope === 'active' ? ACTIVE : HISTORY;
        const res = await adminApi.getOrders({ status, size: 100, signal: abortCtrl.signal });
        if (cancelled) return;
        if (
          scope === 'active' &&
          firstPollDoneRef.current &&
          res.items.length > lastCountRef.current
        ) {
          // pedido novo apareceu — pega o primeiro item (mais recente por sort DESC)
          const newest = res.items[0];
          if (newest) setNewOrder(newest);
        }
        lastCountRef.current = res.items.length;
        firstPollDoneRef.current = true;
        setOrders(res.items);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e as ApiError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    poll();
    intervalId = setInterval(poll, POLL_MS);

    function onVisibility() {
      if (!document.hidden) poll();
    }
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      abortCtrl?.abort();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [scope]);

  return { orders, loading, error, newOrder, clearNewOrder: () => setNewOrder(null) };
}

const SOUND_KEY = 'admin-sound-enabled';

let audioEl: HTMLAudioElement | null = null;

export function playNewOrderSound() {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(SOUND_KEY) === 'false') return;
  if (!audioEl) {
    audioEl = new Audio('/admin/new-order.mp3');
  }
  // Browsers exigem interação prévia; ignora rejeição silenciosamente.
  audioEl.currentTime = 0;
  audioEl.play().catch(() => { /* sem áudio */ });
}
```

- [ ] **Step 2: `lib/admin-orders.test.ts`**

```typescript
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOrderQueue } from './admin-orders';
import * as adminApi from './admin-api';

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(adminApi, 'getOrders').mockReset();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const mockList = (items: unknown[]) => ({
  items, page: 0, size: 20, total: items.length,
});

describe('useOrderQueue', () => {
  it('fetches initial active orders', async () => {
    vi.spyOn(adminApi, 'getOrders').mockResolvedValue(mockList([{ id: 'o1' }]) as never);
    const { result } = renderHook(() => useOrderQueue('active'));
    await waitFor(() => expect(result.current.orders).toHaveLength(1));
  });

  it('polls every 10s', async () => {
    const spy = vi.spyOn(adminApi, 'getOrders').mockResolvedValue(mockList([]) as never);
    renderHook(() => useOrderQueue('active'));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    await act(async () => { vi.advanceTimersByTime(10_000); });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('detects new order after first poll when count grows', async () => {
    const spy = vi.spyOn(adminApi, 'getOrders');
    spy.mockResolvedValueOnce(mockList([{ id: 'o1' }]) as never);
    spy.mockResolvedValueOnce(mockList([{ id: 'o2' }, { id: 'o1' }]) as never);
    const { result } = renderHook(() => useOrderQueue('active'));
    await waitFor(() => expect(result.current.orders).toHaveLength(1));
    await act(async () => { vi.advanceTimersByTime(10_000); });
    await waitFor(() => expect(result.current.newOrder).toMatchObject({ id: 'o2' }));
  });

  it('skips poll when document.hidden', async () => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    const spy = vi.spyOn(adminApi, 'getOrders').mockResolvedValue(mockList([]) as never);
    renderHook(() => useOrderQueue('active'));
    await act(async () => { vi.advanceTimersByTime(10_000); });
    expect(spy).not.toHaveBeenCalled();
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  });
});
```

- [ ] **Step 3: `lib/admin-catalog.ts`**

```typescript
'use client';

import { useCallback, useEffect, useState } from 'react';
import * as adminApi from './admin-api';
import { AdminCategory, AdminCoupon, AdminProduct, ApiError } from './admin-api';

type Resource<T> = {
  items: T[];
  loading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
};

function useResource<T>(fetcher: (signal?: AbortSignal) => Promise<T[]>): Resource<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetcher();
      setItems(res);
      setError(null);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { items, loading, error, refetch };
}

export function useAdminProducts() {
  return useResource<AdminProduct>(adminApi.listProducts);
}
export function useAdminCategories() {
  return useResource<AdminCategory>(adminApi.listCategories);
}
export function useAdminCoupons() {
  return useResource<AdminCoupon>(adminApi.listCoupons);
}
```

- [ ] **Step 4: `lib/admin-catalog.test.ts`**

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAdminProducts } from './admin-catalog';
import * as adminApi from './admin-api';

beforeEach(() => vi.spyOn(adminApi, 'listProducts').mockReset());
afterEach(() => vi.restoreAllMocks());

describe('useAdminProducts', () => {
  it('loads list on mount', async () => {
    vi.spyOn(adminApi, 'listProducts').mockResolvedValue([
      { id: 'p1', categoryId: 'b', name: 'Burger', price: 25 } as never,
    ]);
    const { result } = renderHook(() => useAdminProducts());
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.error).toBeNull();
  });

  it('sets error on api failure', async () => {
    vi.spyOn(adminApi, 'listProducts').mockRejectedValue({ name: 'ApiError', status: 500 });
    const { result } = renderHook(() => useAdminProducts());
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });

  it('refetch reloads data', async () => {
    const spy = vi.spyOn(adminApi, 'listProducts').mockResolvedValue([]);
    const { result } = renderHook(() => useAdminProducts());
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    await result.current.refetch();
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 5: Rodar testes**

```bash
npm test -- lib/admin-orders lib/admin-catalog --run
```

Esperado: ~7 testes verdes.

- [ ] **Step 6: Commit**

```bash
git add lib/admin-orders.ts lib/admin-orders.test.ts lib/admin-catalog.ts lib/admin-catalog.test.ts
git commit -m "$(cat <<'EOF'
feat(sp5c): useOrderQueue (polling 10s) + useAdminProducts/Categories/Coupons

useOrderQueue scope=active|history; polling 10s com AbortController +
pause em document.hidden + visibility re-poll. Detecta novo pedido
via count delta apos primeiro poll, expoe newOrder + clearNewOrder.
playNewOrderSound respeita localStorage admin-sound-enabled.
useAdminProducts/Categories/Coupons: { items, loading, error,
refetch } via useResource generic.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Front — página /admin/pedidos (OrderQueueTabs, OrderCard, page)

**Files:**
- Create: `public/admin/new-order.mp3` (asset binário — baixar/gerar curto)
- Create: `components/admin/OrderQueueTabs.tsx` + `.test.tsx`
- Create: `components/admin/OrderCard.tsx` + `.test.tsx`
- Create: `app/admin/pedidos/page.tsx` + `.test.tsx`

- [ ] **Step 1: Obter o áudio `public/admin/new-order.mp3`**

O arquivo precisa ser um MP3 curto (~0.5s) e leve (≤50KB). Opções:
1. Baixar um sound effect free (CC0) de freesound.org ou pixabay e renomear pra `public/admin/new-order.mp3`.
2. Gerar via ffmpeg: `ffmpeg -f lavfi -i "sine=frequency=880:duration=0.3" -af "volume=0.2" public/admin/new-order.mp3`

Confirme o tamanho: `ls -lh public/admin/new-order.mp3` — esperado ≤50KB.

- [ ] **Step 2: `OrderQueueTabs.tsx` + teste**

```tsx
// components/admin/OrderQueueTabs.tsx
'use client';
import { useRouter, useSearchParams } from 'next/navigation';

type Counts = { received: number; preparing: number; out: number };

type Props = { counts: Counts };

const TABS = [
  { key: 'active', label: 'Ativos' },
  { key: 'history', label: 'Histórico' },
] as const;

export function OrderQueueTabs({ counts }: Props) {
  const router = useRouter();
  const search = useSearchParams();
  const current = search?.get('scope') === 'history' ? 'history' : 'active';
  const activeTotal = counts.received + counts.preparing + counts.out;

  return (
    <div className="mt-4 flex gap-2 border-b border-neutral-200">
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => router.replace(`/admin/pedidos?scope=${t.key}`)}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
            current === t.key
              ? 'border-red-600 text-red-700'
              : 'border-transparent text-neutral-600 hover:text-neutral-900'
          }`}
        >
          {t.label}
          {t.key === 'active' && <span className="ml-1 rounded bg-neutral-200 px-1.5 text-xs">{activeTotal}</span>}
        </button>
      ))}
    </div>
  );
}
```

```tsx
// components/admin/OrderQueueTabs.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OrderQueueTabs } from './OrderQueueTabs';

const replaceMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => ({ get: () => 'active' }),
}));

describe('OrderQueueTabs', () => {
  it('shows active total count', () => {
    render(<OrderQueueTabs counts={{ received: 2, preparing: 1, out: 1 }} />);
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('navigates on tab click', () => {
    render(<OrderQueueTabs counts={{ received: 0, preparing: 0, out: 0 }} />);
    fireEvent.click(screen.getByText('Histórico'));
    expect(replaceMock).toHaveBeenCalledWith('/admin/pedidos?scope=history');
  });
});
```

- [ ] **Step 3: `OrderCard.tsx` + teste**

```tsx
// components/admin/OrderCard.tsx
'use client';
import { AdminOrder, OrderStatus } from '@/lib/admin-api';

type Transition = { label: string; to: OrderStatus; destructive?: boolean };

const NEXT: Record<OrderStatus, Transition[]> = {
  RECEIVED:  [
    { label: 'Aceitar', to: 'PREPARING' },
    { label: 'Cancelar', to: 'CANCELLED', destructive: true },
  ],
  PREPARING: [
    { label: 'Saiu p/ entrega', to: 'OUT' },
    { label: 'Cancelar', to: 'CANCELLED', destructive: true },
  ],
  OUT: [
    { label: 'Confirmar entrega', to: 'DELIVERED' },
    { label: 'Cancelar', to: 'CANCELLED', destructive: true },
  ],
  DELIVERED: [],
  CANCELLED: [],
};

const STATUS_BADGE: Record<OrderStatus, string> = {
  RECEIVED: 'bg-yellow-100 text-yellow-800',
  PREPARING: 'bg-blue-100 text-blue-800',
  OUT: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-neutral-200 text-neutral-700',
};

type Props = {
  order: AdminOrder;
  onTransition: (to: OrderStatus, destructive: boolean) => void;
};

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function OrderCard({ order, onTransition }: Props) {
  return (
    <article className="rounded-lg bg-white p-4 shadow-sm">
      <header className="flex items-start justify-between">
        <div>
          <div className="text-sm text-neutral-500">{fmtTime(order.createdAt)}</div>
          <div className="text-lg font-semibold">#{order.displayId}</div>
          <div className="text-sm text-neutral-700">{order.customerName} · {order.customerPhone}</div>
        </div>
        <span className={`rounded px-2 py-1 text-xs font-medium ${STATUS_BADGE[order.status]}`}>
          {order.status}
        </span>
      </header>
      <ul className="mt-3 space-y-1 text-sm">
        {order.items.map((it) => (
          <li key={it.productId}>
            {it.quantity}× {it.name}{it.notes && <span className="text-neutral-500"> — {it.notes}</span>}
          </li>
        ))}
      </ul>
      <footer className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3">
        <span className="font-semibold">{fmtBRL(order.totals.total)}</span>
        <div className="flex gap-2">
          {NEXT[order.status].map((t) => (
            <button
              key={t.to}
              type="button"
              onClick={() => onTransition(t.to, !!t.destructive)}
              className={`rounded px-3 py-1.5 text-sm font-medium ${
                t.destructive
                  ? 'border border-red-300 text-red-700 hover:bg-red-50'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </footer>
    </article>
  );
}
```

```tsx
// components/admin/OrderCard.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OrderCard } from './OrderCard';
import { AdminOrder } from '@/lib/admin-api';

const baseOrder: AdminOrder = {
  id: 'o1', displayId: '1234', status: 'RECEIVED',
  customerName: 'João', customerPhone: '(21) 90000-0000',
  items: [{ productId: 'p1', name: 'Burger', quantity: 2, unitPrice: 25 }],
  totals: { subtotal: 50, discount: 0, deliveryFee: 5, total: 55 },
  createdAt: '2026-06-07T14:30:00Z',
};

describe('OrderCard', () => {
  it('renders RECEIVED with Aceitar + Cancelar buttons', () => {
    render(<OrderCard order={baseOrder} onTransition={vi.fn()} />);
    expect(screen.getByText('Aceitar')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('calls onTransition with target status', () => {
    const onT = vi.fn();
    render(<OrderCard order={baseOrder} onTransition={onT} />);
    fireEvent.click(screen.getByText('Aceitar'));
    expect(onT).toHaveBeenCalledWith('PREPARING', false);
  });

  it('marks Cancelar as destructive', () => {
    const onT = vi.fn();
    render(<OrderCard order={baseOrder} onTransition={onT} />);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onT).toHaveBeenCalledWith('CANCELLED', true);
  });

  it('renders no actions for DELIVERED', () => {
    render(<OrderCard order={{ ...baseOrder, status: 'DELIVERED' }} onTransition={vi.fn()} />);
    expect(screen.queryByText('Aceitar')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 4: `app/admin/pedidos/page.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { playNewOrderSound, useOrderQueue } from '@/lib/admin-orders';
import * as adminApi from '@/lib/admin-api';
import { AdminOrder, OrderStatus } from '@/lib/admin-api';
import { OrderQueueTabs } from '@/components/admin/OrderQueueTabs';
import { OrderCard } from '@/components/admin/OrderCard';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

export default function PedidosPage() {
  const search = useSearchParams();
  const scope = search?.get('scope') === 'history' ? 'history' : 'active';
  const { orders, loading, error, newOrder, clearNewOrder } = useOrderQueue(scope as 'active' | 'history');
  const [pendingCancel, setPendingCancel] = useState<{ id: string } | null>(null);

  useEffect(() => {
    if (newOrder) {
      playNewOrderSound();
      // notificação visual: aqui simples — pode usar OrderToast em iteração futura
      clearNewOrder();
    }
  }, [newOrder, clearNewOrder]);

  async function handleTransition(orderId: string, to: OrderStatus, destructive: boolean) {
    if (destructive) {
      setPendingCancel({ id: orderId });
      return;
    }
    await adminApi.updateOrderStatus(orderId, to);
  }

  async function confirmCancel() {
    if (!pendingCancel) return;
    await adminApi.updateOrderStatus(pendingCancel.id, 'CANCELLED');
    setPendingCancel(null);
  }

  const counts = countByStatus(orders);

  return (
    <div>
      <AdminPageHeader title="Pedidos" />
      <OrderQueueTabs counts={counts} />

      {error && (
        <div className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700" role="alert">
          Falha ao carregar fila. Tentando novamente em 10s.
        </div>
      )}

      {loading ? (
        <div className="mt-6 grid gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-neutral-200" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <p className="mt-6 text-center text-sm text-neutral-500">
          Sem pedidos {scope === 'active' ? 'ativos' : 'no histórico'}.
        </p>
      ) : (
        <div className="mt-6 grid gap-3">
          {orders.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              onTransition={(to, dest) => handleTransition(o.id, to, dest)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingCancel}
        title="Cancelar pedido?"
        message="Esta ação não pode ser revertida."
        confirmLabel="Cancelar pedido"
        cancelLabel="Voltar"
        destructive
        onConfirm={confirmCancel}
        onCancel={() => setPendingCancel(null)}
      />
    </div>
  );
}

function countByStatus(orders: AdminOrder[]) {
  let received = 0, preparing = 0, out = 0;
  for (const o of orders) {
    if (o.status === 'RECEIVED') received++;
    else if (o.status === 'PREPARING') preparing++;
    else if (o.status === 'OUT') out++;
  }
  return { received, preparing, out };
}
```

- [ ] **Step 5: `app/admin/pedidos/page.test.tsx`**

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PedidosPage from './page';
import * as adminApi from '@/lib/admin-api';

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => 'active' }),
  useRouter: () => ({ replace: vi.fn() }),
}));

const sample: adminApi.AdminOrder = {
  id: 'o1', displayId: '1234', status: 'RECEIVED',
  customerName: 'João', customerPhone: '21000',
  items: [{ productId: 'p1', name: 'X', quantity: 1, unitPrice: 10 }],
  totals: { subtotal: 10, discount: 0, deliveryFee: 0, total: 10 },
  createdAt: '2026-06-07T00:00:00Z',
};

describe('PedidosPage', () => {
  it('renders orders and calls updateOrderStatus on Aceitar', async () => {
    vi.spyOn(adminApi, 'getOrders').mockResolvedValue({
      items: [sample], page: 0, size: 20, total: 1,
    });
    const updateSpy = vi.spyOn(adminApi, 'updateOrderStatus').mockResolvedValue(sample);
    render(<PedidosPage />);
    await waitFor(() => expect(screen.getByText(/#1234/)).toBeInTheDocument());
    fireEvent.click(screen.getByText('Aceitar'));
    await waitFor(() => expect(updateSpy).toHaveBeenCalledWith('o1', 'PREPARING'));
  });

  it('opens ConfirmDialog on Cancelar', async () => {
    vi.spyOn(adminApi, 'getOrders').mockResolvedValue({
      items: [sample], page: 0, size: 20, total: 1,
    });
    render(<PedidosPage />);
    await waitFor(() => expect(screen.getByText(/#1234/)).toBeInTheDocument());
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.getByText('Cancelar pedido?')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Rodar**

```bash
npm test -- components/admin/OrderQueue components/admin/OrderCard app/admin/pedidos --run
```

Esperado: 4 arquivos verdes.

- [ ] **Step 7: Commit**

```bash
git add public/admin/new-order.mp3 \
        components/admin/OrderQueueTabs.tsx components/admin/OrderQueueTabs.test.tsx \
        components/admin/OrderCard.tsx components/admin/OrderCard.test.tsx \
        app/admin/pedidos/page.tsx app/admin/pedidos/page.test.tsx
git commit -m "$(cat <<'EOF'
feat(sp5c): pagina /admin/pedidos com tabs ativos/historico

OrderQueueTabs com URL param scope=active|history + badge count em
ativos. OrderCard com botoes contextuais por status (RECEIVED ->
Aceitar/Cancelar; PREPARING -> Saiu p/entrega/Cancelar; OUT ->
Confirmar entrega/Cancelar) + status badge colorido + items + total.
PedidosPage liga ao useOrderQueue, dispara playNewOrderSound em new,
abre ConfirmDialog em Cancelar (destructive). Skeleton durante load,
banner em erro, empty state.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Front — página /admin/produtos (ProductsTable, ProductFormModal, page)

**Files:**
- Create: `components/admin/ProductsTable.tsx` + `.test.tsx`
- Create: `components/admin/ProductFormModal.tsx` + `.test.tsx`
- Create: `app/admin/produtos/page.tsx` + `.test.tsx`

- [ ] **Step 1: `ProductsTable.tsx`**

```tsx
// components/admin/ProductsTable.tsx
'use client';
import { AdminCategory, AdminProduct } from '@/lib/admin-api';
import { AdminTable, Column } from './AdminTable';
import { InlineToggle } from './InlineToggle';
import { RowActions } from './RowActions';

type Props = {
  products: AdminProduct[];
  categories: AdminCategory[];
  onEdit: (p: AdminProduct) => void;
  onDelete: (p: AdminProduct) => void;
  onToggleAvailable: (p: AdminProduct, next: boolean) => Promise<unknown>;
  onToggleFeatured: (p: AdminProduct, next: boolean) => Promise<unknown>;
};

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function ProductsTable({
  products, categories, onEdit, onDelete, onToggleAvailable, onToggleFeatured,
}: Props) {
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

  const columns: Column<AdminProduct>[] = [
    { key: 'thumb', header: '', render: (p) => p.imageUrl ? (
      <img src={p.imageUrl} alt="" className="h-10 w-10 rounded object-cover" />
    ) : (
      <div className="h-10 w-10 rounded bg-neutral-200" />
    )},
    { key: 'name', header: 'Nome', render: (p) => p.name },
    { key: 'cat', header: 'Categoria', render: (p) => catName(p.categoryId) },
    { key: 'price', header: 'Preço', render: (p) => fmtBRL(p.price) },
    { key: 'available', header: 'Ativo', render: (p) => (
      <InlineToggle initial={p.available} label="Ativo" onToggle={(next) => onToggleAvailable(p, next)} />
    )},
    { key: 'featured', header: 'Destaque', render: (p) => (
      <InlineToggle initial={p.featured} label="Destaque" onToggle={(next) => onToggleFeatured(p, next)} />
    )},
    { key: 'actions', header: '', render: (p) => (
      <RowActions onEdit={() => onEdit(p)} onDelete={() => onDelete(p)} />
    )},
  ];

  return <AdminTable columns={columns} rows={products} rowKey={(p) => p.id} emptyMessage="Nenhum produto cadastrado." />;
}
```

```tsx
// components/admin/ProductsTable.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductsTable } from './ProductsTable';
import { AdminCategory, AdminProduct } from '@/lib/admin-api';

const cats: AdminCategory[] = [{ id: 'burgers', name: 'Burgers', displayOrder: 1, layout: 'grid' }];
const prods: AdminProduct[] = [
  { id: 'x', categoryId: 'burgers', name: 'X-Burger', price: 25, featured: false, available: true, displayOrder: 1 },
];

describe('ProductsTable', () => {
  it('renders products with category name resolved', () => {
    render(
      <ProductsTable
        products={prods} categories={cats}
        onEdit={vi.fn()} onDelete={vi.fn()}
        onToggleAvailable={vi.fn().mockResolvedValue(undefined)}
        onToggleFeatured={vi.fn().mockResolvedValue(undefined)}
      />
    );
    expect(screen.getByText('X-Burger')).toBeInTheDocument();
    expect(screen.getByText('Burgers')).toBeInTheDocument();
    expect(screen.getByText('R$ 25,00')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: `ProductFormModal.tsx`**

```tsx
// components/admin/ProductFormModal.tsx
'use client';
import { useEffect, useState } from 'react';
import { AdminCategory, AdminProduct, ApiError, humanize } from '@/lib/admin-api';
import { FormModal } from './FormModal';
import { FormField } from '@/components/ui/FormField';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  product?: AdminProduct;
  categories: AdminCategory[];
  onClose: () => void;
  onSubmit: (p: AdminProduct) => Promise<void>;
};

const EMPTY: AdminProduct = {
  id: '', categoryId: '', name: '', price: 0,
  featured: false, available: true, displayOrder: 100,
};

export function ProductFormModal({ open, mode, product, categories, onClose, onSubmit }: Props) {
  const [draft, setDraft] = useState<AdminProduct>(product ?? EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(product ?? EMPTY);
    setError(null);
  }, [product, open]);

  async function handle() {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(draft);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? humanize(e) : 'Falha na conexão.');
    } finally {
      setSubmitting(false);
    }
  }

  const title = mode === 'create' ? 'Novo produto' : `Editar ${product?.name ?? ''}`;
  const isEdit = mode === 'edit';

  return (
    <FormModal open={open} title={title} onClose={onClose} onSubmit={handle} submitting={submitting} error={error}>
      <FormField label="ID (slug)" htmlFor="p-id" required hint="ex: x-burger">
        <input
          id="p-id"
          value={draft.id}
          onChange={(e) => setDraft({ ...draft, id: e.target.value })}
          disabled={isEdit}
          required
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm disabled:bg-neutral-100"
        />
      </FormField>
      <FormField label="Categoria" htmlFor="p-cat" required>
        <Select
          id="p-cat"
          value={draft.categoryId}
          onChange={(v) => setDraft({ ...draft, categoryId: v })}
          placeholder="— Selecione —"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
      </FormField>
      <FormField label="Nome" htmlFor="p-name" required>
        <input
          id="p-name"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          required maxLength={120}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </FormField>
      <FormField label="Descrição" htmlFor="p-desc">
        <textarea
          id="p-desc"
          value={draft.description ?? ''}
          onChange={(e) => setDraft({ ...draft, description: e.target.value || undefined })}
          rows={3}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Preço" htmlFor="p-price" required>
          <input
            id="p-price" type="number" step="0.01" min="0"
            value={draft.price}
            onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
            required
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
        </FormField>
        <FormField label="A partir de" htmlFor="p-pricefrom" hint="opcional">
          <input
            id="p-pricefrom" type="number" step="0.01" min="0"
            value={draft.priceFrom ?? ''}
            onChange={(e) => setDraft({
              ...draft, priceFrom: e.target.value ? Number(e.target.value) : undefined,
            })}
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
        </FormField>
      </div>
      <FormField label="URL da imagem" htmlFor="p-img" hint="https://… ou /images/…">
        <input
          id="p-img"
          value={draft.imageUrl ?? ''}
          onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value || undefined })}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </FormField>
      {draft.imageUrl && (
        <img src={draft.imageUrl} alt="preview" className="h-20 w-20 rounded border object-cover" />
      )}
      <div className="mt-3 flex gap-6">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={draft.featured} onChange={(v) => setDraft({ ...draft, featured: v })} aria-label="Destaque" />
          Destaque
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={draft.available} onChange={(v) => setDraft({ ...draft, available: v })} aria-label="Ativo" />
          Ativo
        </label>
      </div>
    </FormModal>
  );
}
```

```tsx
// components/admin/ProductFormModal.test.tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductFormModal } from './ProductFormModal';
import { ApiError } from '@/lib/admin-api';

const cats = [{ id: 'b', name: 'Burgers', displayOrder: 1, layout: 'grid' as const }];

describe('ProductFormModal', () => {
  it('submits new product', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <ProductFormModal open mode="create" categories={cats} onClose={vi.fn()} onSubmit={onSubmit} />
    );
    fireEvent.change(screen.getByLabelText('ID (slug)'), { target: { value: 'x' } });
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'b' } });
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'X-Burger' } });
    fireEvent.change(screen.getByLabelText('Preço'), { target: { value: '25' } });
    fireEvent.click(screen.getByText('Salvar'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it('shows humanized error on ApiError', async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError({ type: 'product-already-exists', title: 'Existe', status: 409 })
    );
    render(
      <ProductFormModal open mode="create" categories={cats} onClose={vi.fn()} onSubmit={onSubmit} />
    );
    fireEvent.change(screen.getByLabelText('ID (slug)'), { target: { value: 'x' } });
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'b' } });
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText('Preço'), { target: { value: '10' } });
    fireEvent.click(screen.getByText('Salvar'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});
```

- [ ] **Step 3: `app/admin/produtos/page.tsx`**

```tsx
'use client';

import { useState } from 'react';
import * as adminApi from '@/lib/admin-api';
import { AdminProduct } from '@/lib/admin-api';
import { useAdminCategories, useAdminProducts } from '@/lib/admin-catalog';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { ProductsTable } from '@/components/admin/ProductsTable';
import { ProductFormModal } from '@/components/admin/ProductFormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export default function ProdutosPage() {
  const { items: products, refetch } = useAdminProducts();
  const { items: categories } = useAdminCategories();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [formOpen, setFormOpen] = useState<{ mode: 'create' | 'edit'; product?: AdminProduct } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminProduct | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filtered = products.filter((p) => {
    if (filterCat && p.categoryId !== filterCat) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function handleSubmit(p: AdminProduct) {
    if (formOpen?.mode === 'create') {
      await adminApi.createProduct(p);
    } else {
      await adminApi.updateProduct(p.id, p);
    }
    await refetch();
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await adminApi.deleteProduct(pendingDelete.id);
      await refetch();
      setPendingDelete(null);
      setDeleteError(null);
    } catch (e) {
      const err = e as adminApi.ApiError;
      if (err.type === 'product-has-orders') {
        setDeleteError('Produto tem pedidos vinculados. Desative em vez de excluir.');
      } else {
        setDeleteError(adminApi.humanize(err));
      }
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Produtos"
        action={
          <button
            onClick={() => setFormOpen({ mode: 'create' })}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Novo produto
          </button>
        }
      />
      <div className="mt-4 flex gap-3">
        <input
          aria-label="Buscar"
          placeholder="Buscar por nome"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded border border-neutral-300 px-3 py-2 text-sm"
        />
        <select
          aria-label="Filtro categoria"
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="rounded border border-neutral-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Todas categorias</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <ProductsTable
        products={filtered}
        categories={categories}
        onEdit={(p) => setFormOpen({ mode: 'edit', product: p })}
        onDelete={(p) => { setDeleteError(null); setPendingDelete(p); }}
        onToggleAvailable={async (p, next) => { await adminApi.updateProduct(p.id, { available: next }); await refetch(); }}
        onToggleFeatured={async (p, next) => { await adminApi.updateProduct(p.id, { featured: next }); await refetch(); }}
      />

      {formOpen && (
        <ProductFormModal
          open
          mode={formOpen.mode}
          product={formOpen.product}
          categories={categories}
          onClose={() => setFormOpen(null)}
          onSubmit={handleSubmit}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Excluir produto?"
        message={
          deleteError
            ? deleteError
            : `Esta ação não pode ser desfeita. Produto: ${pendingDelete?.name ?? ''}.`
        }
        confirmLabel={deleteError ? 'Fechar' : 'Excluir'}
        destructive={!deleteError}
        onConfirm={deleteError ? () => { setPendingDelete(null); setDeleteError(null); } : confirmDelete}
        onCancel={() => { setPendingDelete(null); setDeleteError(null); }}
      />
    </div>
  );
}
```

- [ ] **Step 4: `app/admin/produtos/page.test.tsx`**

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProdutosPage from './page';
import * as adminApi from '@/lib/admin-api';

vi.mock('next/navigation', () => ({ useSearchParams: () => ({ get: () => null }) }));

describe('ProdutosPage', () => {
  it('lists products and opens Novo modal', async () => {
    vi.spyOn(adminApi, 'listProducts').mockResolvedValue([
      { id: 'x', categoryId: 'b', name: 'X-Burger', price: 25, featured: false, available: true, displayOrder: 1 },
    ]);
    vi.spyOn(adminApi, 'listCategories').mockResolvedValue([
      { id: 'b', name: 'Burgers', displayOrder: 1, layout: 'grid' },
    ]);
    render(<ProdutosPage />);
    await waitFor(() => expect(screen.getByText('X-Burger')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Novo produto'));
    expect(screen.getByText('Novo produto', { selector: 'h2' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Rodar**

```bash
npm test -- components/admin/Products app/admin/produtos --run
```

Esperado: 3 arquivos verdes.

- [ ] **Step 6: Commit**

```bash
git add components/admin/ProductsTable.tsx components/admin/ProductsTable.test.tsx \
        components/admin/ProductFormModal.tsx components/admin/ProductFormModal.test.tsx \
        app/admin/produtos/page.tsx app/admin/produtos/page.test.tsx
git commit -m "$(cat <<'EOF'
feat(sp5c): pagina /admin/produtos com tabela + form modal

ProductsTable usa AdminTable + InlineToggle pra available/featured +
RowActions pra editar/excluir. ProductFormModal cobre create+edit
(id RO em edit) com preview de imagem inline. ProdutosPage liga ao
useAdminProducts + useAdminCategories, busca client-side + filtro
categoria. ConfirmDialog gerencia delete + erro 409 product-has-orders
mostrando mensagem alternativa.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Front — páginas /admin/categorias e /admin/cupons

**Files:**
- Create: `components/admin/CategoriesTable.tsx` + `.test.tsx`
- Create: `components/admin/CategoryFormModal.tsx` + `.test.tsx`
- Create: `components/admin/CouponsTable.tsx` + `.test.tsx`
- Create: `components/admin/CouponFormModal.tsx` + `.test.tsx`
- Create: `app/admin/categorias/page.tsx` + `.test.tsx`
- Create: `app/admin/cupons/page.tsx` + `.test.tsx`

> **Padrão de implementação:** ambos seguem o mesmo padrão do Task 8 (Produtos): tabela + InlineToggle (onde aplicável) + RowActions + FormModal + ConfirmDialog na page com erro 409 traduzido.

- [ ] **Step 1: `CategoriesTable.tsx`**

```tsx
// components/admin/CategoriesTable.tsx
'use client';
import { AdminCategory, AdminProduct } from '@/lib/admin-api';
import { AdminTable, Column } from './AdminTable';
import { RowActions } from './RowActions';

type Props = {
  categories: AdminCategory[];
  productsByCategory: Record<string, number>;
  onEdit: (c: AdminCategory) => void;
  onDelete: (c: AdminCategory) => void;
};

export function CategoriesTable({ categories, productsByCategory, onEdit, onDelete }: Props) {
  const columns: Column<AdminCategory>[] = [
    { key: 'name', header: 'Nome', render: (c) => c.name },
    { key: 'layout', header: 'Layout', render: (c) => c.layout },
    { key: 'order', header: 'Ordem', render: (c) => String(c.displayOrder) },
    { key: 'count', header: 'Produtos', render: (c) => String(productsByCategory[c.id] ?? 0) },
    { key: 'actions', header: '', render: (c) => <RowActions onEdit={() => onEdit(c)} onDelete={() => onDelete(c)} /> },
  ];
  return <AdminTable columns={columns} rows={categories} rowKey={(c) => c.id} emptyMessage="Nenhuma categoria cadastrada." />;
}
```

```tsx
// components/admin/CategoriesTable.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CategoriesTable } from './CategoriesTable';

describe('CategoriesTable', () => {
  it('renders categories with product counts', () => {
    render(
      <CategoriesTable
        categories={[{ id: 'b', name: 'Burgers', displayOrder: 1, layout: 'grid' }]}
        productsByCategory={{ b: 12 }}
        onEdit={vi.fn()} onDelete={vi.fn()}
      />
    );
    expect(screen.getByText('Burgers')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: `CategoryFormModal.tsx`**

```tsx
// components/admin/CategoryFormModal.tsx
'use client';
import { useEffect, useState } from 'react';
import { AdminCategory, ApiError, humanize } from '@/lib/admin-api';
import { FormModal } from './FormModal';
import { FormField } from '@/components/ui/FormField';
import { Select } from '@/components/ui/Select';

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  category?: AdminCategory;
  onClose: () => void;
  onSubmit: (c: AdminCategory) => Promise<void>;
};

const EMPTY: AdminCategory = { id: '', name: '', displayOrder: 100, layout: 'grid' };

export function CategoryFormModal({ open, mode, category, onClose, onSubmit }: Props) {
  const [draft, setDraft] = useState<AdminCategory>(category ?? EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(category ?? EMPTY);
    setError(null);
  }, [category, open]);

  async function handle() {
    setSubmitting(true);
    try {
      await onSubmit(draft);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? humanize(e) : 'Falha na conexão.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal
      open={open}
      title={mode === 'create' ? 'Nova categoria' : `Editar ${category?.name ?? ''}`}
      onClose={onClose}
      onSubmit={handle}
      submitting={submitting}
      error={error}
    >
      <FormField label="ID (slug)" htmlFor="c-id" required>
        <input
          id="c-id"
          value={draft.id}
          onChange={(e) => setDraft({ ...draft, id: e.target.value })}
          required disabled={mode === 'edit'}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm disabled:bg-neutral-100"
        />
      </FormField>
      <FormField label="Nome" htmlFor="c-name" required>
        <input
          id="c-name" maxLength={120} required
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </FormField>
      <FormField label="Ordem" htmlFor="c-order">
        <input
          id="c-order" type="number"
          value={draft.displayOrder}
          onChange={(e) => setDraft({ ...draft, displayOrder: Number(e.target.value) })}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </FormField>
      <FormField label="Layout" htmlFor="c-layout">
        <Select
          id="c-layout"
          value={draft.layout}
          onChange={(v) => setDraft({ ...draft, layout: v as 'grid' | 'list' })}
          options={[{ value: 'grid', label: 'Grid' }, { value: 'list', label: 'Lista' }]}
        />
      </FormField>
    </FormModal>
  );
}
```

```tsx
// components/admin/CategoryFormModal.test.tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CategoryFormModal } from './CategoryFormModal';

describe('CategoryFormModal', () => {
  it('submits new category', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CategoryFormModal open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('ID (slug)'), { target: { value: 'b' } });
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Burgers' } });
    fireEvent.click(screen.getByText('Salvar'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });
});
```

- [ ] **Step 3: `app/admin/categorias/page.tsx`**

```tsx
'use client';
import { useMemo, useState } from 'react';
import * as adminApi from '@/lib/admin-api';
import { AdminCategory } from '@/lib/admin-api';
import { useAdminCategories, useAdminProducts } from '@/lib/admin-catalog';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { CategoriesTable } from '@/components/admin/CategoriesTable';
import { CategoryFormModal } from '@/components/admin/CategoryFormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export default function CategoriasPage() {
  const { items: categories, refetch } = useAdminCategories();
  const { items: products } = useAdminProducts();
  const [formOpen, setFormOpen] = useState<{ mode: 'create' | 'edit'; category?: AdminCategory } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminCategory | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of products) m[p.categoryId] = (m[p.categoryId] ?? 0) + 1;
    return m;
  }, [products]);

  async function handleSubmit(c: AdminCategory) {
    if (formOpen?.mode === 'create') await adminApi.createCategory(c);
    else await adminApi.updateCategory(c.id, c);
    await refetch();
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await adminApi.deleteCategory(pendingDelete.id);
      await refetch();
      setPendingDelete(null);
      setDeleteError(null);
    } catch (e) {
      const err = e as adminApi.ApiError;
      if (err.type === 'category-has-products') {
        setDeleteError(`Categoria tem ${counts[pendingDelete.id] ?? 0} produtos. Mova-os ou exclua-os primeiro.`);
      } else {
        setDeleteError(adminApi.humanize(err));
      }
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Categorias"
        action={
          <button
            onClick={() => setFormOpen({ mode: 'create' })}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Nova categoria
          </button>
        }
      />
      <CategoriesTable
        categories={categories}
        productsByCategory={counts}
        onEdit={(c) => setFormOpen({ mode: 'edit', category: c })}
        onDelete={(c) => { setDeleteError(null); setPendingDelete(c); }}
      />

      {formOpen && (
        <CategoryFormModal
          open mode={formOpen.mode} category={formOpen.category}
          onClose={() => setFormOpen(null)}
          onSubmit={handleSubmit}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Excluir categoria?"
        message={deleteError ?? `Categoria: ${pendingDelete?.name ?? ''}.`}
        confirmLabel={deleteError ? 'Fechar' : 'Excluir'}
        destructive={!deleteError}
        onConfirm={deleteError ? () => { setPendingDelete(null); setDeleteError(null); } : confirmDelete}
        onCancel={() => { setPendingDelete(null); setDeleteError(null); }}
      />
    </div>
  );
}
```

```tsx
// app/admin/categorias/page.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CategoriasPage from './page';
import * as adminApi from '@/lib/admin-api';

describe('CategoriasPage', () => {
  it('renders categories list', async () => {
    vi.spyOn(adminApi, 'listCategories').mockResolvedValue([
      { id: 'b', name: 'Burgers', displayOrder: 1, layout: 'grid' },
    ]);
    vi.spyOn(adminApi, 'listProducts').mockResolvedValue([]);
    render(<CategoriasPage />);
    await waitFor(() => expect(screen.getByText('Burgers')).toBeInTheDocument());
  });
});
```

- [ ] **Step 4: `CouponsTable.tsx`**

```tsx
// components/admin/CouponsTable.tsx
'use client';
import { AdminCoupon } from '@/lib/admin-api';
import { AdminTable, Column } from './AdminTable';
import { InlineToggle } from './InlineToggle';
import { RowActions } from './RowActions';

type Props = {
  coupons: AdminCoupon[];
  onEdit: (c: AdminCoupon) => void;
  onDelete: (c: AdminCoupon) => void;
  onToggleActive: (c: AdminCoupon, next: boolean) => Promise<unknown>;
};

function fmtValue(c: AdminCoupon) {
  return c.type === 'percent' ? `${c.value}%` : c.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function fmtDate(iso?: string) {
  return iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';
}

export function CouponsTable({ coupons, onEdit, onDelete, onToggleActive }: Props) {
  const columns: Column<AdminCoupon>[] = [
    { key: 'code', header: 'Código', render: (c) => c.code },
    { key: 'type', header: 'Tipo', render: (c) => c.type },
    { key: 'value', header: 'Valor', render: fmtValue },
    { key: 'min', header: 'Min subtotal', render: (c) => c.minSubtotal != null ? `R$ ${c.minSubtotal}` : '—' },
    { key: 'validity', header: 'Validade', render: (c) => `${fmtDate(c.validFrom)} → ${fmtDate(c.validUntil)}` },
    { key: 'active', header: 'Ativo', render: (c) => (
      <InlineToggle initial={c.active} label="Ativo" onToggle={(next) => onToggleActive(c, next)} />
    )},
    { key: 'actions', header: '', render: (c) => <RowActions onEdit={() => onEdit(c)} onDelete={() => onDelete(c)} /> },
  ];
  return <AdminTable columns={columns} rows={coupons} rowKey={(c) => c.code} emptyMessage="Nenhum cupom cadastrado." />;
}
```

```tsx
// components/admin/CouponsTable.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CouponsTable } from './CouponsTable';

describe('CouponsTable', () => {
  it('renders coupons with formatted value', () => {
    render(
      <CouponsTable
        coupons={[{ code: 'OFF10', type: 'percent', value: 10, active: true }]}
        onEdit={vi.fn()} onDelete={vi.fn()}
        onToggleActive={vi.fn().mockResolvedValue(undefined)}
      />
    );
    expect(screen.getByText('OFF10')).toBeInTheDocument();
    expect(screen.getByText('10%')).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: `CouponFormModal.tsx`**

```tsx
// components/admin/CouponFormModal.tsx
'use client';
import { useEffect, useState } from 'react';
import { AdminCoupon, ApiError, humanize } from '@/lib/admin-api';
import { FormModal } from './FormModal';
import { FormField } from '@/components/ui/FormField';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { DateInput } from '@/components/ui/DateInput';

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  coupon?: AdminCoupon;
  onClose: () => void;
  onSubmit: (c: AdminCoupon) => Promise<void>;
};

const EMPTY: AdminCoupon = { code: '', type: 'percent', value: 0, active: true };

export function CouponFormModal({ open, mode, coupon, onClose, onSubmit }: Props) {
  const [draft, setDraft] = useState<AdminCoupon>(coupon ?? EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(coupon ?? EMPTY);
    setError(null);
  }, [coupon, open]);

  function validate(): string | null {
    if (draft.type === 'percent' && (draft.value <= 0 || draft.value > 100)) {
      return 'Cupom percent deve ter 0 < valor <= 100.';
    }
    if (draft.type === 'fixed' && draft.value <= 0) {
      return 'Cupom fixed deve ter valor > 0.';
    }
    if (draft.validFrom && draft.validUntil && draft.validFrom >= draft.validUntil) {
      return 'Valid from deve ser antes de valid until.';
    }
    return null;
  }

  async function handle() {
    const err = validate();
    if (err) { setError(err); return; }
    setSubmitting(true);
    try {
      await onSubmit({ ...draft, code: draft.code.toUpperCase() });
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? humanize(e) : 'Falha na conexão.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal
      open={open}
      title={mode === 'create' ? 'Novo cupom' : `Editar ${coupon?.code ?? ''}`}
      onClose={onClose}
      onSubmit={handle}
      submitting={submitting}
      error={error}
    >
      <FormField label="Código" htmlFor="c-code" required>
        <input
          id="c-code" required disabled={mode === 'edit'}
          value={draft.code}
          onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm uppercase disabled:bg-neutral-100"
        />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Tipo" htmlFor="c-type" required>
          <Select
            id="c-type"
            value={draft.type}
            onChange={(v) => setDraft({ ...draft, type: v as 'percent' | 'fixed' })}
            options={[{ value: 'percent', label: 'Percent (%)' }, { value: 'fixed', label: 'Fixo (R$)' }]}
          />
        </FormField>
        <FormField label="Valor" htmlFor="c-value" required>
          <input
            id="c-value" type="number" step="0.01" required
            value={draft.value}
            onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })}
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
        </FormField>
      </div>
      <FormField label="Subtotal mínimo" htmlFor="c-min" hint="opcional">
        <input
          id="c-min" type="number" step="0.01"
          value={draft.minSubtotal ?? ''}
          onChange={(e) => setDraft({ ...draft, minSubtotal: e.target.value ? Number(e.target.value) : undefined })}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Válido de" htmlFor="c-from">
          <DateInput
            id="c-from"
            value={draft.validFrom ?? ''}
            onChange={(v) => setDraft({ ...draft, validFrom: v || undefined })}
          />
        </FormField>
        <FormField label="Válido até" htmlFor="c-until">
          <DateInput
            id="c-until"
            value={draft.validUntil ?? ''}
            onChange={(v) => setDraft({ ...draft, validUntil: v || undefined })}
          />
        </FormField>
      </div>
      <label className="mt-2 flex items-center gap-2 text-sm">
        <Switch checked={draft.active} onChange={(v) => setDraft({ ...draft, active: v })} aria-label="Ativo" />
        Ativo
      </label>
    </FormModal>
  );
}
```

```tsx
// components/admin/CouponFormModal.test.tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CouponFormModal } from './CouponFormModal';

describe('CouponFormModal', () => {
  it('rejects percent > 100', async () => {
    const onSubmit = vi.fn();
    render(<CouponFormModal open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Código'), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText('Valor'), { target: { value: '150' } });
    fireEvent.click(screen.getByText('Salvar'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/0 < valor <= 100/));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('uppercases code on submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CouponFormModal open mode="create" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Código'), { target: { value: 'off10' } });
    fireEvent.change(screen.getByLabelText('Valor'), { target: { value: '10' } });
    fireEvent.click(screen.getByText('Salvar'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ code: 'OFF10' })));
  });
});
```

- [ ] **Step 6: `app/admin/cupons/page.tsx`**

```tsx
'use client';
import { useState } from 'react';
import * as adminApi from '@/lib/admin-api';
import { AdminCoupon } from '@/lib/admin-api';
import { useAdminCoupons } from '@/lib/admin-catalog';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { CouponsTable } from '@/components/admin/CouponsTable';
import { CouponFormModal } from '@/components/admin/CouponFormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export default function CuponsPage() {
  const { items: coupons, refetch } = useAdminCoupons();
  const [formOpen, setFormOpen] = useState<{ mode: 'create' | 'edit'; coupon?: AdminCoupon } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminCoupon | null>(null);

  async function handleSubmit(c: AdminCoupon) {
    if (formOpen?.mode === 'create') await adminApi.createCoupon(c);
    else await adminApi.updateCoupon(c.code, c);
    await refetch();
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    await adminApi.deleteCoupon(pendingDelete.code);
    await refetch();
    setPendingDelete(null);
  }

  return (
    <div>
      <AdminPageHeader
        title="Cupons"
        action={
          <button
            onClick={() => setFormOpen({ mode: 'create' })}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Novo cupom
          </button>
        }
      />
      <CouponsTable
        coupons={coupons}
        onEdit={(c) => setFormOpen({ mode: 'edit', coupon: c })}
        onDelete={(c) => setPendingDelete(c)}
        onToggleActive={async (c, next) => { await adminApi.updateCoupon(c.code, { active: next }); await refetch(); }}
      />

      {formOpen && (
        <CouponFormModal
          open mode={formOpen.mode} coupon={formOpen.coupon}
          onClose={() => setFormOpen(null)}
          onSubmit={handleSubmit}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Excluir cupom?"
        message={`Cupom: ${pendingDelete?.code ?? ''}.`}
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
```

```tsx
// app/admin/cupons/page.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CuponsPage from './page';
import * as adminApi from '@/lib/admin-api';

describe('CuponsPage', () => {
  it('renders coupons list', async () => {
    vi.spyOn(adminApi, 'listCoupons').mockResolvedValue([
      { code: 'OFF10', type: 'percent', value: 10, active: true },
    ]);
    render(<CuponsPage />);
    await waitFor(() => expect(screen.getByText('OFF10')).toBeInTheDocument());
  });
});
```

- [ ] **Step 7: Rodar**

```bash
npm test -- components/admin/Cat components/admin/Coup app/admin/categ app/admin/cupons --run
```

Esperado: 6 arquivos verdes.

- [ ] **Step 8: Commit**

```bash
git add components/admin/CategoriesTable.tsx components/admin/CategoriesTable.test.tsx \
        components/admin/CategoryFormModal.tsx components/admin/CategoryFormModal.test.tsx \
        components/admin/CouponsTable.tsx components/admin/CouponsTable.test.tsx \
        components/admin/CouponFormModal.tsx components/admin/CouponFormModal.test.tsx \
        app/admin/categorias/page.tsx app/admin/categorias/page.test.tsx \
        app/admin/cupons/page.tsx app/admin/cupons/page.test.tsx
git commit -m "$(cat <<'EOF'
feat(sp5c): paginas /admin/categorias e /admin/cupons

CategoriesTable mostra Nome | Layout | Ordem | # Produtos (counted
client-side via useAdminProducts). CategoryFormModal cobre create+edit
com id RO em edit, layout grid|list. Page trata erro 409
category-has-products com mensagem especifica do count.

CouponsTable formata percent (%) | fixed (R$), validade dd/MM/yyyy,
toggle Ativo inline. CouponFormModal valida percent 0<v<=100, fixed
v>0, validFrom < validUntil. Codigo uppercase enforce.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Remoção do WhatsApp do checkout

**Files:**
- Modify: `app/checkout/page.tsx`
- Modify: `app/checkout/page.test.tsx`
- Modify: `components/checkout/OrderStatusScreen.tsx`
- (Possivelmente) Modify: `lib/order-message.ts`

- [ ] **Step 1: Auditar uso de `buildWhatsAppMessage` fora do checkout**

```bash
grep -rn "buildWhatsAppMessage" app components lib --include="*.ts" --include="*.tsx"
```

Se único consumidor for `app/checkout/page.tsx`, vou remover a função do `lib/order-message.ts` + seus testes no step 4. Se houver outros consumidores, mantenho a função.

- [ ] **Step 2: Modificar `app/checkout/page.tsx` — remover envio WhatsApp do submit**

Abra o arquivo. Localize o bloco em `submit()` (linhas ~187-218 atualmente — número pode variar) e:

1. Remova o import: `import { buildWhatsAppMessage } from '@/lib/order-message';`
2. Remova o bloco que começa em `// 2) Busca categorias só pra agrupar a mensagem do WhatsApp` até o fechamento do try (≈10 linhas).
3. Remova:
   ```ts
   const msg = buildWhatsAppMessage({ ... });
   const url = `https://wa.me/${storeConfig.whatsappNumber}?text=${encodeURIComponent(msg)}`;
   window.open(url, '_blank');
   ```
4. Substitua tudo isso por nada (o `submit()` fica menor: cria order → set state).

> **Importante:** mantém imports usados ainda por outros lugares do arquivo (`toLegacyMenu`, `getMenu`) se forem usados; se ficaram só pro WhatsApp, remove também.

- [ ] **Step 3: Modificar `app/checkout/page.test.tsx`**

1. Remova qualquer assert do tipo `expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('wa.me'), ...)`.
2. Remova asserts sobre formato da mensagem WhatsApp.
3. Adicione um teste de regressão (no bloco do happy path do submit):

```typescript
it('does NOT open WhatsApp on submit (SP5c removeu duplicacao)', async () => {
  // ... setup já existente do fill + click submit
  expect(openSpy).not.toHaveBeenCalled();
});
```

Mantém `openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);` (outros testes do arquivo provavelmente ainda dependem).

- [ ] **Step 4: Modificar `components/checkout/OrderStatusScreen.tsx`**

Localize a linha (atualmente ~211):
```typescript
? 'aguardando confirmação da loja no WhatsApp.'
```

Substitua por:
```typescript
? 'aguardando confirmação da loja.'
```

> NÃO toque nos outros usos de `openWhatsApp(...)` (Falar com a loja, Ajuda, Ligar, Abrir conversa, Cancelar pedido) — esses canais permanecem.

- [ ] **Step 5: Se único consumidor de `buildWhatsAppMessage` era o checkout, remover**

Caso confirmado em Step 1:

1. Abra `lib/order-message.ts`, delete a função `buildWhatsAppMessage` e seus tipos exclusivos.
2. Abra `lib/order-message.test.ts` (ou similar), delete os blocos de teste de `buildWhatsAppMessage`.
3. Mantém `buildContactMessage`, `buildHelpMessage`, `buildCancelMessage` (usados em OrderStatusScreen).

- [ ] **Step 6: Rodar testes envolvidos**

```bash
npm test -- app/checkout components/checkout/OrderStatusScreen lib/order-message --run
```

Esperado: todos verdes (216 baseline mantido — pode ter -1 ou -2 se removeu testes de `buildWhatsAppMessage`).

- [ ] **Step 7: Commit**

```bash
git add app/checkout/page.tsx app/checkout/page.test.tsx \
        components/checkout/OrderStatusScreen.tsx lib/order-message.ts lib/order-message.test.ts
git commit -m "$(cat <<'EOF'
feat(sp5c): remove duplicacao WhatsApp no checkout

submit() do checkout deixa de chamar window.open(wa.me) em paralelo
ao POST /orders. Pedido vai direto pra fila do admin (SP5c). Mantem
WhatsApp como canal de comunicacao no OrderStatusScreen (botoes Falar
com a loja, Ajuda, Ligar, Cancelar pedido continuam). Texto do status
RECEIVED muda de "aguardando confirmacao da loja no WhatsApp" para
"aguardando confirmacao da loja". Regressao guard: openSpy not called
no submit OK.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Smoke + suite final + push + PR

**Files:** nenhum

- [ ] **Step 1: Suite backend completa**

```bash
cd backend && ./gradlew test
```

Esperado: 153 baseline + 6 SP5c = 159 verdes. Flake do Testcontainers conhecida (`CrossCookieIsolationIT` ou outro IT) pode aparecer — re-rodar isolado pra confirmar.

- [ ] **Step 2: Suite front completa**

```bash
cd .. && npm test -- --run
```

Esperado: 216 baseline + ~25 SP5c = ~241 verdes.

- [ ] **Step 3: Smoke manual local**

```bash
# 1. postgres + mailhog (a partir de backend/)
cd backend && docker compose up -d
# 2. confirma envs (.env já tem ADMIN_BOOTSTRAP_PASSWORD do SP5b.1)
# 3. backend
set -a && source .env && set +a && ./gradlew bootRun &
# 4. front (em outra shell ou após backend up)
cd .. && npm run dev
```

Cenários a validar (via browser em `http://localhost:3000`):

1. **Login admin**: abrir `/admin/entrar` → email `admin@bragas.local` + senha do `.env` → redireciona pra `/admin/pedidos`
2. **Fila vazia**: estado "Sem pedidos ativos." aparece
3. **Pedido novo aparece**: em outra aba/incognito, fazer pedido via `/`+`/checkout`. Em até 10s, deve aparecer no admin com bip + toast (se som ON)
4. **Aceitar**: clicar Aceitar → pedido muda pra PREPARING (badge azul)
5. **Confirmar entrega**: continuar fluxo até DELIVERED
6. **Histórico**: tab Histórico mostra o pedido entregue
7. **CRUD produto**: criar produto novo → editar → toggle Ativo → deletar (se não tem orders ligados)
8. **CRUD categoria**: criar → tentar deletar categoria com produtos → ver mensagem de erro
9. **CRUD cupom**: criar percent 10% → ativar → desativar via InlineToggle → editar para 15% → deletar
10. **Logout**: clicar Sair → vai pra `/admin/entrar`
11. **Checkout sem WhatsApp**: fazer pedido como cliente → no submit, **não** abre janela WhatsApp; vai direto pra OrderStatusScreen

- [ ] **Step 4: Push e PR**

```bash
git push -u origin feat/sp5c-admin-crud-ui
gh pr create --title "feat(sp5c): admin CRUD UI + fila de pedidos + remove WhatsApp do checkout" --body "$(cat <<'EOF'
## Summary

- Painel admin web sob /admin/* no mesmo Next.js (rotas /admin/entrar, /admin/pedidos, /admin/produtos, /admin/categorias, /admin/cupons)
- Sidebar fixa + header com switch de som + AdminAuthProvider/Gate isolado do cliente (cookies bb_admin/bb_session já separados)
- Fila de pedidos com polling 10s, AbortController, pausa em document.hidden, tabs Ativos/Histórico, bip + toast em pedido novo
- CRUD completo via modais inline: produtos, categorias, cupons. InlineToggle pra Ativo/Featured. ConfirmDialog pra delete.
- Backend: GET /api/v1/admin/orders com filtro de status CSV + paginação + clamp size 100 + audit log + 6 ITs
- Remove duplicação WhatsApp do checkout submit; mantém canal de comunicação no OrderStatusScreen

## Test plan

- [x] `./gradlew test` verde (~159 testes; 153 baseline SP5b.1 + 6 admin orders IT)
- [x] `npm test` ~241 verdes (216 baseline + ~25 SP5c)
- [x] Smoke local: login admin + fila com pedido novo + CRUD completo + checkout sem WhatsApp

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Confirmar PR**

```bash
gh pr view --json number,url,state
```

Esperado: state OPEN, URL imprimida.

---

## Summary

- 11 tasks, ~55 steps, commits frequentes por task
- TDD nas tasks 1, 2, 3 (testes antes da impl)
- Refetch após mutação nos CRUDs; optimistic só nos InlineToggle e em OrderCard
- 1 endpoint backend novo (`GET /admin/orders`) com 6 ITs
- ~25 testes front novos + ~6 IT backend
- Smoke manual cobre 11 cenários

## Test plan

- [ ] Task 1: 6 ITs backend `OrderAdminControllerListIT` verdes; baseline 153 mantido = 159
- [ ] Task 2: 6 primitivos UI com ~13 testes
- [ ] Task 3: admin-api + admin-auth com ~9 testes
- [ ] Task 4: 5 shared components com ~10 testes
- [ ] Task 5: 4 shell components com ~9 testes + 3 páginas (login + layout + redirect)
- [ ] Task 6: 2 hooks com ~7 testes
- [ ] Task 7: página pedidos com ~6 testes
- [ ] Task 8: página produtos com ~3 testes
- [ ] Task 9: páginas categorias + cupons com ~6 testes
- [ ] Task 10: regressão no checkout test + texto OrderStatusScreen
- [ ] Task 11: smoke + push + PR

## Self-Review

**Spec coverage (cada seção da spec aponta pra tasks):**

| Seção spec | Tasks |
|---|---|
| §1 Contexto | (intro do plano) |
| §2 Decisões 1-10 | Tasks 1-10 distribuem; §10 (notificação opt-in) cobrida em Task 5 (header) + Task 6 (admin-orders) + Task 7 (page) |
| §3 Arquitetura (rotas + provider + admin-api + backend) | Tasks 1, 3, 5 |
| §4 Componentes (primitivos + admin shared + tema) | Tasks 2, 4 |
| §5 Páginas (entrar, layout, pedidos, produtos, categorias, cupons) | Tasks 5, 7, 8, 9 |
| §6 Hooks e data flow | Task 6 |
| §7 Remoção WhatsApp | Task 10 |
| §8 Erros e UX | distribuído em todas as páginas (ConfirmDialog + banner em modais) |
| §9 Acessibilidade | distribuído (Modal/Switch/ConfirmDialog na Task 2, Sidebar na Task 5) |
| §10 Tests | distribuído (cada task tem testes; Task 11 valida totais) |
| §11 Data flow caminho feliz | Task 11 smoke step 3 |
| §12 Critérios de sucesso | Task 11 |
| §13 Fora de escopo | N/A (não implementa) |

**Placeholder scan:** Nenhum TBD/TODO. Os "ajuste se você tem helper pra mudar status" e "verifique se há helper" em Task 1 step 8 são instruções pro engineer descobrir contexto pontual no código existente, não placeholders abertos.

**Type consistency:**
- `AdminOrder.status` é `OrderStatus = 'RECEIVED' | 'PREPARING' | 'OUT' | 'DELIVERED' | 'CANCELLED'` consistente
- `AdminProduct.featured` boolean obrigatório (não opcional) bate com EMPTY {} default + form
- `useOrderQueue(scope: 'active' | 'history')` consistente entre Tasks 6 e 7
- `adminApi.updateProduct(id, patch: Partial<AdminProduct>)` aceita parcial em todos usos (toggle inline + form completo)
- `AdminCoupon` campos bate entre admin-api + CouponsTable + CouponFormModal
- `ApiError.type` string consistente; comparado via `===` em todos os specs de erro (`product-has-orders`, `category-has-products`, `unauthenticated`, `invalid-credentials`)

Sem gaps detectados.

Plano pronto.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
