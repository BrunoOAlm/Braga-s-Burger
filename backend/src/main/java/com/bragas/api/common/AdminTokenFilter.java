package com.bragas.api.common;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

public class AdminTokenFilter extends OncePerRequestFilter {

    private static final String HEADER = "X-Admin-Token";

    private final byte[] expectedToken;

    public AdminTokenFilter(String token) {
        if (token == null || token.isBlank()) {
            throw new IllegalStateException("ADMIN_TOKEN não configurado");
        }
        this.expectedToken = token.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String provided = request.getHeader(HEADER);
        if (provided == null) {
            writeProblem(response, request, 401, "admin-token-missing", "Token de admin ausente");
            return;
        }
        byte[] providedBytes = provided.getBytes(StandardCharsets.UTF_8);
        if (!MessageDigest.isEqual(expectedToken, providedBytes)) {
            writeProblem(response, request, 401, "admin-token-invalid", "Token de admin inválido");
            return;
        }
        chain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/v1/admin/");
    }

    private static void writeProblem(HttpServletResponse response, HttpServletRequest request,
                                      int status, String slug, String title) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.valueOf("application/problem+json").toString());
        String body = """
            {
              "type": "https://bragas.com/errors/%s",
              "title": "%s",
              "status": %d,
              "instance": "%s"
            }
            """.formatted(slug, title, status, request.getRequestURI());
        response.getWriter().write(body);
    }
}
