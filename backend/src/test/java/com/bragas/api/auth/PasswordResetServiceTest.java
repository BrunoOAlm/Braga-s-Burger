package com.bragas.api.auth;

import org.junit.jupiter.api.Test;

import java.security.MessageDigest;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThat;

class PasswordResetServiceTest {

    @Test
    void generates_url_safe_token_of_expected_length() {
        var svc = new PasswordResetService();
        String token = svc.generateToken();
        assertThat(token).matches("^[A-Za-z0-9_-]+$");
        assertThat(token.length()).isGreaterThanOrEqualTo(40);
    }

    @Test
    void hash_is_deterministic_sha256_hex() throws Exception {
        var svc = new PasswordResetService();
        String token = "abc";
        String expected = HexFormat.of().formatHex(
            MessageDigest.getInstance("SHA-256").digest("abc".getBytes()));
        assertThat(svc.hash(token)).isEqualTo(expected);
    }

    @Test
    void different_tokens_hash_differently() {
        var svc = new PasswordResetService();
        assertThat(svc.hash("a")).isNotEqualTo(svc.hash("b"));
    }
}
