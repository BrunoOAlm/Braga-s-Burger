package com.bragas.api.auth;

import com.bragas.api.common.AppProperties;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class CookieFactory {

    public static final String SESSION_COOKIE = "bb_session";

    private final boolean secure;
    private final String sameSite;
    private final long ttlSeconds;

    public CookieFactory(AppProperties props) {
        this.secure = props.auth().cookieSecure();
        String configured = props.auth().cookieSameSite();
        this.sameSite = configured == null || configured.isBlank() ? "Lax" : configured;
        this.ttlSeconds = props.auth().jwtTtlSeconds();
    }

    public ResponseCookie session(String jwt) {
        return ResponseCookie.from(SESSION_COOKIE, jwt)
            .httpOnly(true)
            .secure(secure)
            .sameSite(sameSite)
            .path("/")
            .maxAge(ttlSeconds)
            .build();
    }

    public ResponseCookie expire() {
        return ResponseCookie.from(SESSION_COOKIE, "")
            .httpOnly(true)
            .secure(secure)
            .sameSite(sameSite)
            .path("/")
            .maxAge(0)
            .build();
    }
}
