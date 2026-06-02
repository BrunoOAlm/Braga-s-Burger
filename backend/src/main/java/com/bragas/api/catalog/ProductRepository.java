package com.bragas.api.catalog;

import com.bragas.api.catalog.domain.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, String> {

    @Query("SELECT p FROM Product p WHERE p.category.id = :categoryId ORDER BY p.displayOrder ASC")
    List<Product> findByCategoryIdOrdered(String categoryId);

    @Query("SELECT p FROM Product p WHERE p.available = true ORDER BY p.category.displayOrder, p.displayOrder")
    List<Product> findAllAvailableOrdered();

    Optional<Product> findByIdAndAvailableTrue(String id);
}
