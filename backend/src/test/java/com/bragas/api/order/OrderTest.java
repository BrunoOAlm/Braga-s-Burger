package com.bragas.api.order;

import com.bragas.api.order.domain.FulfillmentType;
import com.bragas.api.order.domain.Order;
import com.bragas.api.order.domain.OrderStatus;
import com.bragas.api.order.domain.PaymentMethod;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.*;

class OrderTest {

    private static final OffsetDateTime T0 = OffsetDateTime.of(2026, 5, 20, 18, 0, 0, 0, ZoneOffset.UTC);
    private static final OffsetDateTime T1 = T0.plusMinutes(5);

    private Order receivedOrder() {
        return Order.create("#1234", "João", "(21) 99999-0000",
            FulfillmentType.DELIVERY, PaymentMethod.CREDIT, T0);
    }

    @Test
    void aplicaTransitionValidaEMarcaTimestamp() {
        var o = receivedOrder();
        o.applyTransition(OrderStatus.PREPARING, T1);
        assertThat(o.getStatus()).isEqualTo(OrderStatus.PREPARING);
        assertThat(o.getPreparingAt()).isEqualTo(T1);
    }

    @Test
    void rejeitaTransitionInvalida() {
        var o = receivedOrder();
        assertThatThrownBy(() -> o.applyTransition(OrderStatus.DELIVERED, T1))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void rejeitaTransitionDeEstadoFinal() {
        var o = receivedOrder();
        o.applyTransition(OrderStatus.CANCELLED, T1);
        assertThatThrownBy(() -> o.applyTransition(OrderStatus.PREPARING, T1))
            .isInstanceOf(IllegalStateException.class);
    }
}
