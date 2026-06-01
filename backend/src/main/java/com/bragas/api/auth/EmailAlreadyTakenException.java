package com.bragas.api.auth;

public class EmailAlreadyTakenException extends RuntimeException {
    public EmailAlreadyTakenException(String email) {
        // Não inclui o e-mail no message para que ele não vaze no body da resposta 409
        // via ex.getMessage(). Para rastrear o e-mail em logs, use um campo dedicado.
        super("E-mail já cadastrado");
    }
}
