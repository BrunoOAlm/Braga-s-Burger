package com.bragas.api.common;

import com.bragas.api.auth.JwtCookieAuthFilter;
import com.bragas.api.auth.JwtService;
import com.bragas.api.auth.ProblemDetailsAuthEntryPoint;
import com.bragas.api.auth.RateLimitFilter;
import com.bragas.api.auth.UserRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class SecurityConfig {

    private final String adminToken;
    private final List<String> corsOrigins;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final boolean rateLimitEnabled;

    public SecurityConfig(AppProperties props, JwtService jwtService, UserRepository userRepository) {
        this.adminToken = props.admin() == null ? null : props.admin().token();
        this.corsOrigins = props.cors() == null ? null : props.cors().allowedOrigins();
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.rateLimitEnabled = props.auth().rateLimitEnabled();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(c -> c.configurationSource(corsSource()))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/orders/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/orders").permitAll()
                .requestMatchers("/api/v1/me/**").authenticated()
                .anyRequest().permitAll()
            )
            .exceptionHandling(e -> e.authenticationEntryPoint(new ProblemDetailsAuthEntryPoint()))
            .addFilterBefore(new RateLimitFilter(rateLimitEnabled), UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(new JwtCookieAuthFilter(jwtService, userRepository), UsernamePasswordAuthenticationFilter.class)
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
        cfg.setAllowCredentials(true);
        var src = new UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/api/**", cfg);
        return src;
    }
}
