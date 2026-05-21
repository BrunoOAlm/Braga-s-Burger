package com.bragas.api.common;

import java.util.List;

public record ApiError(
    String type,
    String title,
    int status,
    String detail,
    String instance,
    List<FieldError> errors
) {
    public record FieldError(String field, String message) {}

    public static ApiError of(String typeSlug, String title, int status, String detail, String instance) {
        return new ApiError("https://bragas.com/errors/" + typeSlug, title, status, detail, instance, null);
    }

    public static ApiError validation(String detail, String instance, List<FieldError> fieldErrors) {
        return new ApiError(
            "https://bragas.com/errors/validation-failed",
            "Validação falhou", 400, detail, instance, fieldErrors
        );
    }
}
