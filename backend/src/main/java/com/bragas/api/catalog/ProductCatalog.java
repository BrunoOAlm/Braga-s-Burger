package com.bragas.api.catalog;

import com.bragas.api.catalog.domain.Product;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public class ProductCatalog {

    private final Map<String, Product> byId;

    public ProductCatalog(List<Product> products) {
        var m = new LinkedHashMap<String, Product>();
        for (var p : products) m.put(p.id(), p);
        this.byId = Map.copyOf(m);
    }

    public Optional<Product> findById(String id) {
        return Optional.ofNullable(byId.get(id));
    }

    public void requireAll(Collection<String> ids) {
        for (var id : ids) {
            var p = byId.get(id);
            if (p == null) throw new UnknownProductException(id);
            if (!p.available()) throw new UnavailableProductException(id);
        }
    }

    public static class UnknownProductException extends RuntimeException {
        public UnknownProductException(String id) { super("Produto não encontrado: " + id); }
    }

    public static class UnavailableProductException extends RuntimeException {
        public UnavailableProductException(String id) { super("Produto indisponível: " + id); }
    }
}
