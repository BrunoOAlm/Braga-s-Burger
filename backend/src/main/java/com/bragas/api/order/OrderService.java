package com.bragas.api.order;

import com.bragas.api.catalog.CouponCatalog;
import com.bragas.api.catalog.DeliveryAreaCatalog;
import com.bragas.api.catalog.ProductCatalog;
import com.bragas.api.catalog.domain.Coupon;
import com.bragas.api.common.DomainValidationException;
import com.bragas.api.common.InvalidStatusTransitionException;
import com.bragas.api.common.OrderNotFoundException;
import com.bragas.api.order.domain.*;
import com.bragas.api.order.dto.CreateOrderRequest;
import com.bragas.api.order.pricing.DisplayIdGenerator;
import com.bragas.api.order.pricing.OrderEstimateCalculator;
import com.bragas.api.order.pricing.OrderPricingCalculator;
import com.bragas.api.store.StoreProperties;
import com.bragas.api.store.StoreStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class OrderService {

    private final OrderRepository repo;
    private final ProductCatalog products;
    private final CouponCatalog coupons;
    private final DeliveryAreaCatalog areas;
    private final StoreStatus storeStatus;
    private final StoreProperties storeProps;
    private final OrderPricingCalculator pricing;
    private final OrderEstimateCalculator estimator;
    private final DisplayIdGenerator displayIds;
    private final Clock clock;

    public OrderService(OrderRepository repo, ProductCatalog products, CouponCatalog coupons,
                        DeliveryAreaCatalog areas, StoreStatus storeStatus, StoreProperties storeProps,
                        OrderPricingCalculator pricing, OrderEstimateCalculator estimator,
                        DisplayIdGenerator displayIds, Clock clock) {
        this.repo = repo;
        this.products = products;
        this.coupons = coupons;
        this.areas = areas;
        this.storeStatus = storeStatus;
        this.storeProps = storeProps;
        this.pricing = pricing;
        this.estimator = estimator;
        this.displayIds = displayIds;
        this.clock = clock;
    }

    @Transactional
    public Order create(CreateOrderRequest req, com.bragas.api.auth.domain.User user) {
        OffsetDateTime now = OffsetDateTime.now(clock);

        // 1. Loja aberta?
        if (!storeStatus.isOpen(LocalDateTime.now(clock))) {
            throw new DomainValidationException("store-closed", "Loja fechada", "A loja está fechada agora.");
        }

        // 2. Produtos existem e estão disponíveis
        List<String> productIds = req.items().stream().map(CreateOrderRequest.Item::productId).toList();
        products.requireAll(productIds);

        // 3. Endereço/bairro
        Optional<BigDecimal> fee = Optional.empty();
        if (req.fulfillmentType() == FulfillmentType.DELIVERY) {
            if (req.address() == null) {
                throw new DomainValidationException("address-required", "Endereço obrigatório",
                    "Entrega exige endereço.");
            }
            fee = areas.findFee(req.address().neighborhood());
            if (fee.isEmpty()) {
                throw new DomainValidationException("delivery-area-not-served", "Bairro não atendido",
                    "Não entregamos em " + req.address().neighborhood());
            }
        }

        // 4. Cupom
        Optional<Coupon> coupon = Optional.ofNullable(req.couponCode()).flatMap(coupons::find);
        if (req.couponCode() != null && coupon.isEmpty()) {
            throw new DomainValidationException("coupon-invalid", "Cupom inválido",
                "Cupom " + req.couponCode() + " não existe.");
        }

        // 5. Cálculo
        List<OrderPricingCalculator.Line> lines = req.items().stream()
            .map(i -> new OrderPricingCalculator.Line(
                products.findById(i.productId()).orElseThrow(), i.quantity()))
            .toList();
        var totals = pricing.compute(lines, coupon, fee);

        // 6. minSubtotal do cupom
        if (coupon.isPresent() && coupon.get().minSubtotal() != null
            && totals.subtotal().compareTo(coupon.get().minSubtotal()) < 0) {
            throw new DomainValidationException("coupon-min-not-met", "Cupom requer mínimo",
                "Cupom " + coupon.get().code() + " exige subtotal mínimo de " + coupon.get().minSubtotal());
        }

        // 7. Pedido mínimo
        if (totals.subtotal().compareTo(storeProps.minOrder()) < 0) {
            throw new DomainValidationException("order-min-not-met", "Pedido abaixo do mínimo",
                "Subtotal " + totals.subtotal() + " < mínimo " + storeProps.minOrder());
        }

        // 8. Troco suficiente
        if (req.payment() == PaymentMethod.CASH && req.changeFor() != null
            && req.changeFor().compareTo(totals.total()) < 0) {
            throw new DomainValidationException("change-insufficient", "Troco insuficiente",
                "Troco " + req.changeFor() + " < total " + totals.total());
        }

        // 9. Estimativa
        var range = estimator.compute(req.fulfillmentType(), storeProps.averagePrepTime(), fee);

        // 10. Cria entidade
        String displayId = displayIds.next();
        Order order = Order.create(displayId, req.customer().name(), req.customer().phone(),
            req.fulfillmentType(), req.payment(), now);

        if (req.fulfillmentType() == FulfillmentType.DELIVERY) {
            var a = req.address();
            order.setAddress(a.cep(), a.street(), a.number(), a.neighborhood(), a.complement(), a.reference());
        }
        if (req.payment() == PaymentMethod.CASH) order.setChangeFor(req.changeFor());

        order.setCouponCode(coupon.map(Coupon::code).orElse(null));
        order.setCouponDiscount(totals.discount());
        order.setSubtotal(totals.subtotal());
        order.setDeliveryFee(totals.deliveryFee());
        order.setTotal(totals.total());
        order.setEstimatedMin(range.min());
        order.setEstimatedMax(range.max());

        int pos = 0;
        for (var i : req.items()) {
            var product = products.findById(i.productId()).orElseThrow();
            order.addItem(new OrderItem(pos++, product.id(), product.name(), product.price(), i.quantity(), i.notes()));
        }

        order.setUser(user);
        return repo.save(order);
    }

    @Transactional(readOnly = true)
    public Order findById(String id) {
        return repo.findById(id).orElseThrow(() -> new OrderNotFoundException(id));
    }

    @Transactional(readOnly = true)
    public Order findByDisplayId(String displayId) {
        return repo.findByDisplayId(displayId).orElseThrow(() -> new OrderNotFoundException(displayId));
    }

    @Transactional
    public Order transitionStatus(String id, OrderStatus to) {
        Order order = repo.findById(id).orElseThrow(() -> new OrderNotFoundException(id));
        if (!OrderStatusTransition.isValid(order.getStatus(), to)) {
            throw new InvalidStatusTransitionException(order.getStatus(), to);
        }
        order.applyTransition(to, OffsetDateTime.now(clock));
        return repo.save(order);
    }
}
