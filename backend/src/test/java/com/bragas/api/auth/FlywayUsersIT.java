package com.bragas.api.auth;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import javax.sql.DataSource;
import java.sql.ResultSet;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
class FlywayUsersIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired DataSource dataSource;

    @Test
    void users_table_exists_with_unique_email() throws Exception {
        try (var c = dataSource.getConnection(); var s = c.createStatement()) {
            ResultSet rs = s.executeQuery(
                "SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY column_name");
            var cols = new java.util.ArrayList<String>();
            while (rs.next()) cols.add(rs.getString(1));
            assertThat(cols).contains("id", "email", "password_hash", "name", "phone", "created_at", "updated_at");
        }
    }

    @Test
    void password_reset_tokens_table_exists() throws Exception {
        try (var c = dataSource.getConnection(); var s = c.createStatement()) {
            ResultSet rs = s.executeQuery(
                "SELECT column_name FROM information_schema.columns WHERE table_name='password_reset_tokens' ORDER BY column_name");
            var cols = new java.util.ArrayList<String>();
            while (rs.next()) cols.add(rs.getString(1));
            assertThat(cols).contains("id", "token_hash", "user_id", "expires_at", "used_at", "created_at");
        }
    }

    @Test
    void orders_has_user_id_column_nullable() throws Exception {
        try (var c = dataSource.getConnection(); var s = c.createStatement()) {
            ResultSet rs = s.executeQuery(
                "SELECT is_nullable FROM information_schema.columns " +
                "WHERE table_name='orders' AND column_name='user_id'");
            assertThat(rs.next()).isTrue();
            assertThat(rs.getString(1)).isEqualTo("YES");
        }
    }
}
