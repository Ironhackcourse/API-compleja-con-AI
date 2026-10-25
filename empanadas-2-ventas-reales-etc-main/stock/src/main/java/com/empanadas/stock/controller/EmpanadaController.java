package com.empanadas.stock.controller;

import com.empanadas.stock.model.Empanada;
import com.empanadas.stock.service.EmpanadaService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/empanadas")
public class EmpanadaController {

    // Cuerpo del PUT /stock: {"stock": 15}
    public record StockRequest(@Min(0) int stock) {}

    private final EmpanadaService service;

    public EmpanadaController(EmpanadaService service) {
        this.service = service;
    }

    @GetMapping
    public List<Empanada> listar() {
        return service.listar();
    }

    @GetMapping("/{id}")
    public Empanada obtener(@PathVariable Long id) {
        return service.obtener(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Empanada crear(@Valid @RequestBody Empanada empanada) {
        return service.crear(empanada);
    }

    @PutMapping("/{id}")
    public Empanada actualizar(@PathVariable Long id,
                               @Valid @RequestBody Empanada empanada) {
        return service.actualizar(id, empanada);
    }

    @PutMapping("/{id}/stock")
    public Empanada actualizarStock(@PathVariable Long id,
                                    @Valid @RequestBody StockRequest body) {
        return service.actualizarStock(id, body.stock());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void borrar(@PathVariable Long id) {
        service.borrar(id);
    }
}