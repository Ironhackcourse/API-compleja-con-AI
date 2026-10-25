package com.empanadas.stock.controller;

import com.empanadas.stock.model.Ingrediente;
import com.empanadas.stock.service.IngredienteService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ingredientes")
public class IngredienteController {

    private final IngredienteService service;

    public IngredienteController(IngredienteService service) {
        this.service = service;
    }

    @GetMapping
    public List<Ingrediente> listar() {
        return service.listar();
    }

    @GetMapping("/{id}")
    public Ingrediente obtener(@PathVariable Long id) {
        return service.obtener(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)          // 201
    public Ingrediente crear(@Valid @RequestBody Ingrediente ingrediente) {
        return service.crear(ingrediente);
    }

    @PutMapping("/{id}")
    public Ingrediente actualizar(@PathVariable Long id,
                                  @Valid @RequestBody Ingrediente ingrediente) {
        return service.actualizar(id, ingrediente);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)       // 204
    public void borrar(@PathVariable Long id) {
        service.borrar(id);
    }
}