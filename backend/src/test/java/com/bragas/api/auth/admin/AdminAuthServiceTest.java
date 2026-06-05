package com.bragas.api.auth.admin;

import com.bragas.api.auth.InvalidCredentialsException;
import com.bragas.api.auth.admin.domain.AdminUser;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.OffsetDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AdminAuthServiceTest {

    private final AdminUserRepository repo = mock(AdminUserRepository.class);
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
    private final AdminAuthService svc = new AdminAuthService(repo, encoder);

    @Test
    void login_happy_path_returns_admin() {
        String hash = encoder.encode("admin-pwd");
        AdminUser a = AdminUser.create("admin@bragas.local", hash, "Admin", OffsetDateTime.now());
        when(repo.findByEmail("admin@bragas.local")).thenReturn(Optional.of(a));

        AdminUser result = svc.login("admin@bragas.local", "admin-pwd");

        assertThat(result.getEmail()).isEqualTo("admin@bragas.local");
    }

    @Test
    void login_normalizes_email_lowercase_and_trim() {
        String hash = encoder.encode("admin-pwd");
        AdminUser a = AdminUser.create("admin@bragas.local", hash, "Admin", OffsetDateTime.now());
        when(repo.findByEmail("admin@bragas.local")).thenReturn(Optional.of(a));

        AdminUser result = svc.login("  ADMIN@Bragas.Local  ", "admin-pwd");

        assertThat(result.getEmail()).isEqualTo("admin@bragas.local");
    }

    @Test
    void login_with_unknown_email_throws_invalid_credentials() {
        when(repo.findByEmail("nope@bragas.local")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> svc.login("nope@bragas.local", "admin-pwd"))
            .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void login_with_wrong_password_throws_invalid_credentials() {
        String hash = encoder.encode("admin-pwd");
        AdminUser a = AdminUser.create("admin@bragas.local", hash, "Admin", OffsetDateTime.now());
        when(repo.findByEmail("admin@bragas.local")).thenReturn(Optional.of(a));

        assertThatThrownBy(() -> svc.login("admin@bragas.local", "errada"))
            .isInstanceOf(InvalidCredentialsException.class);
    }
}
