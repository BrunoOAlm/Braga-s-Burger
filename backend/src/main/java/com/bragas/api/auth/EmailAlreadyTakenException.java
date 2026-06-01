package com.bragas.api.auth;

public class EmailAlreadyTakenException extends RuntimeException {
    public EmailAlreadyTakenException(String email) {
        super("E-mail já cadastrado: " + email);
    }
}
