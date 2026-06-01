package com.bragas.api.auth;

import com.bragas.api.auth.dto.SignupRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
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
@Import(TestMailConfig.class)
class AuthControllerIT {

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
    @Autowired ObjectMapper om;
    @Autowired UserRepository userRepo;
    @Autowired PasswordResetTokenRepository tokenRepo;
    @Autowired MailService mail;

    @BeforeEach
    void clean() {
        tokenRepo.deleteAll();
        userRepo.deleteAll();
        ((TestMailConfig.CapturingMailService) mail).sent.clear();
    }

    @Test
    void signup_creates_user_and_sets_cookie() throws Exception {
        var req = new SignupRequest("joao@example.com", "senha12345", "João", "(21) 99999-0000");
        mvc.perform(post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(req)))
            .andExpect(status().isCreated())
            .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("bb_session=")))
            .andExpect(jsonPath("$.email").value("joao@example.com"));

        assertThat(userRepo.existsByEmail("joao@example.com")).isTrue();
    }

    @Test
    void signup_duplicate_email_returns_409() throws Exception {
        var req = new SignupRequest("dup@example.com", "senha12345", "Dup", "(21) 99999-0000");
        mvc.perform(post("/api/v1/auth/signup").contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(req)))
            .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/auth/signup").contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(req)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.type").value("https://bragas.com/errors/email-already-taken"));
    }

    @Test
    void login_with_correct_password_sets_cookie() throws Exception {
        var su = new SignupRequest("li@example.com", "senha12345", "Li", "(21) 99999-0000");
        mvc.perform(post("/api/v1/auth/signup").contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(su)));

        mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"li@example.com\",\"password\":\"senha12345\"}"))
            .andExpect(status().isNoContent())
            .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("bb_session=")));
    }

    @Test
    void login_with_wrong_password_returns_401_generic() throws Exception {
        var su = new SignupRequest("li2@example.com", "senha12345", "Li", "(21) 99999-0000");
        mvc.perform(post("/api/v1/auth/signup").contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(su)));

        mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"li2@example.com\",\"password\":\"errada00\"}"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.type").value("https://bragas.com/errors/invalid-credentials"));
    }

    @Test
    void login_unknown_email_returns_same_401() throws Exception {
        mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"nao-existe@example.com\",\"password\":\"senha12345\"}"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.type").value("https://bragas.com/errors/invalid-credentials"));
    }

    @Test
    void logout_clears_cookie() throws Exception {
        mvc.perform(post("/api/v1/auth/logout"))
            .andExpect(status().isNoContent())
            .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("Max-Age=0")));
    }

    @Test
    void forgot_for_unknown_email_returns_204_silently() throws Exception {
        mvc.perform(post("/api/v1/auth/forgot")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"nao-existe@example.com\"}"))
            .andExpect(status().isNoContent());
        assertThat(((TestMailConfig.CapturingMailService) mail).sent).isEmpty();
    }

    @Test
    void forgot_for_known_email_sends_email_and_returns_204() throws Exception {
        var su = new SignupRequest("forg@example.com", "senha12345", "F", "(21) 99999-0000");
        mvc.perform(post("/api/v1/auth/signup").contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(su)));

        mvc.perform(post("/api/v1/auth/forgot")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"forg@example.com\"}"))
            .andExpect(status().isNoContent());

        var sent = ((TestMailConfig.CapturingMailService) mail).sent;
        assertThat(sent).hasSize(1);
        assertThat(sent.get(0).to()).isEqualTo("forg@example.com");
        assertThat(sent.get(0).link()).contains("?token=");
    }

    @Test
    void reset_with_valid_token_succeeds_and_sets_cookie() throws Exception {
        var su = new SignupRequest("rst@example.com", "senha12345", "R", "(21) 99999-0000");
        mvc.perform(post("/api/v1/auth/signup").contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(su)));
        mvc.perform(post("/api/v1/auth/forgot")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"rst@example.com\"}"));

        String link = ((TestMailConfig.CapturingMailService) mail).sent.get(0).link();
        String token = link.substring(link.indexOf("?token=") + 7);

        mvc.perform(post("/api/v1/auth/reset")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + token + "\",\"newPassword\":\"nova-senha-456\"}"))
            .andExpect(status().isNoContent())
            .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("bb_session=")));
    }

    @Test
    void reset_with_reused_token_returns_401() throws Exception {
        var su = new SignupRequest("ru@example.com", "senha12345", "Ru", "(21) 99999-0000");
        mvc.perform(post("/api/v1/auth/signup").contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(su)));
        mvc.perform(post("/api/v1/auth/forgot")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"ru@example.com\"}"));
        String link = ((TestMailConfig.CapturingMailService) mail).sent.get(0).link();
        String token = link.substring(link.indexOf("?token=") + 7);
        String body = "{\"token\":\"" + token + "\",\"newPassword\":\"nova-senha-456\"}";

        mvc.perform(post("/api/v1/auth/reset").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isNoContent());
        mvc.perform(post("/api/v1/auth/reset").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.type").value("https://bragas.com/errors/reset-token-invalid"));
    }

    @Test
    void reset_with_unknown_token_returns_401() throws Exception {
        mvc.perform(post("/api/v1/auth/reset")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"garbage\",\"newPassword\":\"nova-senha-456\"}"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.type").value("https://bragas.com/errors/reset-token-invalid"));
    }
}
