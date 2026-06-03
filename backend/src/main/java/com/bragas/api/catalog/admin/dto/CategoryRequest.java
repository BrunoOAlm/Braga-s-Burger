package com.bragas.api.catalog.admin.dto;

import jakarta.validation.constraints.*;

public record CategoryRequest(
    @NotBlank @Pattern(regexp = "^[a-z0-9-]{1,40}$") String id,
    @NotBlank @Size(min = 1, max = 120) String name,
    Integer displayOrder,
    @Pattern(regexp = "^(grid|list)$") String layout
) {}
