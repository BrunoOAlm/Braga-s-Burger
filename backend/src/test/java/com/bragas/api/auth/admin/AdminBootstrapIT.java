package com.bragas.api.auth.admin;

import com.bragas.api.auth.admin.domain.AdminUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
class AdminBootstrapIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired AdminUserRepository repo;

    @Test
    void fresh_db_bootstrap_creates_admin_from_env() {
        Optional<AdminUser> admin = repo.findByEmail("admin@test.local");

        assertThat(admin).isPresent();
        assertThat(admin.get().getName()).isEqualTo("Admin Test");
        assertThat(admin.get().getId()).startsWith("adm_");
        assertThat(admin.get().getPasswordHash()).matches("^\\$2[aby]\\$\\d{2}\\$[./A-Za-z0-9]{53}$");
    }

    @Test
    void existing_admin_is_not_recreated() {
        long countBefore = repo.count();

        assertThat(countBefore).isGreaterThanOrEqualTo(1);
        assertThat(repo.findByEmail("admin@test.local")).isPresent();
    }
}
