package com.bragas.api.order;

import com.bragas.api.order.domain.Order;
import com.bragas.api.order.domain.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.Set;

public interface OrderRepository extends JpaRepository<Order, String> {
    Optional<Order> findByDisplayId(String displayId);
    boolean existsByDisplayId(String displayId);
    Page<Order> findByUserId(String userId, Pageable pageable);

    @Query(value = "SELECT EXISTS(SELECT 1 FROM order_items WHERE product_id = :productId)", nativeQuery = true)
    boolean existsOrderItemByProductId(@Param("productId") String productId);

    Page<Order> findByStatusInOrderByCreatedAtDesc(Set<OrderStatus> statuses, Pageable pageable);
}
