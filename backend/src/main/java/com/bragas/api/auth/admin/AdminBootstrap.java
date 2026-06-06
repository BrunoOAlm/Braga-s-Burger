package com.bragas.api.auth.admin;

import com.bragas.api.auth.admin.domain.AdminUser;
import com.bragas.api.common.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.regex.Pattern;

@Component
public class AdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);
    // bcrypt: $2[aby]$<cost 2 digitos>$<53 chars base64-like> = 60 chars total
    private static final Pattern BCRYPT = Pattern.compile("^\\$2[aby]\\$\\d{2}\\$[./A-Za-z0-9]{53}$");

    private final AdminUserRepository repo;
    private final PasswordEncoder encoder;
    private final AppProperties.AdminBootstrap props;
    private final Clock clock;

    public AdminBootstrap(AdminUserRepository repo, PasswordEncoder encoder,
                          AppProperties appProps, Clock clock) {
        this.repo = repo;
        this.encoder = encoder;
        this.props = appProps.adminBootstrap();
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        validateAllExistingAdminHashesOrFail();

        String email = props.email();
        String password = props.password();
        if (isBlank(email) || isBlank(password)) {
            log.warn("app.admin-bootstrap parcialmente configurado (email={}, password={}); skip.",
                isBlank(email) ? "MISSING" : "set",
                isBlank(password) ? "MISSING" : "set");
            return;
        }

        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            log.warn("ADMIN_BOOTSTRAP_PASSWORD > 72 bytes (limite bcrypt); skip. Reduza a senha e reinicie.");
            return;
        }

        String normalized = email.toLowerCase().trim();
        if (repo.findByEmail(normalized).isPresent()) {
            log.info("Admin {} ja existe; bootstrap skip.", normalized);
            return;
        }

        String hash = encoder.encode(password);
        AdminUser admin = AdminUser.create(normalized, hash, props.name(), OffsetDateTime.now(clock));
        try {
            repo.save(admin);
            log.info("Admin bootstrap: criado {} id={}", normalized, admin.getId());
        } catch (DataIntegrityViolationException e) {
            log.info("Admin bootstrap: corrida concorrente perdida (admin {} criado por outra instancia); skip.",
                normalized);
        }
    }

    private void validateAllExistingAdminHashesOrFail() {
        for (AdminUser a : repo.findAll()) {
            if (!BCRYPT.matcher(a.getPasswordHash()).matches()) {
                throw new IllegalStateException(
                    "Admin com hash invalido detectado no startup: id=" + a.getId() +
                    " email=" + a.getEmail() +
                    ". Hash deve ser bcrypt ($2[aby]$nn$<53 chars>, 60 chars total). " +
                    "Restore: ./gradlew bcryptHash -Ppassword=NOVA_SENHA -> " +
                    "UPDATE admin_users SET password_hash='<hash>' WHERE id='" + a.getId() + "'."
                );
            }
        }
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
