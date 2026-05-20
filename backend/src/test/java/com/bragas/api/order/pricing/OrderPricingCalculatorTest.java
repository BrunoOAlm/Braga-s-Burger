package com.bragas.api.order.pricing;

import com.bragas.api.catalog.domain.Coupon;
import com.bragas.api.catalog.domain.Product;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class OrderPricingCalculatorTest {

    private final OrderPricingCalculator calc = new OrderPricingCalculator();

    private Product p(String id, String price) {
        return new Product(id, "burgers", id, new BigDecimal(price), true);
    }

    private OrderPricingCalculator.Line line(Product prod, int qty) {
        return new OrderPricingCalculator.Line(prod, qty);
    }

    @Test
    void subtotalSomaPriceVezesQuantity() {
        var lines = List.of(line(p("a", "10.00"), 2), line(p("b", "5.50"), 3));
        var totals = calc.compute(lines, Optional.empty(), Optional.empty());
        assertThat(totals.subtotal()).isEqualByComparingTo("36.50");
    }

    @Test
    void discountPercent() {
        var lines = List.of(line(p("a", "100.00"), 1));
        var coupon = new Coupon("X", Coupon.Type.PERCENT, new BigDecimal("10"), null);
        var totals = calc.compute(lines, Optional.of(coupon), Optional.empty());
        assertThat(totals.discount()).isEqualByComparingTo("10.00");
    }

    @Test
    void discountFixed() {
        var lines = List.of(line(p("a", "100.00"), 1));
        var coupon = new Coupon("X", Coupon.Type.FIXED, new BigDecimal("15"), null);
        var totals = calc.compute(lines, Optional.of(coupon), Optional.empty());
        assertThat(totals.discount()).isEqualByComparingTo("15.00");
    }

    @Test
    void discountClampedToSubtotal() {
        var lines = List.of(line(p("a", "10.00"), 1));
        var coupon = new Coupon("X", Coupon.Type.FIXED, new BigDecimal("999"), null);
        var totals = calc.compute(lines, Optional.of(coupon), Optional.empty());
        assertThat(totals.discount()).isEqualByComparingTo("10.00");
        assertThat(totals.total()).isEqualByComparingTo("0.00");
    }

    @Test
    void deliveryFeeAdicionaNoTotal() {
        var lines = List.of(line(p("a", "30.00"), 1));
        var totals = calc.compute(lines, Optional.empty(), Optional.of(new BigDecimal("4.99")));
        assertThat(totals.deliveryFee()).isEqualByComparingTo("4.99");
        assertThat(totals.total()).isEqualByComparingTo("34.99");
    }

    @Test
    void semCupomDiscountZero() {
        var lines = List.of(line(p("a", "30.00"), 1));
        var totals = calc.compute(lines, Optional.empty(), Optional.empty());
        assertThat(totals.discount()).isEqualByComparingTo("0.00");
    }
}
