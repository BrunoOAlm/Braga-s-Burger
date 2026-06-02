package com.bragas.api.common;

import com.bragas.api.auth.EmailAlreadyTakenException;
import com.bragas.api.auth.InvalidCredentialsException;
import com.bragas.api.auth.RateLimitExceededException;
import com.bragas.api.auth.ResetTokenInvalidException;
import com.bragas.api.auth.UnauthenticatedException;
import com.bragas.api.catalog.exception.CatalogAlreadyExistsException;
import com.bragas.api.catalog.exception.CategoryHasProductsException;
import com.bragas.api.catalog.exception.CategoryNotFoundException;
import com.bragas.api.catalog.exception.CouponNotFoundException;
import com.bragas.api.catalog.exception.ProductHasOrdersException;
import com.bragas.api.catalog.exception.ProductNotFoundException;
import com.bragas.api.catalog.exception.UnavailableProductException;
import com.bragas.api.catalog.exception.UnknownProductException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

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

    @ExceptionHandler({ CategoryNotFoundException.class, ProductNotFoundException.class, CouponNotFoundException.class })
    public ResponseEntity<ApiError> handleCatalogNotFound(RuntimeException ex, HttpServletRequest req) {
        String slug = ex instanceof CategoryNotFoundException ? "category-not-found"
            : ex instanceof ProductNotFoundException ? "product-not-found"
            : "coupon-not-found";
        String title = ex instanceof CategoryNotFoundException ? "Categoria não encontrada"
            : ex instanceof ProductNotFoundException ? "Produto não encontrado"
            : "Cupom não encontrado";
        return problem(HttpStatus.NOT_FOUND,
            ApiError.of(slug, title, 404, "Recurso não encontrado.", req.getRequestURI()));
    }

    @ExceptionHandler(CategoryHasProductsException.class)
    public ResponseEntity<ApiError> handleCategoryHasProducts(CategoryHasProductsException ex, HttpServletRequest req) {
        return problem(HttpStatus.CONFLICT,
            ApiError.of("category-has-products", "Categoria possui produtos", 409,
                "Mova ou apague os produtos antes de remover a categoria.", req.getRequestURI()));
    }

    @ExceptionHandler(ProductHasOrdersException.class)
    public ResponseEntity<ApiError> handleProductHasOrders(ProductHasOrdersException ex, HttpServletRequest req) {
        return problem(HttpStatus.CONFLICT,
            ApiError.of("product-has-orders", "Produto referenciado em pedidos", 409,
                "Este produto está em pedidos antigos. Marque-o como indisponível em vez de apagar.", req.getRequestURI()));
    }

    @ExceptionHandler(CatalogAlreadyExistsException.class)
    public ResponseEntity<ApiError> handleAlreadyExists(CatalogAlreadyExistsException ex, HttpServletRequest req) {
        return problem(HttpStatus.CONFLICT,
            ApiError.of(ex.getSlug(), "Recurso já existe", 409,
                "Já existe um recurso com esse identificador.", req.getRequestURI()));
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

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiError> handleNoResource(NoResourceFoundException ex, HttpServletRequest req) {
        return problem(HttpStatus.NOT_FOUND,
            ApiError.of("not-found", "Rota não encontrada", 404,
                "Recurso não encontrado: " + req.getRequestURI(), req.getRequestURI()));
    }

    @ExceptionHandler(EmailAlreadyTakenException.class)
    public ResponseEntity<ApiError> handleEmailTaken(EmailAlreadyTakenException ex, HttpServletRequest req) {
        return problem(HttpStatus.CONFLICT,
            ApiError.of("email-already-taken", "E-mail já cadastrado", 409,
                "E-mail já cadastrado.", req.getRequestURI()));
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ApiError> handleInvalidCreds(InvalidCredentialsException ex, HttpServletRequest req) {
        return problem(HttpStatus.UNAUTHORIZED,
            ApiError.of("invalid-credentials", "Credenciais inválidas", 401,
                "E-mail ou senha incorretos.", req.getRequestURI()));
    }

    @ExceptionHandler(UnauthenticatedException.class)
    public ResponseEntity<ApiError> handleUnauth(UnauthenticatedException ex, HttpServletRequest req) {
        return problem(HttpStatus.UNAUTHORIZED,
            ApiError.of("unauthenticated", "Não autenticado", 401,
                "Faça login para acessar este recurso.", req.getRequestURI()));
    }

    @ExceptionHandler(ResetTokenInvalidException.class)
    public ResponseEntity<ApiError> handleResetInvalid(ResetTokenInvalidException ex, HttpServletRequest req) {
        return problem(HttpStatus.UNAUTHORIZED,
            ApiError.of("reset-token-invalid", "Link inválido", 401,
                "Link de redefinição inválido ou expirado.", req.getRequestURI()));
    }

    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<ApiError> handleRateLimit(RateLimitExceededException ex, HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
            .contentType(MediaType.valueOf("application/problem+json"))
            .header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.getRetryAfterSeconds()))
            .body(ApiError.of("too-many-requests", "Muitas requisições", 429,
                "Aguarde alguns instantes e tente de novo.", req.getRequestURI()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> handleDataIntegrity(DataIntegrityViolationException ex, HttpServletRequest req) {
        String msg = ex.getMostSpecificCause().getMessage();
        if (msg != null && msg.contains("users_email_key")) {
            return handleEmailTaken(new EmailAlreadyTakenException("(constraint)"), req);
        }
        log.error("DataIntegrityViolation em {} {}: ", req.getMethod(), req.getRequestURI(), ex);
        return problem(HttpStatus.CONFLICT,
            ApiError.of("conflict", "Conflito", 409, "Operação conflitou com estado atual.", req.getRequestURI()));
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
