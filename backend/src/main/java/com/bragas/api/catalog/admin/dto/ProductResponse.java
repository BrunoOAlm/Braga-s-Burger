package com.bragas.api.catalog.admin.dto;

import com.bragas.api.catalog.domain.Product;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record ProductResponse(
    String id,
    String categoryId,
    String name,
    String description,
    BigDecimal price,
    boolean priceFrom,
    String imageUrl,
    boolean featured,
    boolean available,
    int displayOrder,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {
    public static ProductResponse from(Product p) {
        return new ProductResponse(p.getId(), p.getCategory().getId(), p.getName(), p.getDescription(),
            p.getPrice(), p.isPriceFrom(), p.getImageUrl(), p.isFeatured(), p.isAvailable(),
            p.getDisplayOrder(), p.getCreatedAt(), p.getUpdatedAt());
    }
}
