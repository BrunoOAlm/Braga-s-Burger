package com.bragas.api.order;

import com.bragas.api.catalog.CategoryRepository;
import com.bragas.api.catalog.ProductRepository;
import com.bragas.api.catalog.domain.Product;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
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
class OrderControllerIT {

    @Container @SuppressWarnings("resource")
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withDatabaseName("bragas").withUsername("bragas").withPassword("bragas");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url",      postgres::getJdbcUrl);
        r.add("spring.datasource.username", postgres::getUsername);
        r.add("spring.datasource.password", postgres::getPassword);
    }

    // Fixar clock em terça 2026-05-19 às 19h (loja aberta na tue)
    @TestConfiguration
    static class TestClock {
        @Bean @Primary
        Clock clock() {
            return Clock.fixed(Instant.parse("2026-05-19T19:00:00Z"), ZoneOffset.UTC);
        }
    }

    @Autowired MockMvc mvc;
    @Autowired ProductRepository productRepo;
    @Autowired CategoryRepository categoryRepo;
    private final ObjectMapper mapper = new ObjectMapper();

    @BeforeEach
    void cleanup(@Autowired OrderRepository repo) {
        repo.deleteAll();
        // Cria produto fixture "esgotado-test" (available=false) usado por
        // productUnavailable(). Idempotente — se já existir, no-op.
        if (!productRepo.existsById("esgotado-test")) {
            var burgers = categoryRepo.findById("burgers").orElseThrow();
            var p = new Product("esgotado-test", burgers, "Esgotado (test fixture)", new BigDecimal("10.00"));
            p.setAvailable(false);
            productRepo.save(p);
        }
    }

    private static final String VALID_DELIVERY = """
        {
          "customer": { "name": "João", "phone": "(21) 99999-0000" },
          "fulfillmentType": "DELIVERY",
          "address": { "cep": "20000-000", "street": "Rua A", "number": "1", "neighborhood": "Higienópolis" },
          "payment": "CREDIT",
          "items": [
            { "productId": "chicken", "quantity": 1 },
            { "productId": "crispy-catupiry", "quantity": 1 }
          ]
        }
        """;

    private static final String VALID_PICKUP = """
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

    @Test
    void postDeliveryHappyPath() throws Exception {
        mvc.perform(post("/api/v1/orders").contentType("application/json").content(VALID_DELIVERY))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id", startsWith("ord_")))
            .andExpect(jsonPath("$.displayId", matchesPattern("^#\\d{4}$")))
            .andExpect(jsonPath("$.status").value("RECEIVED"))
            .andExpect(jsonPath("$.totals.subtotal").value(65.80))
            .andExpect(jsonPath("$.totals.deliveryFee").value(4.99))
            .andExpect(jsonPath("$.totals.total").value(70.79))
            .andExpect(jsonPath("$.timestamps.receivedAt").isNotEmpty())
            .andExpect(jsonPath("$.timestamps.preparingAt").value(nullValue()));
    }

    @Test
    void postPickupHappyPath() throws Exception {
        mvc.perform(post("/api/v1/orders").contentType("application/json").content(VALID_PICKUP))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.totals.deliveryFee").value(0.00))
            .andExpect(jsonPath("$.estimatedMinutes.min").value(20))
            .andExpect(jsonPath("$.estimatedMinutes.max").value(30));
    }

    @Test
    void productNotFound() throws Exception {
        String body = """
            {
              "customer": { "name": "João", "phone": "(21) 99999-0000" },
              "fulfillmentType": "PICKUP",
              "payment": "PIX",
              "items": [{ "productId": "nao-existe", "quantity": 1 }]
            }
            """;
        mvc.perform(post("/api/v1/orders").contentType("application/json").content(body))
            .andExpect(status().isBadRequest())
            .andExpect(content().contentType("application/problem+json"))
            .andExpect(jsonPath("$.type", endsWith("product-not-found")));
    }

    @Test
    void productUnavailable() throws Exception {
        String body = """
            {
              "customer": { "name": "João", "phone": "(21) 99999-0000" },
              "fulfillmentType": "PICKUP",
              "payment": "PIX",
              "items": [
                { "productId": "chicken", "quantity": 1 },
                { "productId": "crispy-catupiry", "quantity": 1 },
                { "productId": "esgotado-test", "quantity": 1 }
              ]
            }
            """;
        mvc.perform(post("/api/v1/orders").contentType("application/json").content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.type", endsWith("product-unavailable")));
    }

    @Test
    void neighborhoodNotServed() throws Exception {
        String body = """
            {
              "customer": { "name": "João", "phone": "(21) 99999-0000" },
              "fulfillmentType": "DELIVERY",
              "address": { "street": "X", "number": "1", "neighborhood": "Copacabana" },
              "payment": "PIX",
              "items": [
                { "productId": "chicken", "quantity": 1 },
                { "productId": "crispy-catupiry", "quantity": 1 }
              ]
            }
            """;
        mvc.perform(post("/api/v1/orders").contentType("application/json").content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.type", endsWith("delivery-area-not-served")));
    }

    @Test
    void orderUnderMinimum() throws Exception {
        String body = """
            {
              "customer": { "name": "João", "phone": "(21) 99999-0000" },
              "fulfillmentType": "PICKUP",
              "payment": "PIX",
              "items": [{ "productId": "coca-cola-2l", "quantity": 1 }]
            }
            """;
        mvc.perform(post("/api/v1/orders").contentType("application/json").content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.type", endsWith("order-min-not-met")));
    }

    @Test
    void getByIdHappyPath() throws Exception {
        String created = mvc.perform(post("/api/v1/orders").contentType("application/json").content(VALID_DELIVERY))
            .andReturn().getResponse().getContentAsString();
        String id = mapper.readTree(created).get("id").asText();

        mvc.perform(get("/api/v1/orders/" + id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(id));
    }

    @Test
    void getByIdNotFound() throws Exception {
        mvc.perform(get("/api/v1/orders/ord_nao_existe"))
            .andExpect(status().isNotFound())
            .andExpect(content().contentType("application/problem+json"))
            .andExpect(jsonPath("$.type", endsWith("order-not-found")));
    }

    @Test
    void getByDisplayId() throws Exception {
        String created = mvc.perform(post("/api/v1/orders").contentType("application/json").content(VALID_DELIVERY))
            .andReturn().getResponse().getContentAsString();
        String display = mapper.readTree(created).get("displayId").asText();
        String digitsOnly = display.substring(1); // tira o '#' (caractere de fragmento na URL)

        mvc.perform(get("/api/v1/orders/by-display/" + digitsOnly))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.displayId").value(display));
    }

    @Test
    void validationErrorWhenMissingCustomer() throws Exception {
        String body = """
            {
              "fulfillmentType": "PICKUP",
              "payment": "PIX",
              "items": [{ "productId": "chicken", "quantity": 1 }]
            }
            """;
        mvc.perform(post("/api/v1/orders").contentType("application/json").content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.type", endsWith("validation-failed")));
    }
}
