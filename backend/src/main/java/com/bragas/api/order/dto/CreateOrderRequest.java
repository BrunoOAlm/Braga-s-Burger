package com.bragas.api.order.dto;

import com.bragas.api.order.domain.FulfillmentType;
import com.bragas.api.order.domain.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.List;

public record CreateOrderRequest(
    @NotNull @Valid Customer customer,
    @NotNull FulfillmentType fulfillmentType,
    @Valid Address address,
    @NotNull PaymentMethod payment,
    @DecimalMin("0.00") BigDecimal changeFor,
    @NotEmpty @Valid List<Item> items,
    @Size(max = 40) String couponCode
) {
    public record Customer(
        @NotBlank @Size(min = 2, max = 120) String name,
        @NotBlank @Size(min = 8, max = 40)  String phone
    ) {}

    public record Address(
        @Size(max = 10)  String cep,
        @NotBlank @Size(max = 200) String street,
        @NotBlank @Size(max = 20)  String number,
        @NotBlank @Size(max = 120) String neighborhood,
        @Size(max = 200) String complement,
        @Size(max = 200) String reference
    ) {}

    public record Item(
        @NotBlank String productId,
        @Min(1)   int quantity,
        @Size(max = 200) String notes
    ) {}
}
