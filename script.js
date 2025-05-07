let map, marker = null;
let coordsSeleccionadas = null;
let stream;
let outfitSeleccionado = null;

// 📷 ABRIR MENÚ DE OPCIONES DE IMAGEN
function abrirSelectorImagen() {
  document.getElementById("popupOpciones").classList.remove("oculto");
}

// 📁 OPCIÓN: USAR ARCHIVO DEL SISTEMA
function usarArchivo() {
  document.getElementById("inputImagen").click();
  document.getElementById("popupOpciones").classList.add("oculto");
}

// 📸 OPCIÓN: USAR CÁMARA
function iniciarCamara() {
  const camara = document.getElementById("camaraContenedor");
  camara.classList.remove("oculto");
  document.getElementById("popupOpciones").classList.add("oculto");

  navigator.mediaDevices.getUserMedia({ video: true }).then(s => {
    stream = s;
    document.getElementById("video").srcObject = stream;
  }).catch(err => {
    alert("No se pudo acceder a la cámara.");
  });
}

// 📸 CAPTURAR FOTO DESDE LA CÁMARA
function capturarFoto() {
  const video = document.getElementById("video");
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL("image/png");

  agregarImagenCarrusel(url);

  document.getElementById("camaraContenedor").classList.add("oculto");
  if (stream) stream.getTracks().forEach(t => t.stop());
}

// 📁 CARGAR DESDE ARCHIVO
document.getElementById("inputImagen").addEventListener("change", function(e) {
  const archivo = e.target.files[0];
  if (archivo) {
    const url = URL.createObjectURL(archivo);
    agregarImagenCarrusel(url);
    this.value = "";
  }
});

// 🔁 FUNCIÓN PARA AGREGAR IMAGEN AL CARRUSEL
function agregarImagenCarrusel(url) {
  const nuevoDiv = document.createElement("div");
  nuevoDiv.classList.add("outfit");

  const img = document.createElement("img");
  img.src = url;

  nuevoDiv.appendChild(img);

  const contenedor = document.getElementById("outfitContainer");
  contenedor.insertBefore(nuevoDiv, contenedor.lastElementChild);
}

// 🗺️ MOSTRAR MAPA + CONSULTAR CLIMA
function mostrarMapa() {
  const contenedor = document.getElementById("mapaContenedor");
  contenedor.classList.add("visible");
  contenedor.classList.remove("oculto");

  if (!map) {
    map = L.map('map').setView([19.89, -100.45], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    map.on('click', async function(e) {
      coordsSeleccionadas = e.latlng;
      if (marker) map.removeLayer(marker);
      marker = L.marker([coordsSeleccionadas.lat, coordsSeleccionadas.lng]).addTo(map);

      const hour = document.getElementById("hour").value.padStart(2, '0');
      const today = new Date().toISOString().split("T")[0];
      const fullDateTime = `${today}T${hour}:00`;

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coordsSeleccionadas.lat}&longitude=${coordsSeleccionadas.lng}&hourly=temperature_2m,weather_code&timezone=auto&start_date=${today}&end_date=${today}`;

      try {
        const res = await fetch(url);
        const data = await res.json();
        const index = data.hourly.time.findIndex(t => t === fullDateTime);

        if (index === -1) {
          document.getElementById("weatherCard").textContent = "No hay clima disponible.";
          return;
        }

        const temp = data.hourly.temperature_2m[index];
        const code = data.hourly.weather_code[index];
        const description = {
          0: "Despejado", 1: "Mayormente despejado", 2: "Parcialmente nublado", 3: "Nublado",
          45: "Niebla", 48: "Niebla con escarcha", 51: "Llovizna ligera", 53: "Llovizna moderada",
          55: "Llovizna densa", 61: "Lluvia ligera", 63: "Lluvia moderada", 65: "Lluvia intensa",
          80: "Chubascos ligeros", 81: "Chubascos moderados", 82: "Chubascos intensos"
        }[code] || "Clima desconocido";

        document.getElementById("weatherCard").textContent =
          `Clima a las ${hour}:00 → ${description}, ${temp}°C`;
      } catch (err) {
        console.error(err);
        document.getElementById("weatherCard").textContent = "Error al consultar clima.";
      }
    });
  }
}

// 📌 GUARDAR UBICACIÓN
document.getElementById("establecerUbicacion").addEventListener("click", () => {
  if (!coordsSeleccionadas) {
    alert("Selecciona una ubicación primero.");
    return;
  }
  alert(`Ubicación guardada: ${coordsSeleccionadas.lat.toFixed(4)}, ${coordsSeleccionadas.lng.toFixed(4)}`);
  document.getElementById("mapaContenedor").classList.remove("visible");
});

// 🧑‍💻 SELECCIONAR IMAGEN POR TECLADO
document.addEventListener("keydown", (e) => {
  const key = e.key; // Captura el número de tecla presionado
  const imagenes = document.querySelectorAll(".outfit");
  const numeroImagen = parseInt(key);

  if (!isNaN(numeroImagen) && numeroImagen <= imagenes.length) {
    imagenes.forEach(img => img.classList.remove("seleccionado"));
    imagenes[numeroImagen - 1].classList.add("seleccionado");
  }
});
