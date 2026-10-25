package com.empanadas.stock.service;

import com.empanadas.stock.model.Empanada;
import com.empanadas.stock.model.ResumenVentas;
import com.empanadas.stock.model.ResumenVentas.Periodo;
import com.empanadas.stock.model.Venta;
import com.empanadas.stock.repository.EmpanadaRepository;
import com.empanadas.stock.repository.VentaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class VentaService {

    private final VentaRepository ventaRepository;
    private final EmpanadaRepository empanadaRepository;

    public VentaService(VentaRepository ventaRepository,
                        EmpanadaRepository empanadaRepository) {
        this.ventaRepository = ventaRepository;
        this.empanadaRepository = empanadaRepository;
    }

    public List<Venta> recientes() {
        return ventaRepository.findTop30ByOrderByFechaDesc();
    }

    // Todo o nada: si algo falla, ni se descuenta stock ni se guarda la venta
    @Transactional
    public Venta registrar(Long empanadaId, int cantidad) {
        Empanada empanada = empanadaRepository.findById(empanadaId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Empanada no encontrada: " + empanadaId));

        if (empanada.getStock() < cantidad) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Stock insuficiente: quedan " + empanada.getStock());
        }

        empanada.setStock(empanada.getStock() - cantidad);
        empanadaRepository.save(empanada);

        Venta venta = new Venta();
        venta.setEmpanadaId(empanada.getId());
        venta.setNombreEmpanada(empanada.getNombre());
        venta.setCantidad(cantidad);
        venta.setPvpUnitario(empanada.getPvp());
        venta.setCosteUnitario(empanada.getCosteTotal());
        venta.setFecha(LocalDateTime.now());
        return ventaRepository.save(venta);
    }

    // Anular una venta (por error): borra la venta y devuelve el stock
    @Transactional
    public void anular(Long id) {
        Venta venta = ventaRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Venta no encontrada: " + id));

        // Si la empanada ya se borró del catálogo, no hay stock que devolver
        empanadaRepository.findById(venta.getEmpanadaId()).ifPresent(e -> {
            e.setStock(e.getStock() + venta.getCantidad());
            empanadaRepository.save(e);
        });

        ventaRepository.delete(venta);
    }

    @Transactional(readOnly = true)
    public ResumenVentas resumen() {
        LocalDateTime inicioHoy = LocalDate.now().atStartOfDay();
        LocalDateTime inicio7Dias = LocalDate.now().minusDays(6).atStartOfDay();

        return new ResumenVentas(
                calcular(ventaRepository.findByFechaGreaterThanEqual(inicioHoy)),
                calcular(ventaRepository.findByFechaGreaterThanEqual(inicio7Dias)),
                calcular(ventaRepository.findAll())
        );
    }

    private Periodo calcular(List<Venta> ventas) {
        int unidades = 0;
        BigDecimal ingresos = BigDecimal.ZERO;
        BigDecimal coste = BigDecimal.ZERO;

        for (Venta v : ventas) {
            unidades += v.getCantidad();
            ingresos = ingresos.add(v.getIngresos());
            coste = coste.add(v.getCosteUnitario().multiply(BigDecimal.valueOf(v.getCantidad())));
        }
        return new Periodo(unidades, ingresos, coste, ingresos.subtract(coste));
    }
}