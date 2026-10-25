package com.empanadas.stock.controller;

import com.empanadas.stock.model.ResumenVentas;
import com.empanadas.stock.model.Venta;
import com.empanadas.stock.service.VentaService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ventas")
public class VentaController {

    // Cuerpo del POST: {"empanadaId": 1, "cantidad": 3}
    public record VentaRequest(@NotNull Long empanadaId, @Min(1) int cantidad) {}

    private final VentaService service;

    public VentaController(VentaService service) {
        this.service = service;
    }

    @GetMapping
    public List<Venta> recientes() {
        return service.recientes();
    }

    @GetMapping("/resumen")
    public ResumenVentas resumen() {
        return service.resumen();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Venta registrar(@Valid @RequestBody VentaRequest body) {
        return service.registrar(body.empanadaId(), body.cantidad());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void anular(@PathVariable Long id) {
        service.anular(id);
    }
}
