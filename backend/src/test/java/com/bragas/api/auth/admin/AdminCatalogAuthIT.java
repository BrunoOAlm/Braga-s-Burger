package com.bragas.api.auth.admin;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
@ExtendWith(OutputCaptureExtension.class)
class AdminCatalogAuthIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired MockMvc mvc;

    @Test
    void admin_endpoint_without_cookie_returns_401() throws Exception {
        mvc.perform(post("/api/v1/admin/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"id\":\"x\",\"categoryId\":\"burgers\",\"name\":\"X\",\"price\":10.00}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void admin_endpoint_with_admin_cookie_returns_201_and_logs_actor(CapturedOutput out) throws Exception {
        Cookie cookie = AdminAuthTestHelper.loginAndGetCookie(mvc);

        mvc.perform(post("/api/v1/admin/products")
                .cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"id\":\"audit-prod\",\"categoryId\":\"burgers\",\"name\":\"Audit\",\"price\":10.00}"))
            .andExpect(status().isCreated());

        assertThat(out.getOut()).contains("admin.action action=POST resource=product id=audit-prod actor=adm_test_0000000000000000");
    }
}
