package com.bragas.api.store;

import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Map;

@Component
public class StoreStatus {

    private static final String[] DAY_KEYS = { "mon", "tue", "wed", "thu", "fri", "sat", "sun" };

    private final Map<String, OpeningHours> hours;

    public StoreStatus(StoreProperties props) {
        this(props.openingHours());
    }

    // construtor secundário usado em testes
    public StoreStatus(Map<String, OpeningHours> hours) {
        this.hours = hours;
    }

    public boolean isOpen(LocalDateTime now) {
        OpeningHours today = hours.get(keyFor(now.getDayOfWeek()));
        if (today == null) return false;

        LocalTime t = now.toLocalTime();
        LocalTime open  = today.open();
        LocalTime close = today.close();

        // fecha 00:00 = vira pra dia seguinte → aberto até o fim do dia
        if (close.equals(LocalTime.MIDNIGHT)) {
            return !t.isBefore(open);
        }
        return !t.isBefore(open) && t.isBefore(close);
    }

    private static String keyFor(DayOfWeek d) {
        return DAY_KEYS[d.getValue() - 1];
    }
}
