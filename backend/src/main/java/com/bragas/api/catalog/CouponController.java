package com.bragas.api.catalog;

import com.bragas.api.catalog.dto.CouponValidationRequest;
import com.bragas.api.catalog.dto.CouponValidationResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/coupons")
public class CouponController {

    private final CouponService service;

    public CouponController(CouponService service) {
        this.service = service;
    }

    @PostMapping("/validate")
    public CouponValidationResponse validate(@Valid @RequestBody CouponValidationRequest req) {
        return service.validate(req.code(), req.subtotal());
    }
}
