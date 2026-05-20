package com.bragas.api.catalog.domain;

import java.math.BigDecimal;

public record Coupon(
    String code,
    Type type,
    BigDecimal value,
    BigDecimal minSubtotal
) {
    public enum Type { PERCENT, FIXED }
}
