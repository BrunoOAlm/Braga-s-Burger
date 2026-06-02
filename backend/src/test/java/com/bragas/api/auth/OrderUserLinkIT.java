package com.bragas.api.auth;

import com.bragas.api.auth.dto.SignupRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
@Import({TestMailConfig.class, OrderUserLinkIT.TestClock.class})
class OrderUserLinkIT {

    // Fixa o clock em terça 2026-05-19 19h (loja aberta na tue) — sem isso,
    // POST /orders devolve 400 "loja fechada" quando o teste roda fora de horário.
    @TestConfiguration
    static class TestClock {
        @Bean @Primary
        Clock clock() {
            return Clock.fixed(Instant.parse("2026-05-19T19:00:00Z"), ZoneOffset.UTC);
        }
    }

    @Container @SuppressWarnings("resource")
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withDatabaseName("bragas").withUsername("bragas").withPassword("bragas");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url",      postgres::getJdbcUrl);
        r.add("spring.datasource.username", postgres::getUsername);
        r.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired MockMvc mvc;
    // Spring Boot 4 autoconfig usa Jackson 3 (tools.jackson) — Jackson 2 ObjectMapper
    // não é mais bean automático. Instanciamos localmente para serializar DTOs nos testes.
    private final ObjectMapper om = new ObjectMapper();
    @Autowired UserRepository userRepo;

    @BeforeEach
    void clean() { userRepo.deleteAll(); }

    private static final String VALID_ORDER_JSON =
        "{" +
        "\"customer\":{\"name\":\"Jo\",\"phone\":\"(21) 99999-0000\"}," +
        "\"fulfillmentType\":\"DELIVERY\"," +
        "\"address\":{\"cep\":\"20000-000\",\"street\":\"R\",\"number\":\"1\",\"neighborhood\":\"Higienópolis\"}," +
        "\"payment\":\"CREDIT\"," +
        "\"items\":[{\"productId\":\"chicken\",\"quantity\":2}]" +
        "}";

    @Test
    void order_created_with_cookie_persists_user_id() throws Exception {
        Cookie cookie = signupAndExtractCookie("buyer@example.com");
        mvc.perform(post("/api/v1/orders").cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON).content(VALID_ORDER_JSON))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.userId").isNotEmpty());
    }

    @Test
    void order_created_without_cookie_has_null_user_id() throws Exception {
        mvc.perform(post("/api/v1/orders")
                .contentType(MediaType.APPLICATION_JSON).content(VALID_ORDER_JSON))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.userId").isEmpty());
    }

    @Test
    void me_orders_returns_only_user_orders() throws Exception {
        Cookie a = signupAndExtractCookie("a@example.com");
        Cookie b = signupAndExtractCookie("b@example.com");
        mvc.perform(post("/api/v1/orders").cookie(a).contentType(MediaType.APPLICATION_JSON).content(VALID_ORDER_JSON))
            .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/orders").cookie(b).contentType(MediaType.APPLICATION_JSON).content(VALID_ORDER_JSON))
            .andExpect(status().isCreated());

        mvc.perform(get("/api/v1/me/orders").cookie(a))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.total").value(1));
    }

    private Cookie signupAndExtractCookie(String email) throws Exception {
        var req = new SignupRequest(email, "senha12345", "Usuario", "(21) 99999-0000");
        MvcResult r = mvc.perform(post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(req)))
            .andReturn();
        String setCookie = r.getResponse().getHeader("Set-Cookie");
        String value = setCookie.split(";")[0].split("=", 2)[1];
        return new Cookie("bb_session", value);
    }
}
