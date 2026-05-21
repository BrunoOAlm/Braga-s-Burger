package com.bragas.api.order.pricing;

import com.bragas.api.order.domain.FulfillmentType;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Component
public class OrderEstimateCalculator {

    public record Range(int min, int max) {}

    private record FeeMinutes(BigDecimal fee, int minutes) {}

    private static final List<FeeMinutes> TABLE = List.of(
        new FeeMinutes(new BigDecimal("4.99"),  10),
        new FeeMinutes(new BigDecimal("5.99"),  15),
        new FeeMinutes(new BigDecimal("6.99"),  20),
        new FeeMinutes(new BigDecimal("7.99"),  25),
        new FeeMinutes(new BigDecimal("8.99"),  30),
        new FeeMinutes(new BigDecimal("9.99"),  35),
        new FeeMinutes(new BigDecimal("10.99"), 40)
    );

    public Range compute(FulfillmentType type, int prepTime, Optional<BigDecimal> deliveryFee) {
        int total = prepTime;
        if (type == FulfillmentType.DELIVERY && deliveryFee.isPresent()) {
            total += closestMinutes(deliveryFee.get());
        }
        return new Range(total - 5, total + 5);
    }

    private static int closestMinutes(BigDecimal fee) {
        FeeMinutes best = TABLE.get(0);
        BigDecimal bestDelta = fee.subtract(best.fee()).abs();
        for (var row : TABLE) {
            var delta = fee.subtract(row.fee()).abs();
            if (delta.compareTo(bestDelta) < 0) {
                best = row;
                bestDelta = delta;
            }
        }
        return best.minutes();
    }
}
