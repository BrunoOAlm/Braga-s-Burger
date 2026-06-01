package com.bragas.api.auth;

import com.bragas.api.auth.dto.*;
import com.bragas.api.auth.domain.User;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;
    private final CookieFactory cookies;

    public AuthController(AuthService authService, JwtService jwtService, CookieFactory cookies) {
        this.authService = authService;
        this.jwtService = jwtService;
        this.cookies = cookies;
    }

    @PostMapping("/signup")
    public ResponseEntity<MeResponse> signup(@RequestBody @Valid SignupRequest req) {
        User u = authService.signup(req);
        return ResponseEntity.status(201)
            .header(HttpHeaders.SET_COOKIE, cookies.session(jwtService.issue(u.getId())).toString())
            .body(MeResponse.from(u));
    }

    @PostMapping("/login")
    public ResponseEntity<Void> login(@RequestBody @Valid LoginRequest req) {
        User u = authService.login(req.email(), req.password());
        return ResponseEntity.noContent()
            .header(HttpHeaders.SET_COOKIE, cookies.session(jwtService.issue(u.getId())).toString())
            .build();
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent()
            .header(HttpHeaders.SET_COOKIE, cookies.expire().toString())
            .build();
    }

    @PostMapping("/forgot")
    public ResponseEntity<Void> forgot(@RequestBody @Valid ForgotRequest req) {
        authService.triggerReset(req.email());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reset")
    public ResponseEntity<Void> reset(@RequestBody @Valid ResetRequest req) {
        User u = authService.applyReset(req.token(), req.newPassword());
        return ResponseEntity.noContent()
            .header(HttpHeaders.SET_COOKIE, cookies.session(jwtService.issue(u.getId())).toString())
            .build();
    }
}
