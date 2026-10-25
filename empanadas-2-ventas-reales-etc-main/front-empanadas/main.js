const API = "http://localhost:8080/api";

// Formateadores al estilo español: 3,50 €  /  41,67
const euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const numero = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });
const fechaHora = new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short" });

// PVP orientativo y umbral de stock bajo
const PVP_MIN = 2;
const PVP_MAX = 3.5;
const STOCK_BAJO = 5;

// Datos en memoria
let empanadasCargadas = [];
let ingredientesDisponibles = [];

// Estado de edición (null = creando; un número = editando ese id)
let editandoId = null;
let editandoIngId = null;

// Criterio de orden de la lista de empanadas
let orden = "defecto";

// ---------- Utilidades ----------

// Escapa texto antes de meterlo en HTML (los nombres los escribe el usuario)
function esc(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

// Petición GET que lanza error si el servidor no responde 2xx
async function obtener(ruta) {
  const respuesta = await fetch(`${API}${ruta}`);
  if (!respuesta.ok) {
    throw new Error(`El servidor respondió ${respuesta.status}`);
  }
  return respuesta.json();
}

// Petición con cuerpo JSON opcional (POST, PUT, DELETE...)
async function enviar(metodo, ruta, cuerpo) {
  const opciones = { method: metodo };
  if (cuerpo !== undefined) {
    opciones.headers = { "Content-Type": "application/json" };
    opciones.body = JSON.stringify(cuerpo);
  }

  const respuesta = await fetch(`${API}${ruta}`, opciones);

  if (!respuesta.ok) {
    let detalle = "";
    try {
      const datos = await respuesta.json();
      detalle = datos.message || "";   // requiere server.error.include-message=always
    } catch { /* la respuesta no traía JSON */ }
    const error = new Error(detalle || `El servidor respondió ${respuesta.status}`);
    error.status = respuesta.status;
    throw error;
  }

  return respuesta.status === 204 ? null : respuesta.json();
}

function mostrarMensaje(texto, tipo = "error") {
  const caja = document.getElementById("mensaje");
  caja.textContent = texto;
  caja.classList.remove("oculto", "exito");
  if (tipo === "exito") caja.classList.add("exito");
}

function mostrarError(texto) {
  mostrarMensaje(texto, "error");
}

function ocultarError() {
  document.getElementById("mensaje").classList.add("oculto");
}

// ---------- Resumen del stock (potencial) ----------

async function cargarResumen() {
  const r = await obtener("/resumen");
  const clase = r.gananciaPotencial >= 0 ? "positivo" : "negativo";

  document.getElementById("resumen").innerHTML = `
    <div class="dato">
      <span class="etiqueta">Tipos</span>
      <span class="valor">${r.tiposDeEmpanada}</span>
    </div>
    <div class="dato">
      <span class="etiqueta">Unidades en stock</span>
      <span class="valor">${r.unidadesEnStock}</span>
    </div>
    <div class="dato">
      <span class="etiqueta">Coste del stock</span>
      <span class="valor">${euro.format(r.costeStock)}</span>
    </div>
    <div class="dato">
      <span class="etiqueta">Venta potencial</span>
      <span class="valor">${euro.format(r.ventaPotencial)}</span>
    </div>
    <div class="dato">
      <span class="etiqueta">Ganancia potencial</span>
      <span class="valor ${clase}">${euro.format(r.gananciaPotencial)}</span>
    </div>
    <div class="dato">
      <span class="etiqueta">Margen</span>
      <span class="valor ${clase}">${numero.format(r.margenPorcentaje)} %</span>
    </div>
  `;
}

// ---------- Lista de empanadas ----------

function tarjetaEmpanada(e) {
  const claseGanancia = e.ganancia >= 0 ? "positivo" : "negativo";
  const claseStock = e.stock <= STOCK_BAJO ? "stock-bajo" : "";
  const sinStock = e.stock === 0 ? "disabled" : "";

  const chips = e.ingredientes.length
    ? e.ingredientes.map(i => `<span class="chip">${esc(i.nombre)}</span>`).join("")
    : `<span class="sin-ingredientes">Sin ingredientes</span>`;

  const fueraDeRango = e.pvp < PVP_MIN || e.pvp > PVP_MAX;
  const aviso = fueraDeRango
    ? `<p class="aviso-pvp">⚠ PVP fuera del rango orientativo (${euro.format(PVP_MIN)} – ${euro.format(PVP_MAX)})</p>`
    : "";

  return `
    <article class="tarjeta">
      <h3>${esc(e.nombre)}</h3>
      <div class="ingredientes">${chips}</div>
      <div class="fila"><span>Precio base</span><span>${euro.format(e.precioBase)}</span></div>
      <div class="fila"><span>Coste total</span><span>${euro.format(e.costeTotal)}</span></div>
      <div class="fila"><span>PVP</span><span>${euro.format(e.pvp)}</span></div>
      <div class="fila"><span>Ganancia / unidad</span><span class="${claseGanancia}">${euro.format(e.ganancia)}</span></div>
      <div class="fila">
        <span>Stock</span>
        <div class="control-stock">
          <button class="btn-mini" data-accion="menos" data-id="${e.id}" ${sinStock}>−</button>
          <strong class="${claseStock}">${e.stock} uds.</strong>
          <button class="btn-mini" data-accion="mas" data-id="${e.id}">+</button>
        </div>
      </div>
      ${aviso}
      <div class="vender">
        <input type="number" class="cant-venta" min="1" step="1" value="1"
               aria-label="Unidades a vender" ${sinStock}>
        <button class="boton" data-accion="vender" data-id="${e.id}" ${sinStock}>Vender</button>
      </div>
      <div class="acciones">
        <button class="boton-sec" data-accion="editar" data-id="${e.id}">Editar</button>
        <button class="boton-sec peligro" data-accion="borrar" data-id="${e.id}">Borrar</button>
      </div>
    </article>
  `;
}

// Devuelve una COPIA ordenada según el criterio elegido
// (empanadasCargadas no se toca: así "orden de creación" siempre está disponible)
function ordenarEmpanadas(lista) {
  const copia = [...lista];
  const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, "es");

  switch (orden) {
    case "stock":
      // Menos stock primero; si empatan, por nombre
      copia.sort((a, b) => (a.stock - b.stock) || porNombre(a, b));
      break;
    case "ganancia":
      // Más ganancia por unidad primero; si empatan, por nombre
      copia.sort((a, b) => (b.ganancia - a.ganancia) || porNombre(a, b));
      break;
    case "nombre":
      copia.sort(porNombre);
      break;
    // "defecto": se deja como llega del servidor
  }
  return copia;
}

// Pinta las tarjetas con los datos que ya hay en memoria (sin llamar a la API)
function pintarEmpanadas() {
  const lista = document.getElementById("lista-empanadas");

  if (empanadasCargadas.length === 0) {
    lista.innerHTML = `<p class="cargando">Todavía no hay empanadas.</p>`;
    return;
  }
  lista.innerHTML = ordenarEmpanadas(empanadasCargadas).map(tarjetaEmpanada).join("");
}

async function cargarEmpanadas() {
  empanadasCargadas = await obtener("/empanadas");
  pintarIngredientes();   // actualiza el contador "En N empanadas"
  pintarEmpanadas();
}

// Selector de orden: recuerda la elección aunque se recargue la página
const selectorOrden = document.getElementById("orden");

try {
  const guardado = localStorage.getItem("ordenEmpanadas");
  if (guardado && [...selectorOrden.options].some(o => o.value === guardado)) {
    orden = guardado;
  }
} catch { /* sin acceso a localStorage: se usa el orden por defecto */ }
selectorOrden.value = orden;

selectorOrden.addEventListener("change", () => {
  orden = selectorOrden.value;
  try { localStorage.setItem("ordenEmpanadas", orden); } catch { /* ignorar */ }
  pintarEmpanadas();
});

// ---------- Casillas de ingredientes y vista previa ----------

async function cargarIngredientes() {
  ingredientesDisponibles = await obtener("/ingredientes");
  pintarCasillas();
  pintarIngredientes();
}

// Ids de los ingredientes marcados
function idsSeleccionados() {
  return [...document.querySelectorAll("#lista-ingredientes input:checked")]
    .map(c => Number(c.value));
}

function pintarCasillas() {
  const contenedor = document.getElementById("lista-ingredientes");
  const marcados = idsSeleccionados();   // leer ANTES de repintar

  if (ingredientesDisponibles.length === 0) {
    contenedor.innerHTML = `<p class="sin-ingredientes">No hay ingredientes todavía. Créalos en la sección de abajo.</p>`;
    actualizarPrevia();
    return;
  }

  contenedor.innerHTML = ingredientesDisponibles.map(i => `
    <label>
      <input type="checkbox" value="${i.id}" ${marcados.includes(i.id) ? "checked" : ""}>
      ${esc(i.nombre)} (${euro.format(i.precio)})
    </label>
  `).join("");
  actualizarPrevia();
}

// Cálculo en vivo de coste y ganancia
function actualizarPrevia() {
  const base = parseFloat(document.getElementById("precioBase").value) || 0;
  const pvp = parseFloat(document.getElementById("pvp").value) || 0;
  const ids = idsSeleccionados();

  const sumaIngredientes = ingredientesDisponibles
    .filter(i => ids.includes(i.id))
    .reduce((total, i) => total + i.precio, 0);

  const coste = base + sumaIngredientes;
  const ganancia = pvp - coste;
  const clase = ganancia >= 0 ? "positivo" : "negativo";

  const aviso = pvp > 0 && (pvp < PVP_MIN || pvp > PVP_MAX)
    ? `<p class="aviso-pvp">⚠ PVP fuera del rango orientativo (${euro.format(PVP_MIN)} – ${euro.format(PVP_MAX)})</p>`
    : "";

  document.getElementById("previa").innerHTML = `
    <div class="fila"><span>Coste total</span><span>${euro.format(coste)}</span></div>
    <div class="fila"><span>Ganancia / unidad</span><span class="${clase}">${euro.format(ganancia)}</span></div>
    ${aviso}
  `;
}

// ---------- Crear / editar empanada ----------

const formulario = document.getElementById("form-empanada");

function empezarEdicion(e) {
  editandoId = e.id;

  document.getElementById("nombre").value = e.nombre;
  document.getElementById("precioBase").value = e.precioBase;
  document.getElementById("pvp").value = e.pvp;
  document.getElementById("stock").value = e.stock;

  const ids = e.ingredientes.map(i => i.id);
  document.querySelectorAll("#lista-ingredientes input").forEach(casilla => {
    casilla.checked = ids.includes(Number(casilla.value));
  });

  document.getElementById("titulo-form").textContent = `Editando: ${e.nombre}`;
  document.getElementById("btn-guardar").textContent = "Guardar cambios";
  document.getElementById("btn-cancelar").classList.remove("oculto");
  formulario.classList.add("editando");

  actualizarPrevia();
  formulario.scrollIntoView({ behavior: "smooth", block: "center" });
}

function salirDeEdicion() {
  editandoId = null;
  formulario.reset();
  document.getElementById("titulo-form").textContent = "Nueva empanada";
  document.getElementById("btn-guardar").textContent = "Guardar empanada";
  document.getElementById("btn-cancelar").classList.add("oculto");
  formulario.classList.remove("editando");
  actualizarPrevia();
}

async function guardarEmpanada(evento) {
  evento.preventDefault();
  const boton = document.getElementById("btn-guardar");
  boton.disabled = true;
  ocultarError();

  const datos = {
    nombre: document.getElementById("nombre").value.trim(),
    precioBase: parseFloat(document.getElementById("precioBase").value),
    pvp: parseFloat(document.getElementById("pvp").value),
    stock: parseInt(document.getElementById("stock").value, 10),
    ingredientes: idsSeleccionados().map(id => ({ id }))
  };

  const editando = editandoId !== null;

  try {
    const guardada = editando
      ? await enviar("PUT", `/empanadas/${editandoId}`, datos)    // PUT: modificar
      : await enviar("POST", "/empanadas", datos);                // POST: crear

    salirDeEdicion();
    await Promise.all([cargarResumen(), cargarEmpanadas()]);
    mostrarMensaje(
      `Empanada "${guardada.nombre}" ${editando ? "actualizada" : "guardada"} correctamente.`,
      "exito"
    );
  } catch (error) {
    console.error(error);
    mostrarError("No se pudo guardar la empanada. " + error.message);
  } finally {
    boton.disabled = false;
  }
}

formulario.addEventListener("submit", guardarEmpanada);
formulario.addEventListener("input", actualizarPrevia);
document.getElementById("btn-cancelar").addEventListener("click", salirDeEdicion);

// ---------- Acciones de las tarjetas: stock, vender, editar, borrar ----------

async function cambiarStock(empanada, delta) {
  const nuevoStock = empanada.stock + delta;
  if (nuevoStock < 0) return;

  ocultarError();
  try {
    await enviar("PUT", `/empanadas/${empanada.id}/stock`, { stock: nuevoStock });   // PUT
    // Si justo se está editando esta empanada, evitamos que el formulario
    // sobrescriba el stock con un valor antiguo al guardar
    if (editandoId === empanada.id) {
      document.getElementById("stock").value = nuevoStock;
    }
    await Promise.all([cargarResumen(), cargarEmpanadas()]);
  } catch (error) {
    console.error(error);
    mostrarError("No se pudo cambiar el stock. " + error.message);
  }
}

async function venderEmpanada(empanada, cantidad) {
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    mostrarError("Indica una cantidad válida (1 o más).");
    return;
  }
  if (cantidad > empanada.stock) {
    mostrarError(`Solo quedan ${empanada.stock} uds. de "${empanada.nombre}".`);
    return;
  }

  ocultarError();
  try {
    const venta = await enviar("POST", "/ventas", { empanadaId: empanada.id, cantidad });   // POST
    if (editandoId === empanada.id) {
      document.getElementById("stock").value = empanada.stock - cantidad;
    }
    await Promise.all([cargarResumen(), cargarEmpanadas(), cargarVentas()]);
    mostrarMensaje(
      `Venta registrada: ${venta.cantidad} × ${venta.nombreEmpanada} (${euro.format(venta.ingresos)}).`,
      "exito"
    );
  } catch (error) {
    console.error(error);
    if (error.status === 409) {
      mostrarError("No hay stock suficiente para esa venta. Recarga la página por si el stock ha cambiado.");
    } else {
      mostrarError("No se pudo registrar la venta. " + error.message);
    }
  }
}

async function borrarEmpanada(empanada) {
  if (!confirm(`¿Borrar la empanada "${empanada.nombre}"? Esta acción no se puede deshacer.\n\nSu historial de ventas se conservará.`)) {
    return;
  }

  ocultarError();
  try {
    await enviar("DELETE", `/empanadas/${empanada.id}`);                              // DELETE
    if (editandoId === empanada.id) salirDeEdicion();
    await Promise.all([cargarResumen(), cargarEmpanadas()]);
    mostrarMensaje(`Empanada "${empanada.nombre}" borrada.`, "exito");
  } catch (error) {
    console.error(error);
    mostrarError("No se pudo borrar la empanada. " + error.message);
  }
}

// Un solo listener para todos los botones de todas las tarjetas
document.getElementById("lista-empanadas").addEventListener("click", (evento) => {
  const boton = evento.target.closest("button[data-accion]");
  if (!boton) return;

  const empanada = empanadasCargadas.find(e => e.id === Number(boton.dataset.id));
  if (!empanada) return;

  switch (boton.dataset.accion) {
    case "menos":  cambiarStock(empanada, -1); break;
    case "mas":    cambiarStock(empanada, +1); break;
    case "editar": empezarEdicion(empanada);   break;
    case "borrar": borrarEmpanada(empanada);   break;
    case "vender": {
      const entrada = boton.closest(".vender").querySelector(".cant-venta");
      venderEmpanada(empanada, parseInt(entrada.value, 10));
      break;
    }
  }
});

// ---------- Ventas ----------

let ventasCargadas = [];

function bloquePeriodo(titulo, p) {
  const clase = p.ganancia >= 0 ? "positivo" : "negativo";
  return `
    <article class="tarjeta periodo">
      <h3>${titulo}</h3>
      <div class="fila"><span>Unidades vendidas</span><span>${p.unidades}</span></div>
      <div class="fila"><span>Ingresos</span><span>${euro.format(p.ingresos)}</span></div>
      <div class="fila"><span>Coste</span><span>${euro.format(p.coste)}</span></div>
      <div class="fila"><span>Ganancia real</span><span class="${clase}">${euro.format(p.ganancia)}</span></div>
    </article>
  `;
}

async function cargarVentas() {
  const [resumen, ventas] = await Promise.all([
    obtener("/ventas/resumen"),
    obtener("/ventas")
  ]);
  ventasCargadas = ventas;

  document.getElementById("resumen-ventas").innerHTML =
    bloquePeriodo("Hoy", resumen.hoy) +
    bloquePeriodo("Últimos 7 días", resumen.ultimos7Dias) +
    bloquePeriodo("Total", resumen.total);

  const historial = document.getElementById("historial-ventas");
  if (ventas.length === 0) {
    historial.innerHTML = `<p class="cargando">Todavía no hay ventas registradas.</p>`;
    return;
  }

  historial.innerHTML = ventas.map(v => `
    <div class="hist-fila">
      <div class="hist-info">
        <strong>${v.cantidad} × ${esc(v.nombreEmpanada)}</strong>
        <span class="hist-fecha">${fechaHora.format(new Date(v.fecha))}</span>
      </div>
      <div class="hist-importes">
        <div>${euro.format(v.ingresos)}</div>
        <div class="${v.ganancia >= 0 ? "positivo" : "negativo"}">Ganancia: ${euro.format(v.ganancia)}</div>
      </div>
      <button class="boton-sec peligro" data-accion="anular" data-id="${v.id}">Anular</button>
    </div>
  `).join("");
}

async function anularVenta(venta) {
  if (!confirm(`¿Anular la venta de ${venta.cantidad} × "${venta.nombreEmpanada}"?\n\nSe borrará del historial y se devolverá el stock.`)) {
    return;
  }

  ocultarError();
  try {
    await enviar("DELETE", `/ventas/${venta.id}`);                                    // DELETE
    await Promise.all([cargarResumen(), cargarEmpanadas(), cargarVentas()]);
    mostrarMensaje("Venta anulada y stock devuelto.", "exito");
  } catch (error) {
    console.error(error);
    mostrarError("No se pudo anular la venta. " + error.message);
  }
}

document.getElementById("historial-ventas").addEventListener("click", (evento) => {
  const boton = evento.target.closest("button[data-accion='anular']");
  if (!boton) return;

  const venta = ventasCargadas.find(v => v.id === Number(boton.dataset.id));
  if (venta) anularVenta(venta);
});

// ---------- Gestión de ingredientes ----------

const formIng = document.getElementById("form-ingrediente");

function pintarIngredientes() {
  const contenedor = document.getElementById("gestion-ingredientes");

  if (ingredientesDisponibles.length === 0) {
    contenedor.innerHTML = `<p class="cargando">Todavía no hay ingredientes.</p>`;
    return;
  }

  contenedor.innerHTML = ingredientesDisponibles.map(i => {
    const usos = empanadasCargadas
      .filter(e => e.ingredientes.some(x => x.id === i.id)).length;
    const textoUso = usos === 0
      ? "Sin usar"
      : `En ${usos} ${usos === 1 ? "empanada" : "empanadas"}`;

    return `
      <div class="ing-fila">
        <div class="ing-info">
          <strong>${esc(i.nombre)}</strong>
          <span class="ing-uso">${textoUso}</span>
        </div>
        <span class="ing-precio">${euro.format(i.precio)}</span>
        <div class="acciones-ing">
          <button class="boton-sec" data-accion="editar-ing" data-id="${i.id}">Editar</button>
          <button class="boton-sec peligro" data-accion="borrar-ing" data-id="${i.id}">Borrar</button>
        </div>
      </div>
    `;
  }).join("");
}

function empezarEdicionIng(i) {
  editandoIngId = i.id;
  document.getElementById("ing-nombre").value = i.nombre;
  document.getElementById("ing-precio").value = i.precio;
  document.getElementById("btn-guardar-ing").textContent = "Guardar cambios";
  document.getElementById("btn-cancelar-ing").classList.remove("oculto");
  formIng.classList.add("editando");
  formIng.scrollIntoView({ behavior: "smooth", block: "center" });
  document.getElementById("ing-nombre").focus();
}

function salirDeEdicionIng() {
  editandoIngId = null;
  formIng.reset();
  document.getElementById("btn-guardar-ing").textContent = "Añadir ingrediente";
  document.getElementById("btn-cancelar-ing").classList.add("oculto");
  formIng.classList.remove("editando");
}

async function guardarIngrediente(evento) {
  evento.preventDefault();
  const boton = document.getElementById("btn-guardar-ing");
  boton.disabled = true;
  ocultarError();

  const datos = {
    nombre: document.getElementById("ing-nombre").value.trim(),
    precio: parseFloat(document.getElementById("ing-precio").value)
  };
  const editando = editandoIngId !== null;

  try {
    const guardado = editando
      ? await enviar("PUT", `/ingredientes/${editandoIngId}`, datos)   // PUT
      : await enviar("POST", "/ingredientes", datos);                  // POST

    salirDeEdicionIng();
    // Un cambio de precio altera el coste de las empanadas y el resumen
    await Promise.all([cargarIngredientes(), cargarEmpanadas(), cargarResumen()]);
    mostrarMensaje(
      `Ingrediente "${guardado.nombre}" ${editando ? "actualizado" : "añadido"} correctamente.`,
      "exito"
    );
  } catch (error) {
    console.error(error);
    if (error.status === 409) {
      mostrarError(`Ya existe un ingrediente llamado "${datos.nombre}". Usa ese o elige otro nombre.`);
    } else {
      mostrarError("No se pudo guardar el ingrediente. " + error.message);
    }
  } finally {
    boton.disabled = false;
  }
}

async function borrarIngrediente(ingrediente) {
  if (!confirm(`¿Borrar el ingrediente "${ingrediente.nombre}"?`)) return;

  ocultarError();
  try {
    await enviar("DELETE", `/ingredientes/${ingrediente.id}`);          // DELETE
    if (editandoIngId === ingrediente.id) salirDeEdicionIng();
    await cargarIngredientes();
    mostrarMensaje(`Ingrediente "${ingrediente.nombre}" borrado.`, "exito");
  } catch (error) {
    console.error(error);
    if (error.status === 409) {
      mostrarError(
        `No se puede borrar "${ingrediente.nombre}" porque está en alguna empanada. ` +
        `Quítalo primero de esas empanadas (botón Editar) y vuelve a intentarlo.`
      );
    } else {
      mostrarError("No se pudo borrar el ingrediente. " + error.message);
    }
  }
}

formIng.addEventListener("submit", guardarIngrediente);
document.getElementById("btn-cancelar-ing").addEventListener("click", salirDeEdicionIng);

document.getElementById("gestion-ingredientes").addEventListener("click", (evento) => {
  const boton = evento.target.closest("button[data-accion]");
  if (!boton) return;

  const ingrediente = ingredientesDisponibles.find(i => i.id === Number(boton.dataset.id));
  if (!ingrediente) return;

  if (boton.dataset.accion === "editar-ing") empezarEdicionIng(ingrediente);
  if (boton.dataset.accion === "borrar-ing") borrarIngrediente(ingrediente);
});

// ---------- Arranque ----------

async function iniciar() {
  ocultarError();
  try {
    await Promise.all([cargarResumen(), cargarEmpanadas(), cargarIngredientes(), cargarVentas()]);
    actualizarPrevia();
  } catch (error) {
    console.error(error);
    mostrarError("No se pudo conectar con la API. ¿Está arrancado Spring? (" + error.message + ")");
  }
}

iniciar();