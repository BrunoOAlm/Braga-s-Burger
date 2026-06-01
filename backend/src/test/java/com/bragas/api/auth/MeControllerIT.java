package com.bragas.api.auth;

import com.bragas.api.auth.dto.SignupRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
@Import(TestMailConfig.class)
class MeControllerIT {

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

    @Test
    void get_me_without_cookie_returns_401() throws Exception {
        mvc.perform(get("/api/v1/me"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.type").value("https://bragas.com/errors/unauthenticated"));
    }

    @Test
    void get_me_with_valid_cookie_returns_user() throws Exception {
        Cookie cookie = signupAndExtractCookie("me1@example.com");
        mvc.perform(get("/api/v1/me").cookie(cookie))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("me1@example.com"));
    }

    @Test
    void patch_me_updates_name_and_phone() throws Exception {
        Cookie cookie = signupAndExtractCookie("me2@example.com");
        mvc.perform(patch("/api/v1/me").cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Novo Nome\",\"phone\":\"(21) 88888-1234\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Novo Nome"))
            .andExpect(jsonPath("$.phone").value("(21) 88888-1234"));
    }

    @Test
    void change_password_with_wrong_current_returns_401() throws Exception {
        Cookie cookie = signupAndExtractCookie("me3@example.com");
        mvc.perform(post("/api/v1/me/change-password").cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"errada\",\"newPassword\":\"nova-senha-456\"}"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.type").value("https://bragas.com/errors/invalid-credentials"));
    }

    @Test
    void change_password_happy_path_returns_204() throws Exception {
        Cookie cookie = signupAndExtractCookie("me4@example.com");
        mvc.perform(post("/api/v1/me/change-password").cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"senha12345\",\"newPassword\":\"nova-senha-456\"}"))
            .andExpect(status().isNoContent());
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
