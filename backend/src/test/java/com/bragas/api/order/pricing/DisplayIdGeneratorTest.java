package com.bragas.api.order.pricing;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;
import java.util.function.Predicate;

import static org.assertj.core.api.Assertions.*;

class DisplayIdGeneratorTest {

    @Test
    void formatoHashtagComQuatroDigitos() {
        var gen = new DisplayIdGenerator(any -> false, () -> "#0042");
        var id = gen.next();
        assertThat(id).matches("^#\\d{4}$");
    }

    @Test
    void retryQuandoColide() {
        Set<String> taken = new HashSet<>(Set.of("#0001", "#0002"));
        Predicate<String> exists = taken::contains;

        var sequence = new java.util.ArrayDeque<>(java.util.List.of("#0001", "#0002", "#0003"));
        var gen = new DisplayIdGenerator(exists, sequence::poll);

        assertThat(gen.next()).isEqualTo("#0003");
    }

    @Test
    void falhaApos10Colisoes() {
        var gen = new DisplayIdGenerator(any -> true, () -> "#0000");
        assertThatThrownBy(gen::next)
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("colisão");
    }
}
