package com.bragas.api.order.pricing;

import com.bragas.api.catalog.domain.Coupon;
import com.bragas.api.catalog.domain.Product;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;

@Component
public class OrderPricingCalculator {

    public record Line(Product product, int quantity) {}

    public record Totals(BigDecimal subtotal, BigDecimal discount, BigDecimal deliveryFee, BigDecimal total) {}

    public Totals compute(List<Line> lines, Optional<Coupon> coupon, Optional<BigDecimal> deliveryFee) {
        BigDecimal rawSubtotal = BigDecimal.ZERO;
        for (var l : lines) {
            rawSubtotal = rawSubtotal.add(l.product().price().multiply(BigDecimal.valueOf(l.quantity())));
        }
        final BigDecimal subtotal = scale(rawSubtotal);

        BigDecimal discount = coupon.map(c -> applyCoupon(subtotal, c)).orElse(BigDecimal.ZERO);
        discount = scale(discount.min(subtotal));

        BigDecimal fee = scale(deliveryFee.orElse(BigDecimal.ZERO));
        BigDecimal total = scale(subtotal.subtract(discount).add(fee));

        return new Totals(subtotal, discount, fee, total);
    }

    private BigDecimal applyCoupon(BigDecimal subtotal, Coupon c) {
        return switch (c.type()) {
            case PERCENT -> subtotal.multiply(c.value()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            case FIXED   -> c.value();
        };
    }

    private static BigDecimal scale(BigDecimal v) {
        return v.setScale(2, RoundingMode.HALF_UP);
    }
}
