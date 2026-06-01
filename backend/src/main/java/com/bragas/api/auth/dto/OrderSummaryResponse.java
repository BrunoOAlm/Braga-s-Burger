package com.bragas.api.auth.dto;

import com.bragas.api.order.domain.Order;
import com.bragas.api.order.domain.OrderStatus;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record OrderSummaryResponse(
    String id,
    String displayId,
    OrderStatus status,
    BigDecimal total,
    int itemsCount,
    OffsetDateTime createdAt
) {
    public static OrderSummaryResponse from(Order o) {
        return new OrderSummaryResponse(
            o.getId(), o.getDisplayId(), o.getStatus(),
            o.getTotal(), o.getItems().size(), o.getCreatedAt()
        );
    }
}
