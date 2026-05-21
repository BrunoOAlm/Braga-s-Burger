package com.bragas.api.common;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class SecurityConfig {

    private final String adminToken;
    private final List<String> corsOrigins;

    public SecurityConfig(AppProperties props) {
        this.adminToken = props.admin() == null ? null : props.admin().token();
        this.corsOrigins = props.cors() == null ? null : props.cors().allowedOrigins();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(c -> c.configurationSource(corsSource()))
            .authorizeHttpRequests(a -> a.anyRequest().permitAll())
            .addFilterBefore(new AdminTokenFilter(adminToken), AuthorizationFilter.class);
        return http.build();
    }

    private CorsConfigurationSource corsSource() {
        var cfg = new CorsConfiguration();
        if (corsOrigins != null && !corsOrigins.isEmpty()) {
            cfg.setAllowedOrigins(corsOrigins);
        }
        cfg.setAllowedMethods(List.of("GET", "POST", "PATCH", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("*"));
        var src = new UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/api/**", cfg);
        return src;
    }
}
