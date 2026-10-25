const API = "http://localhost:8080/api";

async function probar() {
  const salida = document.getElementById("salida");
  try {
    const respuesta = await fetch(`${API}/resumen`);
    const datos = await respuesta.json();
    salida.textContent = JSON.stringify(datos, null, 2);
  } catch (error) {
    salida.textContent = "Error: " + error.message;
    console.error(error);
  }
}

probar();