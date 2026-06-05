package com.bragas.api.auth.admin;

import com.bragas.api.auth.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

public class JwtAdminCookieAuthFilter extends OncePerRequestFilter {

    public static final String COOKIE_NAME = "bb_admin";
    private static final String SUB_PREFIX = "adm_";

    private final JwtService jwtService;
    private final AdminUserRepository repository;

    public JwtAdminCookieAuthFilter(JwtService jwtService, AdminUserRepository repository) {
        this.jwtService = jwtService;
        this.repository = repository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String token = extractToken(request);
        if (token != null) {
            jwtService.verifyAndExtractUserId(token)
                .filter(sub -> sub.startsWith(SUB_PREFIX))
                .flatMap(repository::findById)
                .ifPresent(admin -> {
                    var auth = new UsernamePasswordAuthenticationToken(
                        admin, null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                });
        }
        chain.doFilter(request, response);
    }

    private String extractToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie c : cookies) {
            if (COOKIE_NAME.equals(c.getName())) return c.getValue();
        }
        return null;
    }
}
