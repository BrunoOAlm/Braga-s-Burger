package com.bragas.api.catalog.dto;

import java.math.BigDecimal;
import java.util.List;

public record MenuResponse(List<CategoryWithProducts> categories) {

    public record CategoryWithProducts(
        String id,
        String name,
        int displayOrder,
        String layout,
        List<ProductOut> products
    ) {}

    public record ProductOut(
        String id,
        String name,
        String description,
        BigDecimal price,
        boolean priceFrom,
        String imageUrl,
        boolean featured,
        boolean available,
        int displayOrder
    ) {}
}
