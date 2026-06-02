package com.bragas.api.catalog.exception;

public class CategoryNotFoundException extends RuntimeException {
    public CategoryNotFoundException(String id) { super("Categoria não encontrada: " + id); }
}
