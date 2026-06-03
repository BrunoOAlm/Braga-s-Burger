package com.bragas.api.catalog.admin;

import com.bragas.api.catalog.CategoryRepository;
import com.bragas.api.catalog.ProductRepository;
import com.bragas.api.catalog.admin.dto.CategoryRequest;
import com.bragas.api.catalog.admin.dto.CategoryResponse;
import com.bragas.api.catalog.domain.Category;
import com.bragas.api.catalog.exception.CatalogAlreadyExistsException;
import com.bragas.api.catalog.exception.CategoryHasProductsException;
import com.bragas.api.catalog.exception.CategoryNotFoundException;
import com.bragas.api.common.DomainValidationException;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/categories")
public class AdminCategoryController {

    private static final Logger log = LoggerFactory.getLogger(AdminCategoryController.class);

    private final CategoryRepository categoryRepo;
    private final ProductRepository productRepo;

    public AdminCategoryController(CategoryRepository categoryRepo, ProductRepository productRepo) {
        this.categoryRepo = categoryRepo;
        this.productRepo = productRepo;
    }

    @GetMapping
    public List<CategoryResponse> list() {
        return categoryRepo.findAllByOrderByDisplayOrderAsc().stream()
            .map(CategoryResponse::from).toList();
    }

    @PostMapping
    @Transactional
    public ResponseEntity<CategoryResponse> create(@Valid @RequestBody CategoryRequest req) {
        if (categoryRepo.existsById(req.id())) throw new CatalogAlreadyExistsException("category-already-exists");
        var c = new Category(req.id(), req.name(),
            req.displayOrder() != null ? req.displayOrder() : 100,
            req.layout() != null ? req.layout() : "grid");
        categoryRepo.save(c);
        log.info("admin.action action=POST resource=category id={}", c.getId());
        return ResponseEntity.created(URI.create("/api/v1/admin/categories/" + c.getId()))
            .body(CategoryResponse.from(c));
    }

    @PatchMapping("/{id}")
    @Transactional
    public CategoryResponse update(@PathVariable String id, @RequestBody CategoryRequest req) {
        // CategoryRequest tem @NotBlank em id/name — não dá pra usar @Valid
        // aqui sem quebrar partial PATCH. Validamos os campos mutáveis
        // manualmente para devolver 400 estruturado em vez de cair no
        // CHECK constraint do DB (que vira 409 genérico).
        if (req.layout() != null && !req.layout().isBlank()
            && !"grid".equals(req.layout()) && !"list".equals(req.layout())) {
            throw new DomainValidationException("validation-failed", "Layout inválido",
                "layout deve ser 'grid' ou 'list'.");
        }
        if (req.name() != null && !req.name().isBlank() && req.name().length() > 120) {
            throw new DomainValidationException("validation-failed", "Nome muito longo",
                "name deve ter no máximo 120 caracteres.");
        }
        var c = categoryRepo.findById(id).orElseThrow(() -> new CategoryNotFoundException(id));
        if (req.name() != null && !req.name().isBlank()) c.setName(req.name());
        if (req.displayOrder() != null) c.setDisplayOrder(req.displayOrder());
        if (req.layout() != null && !req.layout().isBlank()) c.setLayout(req.layout());
        log.info("admin.action action=PATCH resource=category id={}", c.getId());
        return CategoryResponse.from(c);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable String id) {
        var c = categoryRepo.findById(id).orElseThrow(() -> new CategoryNotFoundException(id));
        if (!productRepo.findByCategoryIdOrdered(id).isEmpty()) {
            throw new CategoryHasProductsException();
        }
        categoryRepo.delete(c);
        log.info("admin.action action=DELETE resource=category id={}", id);
        return ResponseEntity.noContent().build();
    }
}
