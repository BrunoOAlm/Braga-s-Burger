package com.bragas.api.catalog.admin.dto;

import com.bragas.api.catalog.domain.Category;
import java.time.OffsetDateTime;

public record CategoryResponse(
    String id,
    String name,
    int displayOrder,
    String layout,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {
    public static CategoryResponse from(Category c) {
        return new CategoryResponse(c.getId(), c.getName(), c.getDisplayOrder(), c.getLayout(),
            c.getCreatedAt(), c.getUpdatedAt());
    }
}
