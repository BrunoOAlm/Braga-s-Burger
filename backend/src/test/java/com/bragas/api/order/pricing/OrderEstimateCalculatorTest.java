package com.bragas.api.order.pricing;

import com.bragas.api.order.domain.FulfillmentType;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class OrderEstimateCalculatorTest {

    private final OrderEstimateCalculator calc = new OrderEstimateCalculator();

    @Test
    void pickupRetornaApenasPrepTime() {
        var range = calc.compute(FulfillmentType.PICKUP, 25, Optional.empty());
        assertThat(range.min()).isEqualTo(20);
        assertThat(range.max()).isEqualTo(30);
    }

    @Test
    void delivery499Adiciona10Min() {
        var range = calc.compute(FulfillmentType.DELIVERY, 25, Optional.of(new BigDecimal("4.99")));
        assertThat(range.min()).isEqualTo(30);
        assertThat(range.max()).isEqualTo(40);
    }

    @Test
    void delivery1099Adiciona40Min() {
        var range = calc.compute(FulfillmentType.DELIVERY, 25, Optional.of(new BigDecimal("10.99")));
        assertThat(range.min()).isEqualTo(60);
        assertThat(range.max()).isEqualTo(70);
    }

    @Test
    void deliveryArredondaParaFaixaMaisProxima() {
        // 6.50 → mais perto de 6.99 (delta 0.49) que de 5.99 (delta 0.51) → 20 min
        var range = calc.compute(FulfillmentType.DELIVERY, 25, Optional.of(new BigDecimal("6.50")));
        assertThat(range.min()).isEqualTo(40);
        assertThat(range.max()).isEqualTo(50);
    }
}
