package com.bragas.api.auth;

import com.bragas.api.auth.domain.User;
import com.bragas.api.auth.dto.*;
import com.bragas.api.order.OrderRepository;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/me")
public class MeController {

    private final AuthService authService;
    private final OrderRepository orderRepository;

    public MeController(AuthService authService, OrderRepository orderRepository) {
        this.authService = authService;
        this.orderRepository = orderRepository;
    }

    @GetMapping
    public MeResponse me(@AuthenticationPrincipal User user) {
        if (user == null) throw new UnauthenticatedException();
        return MeResponse.from(user);
    }

    @PatchMapping
    public MeResponse update(@AuthenticationPrincipal User user, @RequestBody @Valid UpdateMeRequest req) {
        if (user == null) throw new UnauthenticatedException();
        return MeResponse.from(authService.updateMe(user.getId(), req.name(), req.phone()));
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(@AuthenticationPrincipal User user,
                                                @RequestBody @Valid ChangePasswordRequest req) {
        if (user == null) throw new UnauthenticatedException();
        authService.changePassword(user.getId(), req.currentPassword(), req.newPassword());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/orders")
    public OrdersPageResponse orders(@AuthenticationPrincipal User user,
                                      @RequestParam(defaultValue = "20") int limit,
                                      @RequestParam(defaultValue = "0") int offset) {
        if (user == null) throw new UnauthenticatedException();
        int safeLimit = Math.min(Math.max(limit, 1), 50);
        int safeOffset = Math.max(offset, 0);
        var page = orderRepository.findByUserId(user.getId(),
            PageRequest.of(safeOffset / safeLimit, safeLimit, Sort.by(Sort.Direction.DESC, "createdAt")));
        var items = page.getContent().stream().map(OrderSummaryResponse::from).toList();
        return new OrdersPageResponse(items, page.getTotalElements(), safeLimit, safeOffset);
    }
}
