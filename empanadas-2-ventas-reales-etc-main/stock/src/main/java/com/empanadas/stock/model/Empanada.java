package com.empanadas.stock.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
public class Empanada {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "El nombre es obligatorio")
    private String nombre;

    @NotNull
    @DecimalMin("0.00")
    @Column(precision = 10, scale = 2)
    private BigDecimal precioBase;   // masa, aceite, gas, envase...

    @NotNull
    @DecimalMin("0.01")
    @Column(precision = 10, scale = 2)
    private BigDecimal pvp;          // precio de venta al público

    @Min(value = 0, message = "El stock no puede ser negativo")
    private int stock;

    @ManyToMany
    @JoinTable(
        name = "empanada_ingrediente",
        joinColumns = @JoinColumn(name = "empanada_id"),
        inverseJoinColumns = @JoinColumn(name = "ingrediente_id")
    )
    private List<Ingrediente> ingredientes = new ArrayList<>();

    public Empanada() {}

    // ---------- Campos CALCULADOS (no se guardan en la BD) ----------

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    public BigDecimal getCosteTotal() {
        BigDecimal sumaIngredientes = ingredientes.stream()
                .map(Ingrediente::getPrecio)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return precioBase.add(sumaIngredientes);
    }

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    public BigDecimal getGanancia() {
        return pvp.subtract(getCosteTotal());
    }

    // ---------- Getters y setters ----------

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public BigDecimal getPrecioBase() { return precioBase; }
    public void setPrecioBase(BigDecimal precioBase) { this.precioBase = precioBase; }

    public BigDecimal getPvp() { return pvp; }
    public void setPvp(BigDecimal pvp) { this.pvp = pvp; }

    public int getStock() { return stock; }
    public void setStock(int stock) { this.stock = stock; }

    public List<Ingrediente> getIngredientes() { return ingredientes; }
    public void setIngredientes(List<Ingrediente> ingredientes) { this.ingredientes = ingredientes; }
}