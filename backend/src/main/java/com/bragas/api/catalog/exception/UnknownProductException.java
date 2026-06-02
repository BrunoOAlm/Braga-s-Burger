package com.bragas.api.catalog.exception;

public class UnknownProductException extends RuntimeException {
    public UnknownProductException(String id) { super("Produto não encontrado: " + id); }
}
