package com.bragas.api.auth.admin;

import com.bragas.api.auth.JwtService;
import com.bragas.api.auth.UserRepository;
import com.bragas.api.auth.domain.User;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.OffsetDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class CrossCookieIsolationIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired MockMvc mvc;
    @Autowired JwtService jwtService;
    @Autowired UserRepository userRepo;

    @Test
    @Transactional
    void user_jwt_placed_in_bb_admin_cookie_does_not_authenticate_as_admin() throws Exception {
        User u = User.create("victim@test.local", "fakehash", "Victim", "(21) 0000-0000", OffsetDateTime.now());
        userRepo.save(u);
        String userJwt = jwtService.issue(u.getId(), 3600);

        mvc.perform(get("/api/v1/auth/admin/me")
                .cookie(new Cookie("bb_admin", userJwt)))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void admin_jwt_placed_in_bb_session_cookie_does_not_authenticate_as_user() throws Exception {
        String adminJwt = jwtService.issue("adm_test_0000000000000000", 3600);

        mvc.perform(get("/api/v1/me")
                .cookie(new Cookie("bb_session", adminJwt)))
            .andExpect(status().isUnauthorized());
    }
}
