package com.bragas.api.catalog.dto;

import java.math.BigDecimal;

public record CouponValidationResponse(
    boolean valid,
    String type,
    BigDecimal value,
    BigDecimal discount
) {
    public static CouponValidationResponse invalid() {
        return new CouponValidationResponse(false, null, null, null);
    }

    public static CouponValidationResponse valid(String type, BigDecimal value, BigDecimal discount) {
        return new CouponValidationResponse(true, type, value, discount);
    }
}
