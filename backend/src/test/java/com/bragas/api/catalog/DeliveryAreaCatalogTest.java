package com.bragas.api.catalog;

import com.bragas.api.catalog.domain.DeliveryArea;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class DeliveryAreaCatalogTest {

    @Test
    void findFeeReturnsFeeWhenExists() {
        var a = new DeliveryArea("Higienópolis", new BigDecimal("4.99"));
        assertThat(new DeliveryAreaCatalog(List.of(a)).findFee("Higienópolis"))
            .contains(new BigDecimal("4.99"));
    }

    @Test
    void findFeeIsCaseInsensitive() {
        var a = new DeliveryArea("Higienópolis", new BigDecimal("4.99"));
        assertThat(new DeliveryAreaCatalog(List.of(a)).findFee("higienópolis"))
            .contains(new BigDecimal("4.99"));
    }

    @Test
    void findFeeReturnsEmptyWhenNotExists() {
        assertThat(new DeliveryAreaCatalog(List.of()).findFee("X")).isEmpty();
    }
}
