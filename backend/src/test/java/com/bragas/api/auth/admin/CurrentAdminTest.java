package com.bragas.api.auth.admin;

import com.bragas.api.auth.admin.domain.AdminUser;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CurrentAdminTest {

    @AfterEach
    void clear() { SecurityContextHolder.clearContext(); }

    @Test
    void id_returns_admin_id_when_principal_is_admin() {
        AdminUser a = AdminUser.create("a@x", "hash", "A", OffsetDateTime.now());
        var auth = new UsernamePasswordAuthenticationToken(a, null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        SecurityContextHolder.getContext().setAuthentication(auth);

        assertThat(CurrentAdmin.id()).isEqualTo(a.getId());
    }

    @Test
    void id_returns_unknown_when_no_authentication() {
        assertThat(CurrentAdmin.id()).isEqualTo("unknown");
    }

    @Test
    void id_returns_unknown_when_principal_is_not_admin() {
        var auth = new UsernamePasswordAuthenticationToken("some-string", null, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);

        assertThat(CurrentAdmin.id()).isEqualTo("unknown");
    }
}
