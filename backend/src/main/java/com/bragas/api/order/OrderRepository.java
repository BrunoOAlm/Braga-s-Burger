package com.bragas.api.order;

import com.bragas.api.order.domain.Order;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, String> {
    Optional<Order> findByDisplayId(String displayId);
    boolean existsByDisplayId(String displayId);
}
