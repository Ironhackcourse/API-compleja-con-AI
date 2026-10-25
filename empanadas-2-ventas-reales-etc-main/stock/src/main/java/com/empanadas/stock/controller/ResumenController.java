package com.empanadas.stock.controller;

import com.empanadas.stock.model.ResumenGanancias;
import com.empanadas.stock.service.EmpanadaService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/resumen")
public class ResumenController {

    private final EmpanadaService service;

    public ResumenController(EmpanadaService service) {
        this.service = service;
    }

    @GetMapping
    public ResumenGanancias resumen() {
        return service.resumen();
    }
}