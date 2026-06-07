package com.bragas.api.auth.admin;

import com.bragas.api.auth.admin.domain.AdminUser;
import com.bragas.api.common.AppProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(OutputCaptureExtension.class)
class AdminBootstrapTest {

    private final Clock clock = Clock.fixed(Instant.parse("2026-06-05T12:00:00Z"), ZoneOffset.UTC);
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4); // strength baixa em test = rápido

    private AppProperties props(String email, String password, String name) {
        return new AppProperties(
            new AppProperties.Cors(List.of()),
            new AppProperties.Auth("secret-32-bytes-long-padding-padding!!", false, "Lax", 3600, 1800, false),
            new AppProperties.Mail("from@test", "http://reset"),
            new AppProperties.AdminBootstrap(email, password, name)
        );
    }

    @Test
    void creates_admin_when_email_not_exists() {
        AdminUserRepository repo = mock(AdminUserRepository.class);
        when(repo.findAll()).thenReturn(List.of());
        when(repo.findByEmail("admin@bragas.local")).thenReturn(Optional.empty());

        var bootstrap = new AdminBootstrap(repo, encoder, props("admin@bragas.local", "senha-boa-123", "Admin"), clock);
        bootstrap.run(null);

        verify(repo).save(any(AdminUser.class));
    }

    @Test
    void skips_when_email_already_exists() {
        AdminUserRepository repo = mock(AdminUserRepository.class);
        AdminUser existing = AdminUser.create("admin@bragas.local", encoder.encode("qq"), "Admin", OffsetDateTime.now(clock));
        when(repo.findAll()).thenReturn(List.of(existing));
        when(repo.findByEmail("admin@bragas.local")).thenReturn(Optional.of(existing));

        var bootstrap = new AdminBootstrap(repo, encoder, props("admin@bragas.local", "senha-boa-123", "Admin"), clock);
        bootstrap.run(null);

        verify(repo, never()).save(any(AdminUser.class));
    }

    @Test
    void skips_when_email_blank() {
        AdminUserRepository repo = mock(AdminUserRepository.class);
        when(repo.findAll()).thenReturn(List.of());

        var bootstrap = new AdminBootstrap(repo, encoder, props("", "senha-boa-123", "Admin"), clock);
        bootstrap.run(null);

        verify(repo, never()).save(any(AdminUser.class));
    }

    @Test
    void skips_when_password_blank() {
        AdminUserRepository repo = mock(AdminUserRepository.class);
        when(repo.findAll()).thenReturn(List.of());

        var bootstrap = new AdminBootstrap(repo, encoder, props("admin@bragas.local", "", "Admin"), clock);
        bootstrap.run(null);

        verify(repo, never()).save(any(AdminUser.class));
    }

    @Test
    void skips_when_password_over_72_bytes(CapturedOutput out) {
        AdminUserRepository repo = mock(AdminUserRepository.class);
        when(repo.findAll()).thenReturn(List.of());
        when(repo.findByEmail("admin@bragas.local")).thenReturn(Optional.empty());

        String longPassword = "x".repeat(80);
        var bootstrap = new AdminBootstrap(repo, encoder, props("admin@bragas.local", longPassword, "Admin"), clock);
        bootstrap.run(null);

        // Spring Security 6+ rejeita senhas > 72 bytes em encode(); pre-validamos e skip-amos.
        verify(repo, never()).save(any(AdminUser.class));
        assertThat(out.getOut()).contains("> 72 bytes");
    }

    @Test
    void fails_fast_when_existing_admin_has_invalid_bcrypt_format() {
        AdminUserRepository repo = mock(AdminUserRepository.class);
        AdminUser corrupted = AdminUser.create("orph@x", "not-bcrypt", "Orph", OffsetDateTime.now(clock));
        when(repo.findAll()).thenReturn(List.of(corrupted));

        var bootstrap = new AdminBootstrap(repo, encoder, props("admin@bragas.local", "senha-boa-123", "Admin"), clock);

        assertThatThrownBy(() -> bootstrap.run(null))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("hash invalido")
            .hasMessageContaining(corrupted.getId());
    }

    @Test
    void handles_concurrent_creation_via_data_integrity_violation() {
        AdminUserRepository repo = mock(AdminUserRepository.class);
        when(repo.findAll()).thenReturn(List.of());
        when(repo.findByEmail("admin@bragas.local")).thenReturn(Optional.empty());
        when(repo.save(any(AdminUser.class))).thenThrow(new DataIntegrityViolationException("uniq email"));

        var bootstrap = new AdminBootstrap(repo, encoder, props("admin@bragas.local", "senha-boa-123", "Admin"), clock);

        // Não deve propagar exception — concorrência é tratada
        bootstrap.run(null);
    }

    @Test
    void does_not_log_password_anywhere(CapturedOutput out) {
        AdminUserRepository repo = mock(AdminUserRepository.class);
        when(repo.findAll()).thenReturn(List.of());
        when(repo.findByEmail("admin@bragas.local")).thenReturn(Optional.empty());

        String uniqueSecret = "UnIqUe-Token-DoNotLog-987654321";
        var bootstrap = new AdminBootstrap(repo, encoder, props("admin@bragas.local", uniqueSecret, "Admin"), clock);
        bootstrap.run(null);

        assertThat(out.getOut()).doesNotContain(uniqueSecret);
    }
}
