package com.bragas.api.auth;

public class UnauthenticatedException extends RuntimeException {
    public UnauthenticatedException() { super("Não autenticado"); }
}
