package com.bragas.api.auth.admin.dto;

import com.bragas.api.auth.admin.domain.AdminUser;

import java.time.OffsetDateTime;

public record AdminMeResponse(
    String id,
    String email,
    String name,
    OffsetDateTime createdAt
) {
    public static AdminMeResponse from(AdminUser a) {
        return new AdminMeResponse(a.getId(), a.getEmail(), a.getName(), a.getCreatedAt());
    }
}
