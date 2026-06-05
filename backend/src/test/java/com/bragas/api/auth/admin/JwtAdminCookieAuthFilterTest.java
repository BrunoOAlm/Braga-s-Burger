package com.bragas.api.auth.admin;

import com.bragas.api.auth.JwtService;
import com.bragas.api.auth.admin.domain.AdminUser;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class JwtAdminCookieAuthFilterTest {

    private static final String SECRET = "test-secret-with-at-least-32-bytes-of-padding-yay-yay-yay";

    private final JwtService jwt = new JwtService(SECRET, 28800, Clock.systemUTC());
    private final AdminUserRepository repo = mock(AdminUserRepository.class);
    private final JwtAdminCookieAuthFilter filter = new JwtAdminCookieAuthFilter(jwt, repo);

    @AfterEach
    void clear() { SecurityContextHolder.clearContext(); }

    @Test
    void valid_admin_cookie_populates_role_admin() throws Exception {
        AdminUser a = AdminUser.create("a@x", "hash", "A", OffsetDateTime.now());
        when(repo.findById(a.getId())).thenReturn(Optional.of(a));
        String token = jwt.issue(a.getId(), 28800);
        var req = new MockHttpServletRequest("GET", "/api/v1/admin/products");
        req.setCookies(new Cookie("bb_admin", token));
        var res = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(req, res, chain);

        var auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        assertThat(auth.getPrincipal()).isInstanceOf(AdminUser.class);
        assertThat(auth.getAuthorities()).anyMatch(g -> g.getAuthority().equals("ROLE_ADMIN"));
        verify(chain).doFilter(any(), any());
    }

    @Test
    void cookie_with_usr_prefix_in_sub_does_not_authenticate_as_admin() throws Exception {
        String token = jwt.issue("usr_some_user_id", 28800);
        var req = new MockHttpServletRequest("GET", "/api/v1/admin/products");
        req.setCookies(new Cookie("bb_admin", token));
        var res = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(req, res, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(chain).doFilter(any(), any());
    }

    @Test
    void missing_cookie_passes_chain_as_anonymous() throws Exception {
        var req = new MockHttpServletRequest("GET", "/api/v1/admin/products");
        var res = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(req, res, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(chain).doFilter(any(), any());
    }

    @Test
    void invalid_jwt_passes_chain_as_anonymous() throws Exception {
        var req = new MockHttpServletRequest("GET", "/api/v1/admin/products");
        req.setCookies(new Cookie("bb_admin", "not-a-jwt"));
        var res = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(req, res, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(chain).doFilter(any(), any());
    }

    @Test
    void deleted_admin_passes_chain_as_anonymous() throws Exception {
        when(repo.findById("adm_orphan")).thenReturn(Optional.empty());
        String token = jwt.issue("adm_orphan", 28800);
        var req = new MockHttpServletRequest("GET", "/api/v1/admin/products");
        req.setCookies(new Cookie("bb_admin", token));
        var res = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(req, res, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(chain).doFilter(any(), any());
    }
}
