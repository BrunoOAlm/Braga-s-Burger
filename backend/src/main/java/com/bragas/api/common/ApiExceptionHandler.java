package com.bragas.api.common;

import com.bragas.api.catalog.ProductCatalog.UnknownProductException;
import com.bragas.api.catalog.ProductCatalog.UnavailableProductException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;

@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest req) {
        List<ApiError.FieldError> fields = ex.getBindingResult().getFieldErrors().stream()
            .map(f -> new ApiError.FieldError(f.getField(), f.getDefaultMessage()))
            .toList();
        return problem(HttpStatus.BAD_REQUEST,
            ApiError.validation("Um ou mais campos inválidos", req.getRequestURI(), fields));
    }

    @ExceptionHandler(DomainValidationException.class)
    public ResponseEntity<ApiError> handleDomain(DomainValidationException ex, HttpServletRequest req) {
        return problem(HttpStatus.BAD_REQUEST,
            ApiError.of(ex.getTypeSlug(), ex.getTitle(), 400, ex.getMessage(), req.getRequestURI()));
    }

    @ExceptionHandler({ UnknownProductException.class, UnavailableProductException.class })
    public ResponseEntity<ApiError> handleProductIssue(RuntimeException ex, HttpServletRequest req) {
        String slug = ex instanceof UnavailableProductException ? "product-unavailable" : "product-not-found";
        String title = ex instanceof UnavailableProductException ? "Produto indisponível" : "Produto não encontrado";
        return problem(HttpStatus.BAD_REQUEST,
            ApiError.of(slug, title, 400, ex.getMessage(), req.getRequestURI()));
    }

    @ExceptionHandler(OrderNotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(OrderNotFoundException ex, HttpServletRequest req) {
        return problem(HttpStatus.NOT_FOUND,
            ApiError.of("order-not-found", "Pedido não encontrado", 404, ex.getMessage(), req.getRequestURI()));
    }

    @ExceptionHandler(InvalidStatusTransitionException.class)
    public ResponseEntity<ApiError> handleInvalidTransition(InvalidStatusTransitionException ex, HttpServletRequest req) {
        return problem(HttpStatus.CONFLICT,
            ApiError.of("invalid-status-transition", "Transição inválida", 409, ex.getMessage(), req.getRequestURI()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleAny(Exception ex, HttpServletRequest req) {
        log.error("Erro não tratado em {} {}: ", req.getMethod(), req.getRequestURI(), ex);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR,
            ApiError.of("internal-error", "Erro interno", 500, "Algo deu errado.", req.getRequestURI()));
    }

    private ResponseEntity<ApiError> problem(HttpStatus status, ApiError body) {
        return ResponseEntity.status(status)
            .contentType(MediaType.valueOf("application/problem+json"))
            .body(body);
    }
}
