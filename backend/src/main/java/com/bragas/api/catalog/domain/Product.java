package com.bragas.api.catalog.domain;

import java.math.BigDecimal;

public record Product(
    String id,
    String categoryId,
    String name,
    BigDecimal price,
    boolean available
) {}
