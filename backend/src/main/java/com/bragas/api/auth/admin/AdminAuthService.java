package com.bragas.api.auth.admin;

import com.bragas.api.auth.InvalidCredentialsException;
import com.bragas.api.auth.admin.domain.AdminUser;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminAuthService {

    private final AdminUserRepository admins;
    private final PasswordEncoder encoder;

    public AdminAuthService(AdminUserRepository admins, PasswordEncoder encoder) {
        this.admins = admins;
        this.encoder = encoder;
    }

    @Transactional(readOnly = true)
    public AdminUser login(String email, String password) {
        String normalized = email.toLowerCase().trim();
        AdminUser a = admins.findByEmail(normalized).orElseThrow(InvalidCredentialsException::new);
        if (!encoder.matches(password, a.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }
        return a;
    }
}
