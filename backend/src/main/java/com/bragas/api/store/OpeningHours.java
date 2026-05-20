package com.bragas.api.store;

import java.time.LocalTime;

public record OpeningHours(LocalTime open, LocalTime close) {}
