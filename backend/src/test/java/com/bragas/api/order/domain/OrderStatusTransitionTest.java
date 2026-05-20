package com.bragas.api.order.domain;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.stream.Stream;

import static com.bragas.api.order.domain.OrderStatus.*;
import static org.assertj.core.api.Assertions.assertThat;

class OrderStatusTransitionTest {

    @Test
    void receivedCanGoToPreparingOrCancelled() {
        assertThat(OrderStatusTransition.isValid(RECEIVED, PREPARING)).isTrue();
        assertThat(OrderStatusTransition.isValid(RECEIVED, CANCELLED)).isTrue();
    }

    @Test
    void preparingCanGoToOutOrCancelled() {
        assertThat(OrderStatusTransition.isValid(PREPARING, OUT)).isTrue();
        assertThat(OrderStatusTransition.isValid(PREPARING, CANCELLED)).isTrue();
    }

    @Test
    void outCanGoToDeliveredOrCancelled() {
        assertThat(OrderStatusTransition.isValid(OUT, DELIVERED)).isTrue();
        assertThat(OrderStatusTransition.isValid(OUT, CANCELLED)).isTrue();
    }

    @Test
    void deliveredIsFinal() {
        for (OrderStatus to : OrderStatus.values()) {
            assertThat(OrderStatusTransition.isValid(DELIVERED, to))
                .as("delivered → %s", to)
                .isFalse();
        }
    }

    @Test
    void cancelledIsFinal() {
        for (OrderStatus to : OrderStatus.values()) {
            assertThat(OrderStatusTransition.isValid(CANCELLED, to)).isFalse();
        }
    }

    @ParameterizedTest
    @MethodSource("invalidTransitions")
    void rejectsInvalidTransitions(OrderStatus from, OrderStatus to) {
        assertThat(OrderStatusTransition.isValid(from, to)).isFalse();
    }

    static Stream<Object[]> invalidTransitions() {
        return Stream.of(
            new Object[]{RECEIVED, OUT},
            new Object[]{RECEIVED, DELIVERED},
            new Object[]{PREPARING, RECEIVED},
            new Object[]{PREPARING, DELIVERED},
            new Object[]{OUT, RECEIVED},
            new Object[]{OUT, PREPARING}
        );
    }

    @Test
    void selfTransitionIsInvalid() {
        for (OrderStatus s : OrderStatus.values()) {
            assertThat(OrderStatusTransition.isValid(s, s)).isFalse();
        }
    }
}
