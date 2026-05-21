package com.bragas.api.catalog;

import com.bragas.api.catalog.domain.DeliveryArea;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

public class DeliveryAreaCatalog {

    private final Map<String, BigDecimal> byNeighborhood;

    public DeliveryAreaCatalog(List<DeliveryArea> areas) {
        var m = new LinkedHashMap<String, BigDecimal>();
        for (var a : areas) m.put(normalize(a.neighborhood()), a.fee());
        this.byNeighborhood = Map.copyOf(m);
    }

    public Optional<BigDecimal> findFee(String neighborhood) {
        return Optional.ofNullable(byNeighborhood.get(normalize(neighborhood)));
    }

    private static String normalize(String s) {
        return s == null ? "" : s.toLowerCase(Locale.ROOT);
    }
}
