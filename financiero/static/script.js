// ===========================================
// Referencias a elementos del DOM
// ===========================================
const formulario = document.getElementById("formulario");           // Formulario principal
const mensaje = document.getElementById("mensaje");                 // Párrafo donde se muestra el mensaje al usuario
const tablaBody = document.querySelector("#tabla-creditos tbody"); // Cuerpo de la tabla donde se listan los créditos
const btnSubmit = document.getElementById("btn-submit");           // Botón para registrar/actualizar crédito
const btnCancel = document.getElementById("btn-cancel");           // Botón para cancelar edición

// ===========================================
// Función: mostrarMensaje
// Muestra un mensaje en pantalla con color verde (éxito) o rojo (error)
// ===========================================
function mostrarMensaje(texto, esError = false) {
  mensaje.textContent = texto;
  mensaje.style.color = esError ? "red" : "green";
}

// ===========================================
// Función: limpiarFormulario
// Restaura el formulario al estado inicial
// ===========================================
function limpiarFormulario() {
  formulario.reset();                 // Limpia los valores de los campos
  formulario.id.value = "";          // Limpia el ID oculto (usado para edición)
  btnSubmit.textContent = "Registrar"; // Vuelve a mostrar el botón como "Registrar"
  btnCancel.style.display = "none";  // Oculta el botón de cancelar
}

// ===========================================
// Función: cargarCreditos
// Consulta al backend todos los créditos y los muestra en la tabla
// ===========================================
function cargarCreditos() {
  fetch("/creditos")
    .then((res) => res.json())
    .then((data) => {
      tablaBody.innerHTML = ""; // Limpia tabla antes de volver a cargarla

      data.forEach((credito) => {
        const fila = document.createElement("tr");
        fila.innerHTML = `
          <td>${credito.id}</td>
          <td>${credito.cliente}</td>
          <td>${credito.monto}</td>
          <td>${credito.tasa_interes}</td>
          <td>${credito.plazo}</td>
          <td>${credito.fecha_otorgamiento}</td>
          <td>
            <button onclick="editarCredito(${credito.id})">Editar</button>
            <button onclick="borrarCredito(${credito.id})">Borrar</button>
          </td>
        `;
        tablaBody.appendChild(fila);
      });

      // Llama a la función para graficar después de cargar los datos
      graficarCreditos();
    })
    .catch(() => mostrarMensaje("Error al cargar créditos", true));
}

// ===========================================
// Evento: Enviar formulario (Registrar o actualizar crédito)
// ===========================================
formulario.addEventListener("submit", function (e) {
  e.preventDefault(); // Previene el comportamiento por defecto (recargar página)

  // Captura y valida los datos ingresados
  const cliente = formulario.cliente.value.trim();
  const monto = parseFloat(formulario.monto.value);
  const tasa_interes = parseFloat(formulario.tasa_interes.value);
  const plazo = parseInt(formulario.plazo.value);
  const fecha_otorgamiento = formulario.fecha_otorgamiento.value;

  // Validaciones básicas
  if (!cliente) return mostrarMensaje("El campo cliente es obligatorio", true);
  if (isNaN(monto) || monto <= 0) return mostrarMensaje("Monto debe ser un número positivo", true);
  if (isNaN(tasa_interes) || tasa_interes < 0) return mostrarMensaje("Tasa de interés debe ser 0 o positiva", true);
  if (isNaN(plazo) || plazo <= 0) return mostrarMensaje("Plazo debe ser un número entero positivo", true);
  if (!fecha_otorgamiento) return mostrarMensaje("Fecha de otorgamiento es obligatoria", true);

  // Determina si es creación (POST) o edición (PUT)
  const id = formulario.id.value;
  const metodo = id ? "PUT" : "POST";
  const url = id ? `/creditos/${id}` : "/creditos";

  // Enviar los datos al backend
  fetch(url, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cliente,
      monto,
      tasa_interes,
      plazo,
      fecha_otorgamiento,
    }),
  })
    .then((res) => {
      if (!res.ok) throw new Error("Error en la petición");
      return res.json();
    })
    .then((data) => {
      mostrarMensaje(data.mensaje);  // Muestra mensaje del servidor
      limpiarFormulario();           // Limpia el formulario
      cargarCreditos();              // Recarga la tabla actualizada
    })
    .catch(() => mostrarMensaje("Error al guardar el crédito", true));
});

// ===========================================
// Función: borrarCredito
// Elimina un crédito por ID, previa confirmación
// ===========================================
function borrarCredito(id) {
  if (!confirm("¿Seguro que quieres borrar este crédito?")) return;

  fetch(`/creditos/${id}`, { method: "DELETE" })
    .then((res) => res.json())
    .then((data) => {
      mostrarMensaje(data.mensaje);
      cargarCreditos(); // Recargar tabla después de borrar
    })
    .catch(() => mostrarMensaje("Error al borrar el crédito", true));
}

// ===========================================
// Función: editarCredito
// Carga un crédito específico en el formulario para edición
// ===========================================
function editarCredito(id) {
  fetch(`/creditos`)
    .then((res) => res.json())
    .then((data) => {
      const credito = data.find((c) => c.id === id);
      if (!credito) return mostrarMensaje("Crédito no encontrado", true);

      // Carga los valores en el formulario
      formulario.id.value = credito.id;
      formulario.cliente.value = credito.cliente;
      formulario.monto.value = credito.monto;
      formulario.tasa_interes.value = credito.tasa_interes;
      formulario.plazo.value = credito.plazo;
      formulario.fecha_otorgamiento.value = credito.fecha_otorgamiento;

      // Cambia el estado del formulario a edición
      btnSubmit.textContent = "Actualizar";
      btnCancel.style.display = "inline";
      mostrarMensaje("");
    })
    .catch(() => mostrarMensaje("Error al cargar crédito para editar", true));
}

// ===========================================
// Evento: Cancelar edición
// ===========================================
btnCancel.addEventListener("click", function () {
  limpiarFormulario();
  mostrarMensaje("");
});

// ===========================================
// Cargar todos los créditos al cargar la página
// ===========================================
cargarCreditos();


// ===========================================
// Gráfico con Chart.js: Créditos por cliente
// ===========================================
function graficarCreditos() {
  fetch("/datos-grafico")
    .then((res) => res.json())
    .then((data) => {
      const ctx = document.getElementById("graficoCreditos").getContext("2d");

      // Evita que se duplique la gráfica al recargar datos
      if (window.miGrafica) {
        window.miGrafica.destroy();
      }

      // Crear nuevo gráfico de barras
      window.miGrafica = new Chart(ctx, {
        type: "bar",
        data: {
          labels: data.clientes,  // Etiquetas del eje X (nombres de clientes)
          datasets: [{
            label: "Créditos por cliente",
            data: data.totales,   // Datos del eje Y (cantidad de créditos)
            backgroundColor: "rgba(54, 162, 235, 0.5)",
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
            ticks: {
              stepSize: 1  // 👈 Esto asegura solo valores enteros en el eje Y
            },
              title: {
                display: true,
                text: "Cantidad de Créditos"
              }
            },
            x: {
              title: {
                display: true,
                text: "Clientes"
              }
            }
          }
        }
      });
    })
    .catch(() => console.error("Error al obtener datos del gráfico"));
}
