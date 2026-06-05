package com.bragas.api.catalog.admin;

import com.bragas.api.auth.admin.AdminAuthTestHelper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
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
class AdminCategoryControllerIT {

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
    private Cookie adminCookie;

    @BeforeEach
    void loginAdmin() throws Exception {
        adminCookie = AdminAuthTestHelper.loginAndGetCookie(mvc);
    }

    @Test
    void list_returns_seeded_categories() throws Exception {
        mvc.perform(get("/api/v1/admin/categories")
                .cookie(adminCookie))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }

    @Test
    void create_without_token_returns_401() throws Exception {
        mvc.perform(post("/api/v1/admin/categories")
                .contentType(APPLICATION_JSON)
                .content("{\"id\":\"nova\",\"name\":\"Nova\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void delete_category_with_products_returns_409() throws Exception {
        mvc.perform(delete("/api/v1/admin/categories/burgers")
                .cookie(adminCookie))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.type").value("https://bragas.com/errors/category-has-products"));
    }

    @Test
    void invalid_layout_returns_400() throws Exception {
        mvc.perform(post("/api/v1/admin/categories")
                .cookie(adminCookie)
                .contentType(APPLICATION_JSON)
                .content("{\"id\":\"xtest\",\"name\":\"X\",\"layout\":\"invalid\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void patch_invalid_layout_returns_400_not_409() throws Exception {
        mvc.perform(patch("/api/v1/admin/categories/burgers")
                .cookie(adminCookie)
                .contentType(APPLICATION_JSON)
                .content("{\"layout\":\"garbage\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.type").value("https://bragas.com/errors/validation-failed"));
    }
}
