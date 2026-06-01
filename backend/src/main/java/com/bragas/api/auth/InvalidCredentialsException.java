package com.bragas.api.auth;

public class InvalidCredentialsException extends RuntimeException {
    public InvalidCredentialsException() { super("Credenciais inválidas"); }
}
