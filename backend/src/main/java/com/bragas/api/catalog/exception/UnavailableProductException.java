package com.bragas.api.catalog.exception;

public class UnavailableProductException extends RuntimeException {
    public UnavailableProductException(String id) { super("Produto indisponível: " + id); }
}
