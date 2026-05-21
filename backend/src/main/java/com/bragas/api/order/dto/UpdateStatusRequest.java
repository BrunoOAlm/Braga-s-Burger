package com.bragas.api.order.dto;

import com.bragas.api.order.domain.OrderStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateStatusRequest(
    @NotNull OrderStatus to
) {}
