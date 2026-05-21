package com.bragas.api.order.domain;

import jakarta.persistence.*;

import java.math.BigDecimal;

@Entity
@Table(name = "order_items")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(nullable = false)
    private int position;

    @Column(name = "product_id", nullable = false, length = 80)
    private String productId;

    @Column(name = "product_name", nullable = false, length = 200)
    private String productName;

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(nullable = false)
    private int quantity;

    @Column(columnDefinition = "TEXT")
    private String notes;

    protected OrderItem() {}

    public OrderItem(int position, String productId, String productName, BigDecimal unitPrice, int quantity, String notes) {
        this.position = position;
        this.productId = productId;
        this.productName = productName;
        this.unitPrice = unitPrice;
        this.quantity = quantity;
        this.notes = notes;
    }

    void setOrder(Order order) { this.order = order; }

    public int getPosition() { return position; }
    public String getProductId() { return productId; }
    public String getProductName() { return productName; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public int getQuantity() { return quantity; }
    public String getNotes() { return notes; }
}
