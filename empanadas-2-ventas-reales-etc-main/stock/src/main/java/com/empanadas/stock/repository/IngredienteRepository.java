package com.empanadas.stock.repository;

import com.empanadas.stock.model.Ingrediente;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IngredienteRepository extends JpaRepository<Ingrediente, Long> {

    // Para crear: ¿existe ya uno con ese nombre?
    boolean existsByNombreIgnoreCase(String nombre);

    // Para editar: ¿existe OTRO (distinto id) con ese nombre?
    boolean existsByNombreIgnoreCaseAndIdNot(String nombre, Long id);
}