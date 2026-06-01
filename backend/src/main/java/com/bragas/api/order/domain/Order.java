package com.bragas.api.order.domain;

import com.bragas.api.auth.domain.User;
import com.github.f4b6a3.ulid.UlidCreator;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
public class Order {

    @Id
    @Column(length = 32)
    private String id;

    @Column(name = "display_id", length = 5, nullable = false, unique = true)
    private String displayId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderStatus status;

    @Column(name = "customer_name", nullable = false, length = 120)
    private String customerName;

    @Column(name = "customer_phone", nullable = false, length = 40)
    private String customerPhone;

    @Enumerated(EnumType.STRING)
    @Column(name = "fulfillment_type", nullable = false, length = 20)
    private FulfillmentType fulfillmentType;

    @Column(name = "address_cep", length = 10)          private String addressCep;
    @Column(name = "address_street", length = 200)      private String addressStreet;
    @Column(name = "address_number", length = 20)       private String addressNumber;
    @Column(name = "address_neighborhood", length = 120) private String addressNeighborhood;
    @Column(name = "address_complement", length = 200)  private String addressComplement;
    @Column(name = "address_reference", length = 200)   private String addressReference;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentMethod payment;

    @Column(name = "change_for", precision = 10, scale = 2)
    private BigDecimal changeFor;

    @Column(name = "coupon_code", length = 40)
    private String couponCode;

    @Column(name = "coupon_discount", precision = 10, scale = 2, nullable = false)
    private BigDecimal couponDiscount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "delivery_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal deliveryFee = BigDecimal.ZERO;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal total;

    @Column(name = "estimated_min", nullable = false) private int estimatedMin;
    @Column(name = "estimated_max", nullable = false) private int estimatedMax;

    @Column(name = "received_at",  nullable = false) private OffsetDateTime receivedAt;
    @Column(name = "preparing_at")                    private OffsetDateTime preparingAt;
    @Column(name = "out_at")                          private OffsetDateTime outAt;
    @Column(name = "delivered_at")                    private OffsetDateTime deliveredAt;
    @Column(name = "cancelled_at")                    private OffsetDateTime cancelledAt;

    @Column(name = "created_at", nullable = false, updatable = false) private OffsetDateTime createdAt;
    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false) private OffsetDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("position ASC")
    private List<OrderItem> items = new ArrayList<>();

    protected Order() {}

    public static Order create(String displayId, String customerName, String customerPhone,
                                FulfillmentType fulfillmentType, PaymentMethod payment,
                                OffsetDateTime now) {
        Order o = new Order();
        o.id = "ord_" + UlidCreator.getUlid();
        o.displayId = displayId;
        o.status = OrderStatus.RECEIVED;
        o.customerName = customerName;
        o.customerPhone = customerPhone;
        o.fulfillmentType = fulfillmentType;
        o.payment = payment;
        o.receivedAt = now;
        o.createdAt = now;
        return o;
    }

    public void applyTransition(OrderStatus to, OffsetDateTime when) {
        if (!OrderStatusTransition.isValid(this.status, to)) {
            throw new IllegalStateException("Transição inválida: " + status + " → " + to);
        }
        this.status = to;
        switch (to) {
            case PREPARING -> this.preparingAt = when;
            case OUT       -> this.outAt = when;
            case DELIVERED -> this.deliveredAt = when;
            case CANCELLED -> this.cancelledAt = when;
            default -> {}
        }
    }

    public void addItem(OrderItem item) {
        item.setOrder(this);
        items.add(item);
    }

    public String getId() { return id; }
    public String getDisplayId() { return displayId; }
    public OrderStatus getStatus() { return status; }
    public String getCustomerName() { return customerName; }
    public String getCustomerPhone() { return customerPhone; }
    public FulfillmentType getFulfillmentType() { return fulfillmentType; }
    public String getAddressCep() { return addressCep; }
    public String getAddressStreet() { return addressStreet; }
    public String getAddressNumber() { return addressNumber; }
    public String getAddressNeighborhood() { return addressNeighborhood; }
    public String getAddressComplement() { return addressComplement; }
    public String getAddressReference() { return addressReference; }
    public PaymentMethod getPayment() { return payment; }
    public BigDecimal getChangeFor() { return changeFor; }
    public String getCouponCode() { return couponCode; }
    public BigDecimal getCouponDiscount() { return couponDiscount; }
    public BigDecimal getSubtotal() { return subtotal; }
    public BigDecimal getDeliveryFee() { return deliveryFee; }
    public BigDecimal getTotal() { return total; }
    public int getEstimatedMin() { return estimatedMin; }
    public int getEstimatedMax() { return estimatedMax; }
    public OffsetDateTime getReceivedAt() { return receivedAt; }
    public OffsetDateTime getPreparingAt() { return preparingAt; }
    public OffsetDateTime getOutAt() { return outAt; }
    public OffsetDateTime getDeliveredAt() { return deliveredAt; }
    public OffsetDateTime getCancelledAt() { return cancelledAt; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public List<OrderItem> getItems() { return items; }
    public User getUser() { return user; }

    public void setAddress(String cep, String street, String number, String neighborhood, String complement, String reference) {
        this.addressCep = cep;
        this.addressStreet = street;
        this.addressNumber = number;
        this.addressNeighborhood = neighborhood;
        this.addressComplement = complement;
        this.addressReference = reference;
    }
    public void setChangeFor(BigDecimal changeFor) { this.changeFor = changeFor; }
    public void setCouponCode(String couponCode) { this.couponCode = couponCode; }
    public void setCouponDiscount(BigDecimal couponDiscount) { this.couponDiscount = couponDiscount; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
    public void setDeliveryFee(BigDecimal deliveryFee) { this.deliveryFee = deliveryFee; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public void setEstimatedMin(int estimatedMin) { this.estimatedMin = estimatedMin; }
    public void setEstimatedMax(int estimatedMax) { this.estimatedMax = estimatedMax; }
    public void setUser(User user) { this.user = user; }
}
