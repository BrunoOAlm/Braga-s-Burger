package com.bragas.api.common;

import com.bragas.api.order.domain.OrderStatus;

public class InvalidStatusTransitionException extends RuntimeException {
    public InvalidStatusTransitionException(OrderStatus from, OrderStatus to) {
        super("Transição inválida: " + from + " → " + to);
    }
}
