package com.bragas.api.auth.admin;

import jakarta.servlet.http.Cookie;
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

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class AdminAuthControllerIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired MockMvc mvc;

    @Test
    void login_with_seed_credentials_returns_204_and_admin_cookie() throws Exception {
        mvc.perform(post("/api/v1/auth/admin/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"admin@test.local\",\"password\":\"admin-test-pwd\"}"))
            .andExpect(status().isNoContent())
            .andExpect(header().string("Set-Cookie", containsString("bb_admin=")))
            .andExpect(header().string("Set-Cookie", containsString("HttpOnly")))
            .andExpect(header().string("Set-Cookie", containsString("Max-Age=1800")));
    }

    @Test
    void login_with_wrong_password_returns_401_generic() throws Exception {
        mvc.perform(post("/api/v1/auth/admin/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"admin@test.local\",\"password\":\"errada-123\"}"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.type").value("https://bragas.com/errors/invalid-credentials"));
    }

    @Test
    void login_with_unknown_email_returns_same_401() throws Exception {
        mvc.perform(post("/api/v1/auth/admin/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"nao-existe@test.local\",\"password\":\"admin-test-pwd\"}"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.type").value("https://bragas.com/errors/invalid-credentials"));
    }

    @Test
    void logout_with_admin_cookie_returns_204_and_clears_cookie() throws Exception {
        Cookie cookie = AdminAuthTestHelper.loginAndGetCookie(mvc);

        mvc.perform(post("/api/v1/auth/admin/logout").cookie(cookie))
            .andExpect(status().isNoContent())
            .andExpect(header().string("Set-Cookie", containsString("bb_admin=")))
            .andExpect(header().string("Set-Cookie", containsString("Max-Age=0")));
    }

    @Test
    void logout_without_admin_cookie_returns_401() throws Exception {
        mvc.perform(post("/api/v1/auth/admin/logout"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.type").value("https://bragas.com/errors/unauthenticated"));
    }

    @Test
    void get_admin_me_without_cookie_returns_401() throws Exception {
        mvc.perform(get("/api/v1/auth/admin/me"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.type").value("https://bragas.com/errors/unauthenticated"));
    }

    @Test
    void get_admin_me_with_admin_cookie_returns_200() throws Exception {
        Cookie cookie = AdminAuthTestHelper.loginAndGetCookie(mvc);

        mvc.perform(get("/api/v1/auth/admin/me").cookie(cookie))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("admin@test.local"))
            .andExpect(jsonPath("$.name").value("Admin Test"))
            .andExpect(jsonPath("$.id", startsWith("adm_")));
    }
}
