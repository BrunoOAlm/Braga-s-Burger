package com.bragas.api.auth;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

@Service
public class JwtService {

    private static final String ISSUER = "bragas-api";
    private final SecretKey key;
    private final long ttlSeconds;
    private final Clock clock;

    public JwtService(@Value("${app.auth.jwtSecret}") String secret,
                      @Value("${app.auth.jwtTtlSeconds}") long ttlSeconds,
                      Clock clock) {
        byte[] bytes = secret == null ? new byte[0] : secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("JWT_SECRET deve ter pelo menos 32 bytes");
        }
        this.key = Keys.hmacShaKeyFor(bytes);
        this.ttlSeconds = ttlSeconds;
        this.clock = clock;
    }

    public String issue(String subject) {
        return issue(subject, this.ttlSeconds);
    }

    public String issue(String subject, long ttlSeconds) {
        Instant now = clock.instant();
        return Jwts.builder()
            .issuer(ISSUER)
            .subject(subject)
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plusSeconds(ttlSeconds)))
            .signWith(key)
            .compact();
    }

    public Optional<String> verifyAndExtractUserId(String jwt) {
        if (jwt == null || jwt.isBlank()) return Optional.empty();
        try {
            var claims = Jwts.parser()
                .verifyWith(key)
                .clock(() -> Date.from(clock.instant()))
                .requireIssuer(ISSUER)
                .build()
                .parseSignedClaims(jwt)
                .getPayload();
            return Optional.ofNullable(claims.getSubject());
        } catch (Exception ex) {
            return Optional.empty();
        }
    }
}
