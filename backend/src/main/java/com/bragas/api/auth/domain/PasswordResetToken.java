package com.bragas.api.auth.domain;

import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "password_reset_tokens")
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "token_hash", nullable = false, length = 64, unique = true)
    private String tokenHash;

    @Column(name = "user_id", nullable = false, length = 32)
    private String userId;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "used_at")
    private OffsetDateTime usedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected PasswordResetToken() {}

    public static PasswordResetToken create(String tokenHash, String userId, OffsetDateTime now, OffsetDateTime expiresAt) {
        PasswordResetToken t = new PasswordResetToken();
        t.tokenHash = tokenHash;
        t.userId = userId;
        t.expiresAt = expiresAt;
        t.createdAt = now;
        return t;
    }

    public Long getId() { return id; }
    public String getTokenHash() { return tokenHash; }
    public String getUserId() { return userId; }
    public OffsetDateTime getExpiresAt() { return expiresAt; }
    public OffsetDateTime getUsedAt() { return usedAt; }
    public OffsetDateTime getCreatedAt() { return createdAt; }

    public void markUsed(OffsetDateTime when) { this.usedAt = when; }

    public boolean isValid(OffsetDateTime now) {
        return usedAt == null && expiresAt.isAfter(now);
    }
}
