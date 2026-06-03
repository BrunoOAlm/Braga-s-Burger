package com.bragas.api.catalog.admin;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class AdminProductControllerIT {

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

    @Test
    void create_with_unknown_category_returns_404() throws Exception {
        mvc.perform(post("/api/v1/admin/products")
                .header("X-Admin-Token", "test-admin-token")
                .contentType(APPLICATION_JSON)
                .content("{\"id\":\"novo-x\",\"categoryId\":\"naoexiste\",\"name\":\"Novo\",\"price\":10.00}"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.type").value("https://bragas.com/errors/category-not-found"));
    }

    @Test
    void create_with_http_image_returns_400() throws Exception {
        mvc.perform(post("/api/v1/admin/products")
                .header("X-Admin-Token", "test-admin-token")
                .contentType(APPLICATION_JSON)
                .content("{\"id\":\"novo-y\",\"categoryId\":\"burgers\",\"name\":\"Novo\",\"price\":10.00," +
                    "\"imageUrl\":\"http://insecure.com/img.png\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void create_happy_path_returns_201() throws Exception {
        mvc.perform(post("/api/v1/admin/products")
                .header("X-Admin-Token", "test-admin-token")
                .contentType(APPLICATION_JSON)
                .content("{\"id\":\"smoke-prod\",\"categoryId\":\"burgers\",\"name\":\"Smoke\",\"price\":10.00}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value("smoke-prod"));
    }

    @Test
    void create_without_required_fields_returns_400() throws Exception {
        // sem categoryId, name, price — deve retornar 400 validation-failed, não 500
        mvc.perform(post("/api/v1/admin/products")
                .header("X-Admin-Token", "test-admin-token")
                .contentType(APPLICATION_JSON)
                .content("{\"id\":\"novo-z\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.type").value("https://bragas.com/errors/validation-failed"));
    }

    @Test
    void list_returns_array() throws Exception {
        mvc.perform(get("/api/v1/admin/products")
                .header("X-Admin-Token", "test-admin-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }
}
