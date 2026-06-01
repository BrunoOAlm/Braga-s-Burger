package com.bragas.api.auth;

import com.bragas.api.common.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class SpringMailService implements MailService {

    private static final Logger log = LoggerFactory.getLogger(SpringMailService.class);

    private final JavaMailSender mailSender;
    private final String from;

    public SpringMailService(JavaMailSender mailSender, AppProperties props) {
        this.mailSender = mailSender;
        this.from = props.mail().from();
    }

    @Override
    @Async
    public void sendPasswordReset(String to, String resetLink) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(from);
            msg.setTo(to);
            msg.setSubject("Braga's Burger — Redefinir senha");
            msg.setText("""
                Olá,

                Recebemos um pedido para redefinir sua senha na Braga's Burger.

                Clique no link abaixo (válido por 1 hora):
                %s

                Se não foi você, ignore este e-mail.

                — Equipe Braga's Burger
                """.formatted(resetLink));
            mailSender.send(msg);
        } catch (Exception ex) {
            log.error("Falha ao enviar e-mail de reset para {}: {}", to, ex.getMessage());
        }
    }
}
