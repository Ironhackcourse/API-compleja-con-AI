package com.empanadas.stock.model;

import java.math.BigDecimal;

public record ResumenVentas(Periodo hoy, Periodo ultimos7Dias, Periodo total) {

    public record Periodo(
            int unidades,
            BigDecimal ingresos,
            BigDecimal coste,
            BigDecimal ganancia
    ) {}
}