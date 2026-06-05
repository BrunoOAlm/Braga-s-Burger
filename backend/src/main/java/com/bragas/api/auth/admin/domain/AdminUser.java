package com.bragas.api.auth.admin.domain;

import com.github.f4b6a3.ulid.UlidCreator;
import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "admin_users")
public class AdminUser {

    @Id
    @Column(length = 32)
    private String id;

    @Column(nullable = false, length = 200, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 72)
    private String passwordHash;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime updatedAt;

    protected AdminUser() {}

    public static AdminUser create(String email, String passwordHash, String name, OffsetDateTime now) {
        AdminUser a = new AdminUser();
        a.id = "adm_" + UlidCreator.getUlid();
        a.email = email;
        a.passwordHash = passwordHash;
        a.name = name;
        a.createdAt = now;
        return a;
    }

    public String getId() { return id; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public String getName() { return name; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }

    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
}
