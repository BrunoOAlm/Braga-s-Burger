package com.bragas.api.order.dto;

import com.bragas.api.order.domain.FulfillmentType;
import com.bragas.api.order.domain.Order;
import com.bragas.api.order.domain.OrderStatus;
import com.bragas.api.order.domain.PaymentMethod;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record OrderResponse(
    String id,
    String displayId,
    OrderStatus status,
    FulfillmentType fulfillmentType,
    Customer customer,
    Address address,
    PaymentMethod payment,
    BigDecimal changeFor,
    List<Item> items,
    String couponCode,
    Totals totals,
    Range estimatedMinutes,
    OffsetDateTime createdAt,
    Timestamps timestamps
) {
    public record Customer(String name, String phone) {}
    public record Address(String cep, String street, String number, String neighborhood, String complement, String reference) {}
    public record Item(String productId, String productName, BigDecimal unitPrice, int quantity, String notes) {}
    public record Totals(BigDecimal subtotal, BigDecimal discount, BigDecimal deliveryFee, BigDecimal total) {}
    public record Range(int min, int max) {}
    public record Timestamps(
        OffsetDateTime receivedAt,
        OffsetDateTime preparingAt,
        OffsetDateTime outAt,
        OffsetDateTime deliveredAt,
        OffsetDateTime cancelledAt
    ) {}

    public static OrderResponse from(Order o) {
        Address address = o.getAddressStreet() == null ? null : new Address(
            o.getAddressCep(), o.getAddressStreet(), o.getAddressNumber(),
            o.getAddressNeighborhood(), o.getAddressComplement(), o.getAddressReference()
        );

        List<Item> items = o.getItems().stream()
            .map(i -> new Item(i.getProductId(), i.getProductName(), i.getUnitPrice(), i.getQuantity(), i.getNotes()))
            .toList();

        return new OrderResponse(
            o.getId(),
            o.getDisplayId(),
            o.getStatus(),
            o.getFulfillmentType(),
            new Customer(o.getCustomerName(), o.getCustomerPhone()),
            address,
            o.getPayment(),
            o.getChangeFor(),
            items,
            o.getCouponCode(),
            new Totals(o.getSubtotal(), o.getCouponDiscount(), o.getDeliveryFee(), o.getTotal()),
            new Range(o.getEstimatedMin(), o.getEstimatedMax()),
            o.getCreatedAt(),
            new Timestamps(o.getReceivedAt(), o.getPreparingAt(), o.getOutAt(), o.getDeliveredAt(), o.getCancelledAt())
        );
    }
}
