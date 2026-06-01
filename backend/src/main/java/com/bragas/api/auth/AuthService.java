package com.bragas.api.auth;

import com.bragas.api.auth.domain.PasswordResetToken;
import com.bragas.api.auth.domain.User;
import com.bragas.api.auth.dto.SignupRequest;
import com.bragas.api.common.AppProperties;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;

@Service
public class AuthService {

    private static final Duration RESET_TTL = Duration.ofHours(1);

    private final UserRepository users;
    private final PasswordResetTokenRepository tokens;
    private final PasswordEncoder encoder;
    private final PasswordResetService resetService;
    private final MailService mail;
    private final String resetBaseUrl;
    private final Clock clock;

    public AuthService(UserRepository users, PasswordResetTokenRepository tokens,
                       PasswordEncoder encoder, PasswordResetService resetService,
                       MailService mail, AppProperties props, Clock clock) {
        this.users = users;
        this.tokens = tokens;
        this.encoder = encoder;
        this.resetService = resetService;
        this.mail = mail;
        this.resetBaseUrl = props.mail().resetBaseUrl();
        this.clock = clock;
    }

    @Transactional
    public User signup(SignupRequest req) {
        String email = req.email().toLowerCase().trim();
        if (users.existsByEmail(email)) {
            throw new EmailAlreadyTakenException(email);
        }
        String hash = encoder.encode(req.password());
        User u = User.create(email, hash, req.name(), req.phone(), OffsetDateTime.now(clock));
        return users.save(u);
    }

    @Transactional(readOnly = true)
    public User login(String email, String password) {
        String normalized = email.toLowerCase().trim();
        User u = users.findByEmail(normalized).orElseThrow(InvalidCredentialsException::new);
        if (!encoder.matches(password, u.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }
        return u;
    }

    @Transactional
    public void triggerReset(String email) {
        String normalized = email.toLowerCase().trim();
        users.findByEmail(normalized).ifPresent(u -> {
            String token = resetService.generateToken();
            String hash = resetService.hash(token);
            OffsetDateTime now = OffsetDateTime.now(clock);
            tokens.save(PasswordResetToken.create(hash, u.getId(), now, now.plus(RESET_TTL)));
            mail.sendPasswordReset(u.getEmail(), resetBaseUrl + "?token=" + token);
        });
    }

    @Transactional
    public User applyReset(String token, String newPassword) {
        String hash = resetService.hash(token);
        PasswordResetToken t = tokens.findByTokenHash(hash).orElseThrow(ResetTokenInvalidException::new);
        OffsetDateTime now = OffsetDateTime.now(clock);
        if (!t.isValid(now)) throw new ResetTokenInvalidException();
        User u = users.findById(t.getUserId()).orElseThrow(ResetTokenInvalidException::new);
        u.setPasswordHash(encoder.encode(newPassword));
        t.markUsed(now);
        return u;
    }

    @Transactional
    public void changePassword(String userId, String currentPassword, String newPassword) {
        User u = users.findById(userId).orElseThrow(InvalidCredentialsException::new);
        if (!encoder.matches(currentPassword, u.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }
        u.setPasswordHash(encoder.encode(newPassword));
    }

    @Transactional
    public User updateMe(String userId, String name, String phone) {
        User u = users.findById(userId).orElseThrow(InvalidCredentialsException::new);
        if (name != null && !name.isBlank()) u.setName(name);
        if (phone != null && !phone.isBlank()) u.setPhone(phone);
        return u;
    }
}
