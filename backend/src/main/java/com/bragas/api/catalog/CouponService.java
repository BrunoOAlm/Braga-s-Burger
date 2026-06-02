package com.bragas.api.catalog;

import com.bragas.api.catalog.domain.Coupon;
import com.bragas.api.catalog.dto.CouponValidationResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Optional;

@Service
public class CouponService {

    private final CouponRepository repo;
    private final Clock clock;

    public CouponService(CouponRepository repo, Clock clock) {
        this.repo = repo;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public CouponValidationResponse validate(String code, BigDecimal subtotal) {
        Optional<Coupon> maybe = repo.findById(code.toUpperCase());
        if (maybe.isEmpty()) return CouponValidationResponse.invalid();

        Coupon c = maybe.get();
        if (!c.isActive()) return CouponValidationResponse.invalid();

        OffsetDateTime now = OffsetDateTime.now(clock);
        if (c.getValidFrom() != null && now.isBefore(c.getValidFrom())) return CouponValidationResponse.invalid();
        if (c.getValidUntil() != null && now.isAfter(c.getValidUntil())) return CouponValidationResponse.invalid();
        if (c.getMinSubtotal() != null && subtotal.compareTo(c.getMinSubtotal()) < 0) return CouponValidationResponse.invalid();

        BigDecimal discount;
        if ("percent".equals(c.getType())) {
            discount = subtotal.multiply(c.getValue()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        } else {
            discount = c.getValue().min(subtotal);
        }
        return CouponValidationResponse.valid(c.getType(), c.getValue(), discount);
    }
}
