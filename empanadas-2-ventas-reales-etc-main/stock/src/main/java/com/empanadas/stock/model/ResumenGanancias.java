package com.empanadas.stock.model;

import java.math.BigDecimal;

public record ResumenGanancias(
        int tiposDeEmpanada,
        int unidadesEnStock,
        BigDecimal costeStock,
        BigDecimal ventaPotencial,
        BigDecimal gananciaPotencial,
        BigDecimal margenPorcentaje
) {}