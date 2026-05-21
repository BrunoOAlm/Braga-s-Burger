package com.bragas.api.order;

import com.bragas.api.order.dto.OrderResponse;
import com.bragas.api.order.dto.UpdateStatusRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/orders")
public class OrderAdminController {

    private final OrderService service;

    public OrderAdminController(OrderService service) {
        this.service = service;
    }

    @PatchMapping("/{id}/status")
    public OrderResponse updateStatus(@PathVariable String id, @RequestBody @Valid UpdateStatusRequest req) {
        return OrderResponse.from(service.transitionStatus(id, req.to()));
    }
}
