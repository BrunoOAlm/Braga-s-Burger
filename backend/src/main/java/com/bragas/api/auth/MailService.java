package com.bragas.api.auth;

public interface MailService {
    void sendPasswordReset(String to, String resetLink);
}
