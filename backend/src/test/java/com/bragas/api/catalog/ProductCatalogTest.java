package com.bragas.api.catalog;

import com.bragas.api.catalog.domain.Product;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.*;

class ProductCatalogTest {

    private ProductCatalog catalog(List<Product> products) {
        return new ProductCatalog(products);
    }

    @Test
    void findByIdReturnsProductWhenExists() {
        var p = new Product("chicken", "burgers", "Chicken", new BigDecimal("25.90"), true);
        assertThat(catalog(List.of(p)).findById("chicken")).contains(p);
    }

    @Test
    void findByIdReturnsEmptyWhenNotExists() {
        assertThat(catalog(List.of()).findById("nope")).isEmpty();
    }

    @Test
    void requireAllPassesWhenAllExistAndAvailable() {
        var p1 = new Product("a", "x", "A", new BigDecimal("1"), true);
        var p2 = new Product("b", "x", "B", new BigDecimal("2"), true);
        assertThatCode(() -> catalog(List.of(p1, p2)).requireAll(List.of("a", "b")))
            .doesNotThrowAnyException();
    }

    @Test
    void requireAllThrowsWhenAnyMissing() {
        var p = new Product("a", "x", "A", new BigDecimal("1"), true);
        assertThatThrownBy(() -> catalog(List.of(p)).requireAll(List.of("a", "missing")))
            .isInstanceOf(ProductCatalog.UnknownProductException.class)
            .hasMessageContaining("missing");
    }

    @Test
    void requireAllThrowsWhenAnyUnavailable() {
        var off = new Product("off", "x", "Off", new BigDecimal("1"), false);
        assertThatThrownBy(() -> catalog(List.of(off)).requireAll(List.of("off")))
            .isInstanceOf(ProductCatalog.UnavailableProductException.class)
            .hasMessageContaining("off");
    }
}
