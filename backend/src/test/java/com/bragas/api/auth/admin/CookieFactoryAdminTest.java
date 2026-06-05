package com.bragas.api.auth.admin;

import com.bragas.api.auth.CookieFactory;
import com.bragas.api.common.AppProperties;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CookieFactoryAdminTest {

    private AppProperties props(boolean secure, String sameSite, long adminTtl) {
        return new AppProperties(
            new AppProperties.Admin(null),
            new AppProperties.Cors(List.of()),
            new AppProperties.Auth("secret-32-bytes-long-padding-padding!!", secure, sameSite, 604800, adminTtl, false),
            new AppProperties.Mail("from@test", "http://reset")
        );
    }

    @Test
    void admin_session_cookie_has_expected_attributes() {
        var factory = new CookieFactory(props(true, "None", 28800));
        var cookie = factory.adminSession("jwt-value");

        assertThat(cookie.getName()).isEqualTo("bb_admin");
        assertThat(cookie.getValue()).isEqualTo("jwt-value");
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.isSecure()).isTrue();
        assertThat(cookie.getSameSite()).isEqualTo("None");
        assertThat(cookie.getPath()).isEqualTo("/");
        assertThat(cookie.getMaxAge().getSeconds()).isEqualTo(28800);
    }

    @Test
    void admin_expire_cookie_has_max_age_zero() {
        var factory = new CookieFactory(props(false, "Lax", 28800));
        var cookie = factory.adminExpire();

        assertThat(cookie.getName()).isEqualTo("bb_admin");
        assertThat(cookie.getValue()).isEmpty();
        assertThat(cookie.getMaxAge().getSeconds()).isEqualTo(0);
        assertThat(cookie.getPath()).isEqualTo("/");
    }
}
