package com.bragas.api.catalog;

import com.bragas.api.catalog.domain.Coupon;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CouponCatalogTest {

    @Test
    void findReturnsCouponWhenExists() {
        var c = new Coupon("BEMVINDO10", Coupon.Type.PERCENT, new BigDecimal("10"), null);
        var cat = new CouponCatalog(List.of(c));
        assertThat(cat.find("BEMVINDO10")).contains(c);
    }

    @Test
    void findIsCaseSensitive() {
        var c = new Coupon("BEMVINDO10", Coupon.Type.PERCENT, new BigDecimal("10"), null);
        assertThat(new CouponCatalog(List.of(c)).find("bemvindo10")).isEmpty();
    }

    @Test
    void findReturnsEmptyWhenNotExists() {
        assertThat(new CouponCatalog(List.of()).find("NADA")).isEmpty();
    }
}
