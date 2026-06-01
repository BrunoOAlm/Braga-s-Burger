package com.bragas.api.auth;

import com.bragas.api.common.AppProperties;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class CookieFactory {

    public static final String SESSION_COOKIE = "bb_session";

    private final boolean secure;
    private final long ttlSeconds;

    public CookieFactory(AppProperties props) {
        this.secure = props.auth().cookieSecure();
        this.ttlSeconds = props.auth().jwtTtlSeconds();
    }

    public ResponseCookie session(String jwt) {
        return ResponseCookie.from(SESSION_COOKIE, jwt)
            .httpOnly(true)
            .secure(secure)
            .sameSite("Lax")
            .path("/")
            .maxAge(ttlSeconds)
            .build();
    }

    public ResponseCookie expire() {
        return ResponseCookie.from(SESSION_COOKIE, "")
            .httpOnly(true)
            .secure(secure)
            .sameSite("Lax")
            .path("/")
            .maxAge(0)
            .build();
    }
}
