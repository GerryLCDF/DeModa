// Colores disponibles para selector
const colors = [
  "black", "white", "red", "green", "blue", "yellow", "cyan", "magenta",
  "gray", "silver", "maroon", "olive", "lime", "teal", "navy", "purple",
  "aqua", "fuchsia", "orange", "brown", "gold", "pink", "violet", "indigo",
  "coral", "salmon", "turquoise", "beige", "tan", "khaki", "lavender",
  "crimson", "chocolate", "tomato", "sienna", "skyblue", "slategray",
];

const container = document.getElementById("colorBubbles");

// Crear burbujas de colores
colors.forEach((color) => {
  const bubble = document.createElement("div");
  bubble.className = "color-bubble";
  bubble.style.backgroundColor = color;
  bubble.tabIndex = 0; // para accesibilidad

  bubble.addEventListener("click", () => {
    if (bubble.classList.contains("selected")) {
      bubble.classList.remove("selected");
      bubble.innerHTML = "";
    } else {
      bubble.classList.add("selected");
      bubble.innerHTML = '<span class="checkmark">✔</span>';
    }
  });

  bubble.addEventListener("keypress", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      bubble.click();
    }
  });

  container.appendChild(bubble);
});

// Scroll botones para colores
document.querySelector(".scroll-btn.left").onclick = () => {
  container.scrollBy({ left: -100, behavior: "smooth" });
};

document.querySelector(".scroll-btn.right").onclick = () => {
  container.scrollBy({ left: 100, behavior: "smooth" });
};


// ---------- MAPA -------------

let map, marker = null;
let coordsSeleccionadas = null;

const mapaContenedor = document.getElementById("mapaContenedor");
const lugarInput = document.getElementById("lugarEvento");
const btnEstablecer = document.getElementById("establecerUbicacion");

// Inicializar mapa sólo una vez
function inicializarMapa() {
  if (map) return;

  // Centro inicial: Ciudad de México y zoom general
  map = L.map('map').setView([19.43, -99.13], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  // Evento click para marcar ubicación
  map.on('click', function(e) {
    coordsSeleccionadas = e.latlng;

    if (marker) {
      marker.setLatLng(coordsSeleccionadas);
    } else {
      marker = L.marker(coordsSeleccionadas).addTo(map);
    }
  });
}

// Abrir mapa al hacer clic en input
lugarInput.addEventListener("click", () => {
  mapaContenedor.classList.add("visible");
  inicializarMapa();
});

// Botón para establecer ubicación
btnEstablecer.addEventListener("click", () => {
  if (!coordsSeleccionadas) {
    alert("Selecciona una ubicación en el mapa primero.");
    return;
  }

  // Poner las coordenadas en el input
  lugarInput.value = `${coordsSeleccionadas.lat.toFixed(6)}, ${coordsSeleccionadas.lng.toFixed(6)}`;

  // Ocultar el mapa
  mapaContenedor.classList.remove("visible");
});

// Cerrar mapa si se da clic fuera del mapa (fondo modal)
mapaContenedor.addEventListener("click", (e) => {
  if (e.target === mapaContenedor) {
    mapaContenedor.classList.remove("visible");
  }
});


// -------- ENVIO FORMULARIO -----------

document.getElementById("btnEnviar").addEventListener("click", (e) => {
  e.preventDefault();

  const tipoEvento = document.getElementById("tipoEvento").value.trim();
  const lugarEvento = lugarInput.value.trim();
  const fechaEvento = document.getElementById("fechaEvento").value;
  const horaEvento = document.getElementById("horaEvento").value;
  const edad = document.getElementById("edad").value;
  const genero = document.getElementById("genero").value;

  if (
    !tipoEvento ||
    !lugarEvento ||
    !fechaEvento ||
    !horaEvento ||
    !edad ||
    !genero
  ) {
    alert("Por favor, complete todos los campos obligatorios.");
    return;
  }

  // Colores favoritos seleccionados
  const coloresSeleccionados = [];
  document.querySelectorAll(".color-bubble.selected").forEach((bubble) => {
    coloresSeleccionados.push(bubble.style.backgroundColor);
  });

  // Extraer latitud y longitud desde el input "lugarEvento"
  let lat = null, lng = null;
  const coords = lugarEvento.split(",");
  if (coords.length === 2) {
    lat = parseFloat(coords[0].trim());
    lng = parseFloat(coords[1].trim());
  }

  const datosFormulario = {
    evento: {
      tipo: tipoEvento,
      lugar: {
        texto: lugarEvento,
        latitud: lat,
        longitud: lng
      },
      fecha: fechaEvento,
      hora: horaEvento,
    },
    persona: {
      edad: Number(edad),
      genero: genero,
      coloresFavoritos: coloresSeleccionados,
    },
  };

  downloadJSON(datosFormulario);
});

// Función para descargar JSON
function downloadJSON(data, filename = "datos_formulario.json") {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
