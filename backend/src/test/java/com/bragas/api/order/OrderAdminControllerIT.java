package com.bragas.api.order;

import com.fasterxml.jackson.databind.ObjectMapper;
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

import static org.hamcrest.Matchers.endsWith;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class OrderAdminControllerIT {

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
            return Clock.fixed(Instant.parse("2026-05-19T19:00:00Z"), ZoneOffset.UTC);
        }
    }

    @Autowired MockMvc mvc;
    private final ObjectMapper mapper = new ObjectMapper();

    @BeforeEach
    void cleanup(@Autowired OrderRepository repo) {
        repo.deleteAll();
    }

    private static final String VALID_ORDER = """
        {
          "customer": { "name": "João", "phone": "(21) 99999-0000" },
          "fulfillmentType": "PICKUP",
          "payment": "PIX",
          "items": [
            { "productId": "chicken", "quantity": 1 },
            { "productId": "crispy-catupiry", "quantity": 1 }
          ]
        }
        """;

    private String createOrderAndReturnId() throws Exception {
        String created = mvc.perform(post("/api/v1/orders").contentType("application/json").content(VALID_ORDER))
            .andReturn().getResponse().getContentAsString();
        return mapper.readTree(created).get("id").asText();
    }

    @Test
    void patchSemTokenRetorna401() throws Exception {
        String id = createOrderAndReturnId();
        mvc.perform(patch("/api/v1/admin/orders/" + id + "/status")
                .contentType("application/json")
                .content("{\"to\":\"PREPARING\"}"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.type", endsWith("admin-token-missing")));
    }

    @Test
    void patchTokenErradoRetorna401() throws Exception {
        String id = createOrderAndReturnId();
        mvc.perform(patch("/api/v1/admin/orders/" + id + "/status")
                .header("X-Admin-Token", "errado")
                .contentType("application/json")
                .content("{\"to\":\"PREPARING\"}"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.type", endsWith("admin-token-invalid")));
    }

    @Test
    void transicaoValidaGravaTimestamp() throws Exception {
        String id = createOrderAndReturnId();
        mvc.perform(patch("/api/v1/admin/orders/" + id + "/status")
                .header("X-Admin-Token", "test-admin-token")
                .contentType("application/json")
                .content("{\"to\":\"PREPARING\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("PREPARING"))
            .andExpect(jsonPath("$.timestamps.preparingAt").value(notNullValue()))
            .andExpect(jsonPath("$.timestamps.outAt").value(nullValue()));
    }

    @Test
    void transicaoInvalidaRetorna409() throws Exception {
        String id = createOrderAndReturnId();
        mvc.perform(patch("/api/v1/admin/orders/" + id + "/status")
                .header("X-Admin-Token", "test-admin-token")
                .contentType("application/json")
                .content("{\"to\":\"DELIVERED\"}"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.type", endsWith("invalid-status-transition")));
    }

    @Test
    void pedidoInexistenteRetorna404() throws Exception {
        mvc.perform(patch("/api/v1/admin/orders/ord_nao_existe/status")
                .header("X-Admin-Token", "test-admin-token")
                .contentType("application/json")
                .content("{\"to\":\"PREPARING\"}"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.type", endsWith("order-not-found")));
    }

    @Test
    void fluxoCompletoReceivedPreparingOutDelivered() throws Exception {
        String id = createOrderAndReturnId();
        for (String to : new String[]{"PREPARING", "OUT", "DELIVERED"}) {
            mvc.perform(patch("/api/v1/admin/orders/" + id + "/status")
                    .header("X-Admin-Token", "test-admin-token")
                    .contentType("application/json")
                    .content("{\"to\":\"" + to + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(to));
        }
    }
}
