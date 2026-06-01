package com.bragas.api.auth;

public class ResetTokenInvalidException extends RuntimeException {
    public ResetTokenInvalidException() { super("Token de redefinição inválido"); }
}
