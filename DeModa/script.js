let map, marker = null;
let coordsSeleccionadas = null;
let stream;
let textoCompleto = `Se recomienda el uso de este outfit, ya que presenta un conjunto más ligero en comparación con los otros, que son más cargados. Además, este es perfecto porque el lugar al que te diriges presenta un clima templado y despejado. Se aconseja no sobrecargar el look con accesorios. También se recomienda el uso del bolso que se muestra en el tercer outfit.`;

// URL de tu función en Google Cloud Function (cambia por la URL real)
const URL_API = "https://us-central1-tu-proyecto.cloudfunctions.net/analizar_outfit";

// Referencia al carrusel
const carousel = document.getElementById("carousel");

// Función para posicionar carrusel centrado en índice seleccionado
function posicionarCarrusel(indiceSeleccionado = null) {
  const items = carousel.querySelectorAll(".carousel-item");
  const count = items.length;
  if (count === 0) return;

  if (indiceSeleccionado === null) {
    indiceSeleccionado = Math.floor(count / 2);
  }

  items.forEach((item, i) => {
    const offset = i - indiceSeleccionado;
    const absOffset = Math.abs(offset);

    if (offset === 0) {
      item.style.transform = `translateX(0px) translateZ(100px) rotateY(0deg) scale(1.1)`;
      item.style.zIndex = 1000;
      item.style.opacity = 1;
    } else if (absOffset <= 3) {
      const distanciaX = offset * 140;
      const rotacionY = offset * -30;
      const escala = 1 - 0.15 * absOffset;
      const zIndex = 1000 - absOffset * 10;

      item.style.transform = `translateX(${distanciaX}px) translateZ(${100 - absOffset * 50}px) rotateY(${rotacionY}deg) scale(${escala})`;
      item.style.zIndex = zIndex;
      item.style.opacity = 1;
    } else {
      item.style.transform = `translateX(0px) translateZ(-200px)`;
      item.style.opacity = 0;
      item.style.zIndex = 0;
    }
  });
}

// Agregar imagen al carrusel con evento para centrar al hacer click
function agregarImagenCarrusel(url) {
  const nuevoDiv = document.createElement("div");
  nuevoDiv.classList.add("carousel-item");

  const img = document.createElement("img");
  img.src = url;

  img.onclick = () => {
    const items = Array.from(carousel.querySelectorAll(".carousel-item"));
    const idx = items.indexOf(nuevoDiv);
    posicionarCarrusel(idx);
  };

  nuevoDiv.appendChild(img);

  const btnAgregar = document.getElementById("add-image-btn");
  carousel.insertBefore(nuevoDiv, btnAgregar);

  posicionarCarrusel(); // centra al medio
}

// Evento click en "+" para abrir menú opciones
document.getElementById("add-image-btn").onclick = abrirSelectorImagen;

// Evento click en botón "Agregar más" para abrir menú opciones
const botonAgregarMas = document.querySelector('button[onclick="abrirSelectorImagen()"]');
if (botonAgregarMas) {
  botonAgregarMas.onclick = abrirSelectorImagen;
}

// Cerrar popup si se hace click fuera de él (salvo botones que abren popup)
document.addEventListener("click", function(event) {
  const popup = document.getElementById("popupOpciones");
  if (!popup.classList.contains("oculto")) {
    const clicDentroPopup = popup.contains(event.target);
    const clicEnAddBtn = event.target.closest('#add-image-btn');
    const clicEnAgregarMas = event.target.closest('button[onclick="abrirSelectorImagen()"]');
    if (!clicDentroPopup && !clicEnAddBtn && !clicEnAgregarMas) {
      popup.classList.add("oculto");
    }
  }
});

// Función para abrir el popup menú opciones
function abrirSelectorImagen() {
  document.getElementById("popupOpciones").classList.remove("oculto");
}

// Usar archivo local
function usarArchivo() {
  document.getElementById("inputImagen").click();
  document.getElementById("popupOpciones").classList.add("oculto");
}

// Iniciar cámara para tomar foto
function iniciarCamara() {
  const camara = document.getElementById("camaraContenedor");
  camara.classList.remove("oculto");
  document.getElementById("popupOpciones").classList.add("oculto");

  navigator.mediaDevices.getUserMedia({ video: true })
    .then(s => {
      stream = s;
      document.getElementById("video").srcObject = stream;
    })
    .catch(() => {
      alert("No se pudo acceder a la cámara.");
    });
}

// Capturar foto de la cámara y agregar al carrusel
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

// Evento input archivo seleccionado
document.getElementById("inputImagen").addEventListener("change", function(e) {
  const archivo = e.target.files[0];
  if (archivo) {
    const url = URL.createObjectURL(archivo);
    agregarImagenCarrusel(url);
    this.value = "";
  }
});

// Mostrar mapa y consultar clima (igual que antes)
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

      const hour = document.getElementById("hour")?.value.padStart(2, '0') || "12";
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
      } catch {
        document.getElementById("weatherCard").textContent = "Error al consultar clima.";
      }
    });
  }
}

// Guardar ubicación del mapa
document.getElementById("establecerUbicacion").addEventListener("click", () => {
  if (!coordsSeleccionadas) {
    alert("Selecciona una ubicación primero.");
    return;
  }
  alert(`Ubicación guardada: ${coordsSeleccionadas.lat.toFixed(4)}, ${coordsSeleccionadas.lng.toFixed(4)}`);
  document.getElementById("mapaContenedor").classList.remove("visible");
});

// Enviar outfits uno a uno al backend
async function enviarOutfits() {
  const resultadosDiv = document.getElementById("resultadosAPI");
  resultadosDiv.innerHTML = "Enviando outfits...<br>";

  const images = Array.from(document.querySelectorAll(".carousel-item img")).filter(img => {
    return !img.parentElement.classList.contains("mas");
  });

  if (images.length === 0) {
    resultadosDiv.innerHTML = "No hay imágenes para enviar.";
    return;
  }

  for (let i = 0; i < images.length; i++) {
    resultadosDiv.innerHTML += `<br>Procesando imagen ${i + 1} de ${images.length}...<br>`;

    try {
      const base64 = await convertirImgABase64(images[i].src);

      const payload = {
        base64_image: base64.split(",")[1] // quitar "data:image/png;base64,"
      };

      const respuesta = await fetch(URL_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!respuesta.ok) {
        resultadosDiv.innerHTML += `Error en imagen ${i + 1}: ${respuesta.statusText}<br>`;
        continue;
      }

      const data = await respuesta.json();
      resultadosDiv.innerHTML += `<pre>${JSON.stringify(data, null, 2)}</pre><hr>`;
    } catch (error) {
      resultadosDiv.innerHTML += `Error procesando imagen ${i + 1}: ${error.message}<br>`;
    }
  }

  resultadosDiv.innerHTML += "<br>Proceso terminado.";
}

// Convertir URL imagen a base64
function convertirImgABase64(url) {
  return new Promise((resolve, reject) => {
    if (url.startsWith("data:image")) {
      resolve(url);
      return;
    }
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = function() {
      const canvas = document.createElement("canvas");
      canvas.width = this.width;
      canvas.height = this.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(this, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = function() {
      reject(new Error("No se pudo cargar la imagen para convertir."));
    };
    img.src = url;
  });
}

// Asociar evento al botón enviar outfits
document.getElementById("btnEnviarOutfits").addEventListener("click", enviarOutfits);

// Inicializar carrusel al cargar la página
window.onload = () => posicionarCarrusel();
