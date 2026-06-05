package com.bragas.api.common;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "app")
public record AppProperties(Cors cors, Auth auth, Mail mail) {
    public record Cors(List<String> allowedOrigins) {}
    public record Auth(String jwtSecret, boolean cookieSecure, String cookieSameSite,
                       long jwtTtlSeconds, long adminCookieTtlSeconds, boolean rateLimitEnabled) {}
    public record Mail(String from, String resetBaseUrl) {}
}
