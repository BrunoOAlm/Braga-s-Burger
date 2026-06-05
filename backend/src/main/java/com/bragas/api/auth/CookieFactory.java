package com.bragas.api.auth;

import com.bragas.api.common.AppProperties;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class CookieFactory {

    public static final String SESSION_COOKIE = "bb_session";
    public static final String ADMIN_COOKIE   = "bb_admin";

    private final boolean secure;
    private final String sameSite;
    private final long ttlSeconds;
    private final long adminTtlSeconds;

    public CookieFactory(AppProperties props) {
        this.secure = props.auth().cookieSecure();
        String configured = props.auth().cookieSameSite();
        this.sameSite = configured == null || configured.isBlank() ? "Lax" : configured;
        this.ttlSeconds = props.auth().jwtTtlSeconds();
        this.adminTtlSeconds = props.auth().adminCookieTtlSeconds();
    }

    public ResponseCookie session(String jwt) {
        return build(SESSION_COOKIE, jwt, ttlSeconds);
    }

    public ResponseCookie expire() {
        return build(SESSION_COOKIE, "", 0);
    }

    public ResponseCookie adminSession(String jwt) {
        return build(ADMIN_COOKIE, jwt, adminTtlSeconds);
    }

    public ResponseCookie adminExpire() {
        return build(ADMIN_COOKIE, "", 0);
    }

    private ResponseCookie build(String name, String value, long maxAge) {
        return ResponseCookie.from(name, value)
            .httpOnly(true)
            .secure(secure)
            .sameSite(sameSite)
            .path("/")
            .maxAge(maxAge)
            .build();
    }
}
