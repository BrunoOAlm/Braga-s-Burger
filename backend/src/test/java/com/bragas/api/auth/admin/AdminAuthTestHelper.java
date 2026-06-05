package com.bragas.api.auth.admin;

import jakarta.servlet.http.Cookie;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

public final class AdminAuthTestHelper {

    public static final String TEST_EMAIL = "admin@test.local";
    public static final String TEST_PASSWORD = "admin-test-pwd";

    private AdminAuthTestHelper() {}

    public static Cookie loginAndGetCookie(MockMvc mvc) throws Exception {
        String body = "{\"email\":\"" + TEST_EMAIL + "\",\"password\":\"" + TEST_PASSWORD + "\"}";
        MvcResult r = mvc.perform(post("/api/v1/auth/admin/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andReturn();
        String setCookie = r.getResponse().getHeader("Set-Cookie");
        if (setCookie == null) {
            throw new IllegalStateException("Login admin nao retornou Set-Cookie. Status: "
                + r.getResponse().getStatus() + " Body: " + r.getResponse().getContentAsString());
        }
        String value = setCookie.split(";")[0].split("=", 2)[1];
        return new Cookie("bb_admin", value);
    }
}
