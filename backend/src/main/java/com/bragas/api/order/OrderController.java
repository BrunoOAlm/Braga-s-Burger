package com.bragas.api.order;

import com.bragas.api.order.dto.CreateOrderRequest;
import com.bragas.api.order.dto.OrderResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final OrderService service;

    public OrderController(OrderService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<OrderResponse> create(@RequestBody @Valid CreateOrderRequest req) {
        var order = service.create(req);
        var resp = OrderResponse.from(order);
        return ResponseEntity.created(URI.create("/api/v1/orders/" + order.getId())).body(resp);
    }

    @GetMapping("/{id}")
    public OrderResponse getById(@PathVariable String id) {
        return OrderResponse.from(service.findById(id));
    }

    @GetMapping("/by-display/{displayId}")
    public OrderResponse getByDisplayId(@PathVariable String displayId) {
        String normalized = displayId.startsWith("#") ? displayId : "#" + displayId;
        return OrderResponse.from(service.findByDisplayId(normalized));
    }
}
