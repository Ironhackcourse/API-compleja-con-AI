package com.empanadas.stock.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
public class Venta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long empanadaId;          // sin clave foránea: el historial sobrevive al borrado
    private String nombreEmpanada;    // copia del nombre en el momento de la venta
    private int cantidad;

    @Column(precision = 10, scale = 2)
    private BigDecimal pvpUnitario;   // copia del PVP en el momento de la venta

    @Column(precision = 10, scale = 2)
    private BigDecimal costeUnitario; // copia del coste en el momento de la venta

    private LocalDateTime fecha;

    public Venta() {}

    // ---------- Calculados (no se guardan) ----------

    public BigDecimal getIngresos() {
        return pvpUnitario.multiply(BigDecimal.valueOf(cantidad));
    }

    public BigDecimal getGanancia() {
        return pvpUnitario.subtract(costeUnitario).multiply(BigDecimal.valueOf(cantidad));
    }

    // ---------- Getters y setters ----------

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getEmpanadaId() { return empanadaId; }
    public void setEmpanadaId(Long empanadaId) { this.empanadaId = empanadaId; }

    public String getNombreEmpanada() { return nombreEmpanada; }
    public void setNombreEmpanada(String nombreEmpanada) { this.nombreEmpanada = nombreEmpanada; }

    public int getCantidad() { return cantidad; }
    public void setCantidad(int cantidad) { this.cantidad = cantidad; }

    public BigDecimal getPvpUnitario() { return pvpUnitario; }
    public void setPvpUnitario(BigDecimal pvpUnitario) { this.pvpUnitario = pvpUnitario; }

    public BigDecimal getCosteUnitario() { return costeUnitario; }
    public void setCosteUnitario(BigDecimal costeUnitario) { this.costeUnitario = costeUnitario; }

    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
}