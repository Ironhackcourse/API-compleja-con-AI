package com.empanadas.stock.repository;

import com.empanadas.stock.model.Venta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface VentaRepository extends JpaRepository<Venta, Long> {

    List<Venta> findTop30ByOrderByFechaDesc();

    List<Venta> findByFechaGreaterThanEqual(LocalDateTime desde);
}