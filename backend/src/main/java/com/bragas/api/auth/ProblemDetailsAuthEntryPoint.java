package com.bragas.api.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;

import java.io.IOException;

public class ProblemDetailsAuthEntryPoint implements AuthenticationEntryPoint {

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException) throws IOException {
        response.setStatus(401);
        response.setContentType("application/problem+json");
        String body = """
            {
              "type": "https://bragas.com/errors/unauthenticated",
              "title": "Não autenticado",
              "status": 401,
              "detail": "Faça login para acessar este recurso.",
              "instance": "%s"
            }
            """.formatted(request.getRequestURI());
        response.getWriter().write(body);
    }
}
