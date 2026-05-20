package com.bragas.api.order.pricing;

import com.bragas.api.order.OrderRepository;
import org.springframework.stereotype.Component;

import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Predicate;
import java.util.function.Supplier;

@Component
public class DisplayIdGenerator {

    private static final int MAX_ATTEMPTS = 10;

    private final Predicate<String> existsInRepository;
    private final Supplier<String> candidateSource;

    public DisplayIdGenerator(OrderRepository repo) {
        this(repo::existsByDisplayId, DisplayIdGenerator::randomCandidate);
    }

    // usado em testes
    DisplayIdGenerator(Predicate<String> existsInRepository, Supplier<String> candidateSource) {
        this.existsInRepository = existsInRepository;
        this.candidateSource = candidateSource;
    }

    public String next() {
        for (int i = 0; i < MAX_ATTEMPTS; i++) {
            String candidate = candidateSource.get();
            if (!existsInRepository.test(candidate)) return candidate;
        }
        throw new IllegalStateException("Não consegui gerar displayId sem colisão em " + MAX_ATTEMPTS + " tentativas");
    }

    private static String randomCandidate() {
        int n = ThreadLocalRandom.current().nextInt(0, 10_000);
        return String.format("#%04d", n);
    }
}
