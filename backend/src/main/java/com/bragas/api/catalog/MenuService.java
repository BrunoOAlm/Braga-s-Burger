package com.bragas.api.catalog;

import com.bragas.api.catalog.domain.Category;
import com.bragas.api.catalog.domain.Product;
import com.bragas.api.catalog.dto.MenuResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class MenuService {

    private final CategoryRepository categoryRepo;
    private final ProductRepository productRepo;

    public MenuService(CategoryRepository categoryRepo, ProductRepository productRepo) {
        this.categoryRepo = categoryRepo;
        this.productRepo = productRepo;
    }

    @Transactional(readOnly = true)
    public MenuResponse buildMenu() {
        List<Category> categories = categoryRepo.findAllByOrderByDisplayOrderAsc();
        List<Product> availableProducts = productRepo.findAllAvailableOrdered();

        Map<String, List<Product>> byCategory = availableProducts.stream()
            .collect(Collectors.groupingBy(p -> p.getCategory().getId()));

        List<MenuResponse.CategoryWithProducts> out = categories.stream()
            .map(c -> new MenuResponse.CategoryWithProducts(
                c.getId(),
                c.getName(),
                c.getDisplayOrder(),
                c.getLayout(),
                byCategory.getOrDefault(c.getId(), List.of()).stream()
                    .map(p -> new MenuResponse.ProductOut(
                        p.getId(), p.getName(), p.getDescription(),
                        p.getPrice(), p.isPriceFrom(), p.getImageUrl(),
                        p.isFeatured(), p.isAvailable(), p.getDisplayOrder()))
                    .toList()
            ))
            .toList();

        return new MenuResponse(out);
    }
}
