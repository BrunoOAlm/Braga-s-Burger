package com.bragas.api.auth.admin;

import com.bragas.api.auth.admin.domain.AdminUser;
import org.springframework.security.core.context.SecurityContextHolder;

public final class CurrentAdmin {

    private CurrentAdmin() {}

    public static String id() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return "unknown";
        Object principal = auth.getPrincipal();
        if (principal instanceof AdminUser a) return a.getId();
        return "unknown";
    }
}
