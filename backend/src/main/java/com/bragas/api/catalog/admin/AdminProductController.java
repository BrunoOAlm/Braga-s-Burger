package com.bragas.api.catalog.admin;

import com.bragas.api.catalog.CategoryRepository;
import com.bragas.api.catalog.ProductRepository;
import com.bragas.api.catalog.admin.dto.ProductRequest;
import com.bragas.api.catalog.admin.dto.ProductResponse;
import com.bragas.api.catalog.domain.Product;
import com.bragas.api.catalog.exception.CatalogAlreadyExistsException;
import com.bragas.api.catalog.exception.CategoryNotFoundException;
import com.bragas.api.catalog.exception.ProductHasOrdersException;
import com.bragas.api.catalog.exception.ProductNotFoundException;
import com.bragas.api.common.DomainValidationException;
import com.bragas.api.order.OrderRepository;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/products")
public class AdminProductController {

    private static final Logger log = LoggerFactory.getLogger(AdminProductController.class);

    private final ProductRepository productRepo;
    private final CategoryRepository categoryRepo;
    private final OrderRepository orderRepo;

    public AdminProductController(ProductRepository productRepo, CategoryRepository categoryRepo, OrderRepository orderRepo) {
        this.productRepo = productRepo;
        this.categoryRepo = categoryRepo;
        this.orderRepo = orderRepo;
    }

    @GetMapping
    public List<ProductResponse> list(@RequestParam(required = false) String categoryId) {
        List<Product> products = categoryId != null
            ? productRepo.findByCategoryIdOrdered(categoryId)
            : productRepo.findAll();
        return products.stream().map(ProductResponse::from).toList();
    }

    @PostMapping
    @Transactional
    public ResponseEntity<ProductResponse> create(@Valid @RequestBody ProductRequest req) {
        if (req.id() == null || req.categoryId() == null || req.name() == null || req.price() == null) {
            throw new DomainValidationException("validation-failed", "Campos obrigatórios",
                "POST exige id, categoryId, name e price.");
        }
        if (productRepo.existsById(req.id())) throw new CatalogAlreadyExistsException("product-already-exists");
        var category = categoryRepo.findById(req.categoryId())
            .orElseThrow(() -> new CategoryNotFoundException(req.categoryId()));
        var p = new Product(req.id(), category, req.name(), req.price());
        if (req.description() != null) p.setDescription(req.description());
        if (req.priceFrom() != null) p.setPriceFrom(req.priceFrom());
        if (req.imageUrl() != null) p.setImageUrl(req.imageUrl());
        if (req.featured() != null) p.setFeatured(req.featured());
        if (req.available() != null) p.setAvailable(req.available());
        if (req.displayOrder() != null) p.setDisplayOrder(req.displayOrder());
        productRepo.save(p);
        log.info("admin.action action=POST resource=product id={}", p.getId());
        return ResponseEntity.created(URI.create("/api/v1/admin/products/" + p.getId()))
            .body(ProductResponse.from(p));
    }

    @PatchMapping("/{id}")
    @Transactional
    public ProductResponse update(@PathVariable String id, @Valid @RequestBody ProductRequest req) {
        var p = productRepo.findById(id).orElseThrow(() -> new ProductNotFoundException(id));
        if (req.categoryId() != null) {
            var category = categoryRepo.findById(req.categoryId())
                .orElseThrow(() -> new CategoryNotFoundException(req.categoryId()));
            p.setCategory(category);
        }
        if (req.name() != null && !req.name().isBlank()) p.setName(req.name());
        if (req.description() != null) p.setDescription(req.description());
        if (req.price() != null) p.setPrice(req.price());
        if (req.priceFrom() != null) p.setPriceFrom(req.priceFrom());
        if (req.imageUrl() != null) p.setImageUrl(req.imageUrl());
        if (req.featured() != null) p.setFeatured(req.featured());
        if (req.available() != null) p.setAvailable(req.available());
        if (req.displayOrder() != null) p.setDisplayOrder(req.displayOrder());
        log.info("admin.action action=PATCH resource=product id={}", p.getId());
        return ProductResponse.from(p);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable String id) {
        var p = productRepo.findById(id).orElseThrow(() -> new ProductNotFoundException(id));
        if (orderRepo.existsOrderItemByProductId(id)) {
            throw new ProductHasOrdersException();
        }
        productRepo.delete(p);
        log.info("admin.action action=DELETE resource=product id={}", id);
        return ResponseEntity.noContent().build();
    }
}
