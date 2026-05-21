package com.bragas.api.common;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "app")
public record AppProperties(Admin admin, Cors cors) {
    public record Admin(String token) {}
    public record Cors(List<String> allowedOrigins) {}
}
