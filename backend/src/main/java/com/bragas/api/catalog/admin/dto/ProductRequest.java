package com.bragas.api.catalog.admin.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record ProductRequest(
    @Pattern(regexp = "^[a-z0-9-]{1,40}$") String id,
    @Pattern(regexp = "^[a-z0-9-]{1,40}$") String categoryId,
    @Size(min = 1, max = 120) String name,
    @Size(max = 500) String description,
    @DecimalMin("0.00") BigDecimal price,
    Boolean priceFrom,
    @Pattern(regexp = "^(https://|/images/).+", message = "imageUrl deve começar com https:// ou /images/")
    @Size(max = 500) String imageUrl,
    Boolean featured,
    Boolean available,
    Integer displayOrder
) {}
