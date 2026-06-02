package com.bragas.api.catalog.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "coupons")
public class Coupon {

    @Id
    private String code;

    @Column(nullable = false)
    private String type;  // 'percent' | 'fixed'

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal value;

    @Column(name = "min_subtotal", precision = 10, scale = 2)
    private BigDecimal minSubtotal;

    @Column(name = "valid_from")
    private OffsetDateTime validFrom;

    @Column(name = "valid_until")
    private OffsetDateTime validUntil;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected Coupon() {}

    public Coupon(String code, String type, BigDecimal value) {
        this.code = code;
        this.type = type;
        this.value = value;
    }

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }

    public String getCode() { return code; }
    public String getType() { return type; }
    public BigDecimal getValue() { return value; }
    public BigDecimal getMinSubtotal() { return minSubtotal; }
    public OffsetDateTime getValidFrom() { return validFrom; }
    public OffsetDateTime getValidUntil() { return validUntil; }
    public boolean isActive() { return active; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }

    public void setType(String type) { this.type = type; }
    public void setValue(BigDecimal value) { this.value = value; }
    public void setMinSubtotal(BigDecimal minSubtotal) { this.minSubtotal = minSubtotal; }
    public void setValidFrom(OffsetDateTime validFrom) { this.validFrom = validFrom; }
    public void setValidUntil(OffsetDateTime validUntil) { this.validUntil = validUntil; }
    public void setActive(boolean active) { this.active = active; }
}
