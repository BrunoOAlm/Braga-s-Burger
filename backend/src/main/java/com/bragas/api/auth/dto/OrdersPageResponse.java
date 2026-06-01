package com.bragas.api.auth.dto;

import java.util.List;

public record OrdersPageResponse(
    List<OrderSummaryResponse> items,
    long total,
    int limit,
    int offset
) {}
