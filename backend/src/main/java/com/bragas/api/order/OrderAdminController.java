package com.bragas.api.order;

import com.bragas.api.auth.admin.CurrentAdmin;
import com.bragas.api.common.DomainValidationException;
import com.bragas.api.order.domain.Order;
import com.bragas.api.order.domain.OrderStatus;
import com.bragas.api.order.dto.OrderListResponse;
import com.bragas.api.order.dto.OrderResponse;
import com.bragas.api.order.dto.UpdateStatusRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin/orders")
public class OrderAdminController {

    private static final Logger log = LoggerFactory.getLogger(OrderAdminController.class);
    private static final Set<OrderStatus> DEFAULT_STATUSES =
        Set.of(OrderStatus.RECEIVED, OrderStatus.PREPARING, OrderStatus.OUT);
    private static final int MAX_SIZE = 100;

    private final OrderService service;

    public OrderAdminController(OrderService service) {
        this.service = service;
    }

    @GetMapping
    public OrderListResponse list(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        if (page < 0) page = 0;
        if (size < 1) size = 1;
        if (size > MAX_SIZE) size = MAX_SIZE;

        Set<OrderStatus> statuses = parseStatuses(status);

        Page<Order> result = service.searchByStatus(statuses, PageRequest.of(page, size));
        List<OrderResponse> items = result.getContent().stream()
            .map(OrderResponse::from).toList();

        log.info("admin.action action=GET resource=orders status={} page={} size={} returned={} actor={}",
            statuses.stream().map(Enum::name).sorted().collect(Collectors.joining(",")),
            page, size, items.size(), CurrentAdmin.id());

        return new OrderListResponse(items, page, size, result.getTotalElements());
    }

    private Set<OrderStatus> parseStatuses(String raw) {
        if (raw == null || raw.isBlank()) return DEFAULT_STATUSES;
        Set<OrderStatus> out = EnumSet.noneOf(OrderStatus.class);
        for (String token : raw.split(",")) {
            String t = token.trim().toUpperCase();
            if (t.isEmpty()) continue;
            try {
                out.add(OrderStatus.valueOf(t));
            } catch (IllegalArgumentException e) {
                throw new DomainValidationException("validation-failed",
                    "Status inválido",
                    "Valores válidos: " + Arrays.toString(OrderStatus.values()));
            }
        }
        return out.isEmpty() ? DEFAULT_STATUSES : out;
    }

    @PatchMapping("/{id}/status")
    public OrderResponse updateStatus(@PathVariable String id, @RequestBody @Valid UpdateStatusRequest req) {
        return OrderResponse.from(service.transitionStatus(id, req.to()));
    }
}
