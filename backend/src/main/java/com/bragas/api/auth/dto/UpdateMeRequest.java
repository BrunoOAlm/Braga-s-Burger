package com.bragas.api.auth.dto;

import jakarta.validation.constraints.Size;

public record UpdateMeRequest(
    @Size(min = 2, max = 120) String name,
    @Size(min = 8, max = 40) String phone
) {}
