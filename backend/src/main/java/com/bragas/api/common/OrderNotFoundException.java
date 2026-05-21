package com.bragas.api.common;

public class OrderNotFoundException extends RuntimeException {
    public OrderNotFoundException(String idOrDisplay) {
        super("Pedido não encontrado: " + idOrDisplay);
    }
}
