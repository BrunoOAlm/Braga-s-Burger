package com.bragas.api.auth.admin;

import com.bragas.api.auth.admin.domain.AdminUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AdminUserRepository extends JpaRepository<AdminUser, String> {
    Optional<AdminUser> findByEmail(String email);
}
