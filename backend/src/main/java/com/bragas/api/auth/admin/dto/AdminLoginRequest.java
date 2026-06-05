package com.bragas.api.auth.admin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminLoginRequest(
    @Email @NotBlank @Size(max = 200) String email,
    @NotBlank @Size(min = 8, max = 100) String password
) {}
