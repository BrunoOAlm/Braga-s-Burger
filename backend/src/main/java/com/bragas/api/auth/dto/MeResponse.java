package com.bragas.api.auth.dto;

import com.bragas.api.auth.domain.User;

import java.time.OffsetDateTime;

public record MeResponse(
    String id,
    String email,
    String name,
    String phone,
    OffsetDateTime createdAt
) {
    public static MeResponse from(User u) {
        return new MeResponse(u.getId(), u.getEmail(), u.getName(), u.getPhone(), u.getCreatedAt());
    }
}
