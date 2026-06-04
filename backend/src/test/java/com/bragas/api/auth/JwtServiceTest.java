package com.bragas.api.auth;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String SECRET = "this-is-a-test-secret-with-at-least-32-bytes-of-entropy-yay";
    private final Clock clock = Clock.fixed(Instant.parse("2026-05-27T18:00:00Z"), ZoneOffset.UTC);

    @Test
    void issue_and_verify_happy_path() {
        var svc = new JwtService(SECRET, 3600, clock);
        String jwt = svc.issue("usr_abc");
        Optional<String> sub = svc.verifyAndExtractUserId(jwt);
        assertThat(sub).contains("usr_abc");
    }

    @Test
    void verify_returns_empty_for_tampered_token() {
        var svc = new JwtService(SECRET, 3600, clock);
        String jwt = svc.issue("usr_abc");
        String tampered = jwt.substring(0, jwt.length() - 2) + "xx";
        assertThat(svc.verifyAndExtractUserId(tampered)).isEmpty();
    }

    @Test
    void verify_returns_empty_for_expired_token() {
        Clock t0 = Clock.fixed(Instant.parse("2026-05-27T18:00:00Z"), ZoneOffset.UTC);
        Clock t1 = Clock.fixed(Instant.parse("2026-05-27T19:00:01Z"), ZoneOffset.UTC);
        String jwt = new JwtService(SECRET, 3600, t0).issue("usr_abc");
        assertThat(new JwtService(SECRET, 3600, t1).verifyAndExtractUserId(jwt)).isEmpty();
    }

    @Test
    void constructor_rejects_short_secret() {
        assertThatThrownBy(() -> new JwtService("short", 3600, clock))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("JWT_SECRET");
    }

    @Test
    void verify_returns_empty_for_garbage() {
        var svc = new JwtService(SECRET, 3600, clock);
        assertThat(svc.verifyAndExtractUserId("not-a-jwt")).isEmpty();
        assertThat(svc.verifyAndExtractUserId("")).isEmpty();
    }

    @Test
    void issue_with_custom_ttl_token_expires_after_that_ttl() {
        var fixed = Clock.fixed(Instant.parse("2026-01-01T00:00:00Z"), ZoneOffset.UTC);
        var svc = new JwtService(SECRET, 604800, fixed);

        String jwt = svc.issue("adm_xyz", 60);

        var clock30s = Clock.fixed(Instant.parse("2026-01-01T00:00:30Z"), ZoneOffset.UTC);
        var svc30s = new JwtService(SECRET, 604800, clock30s);
        assertThat(svc30s.verifyAndExtractUserId(jwt)).contains("adm_xyz");

        var clock61s = Clock.fixed(Instant.parse("2026-01-01T00:01:01Z"), ZoneOffset.UTC);
        var svc61s = new JwtService(SECRET, 604800, clock61s);
        assertThat(svc61s.verifyAndExtractUserId(jwt)).isEmpty();
    }
}
