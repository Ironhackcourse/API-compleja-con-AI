package com.empanadas.stock.service;

import com.empanadas.stock.model.Ingrediente;
import com.empanadas.stock.repository.IngredienteRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class IngredienteService {

    private final IngredienteRepository repository;

    public IngredienteService(IngredienteRepository repository) {
        this.repository = repository;
    }

    public List<Ingrediente> listar() {
        return repository.findAll();
    }

    public Ingrediente obtener(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Ingrediente no encontrado: " + id));
    }

    public Ingrediente crear(Ingrediente ingrediente) {
        ingrediente.setId(null);   // fuerza a crear uno nuevo, nunca a sobrescribir
        ingrediente.setNombre(ingrediente.getNombre().trim());

        if (repository.existsByNombreIgnoreCase(ingrediente.getNombre())) {
            throw nombreDuplicado(ingrediente.getNombre());
        }
        return guardar(ingrediente);
    }

    public Ingrediente actualizar(Long id, Ingrediente datos) {
        Ingrediente existente = obtener(id);   // lanza 404 si no existe
        String nombre = datos.getNombre().trim();

        if (repository.existsByNombreIgnoreCaseAndIdNot(nombre, id)) {
            throw nombreDuplicado(nombre);
        }

        existente.setNombre(nombre);
        existente.setPrecio(datos.getPrecio());
        return guardar(existente);
    }

    public void borrar(Long id) {
        obtener(id);   // lanza 404 si no existe
        try {
            repository.deleteById(id);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "No se puede borrar: el ingrediente se usa en alguna empanada");
        }
    }

    // Red de seguridad: si dos peticiones simultáneas pasan la comprobación,
    // la restricción unique de MySQL rechaza la segunda
    private Ingrediente guardar(Ingrediente ingrediente) {
        try {
            return repository.save(ingrediente);
        } catch (DataIntegrityViolationException e) {
            throw nombreDuplicado(ingrediente.getNombre());
        }
    }

    private ResponseStatusException nombreDuplicado(String nombre) {
        return new ResponseStatusException(HttpStatus.CONFLICT,
                "Ya existe un ingrediente llamado \"" + nombre + "\"");
    }
}