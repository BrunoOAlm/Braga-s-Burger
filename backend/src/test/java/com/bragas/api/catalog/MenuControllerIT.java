package com.bragas.api.catalog;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class MenuControllerIT {

    @Container @SuppressWarnings("resource")
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withDatabaseName("bragas").withUsername("bragas").withPassword("bragas");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url",      postgres::getJdbcUrl);
        r.add("spring.datasource.username", postgres::getUsername);
        r.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired MockMvc mvc;

    @Test
    void get_menu_returns_categories_with_products() throws Exception {
        mvc.perform(get("/api/v1/menu"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.categories").isArray())
            .andExpect(jsonPath("$.categories[0].id").value("burgers"))
            .andExpect(jsonPath("$.categories[0].products").isArray())
            .andExpect(jsonPath("$.categories[0].products[0].id").exists());
    }

    @Test
    void get_menu_ordering_by_display_order() throws Exception {
        mvc.perform(get("/api/v1/menu"))
            .andExpect(status().isOk())
            // burgers tem display_order=10 no seed (categoria #1).
            .andExpect(jsonPath("$.categories[0].displayOrder").value(10));
    }

    @Test
    void get_menu_bebidas_e_molhos_em_grid_com_fotos() throws Exception {
        mvc.perform(get("/api/v1/menu"))
            .andExpect(status().isOk())
            // V7: bebidas e molhos viram cards (grid) com foto.
            .andExpect(jsonPath("$.categories[?(@.id=='bebidas')].layout").value("grid"))
            .andExpect(jsonPath("$.categories[?(@.id=='molhos')].layout").value("grid"))
            .andExpect(jsonPath(
                "$.categories[?(@.id=='bebidas')].products[?(@.id=='coca-cola-lata')].imageUrl")
                .value("/images/products/coca-cola-lata.webp"))
            // sem foto ainda: image_url continua NULL (placeholder no front).
            .andExpect(jsonPath(
                "$.categories[?(@.id=='bebidas')].products[?(@.id=='coca-cola-zero-600ml')].imageUrl")
                .value(org.hamcrest.Matchers.contains((Object) null)));
    }
}
