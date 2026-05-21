package com.bragas.api.store;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class StoreStatusTest {

    private StoreStatus storeStatus(Map<String, OpeningHours> hours) {
        return new StoreStatus(hours);
    }

    private Map<String, OpeningHours> defaultHours() {
        var m = new HashMap<String, OpeningHours>();
        m.put("sun", new OpeningHours(LocalTime.of(18, 0), LocalTime.of(0, 0)));
        m.put("mon", null);
        m.put("tue", new OpeningHours(LocalTime.of(18, 0), LocalTime.of(23, 40)));
        m.put("wed", new OpeningHours(LocalTime.of(18, 0), LocalTime.of(23, 40)));
        m.put("thu", new OpeningHours(LocalTime.of(18, 0), LocalTime.of(23, 40)));
        m.put("fri", new OpeningHours(LocalTime.of(18, 0), LocalTime.of(0, 0)));
        m.put("sat", new OpeningHours(LocalTime.of(18, 0), LocalTime.of(0, 0)));
        return m;
    }

    @Test
    void closedOnMonday() {
        // 2026-05-18 é segunda
        assertThat(storeStatus(defaultHours()).isOpen(LocalDateTime.of(2026, 5, 18, 19, 0))).isFalse();
    }

    @Test
    void openOnTuesdayAt19h() {
        // 2026-05-19 é terça
        assertThat(storeStatus(defaultHours()).isOpen(LocalDateTime.of(2026, 5, 19, 19, 0))).isTrue();
    }

    @Test
    void closedTuesdayBefore18h() {
        assertThat(storeStatus(defaultHours()).isOpen(LocalDateTime.of(2026, 5, 19, 17, 59))).isFalse();
    }

    @Test
    void closedTuesdayAfter2340() {
        assertThat(storeStatus(defaultHours()).isOpen(LocalDateTime.of(2026, 5, 19, 23, 41))).isFalse();
    }

    @Test
    void openFridayAt23h() {
        // 2026-05-22 é sexta — fecha 00:00 (próximo dia)
        assertThat(storeStatus(defaultHours()).isOpen(LocalDateTime.of(2026, 5, 22, 23, 0))).isTrue();
    }

    @Test
    void closedSundayAt17h59() {
        assertThat(storeStatus(defaultHours()).isOpen(LocalDateTime.of(2026, 5, 17, 17, 59))).isFalse();
    }
}
