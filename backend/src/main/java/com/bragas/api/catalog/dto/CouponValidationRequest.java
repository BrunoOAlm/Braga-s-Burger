package com.bragas.api.catalog.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record CouponValidationRequest(
    @NotBlank @Pattern(regexp = "^[A-Za-z0-9_-]{2,40}$") String code,
    @NotNull @DecimalMin("0.00") BigDecimal subtotal
) {}
