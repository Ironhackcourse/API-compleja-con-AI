package com.empanadas.stock.service;

import com.empanadas.stock.model.Empanada;
import com.empanadas.stock.model.Ingrediente;
import com.empanadas.stock.repository.EmpanadaRepository;
import com.empanadas.stock.repository.IngredienteRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.empanadas.stock.model.ResumenGanancias;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
public class EmpanadaService {

    private final EmpanadaRepository empanadaRepository;
    private final IngredienteRepository ingredienteRepository;

    public EmpanadaService(EmpanadaRepository empanadaRepository,
                           IngredienteRepository ingredienteRepository) {
        this.empanadaRepository = empanadaRepository;
        this.ingredienteRepository = ingredienteRepository;
    }

    public List<Empanada> listar() {
        return empanadaRepository.findAll();
    }

    public Empanada obtener(Long id) {
        return empanadaRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Empanada no encontrada: " + id));
    }

    public Empanada crear(Empanada empanada) {
        empanada.setId(null);
        empanada.setIngredientes(resolverIngredientes(empanada.getIngredientes()));
        return empanadaRepository.save(empanada);
    }

    public Empanada actualizar(Long id, Empanada datos) {
        Empanada existente = obtener(id);
        existente.setNombre(datos.getNombre());
        existente.setPrecioBase(datos.getPrecioBase());
        existente.setPvp(datos.getPvp());
        existente.setStock(datos.getStock());
        existente.setIngredientes(resolverIngredientes(datos.getIngredientes()));
        return empanadaRepository.save(existente);
    }

    public Empanada actualizarStock(Long id, int nuevoStock) {
        Empanada existente = obtener(id);
        existente.setStock(nuevoStock);
        return empanadaRepository.save(existente);
    }

    public void borrar(Long id) {
        obtener(id);
        empanadaRepository.deleteById(id);
    }

    // Convierte [{id:1},{id:2}] en los Ingrediente reales de la BD
    private List<Ingrediente> resolverIngredientes(List<Ingrediente> recibidos) {
        if (recibidos == null || recibidos.isEmpty()) {
            return new ArrayList<>();
        }
        List<Long> ids = recibidos.stream()
                .map(Ingrediente::getId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        List<Ingrediente> encontrados = ingredienteRepository.findAllById(ids);
        if (encontrados.size() != ids.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Alguno de los ingredientes indicados no existe");
        }
        return new ArrayList<>(encontrados);
    }

        @Transactional(readOnly = true)
    public ResumenGanancias resumen() {
        List<Empanada> todas = empanadaRepository.findAll();

        int unidades = 0;
        BigDecimal coste = BigDecimal.ZERO;
        BigDecimal venta = BigDecimal.ZERO;

        for (Empanada e : todas) {
            BigDecimal stock = BigDecimal.valueOf(e.getStock());
            unidades += e.getStock();
            coste = coste.add(e.getCosteTotal().multiply(stock));
            venta = venta.add(e.getPvp().multiply(stock));
        }

        BigDecimal ganancia = venta.subtract(coste);

        // Evitamos dividir por cero si no hay stock
        BigDecimal margen = venta.signum() == 0
                ? BigDecimal.ZERO
                : ganancia.multiply(BigDecimal.valueOf(100))
                          .divide(venta, 2, RoundingMode.HALF_UP);

        return new ResumenGanancias(todas.size(), unidades, coste, venta, ganancia, margen);
    }
}