package com.bragas.api.auth.admin;

import com.bragas.api.auth.CookieFactory;
import com.bragas.api.auth.JwtService;
import com.bragas.api.auth.UnauthenticatedException;
import com.bragas.api.auth.admin.domain.AdminUser;
import com.bragas.api.auth.admin.dto.AdminLoginRequest;
import com.bragas.api.auth.admin.dto.AdminMeResponse;
import com.bragas.api.common.AppProperties;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth/admin")
public class AdminAuthController {

    private final AdminAuthService authService;
    private final JwtService jwtService;
    private final CookieFactory cookies;
    private final long adminTtlSeconds;

    public AdminAuthController(AdminAuthService authService, JwtService jwtService,
                               CookieFactory cookies, AppProperties props) {
        this.authService = authService;
        this.jwtService = jwtService;
        this.cookies = cookies;
        this.adminTtlSeconds = props.auth().adminCookieTtlSeconds();
    }

    @PostMapping("/login")
    public ResponseEntity<Void> login(@RequestBody @Valid AdminLoginRequest req) {
        AdminUser a = authService.login(req.email(), req.password());
        String jwt = jwtService.issue(a.getId(), adminTtlSeconds);
        return ResponseEntity.noContent()
            .header(HttpHeaders.SET_COOKIE, cookies.adminSession(jwt).toString())
            .build();
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent()
            .header(HttpHeaders.SET_COOKIE, cookies.adminExpire().toString())
            .build();
    }

    @GetMapping("/me")
    public AdminMeResponse me(@AuthenticationPrincipal AdminUser admin) {
        if (admin == null) throw new UnauthenticatedException();
        return AdminMeResponse.from(admin);
    }
}
