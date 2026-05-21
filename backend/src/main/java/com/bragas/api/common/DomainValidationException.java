package com.bragas.api.common;

public class DomainValidationException extends RuntimeException {
    private final String typeSlug;
    private final String title;

    public DomainValidationException(String typeSlug, String title, String detail) {
        super(detail);
        this.typeSlug = typeSlug;
        this.title = title;
    }

    public String getTypeSlug() { return typeSlug; }
    public String getTitle() { return title; }
}
