package com.empanadas.stock.repository;

import com.empanadas.stock.model.Empanada;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmpanadaRepository extends JpaRepository<Empanada, Long> {
}