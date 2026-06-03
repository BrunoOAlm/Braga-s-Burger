package com.bragas.api.catalog;

import com.bragas.api.catalog.domain.Coupon;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CouponRepository extends JpaRepository<Coupon, String> {
    // Lookup por code: como o code é o @Id e armazenamos sempre uppercase,
    // basta o findById(code.toUpperCase()) no service.
}
