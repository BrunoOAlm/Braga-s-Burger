package com.bragas.api.catalog;

import com.bragas.api.catalog.domain.Coupon;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public class CouponCatalog {

    private final Map<String, Coupon> byCode;

    public CouponCatalog(List<Coupon> coupons) {
        var m = new LinkedHashMap<String, Coupon>();
        for (var c : coupons) m.put(c.code(), c);
        this.byCode = Map.copyOf(m);
    }

    public Optional<Coupon> find(String code) {
        return Optional.ofNullable(byCode.get(code));
    }
}
