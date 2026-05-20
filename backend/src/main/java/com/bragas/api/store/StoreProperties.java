package com.bragas.api.store;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.math.BigDecimal;
import java.util.Map;

@ConfigurationProperties(prefix = "app.store")
public record StoreProperties(
    BigDecimal minOrder,
    int averagePrepTime,
    Map<String, OpeningHours> openingHours
) {}
