package com.bragas.api.catalog.exception;

public class CategoryHasProductsException extends RuntimeException {
    public CategoryHasProductsException() { super("Categoria possui produtos"); }
}
