package com.bragas.api.catalog.admin.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record CouponRequest(
    @Pattern(regexp = "^[A-Za-z0-9_-]{2,40}$") String code,
    @Pattern(regexp = "^(percent|fixed)$") String type,
    @DecimalMin("0.00") BigDecimal value,
    @DecimalMin("0.00") BigDecimal minSubtotal,
    OffsetDateTime validFrom,
    OffsetDateTime validUntil,
    Boolean active
) {
    @AssertTrue(message = "percent value must be <= 100")
    public boolean isPercentValueValid() {
        return !"percent".equals(type) || value == null || value.compareTo(BigDecimal.valueOf(100)) <= 0;
    }

    @AssertTrue(message = "validFrom must be before validUntil")
    public boolean isWindowValid() {
        return validFrom == null || validUntil == null || validFrom.isBefore(validUntil);
    }
}
