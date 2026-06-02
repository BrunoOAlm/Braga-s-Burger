package com.bragas.api.catalog;

import com.bragas.api.catalog.domain.Coupon;
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

import java.math.BigDecimal;
import java.time.OffsetDateTime;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class CouponValidateIT {

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
    @Autowired CouponRepository repo;

    @Test
    void valid_active_coupon_returns_true_and_discount() throws Exception {
        // BEMVINDO10 seed: percent 10
        mvc.perform(post("/api/v1/coupons/validate")
                .contentType(APPLICATION_JSON)
                .content("{\"code\":\"BEMVINDO10\",\"subtotal\":50.00}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.valid").value(true))
            .andExpect(jsonPath("$.discount").value(5.00));
    }

    @Test
    void unknown_code_returns_invalid_opaque() throws Exception {
        mvc.perform(post("/api/v1/coupons/validate")
                .contentType(APPLICATION_JSON)
                .content("{\"code\":\"INEXISTE\",\"subtotal\":50.00}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.valid").value(false));
    }

    @Test
    void inactive_coupon_returns_invalid() throws Exception {
        var c = new Coupon("INATIVO", "percent", BigDecimal.TEN);
        c.setActive(false);
        repo.save(c);

        mvc.perform(post("/api/v1/coupons/validate")
                .contentType(APPLICATION_JSON)
                .content("{\"code\":\"INATIVO\",\"subtotal\":50.00}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.valid").value(false));
    }

    @Test
    void expired_coupon_returns_invalid() throws Exception {
        var c = new Coupon("EXPIROU", "percent", BigDecimal.TEN);
        c.setValidUntil(OffsetDateTime.now().minusDays(1));
        repo.save(c);

        mvc.perform(post("/api/v1/coupons/validate")
                .contentType(APPLICATION_JSON)
                .content("{\"code\":\"EXPIROU\",\"subtotal\":50.00}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.valid").value(false));
    }

    @Test
    void below_min_subtotal_returns_invalid() throws Exception {
        // FRETE5 seed: minSubtotal=40
        mvc.perform(post("/api/v1/coupons/validate")
                .contentType(APPLICATION_JSON)
                .content("{\"code\":\"FRETE5\",\"subtotal\":30.00}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.valid").value(false));
    }
}
