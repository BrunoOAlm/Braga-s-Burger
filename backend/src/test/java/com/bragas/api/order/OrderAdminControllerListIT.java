package com.bragas.api.order;

import com.bragas.api.auth.admin.AdminAuthTestHelper;
import com.bragas.api.order.domain.OrderStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class OrderAdminControllerListIT {

    @Container @SuppressWarnings("resource")
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withDatabaseName("bragas").withUsername("bragas").withPassword("bragas");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url",      postgres::getJdbcUrl);
        r.add("spring.datasource.username", postgres::getUsername);
        r.add("spring.datasource.password", postgres::getPassword);
    }

    @TestConfiguration
    static class TestClock {
        @Bean @Primary
        Clock clock() {
            // Tuesday 2026-05-19 19:00 UTC — store is open
            return Clock.fixed(Instant.parse("2026-05-19T19:00:00Z"), ZoneOffset.UTC);
        }
    }

    @Autowired MockMvc mvc;
    @Autowired OrderService orderService;
    @Autowired OrderRepository orderRepo;

    private final ObjectMapper mapper = new ObjectMapper();
    private Cookie adminCookie;

    // Minimal PICKUP order body — matches products in test seed data
    private static final String VALID_ORDER = """
        {
          "customer": { "name": "Cliente Teste", "phone": "(21) 99999-0000" },
          "fulfillmentType": "PICKUP",
          "payment": "PIX",
          "items": [
            { "productId": "chicken", "quantity": 1 },
            { "productId": "crispy-catupiry", "quantity": 1 }
          ]
        }
        """;

    @BeforeEach
    void setup() throws Exception {
        orderRepo.deleteAll();
        adminCookie = AdminAuthTestHelper.loginAndGetCookie(mvc);
    }

    /** Creates an order via POST and returns its UUID id. */
    private String createOrder() throws Exception {
        String body = mvc.perform(post("/api/v1/orders")
                .contentType("application/json")
                .content(VALID_ORDER))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
        return mapper.readTree(body).get("id").asText();
    }

    // ── Test 1 ──────────────────────────────────────────────────────────────
    @Test
    void returns_active_orders_by_default() throws Exception {
        // 3 orders: RECEIVED (active), PREPARING (active), DELIVERED (not active)
        String id1 = createOrder(); // stays RECEIVED
        String id2 = createOrder(); // → PREPARING
        String id3 = createOrder(); // → PREPARING → OUT → DELIVERED

        orderService.transitionStatus(id2, OrderStatus.PREPARING);

        orderService.transitionStatus(id3, OrderStatus.PREPARING);
        orderService.transitionStatus(id3, OrderStatus.OUT);
        orderService.transitionStatus(id3, OrderStatus.DELIVERED);

        // GET without ?status → default active set: RECEIVED + PREPARING + OUT
        mvc.perform(get("/api/v1/admin/orders").cookie(adminCookie))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.total").value(2))
            .andExpect(jsonPath("$.items", hasSize(2)));
    }

    // ── Test 2 ──────────────────────────────────────────────────────────────
    @Test
    void filters_by_status_csv() throws Exception {
        String id1 = createOrder(); // stays RECEIVED
        String id2 = createOrder(); // → PREPARING

        orderService.transitionStatus(id2, OrderStatus.PREPARING);

        mvc.perform(get("/api/v1/admin/orders?status=RECEIVED").cookie(adminCookie))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.items[0].status").value("RECEIVED"));
    }

    // ── Test 3 ──────────────────────────────────────────────────────────────
    @Test
    void paginates_with_page_and_size() throws Exception {
        // Create 5 orders (all RECEIVED)
        for (int i = 0; i < 5; i++) {
            createOrder();
        }

        // page=1, size=2 → second page of 2, total must be 5
        mvc.perform(get("/api/v1/admin/orders?status=RECEIVED&size=2&page=1").cookie(adminCookie))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items", hasSize(2)))
            .andExpect(jsonPath("$.total").value(5))
            .andExpect(jsonPath("$.page").value(1))
            .andExpect(jsonPath("$.size").value(2));
    }

    // ── Test 4 ──────────────────────────────────────────────────────────────
    @Test
    void rejects_invalid_status() throws Exception {
        mvc.perform(get("/api/v1/admin/orders?status=BANANA").cookie(adminCookie))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.type", endsWith("validation-failed")));
    }

    // ── Test 5 ──────────────────────────────────────────────────────────────
    @Test
    void unauthenticated_returns_401() throws Exception {
        mvc.perform(get("/api/v1/admin/orders"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.type", endsWith("unauthenticated")));
    }

    // ── Test 6 ──────────────────────────────────────────────────────────────
    @Test
    void clamps_size_to_max_100() throws Exception {
        mvc.perform(get("/api/v1/admin/orders?size=500").cookie(adminCookie))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.size").value(100));
    }
}
