package com.bragas.api.catalog.admin;

import com.bragas.api.catalog.CouponRepository;
import com.bragas.api.catalog.admin.dto.CouponRequest;
import com.bragas.api.catalog.admin.dto.CouponResponse;
import com.bragas.api.catalog.domain.Coupon;
import com.bragas.api.catalog.exception.CatalogAlreadyExistsException;
import com.bragas.api.catalog.exception.CouponNotFoundException;
import com.bragas.api.common.DomainValidationException;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/coupons")
public class AdminCouponController {

    private static final Logger log = LoggerFactory.getLogger(AdminCouponController.class);

    private final CouponRepository repo;

    public AdminCouponController(CouponRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<CouponResponse> list() {
        return repo.findAll().stream().map(CouponResponse::from).toList();
    }

    @PostMapping
    @Transactional
    public ResponseEntity<CouponResponse> create(@Valid @RequestBody CouponRequest req) {
        if (req.code() == null || req.type() == null || req.value() == null) {
            throw new DomainValidationException("validation-failed", "Campos obrigatórios",
                "POST exige code, type e value.");
        }
        String code = req.code().toUpperCase();
        if (repo.existsById(code)) throw new CatalogAlreadyExistsException("coupon-already-exists");
        var c = new Coupon(code, req.type(), req.value());
        if (req.minSubtotal() != null) c.setMinSubtotal(req.minSubtotal());
        if (req.validFrom() != null) c.setValidFrom(req.validFrom());
        if (req.validUntil() != null) c.setValidUntil(req.validUntil());
        if (req.active() != null) c.setActive(req.active());
        repo.save(c);
        log.info("admin.action action=POST resource=coupon code={}", c.getCode());
        return ResponseEntity.created(URI.create("/api/v1/admin/coupons/" + c.getCode()))
            .body(CouponResponse.from(c));
    }

    @PatchMapping("/{code}")
    @Transactional
    public CouponResponse update(@PathVariable String code, @Valid @RequestBody CouponRequest req) {
        var c = repo.findById(code.toUpperCase()).orElseThrow(() -> new CouponNotFoundException(code));
        if (req.type() != null) c.setType(req.type());
        if (req.value() != null) c.setValue(req.value());
        if (req.minSubtotal() != null) c.setMinSubtotal(req.minSubtotal());
        if (req.validFrom() != null) c.setValidFrom(req.validFrom());
        if (req.validUntil() != null) c.setValidUntil(req.validUntil());
        if (req.active() != null) c.setActive(req.active());
        log.info("admin.action action=PATCH resource=coupon code={}", c.getCode());
        return CouponResponse.from(c);
    }

    @DeleteMapping("/{code}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable String code) {
        String upper = code.toUpperCase();
        if (!repo.existsById(upper)) throw new CouponNotFoundException(code);
        repo.deleteById(upper);
        log.info("admin.action action=DELETE resource=coupon code={}", upper);
        return ResponseEntity.noContent().build();
    }
}
