package com.bragas.api.order.domain;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

public final class OrderStatusTransition {

    private static final Map<OrderStatus, Set<OrderStatus>> ALLOWED;

    static {
        ALLOWED = new EnumMap<>(OrderStatus.class);
        ALLOWED.put(OrderStatus.RECEIVED,  EnumSet.of(OrderStatus.PREPARING, OrderStatus.CANCELLED));
        ALLOWED.put(OrderStatus.PREPARING, EnumSet.of(OrderStatus.OUT,        OrderStatus.CANCELLED));
        ALLOWED.put(OrderStatus.OUT,       EnumSet.of(OrderStatus.DELIVERED,  OrderStatus.CANCELLED));
        ALLOWED.put(OrderStatus.DELIVERED, EnumSet.noneOf(OrderStatus.class));
        ALLOWED.put(OrderStatus.CANCELLED, EnumSet.noneOf(OrderStatus.class));
    }

    private OrderStatusTransition() {}

    public static boolean isValid(OrderStatus from, OrderStatus to) {
        return ALLOWED.getOrDefault(from, EnumSet.noneOf(OrderStatus.class)).contains(to);
    }
}
