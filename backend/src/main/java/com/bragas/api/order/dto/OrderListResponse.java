package com.bragas.api.order.dto;

import java.util.List;

public record OrderListResponse(
    List<OrderResponse> items,
    int page,
    int size,
    long total
) {}
