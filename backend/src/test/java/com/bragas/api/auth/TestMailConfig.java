package com.bragas.api.auth;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

import java.util.ArrayList;
import java.util.List;

@TestConfiguration
public class TestMailConfig {

    public static class CapturingMailService implements MailService {
        public final List<Sent> sent = new ArrayList<>();
        public record Sent(String to, String link) {}

        @Override
        public void sendPasswordReset(String to, String link) {
            sent.add(new Sent(to, link));
        }
    }

    @Bean
    @Primary
    public MailService capturingMailService() {
        return new CapturingMailService();
    }
}
