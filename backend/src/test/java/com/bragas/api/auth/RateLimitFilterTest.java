package com.bragas.api.auth;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class RateLimitFilterTest {

    @Test
    void allows_up_to_limit_then_blocks() throws Exception {
        var filter = new RateLimitFilter(true);
        var chain = mock(FilterChain.class);

        for (int i = 0; i < 5; i++) {
            var req = login(); var res = new MockHttpServletResponse();
            filter.doFilter(req, res, chain);
        }
        verify(chain, org.mockito.Mockito.times(5)).doFilter(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());

        var req = login(); var res = new MockHttpServletResponse();
        filter.doFilter(req, res, chain);
        assertThat(res.getStatus()).isEqualTo(429);
        assertThat(res.getContentType()).startsWith("application/problem+json");
        assertThat(res.getContentAsString()).contains("too-many-requests");
        assertThat(res.getHeader("Retry-After")).isNotNull();
        // chain NÃO foi chamado na 6ª tentativa
        verify(chain, org.mockito.Mockito.times(5)).doFilter(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void different_ips_have_independent_buckets() throws Exception {
        var filter = new RateLimitFilter(true);
        var chain = mock(FilterChain.class);

        for (int i = 0; i < 5; i++) {
            var req = login(); req.setRemoteAddr("1.1.1.1");
            filter.doFilter(req, new MockHttpServletResponse(), chain);
        }
        var other = login(); other.setRemoteAddr("2.2.2.2");
        filter.doFilter(other, new MockHttpServletResponse(), chain);
        verify(chain, org.mockito.Mockito.times(6)).doFilter(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void non_auth_routes_pass_unchanged() throws Exception {
        var filter = new RateLimitFilter(true);
        var chain = mock(FilterChain.class);
        var req = new MockHttpServletRequest("POST", "/api/v1/orders");
        for (int i = 0; i < 50; i++) {
            filter.doFilter(req, new MockHttpServletResponse(), chain);
        }
        verify(chain, org.mockito.Mockito.times(50)).doFilter(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void coupon_validate_rate_limit_60_per_min() throws Exception {
        var filter = new RateLimitFilter(true);
        var chain = mock(FilterChain.class);
        for (int i = 0; i < 60; i++) {
            var req = new MockHttpServletRequest("POST", "/api/v1/coupons/validate");
            req.setRemoteAddr("3.3.3.3");
            filter.doFilter(req, new MockHttpServletResponse(), chain);
        }
        var req = new MockHttpServletRequest("POST", "/api/v1/coupons/validate");
        req.setRemoteAddr("3.3.3.3");
        var res = new MockHttpServletResponse();
        filter.doFilter(req, res, chain);
        assertThat(res.getStatus()).isEqualTo(429);
    }

    @Test
    void admin_routes_rate_limit_30_per_min() throws Exception {
        var filter = new RateLimitFilter(true);
        var chain = mock(FilterChain.class);
        for (int i = 0; i < 30; i++) {
            var req = new MockHttpServletRequest("POST", "/api/v1/admin/products");
            req.setRemoteAddr("4.4.4.4");
            filter.doFilter(req, new MockHttpServletResponse(), chain);
        }
        var req = new MockHttpServletRequest("POST", "/api/v1/admin/products");
        req.setRemoteAddr("4.4.4.4");
        var res = new MockHttpServletResponse();
        filter.doFilter(req, res, chain);
        assertThat(res.getStatus()).isEqualTo(429);
    }

    private MockHttpServletRequest login() {
        var r = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        r.setRemoteAddr("9.9.9.9");
        return r;
    }
}
