package com.bragas.api.catalog.exception;

public class CouponNotFoundException extends RuntimeException {
    public CouponNotFoundException(String code) { super("Cupom não encontrado: " + code); }
}
