package com.bragas.api.catalog.exception;

public class CatalogAlreadyExistsException extends RuntimeException {
    private final String slug;
    public CatalogAlreadyExistsException(String slug) {
        super("Recurso já existe");
        this.slug = slug;
    }
    public String getSlug() { return slug; }
}
