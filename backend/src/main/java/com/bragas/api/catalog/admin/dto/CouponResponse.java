package com.bragas.api.catalog.admin.dto;

import com.bragas.api.catalog.domain.Coupon;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record CouponResponse(
    String code,
    String type,
    BigDecimal value,
    BigDecimal minSubtotal,
    OffsetDateTime validFrom,
    OffsetDateTime validUntil,
    boolean active,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {
    public static CouponResponse from(Coupon c) {
        return new CouponResponse(c.getCode(), c.getType(), c.getValue(), c.getMinSubtotal(),
            c.getValidFrom(), c.getValidUntil(), c.isActive(),
            c.getCreatedAt(), c.getUpdatedAt());
    }
}
