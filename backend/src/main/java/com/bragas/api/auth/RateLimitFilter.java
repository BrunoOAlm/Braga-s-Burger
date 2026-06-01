package com.bragas.api.auth;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class RateLimitFilter extends OncePerRequestFilter {

    private record Rule(String pathPrefix, long capacity, Duration refill) {}

    private static final Rule[] RULES = new Rule[] {
        new Rule("/api/v1/auth/login",   5, Duration.ofMinutes(1)),
        new Rule("/api/v1/auth/signup",  3, Duration.ofMinutes(1)),
        new Rule("/api/v1/auth/forgot",  2, Duration.ofMinutes(1)),
        new Rule("/api/v1/auth/reset",   5, Duration.ofMinutes(1)),
    };

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Rule rule = matchRule(request);
        if (rule == null) {
            chain.doFilter(request, response);
            return;
        }
        String key = clientIp(request) + ":" + rule.pathPrefix;
        Bucket bucket = buckets.computeIfAbsent(key, k -> Bucket.builder()
            .addLimit(Bandwidth.builder().capacity(rule.capacity).refillGreedy(rule.capacity, rule.refill).build())
            .build());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            long retryAfter = Math.max(1, probe.getNanosToWaitForRefill() / 1_000_000_000L);
            throw new RateLimitExceededException(retryAfter);
        }
        chain.doFilter(request, response);
    }

    private Rule matchRule(HttpServletRequest request) {
        if (!"POST".equalsIgnoreCase(request.getMethod())) return null;
        String uri = request.getRequestURI();
        for (Rule r : RULES) if (uri.equals(r.pathPrefix)) return r;
        return null;
    }

    private static String clientIp(HttpServletRequest req) {
        String fwd = req.getHeader("X-Forwarded-For");
        if (fwd != null && !fwd.isBlank()) return fwd.split(",")[0].trim();
        return req.getRemoteAddr();
    }
}
