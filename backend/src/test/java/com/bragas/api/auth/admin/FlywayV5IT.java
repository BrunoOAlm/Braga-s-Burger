package com.bragas.api.auth.admin;

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
import java.util.ArrayList;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
class FlywayV5IT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired DataSource dataSource;

    @Test
    void admin_users_table_exists_with_expected_columns() throws Exception {
        try (var c = dataSource.getConnection(); var s = c.createStatement()) {
            ResultSet rs = s.executeQuery(
                "SELECT column_name FROM information_schema.columns " +
                "WHERE table_name='admin_users' ORDER BY column_name");
            var cols = new ArrayList<String>();
            while (rs.next()) cols.add(rs.getString(1));
            assertThat(cols).contains("id", "email", "password_hash", "name", "created_at", "updated_at");
        }
    }

    @Test
    void admin_users_email_is_unique() throws Exception {
        try (var c = dataSource.getConnection(); var s = c.createStatement()) {
            ResultSet rs = s.executeQuery(
                "SELECT COUNT(*) FROM pg_indexes " +
                "WHERE tablename='admin_users' AND indexdef ILIKE '%UNIQUE%email%'");
            assertThat(rs.next()).isTrue();
            assertThat(rs.getInt(1)).isGreaterThanOrEqualTo(1);
        }
    }

    @Test
    void seed_inserted_one_admin_with_bootstrap_email() throws Exception {
        try (var c = dataSource.getConnection(); var s = c.createStatement()) {
            ResultSet rs = s.executeQuery(
                "SELECT id, email, name FROM admin_users WHERE email='admin@test.local'");
            assertThat(rs.next()).isTrue();
            assertThat(rs.getString("id")).isEqualTo("adm_test_0000000000000000");
            assertThat(rs.getString("name")).isEqualTo("Admin Test");
        }
    }
}
