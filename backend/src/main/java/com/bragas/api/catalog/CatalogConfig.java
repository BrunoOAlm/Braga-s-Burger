package com.bragas.api.catalog;

import com.bragas.api.catalog.domain.Coupon;
import com.bragas.api.catalog.domain.DeliveryArea;
import com.bragas.api.catalog.domain.Product;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

@Configuration
public class CatalogConfig {

    private final ObjectMapper mapper = new ObjectMapper();

    @Bean
    public ProductCatalog productCatalog() throws IOException {
        return new ProductCatalog(load("data/products.json", new TypeReference<>() {}));
    }

    @Bean
    public CouponCatalog couponCatalog() throws IOException {
        return new CouponCatalog(load("data/coupons.json", new TypeReference<>() {}));
    }

    @Bean
    public DeliveryAreaCatalog deliveryAreaCatalog() throws IOException {
        return new DeliveryAreaCatalog(load("data/delivery-areas.json", new TypeReference<>() {}));
    }

    private <T> List<T> load(String path, TypeReference<List<T>> typeRef) throws IOException {
        try (InputStream in = new ClassPathResource(path).getInputStream()) {
            List<T> list = mapper.readValue(in, typeRef);
            if (list == null || list.isEmpty()) {
                throw new IllegalStateException("Catalog vazio: " + path);
            }
            return list;
        }
    }
}
