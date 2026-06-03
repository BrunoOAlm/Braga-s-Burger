package com.bragas.api.catalog.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "products")
public class Product {

    @Id
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String description = "";

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "price_from", nullable = false)
    private boolean priceFrom = false;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(nullable = false)
    private boolean featured = false;

    @Column(nullable = false)
    private boolean available = true;

    @Column(name = "display_order", nullable = false)
    private int displayOrder = 100;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected Product() {}

    public Product(String id, Category category, String name, BigDecimal price) {
        this.id = id;
        this.category = category;
        this.name = name;
        this.price = price;
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

    public String getId() { return id; }
    public Category getCategory() { return category; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public BigDecimal getPrice() { return price; }
    public boolean isPriceFrom() { return priceFrom; }
    public String getImageUrl() { return imageUrl; }
    public boolean isFeatured() { return featured; }
    public boolean isAvailable() { return available; }
    public int getDisplayOrder() { return displayOrder; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }

    public void setCategory(Category category) { this.category = category; }
    public void setName(String name) { this.name = name; }
    public void setDescription(String description) { this.description = description; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public void setPriceFrom(boolean priceFrom) { this.priceFrom = priceFrom; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public void setFeatured(boolean featured) { this.featured = featured; }
    public void setAvailable(boolean available) { this.available = available; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }
}
