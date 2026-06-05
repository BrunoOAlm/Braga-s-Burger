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
class AdminCouponControllerIT {

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
    void create_percent_over_100_returns_400() throws Exception {
        mvc.perform(post("/api/v1/admin/coupons")
                .cookie(adminCookie)
                .contentType(APPLICATION_JSON)
                .content("{\"code\":\"TOOMUCH\",\"type\":\"percent\",\"value\":150}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void create_invalid_window_returns_400() throws Exception {
        mvc.perform(post("/api/v1/admin/coupons")
                .cookie(adminCookie)
                .contentType(APPLICATION_JSON)
                .content("{\"code\":\"BADWIN\",\"type\":\"percent\",\"value\":10," +
                    "\"validFrom\":\"2025-01-02T00:00:00Z\",\"validUntil\":\"2025-01-01T00:00:00Z\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void create_without_required_fields_returns_400() throws Exception {
        mvc.perform(post("/api/v1/admin/coupons")
                .cookie(adminCookie)
                .contentType(APPLICATION_JSON)
                .content("{\"code\":\"SOCODE\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.type").value("https://bragas.com/errors/validation-failed"));
    }

    @Test
    void patch_percent_value_over_100_returns_400_not_409() throws Exception {
        mvc.perform(patch("/api/v1/admin/coupons/BEMVINDO10")
                .cookie(adminCookie)
                .contentType(APPLICATION_JSON)
                .content("{\"value\":150}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.type").value("https://bragas.com/errors/coupon-percent-over-100"));
    }

    @Test
    void patch_invalid_window_returns_400_not_409() throws Exception {
        mvc.perform(post("/api/v1/admin/coupons")
                .cookie(adminCookie)
                .contentType(APPLICATION_JSON)
                .content("{\"code\":\"WINTEST\",\"type\":\"percent\",\"value\":10," +
                    "\"validFrom\":\"2030-01-01T00:00:00Z\"}"))
            .andExpect(status().isCreated());
        mvc.perform(patch("/api/v1/admin/coupons/WINTEST")
                .cookie(adminCookie)
                .contentType(APPLICATION_JSON)
                .content("{\"validUntil\":\"2020-01-01T00:00:00Z\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.type").value("https://bragas.com/errors/coupon-invalid-window"));
    }

    @Test
    void patch_to_inactive_sets_active_false() throws Exception {
        mvc.perform(patch("/api/v1/admin/coupons/BEMVINDO10")
                .cookie(adminCookie)
                .contentType(APPLICATION_JSON)
                .content("{\"active\":false}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.active").value(false));
        mvc.perform(patch("/api/v1/admin/coupons/BEMVINDO10")
                .cookie(adminCookie)
                .contentType(APPLICATION_JSON)
                .content("{\"active\":true}"))
            .andExpect(status().isOk());
    }
}
