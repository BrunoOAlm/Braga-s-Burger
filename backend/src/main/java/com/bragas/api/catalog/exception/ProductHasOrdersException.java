package com.bragas.api.catalog.exception;

public class ProductHasOrdersException extends RuntimeException {
    public ProductHasOrdersException() { super("Produto referenciado em pedidos"); }
}
