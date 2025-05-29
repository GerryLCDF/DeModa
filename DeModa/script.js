const carousel = document.getElementById("carousel");
const popupOpciones = document.getElementById("popupOpciones");
const camaraContenedor = document.getElementById("camaraContenedor");
const video = document.getElementById("video");
const inputImagen = document.getElementById("inputImagen");
const API_UPLOAD_URL = "http://localhost:3000/upload";
const API_LIST_URL = "http://localhost:3000/images";
const URL_API = "TU_API_KEY_AQUI"; // Cambia por tu API real

let stream = null;

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
      item.style.transform = "translateX(0px) translateZ(100px) rotateY(0deg) scale(1.1)";
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
      item.style.transform = "translateX(0px) translateZ(-200px)";
      item.style.opacity = 0;
      item.style.zIndex = 0;
    }
  });
}

function agregarImagenCarrusel(url) {
  const nuevoDiv = document.createElement("div");
  nuevoDiv.classList.add("carousel-item");

  const imgContainer = document.createElement("div");
  imgContainer.classList.add("img-container");

  const img = document.createElement("img");
  img.src = url;
  img.alt = "Outfit";

  img.onclick = () => {
    const items = Array.from(carousel.querySelectorAll(".carousel-item"));
    const idx = items.indexOf(nuevoDiv);
    posicionarCarrusel(idx);
  };

  imgContainer.appendChild(img);

  const deleteBar = document.createElement("div");
  deleteBar.classList.add("delete-bar");

  const btnEliminar = document.createElement("button");
  btnEliminar.textContent = "X";

  btnEliminar.onclick = async (event) => {
    event.stopPropagation();
    if (!confirm("¿Eliminar esta imagen?")) return;

    const filename = url.split("/").pop();

    try {
      const resp = await fetch(`http://localhost:3000/delete/${filename}`, {
        method: "DELETE",
      });
      if (!resp.ok) {
        alert("Error al eliminar la imagen en servidor");
        return;
      }
      nuevoDiv.remove();
      posicionarCarrusel();
      await fetch("http://localhost:3000/reordenar", { method: "POST" });
    } catch (error) {
      alert("Error al eliminar la imagen: " + error.message);
    }
  };

  deleteBar.appendChild(btnEliminar);
  nuevoDiv.appendChild(imgContainer);
  nuevoDiv.appendChild(deleteBar);

  const btnAgregar = document.getElementById("add-image-btn");
  carousel.insertBefore(nuevoDiv, btnAgregar);

  posicionarCarrusel();
}

function abrirSelectorImagen() {
  popupOpciones.classList.remove("oculto");
}

function usarArchivo() {
  inputImagen.click();
}

inputImagen.addEventListener("change", async function (e) {
  const archivo = e.target.files[0];
  if (archivo) {
    try {
      const urlGuardada = await subirBlobAlServidor(archivo);
      agregarImagenCarrusel(urlGuardada);
    } catch (error) {
      alert("Error al subir la imagen: " + error.message);
    }
    this.value = "";
    popupOpciones.classList.add("oculto");
  }
});

// Abre cámara y pide permiso correctamente
async function iniciarCamara() {
  popupOpciones.classList.add("oculto");
  camaraContenedor.classList.remove("oculto");
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    video.srcObject = stream;
    await video.play();
  } catch (err) {
    alert("No se pudo acceder a la cámara: " + err.message);
    cerrarCamara();
  }
}

function capturarFoto() {
  if (!stream) {
    alert("La cámara no está iniciada");
    return;
  }
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob(async (blob) => {
    if (blob) {
      try {
        const urlGuardada = await subirBlobAlServidor(blob);
        agregarImagenCarrusel(urlGuardada);
      } catch (error) {
        alert("Error al subir la foto: " + error.message);
      }
    }
  }, "image/png");

  cerrarCamara();
}

function cerrarCamara() {
  camaraContenedor.classList.add("oculto");
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
}

async function subirBlobAlServidor(blob) {
  const formData = new FormData();
  formData.append("image", blob, "foto.png");

  const respuesta = await fetch(API_UPLOAD_URL, {
    method: "POST",
    body: formData,
  });

  if (!respuesta.ok) throw new Error("Error al subir la imagen");

  const data = await respuesta.json();
  return data.url;
}

async function cargarImagenesGuardadas() {
  try {
    const resp = await fetch(API_LIST_URL);
    if (!resp.ok) throw new Error("No se pudieron cargar imágenes");
    const urls = await resp.json();

    const btnAgregar = document.getElementById("add-image-btn");
    const carouselElem = btnAgregar.parentElement;
    Array.from(carouselElem.querySelectorAll(".carousel-item")).forEach(item => {
      if (!item.classList.contains("mas")) item.remove();
    });

    urls.forEach(url => agregarImagenCarrusel(url));
    posicionarCarrusel();
  } catch (e) {
    console.warn(e);
  }
}

function convertirImgABase64(url) {
  return new Promise((resolve, reject) => {
    if (url.startsWith("data:image")) {
      resolve(url);
      return;
    }
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = function () {
      const canvas = document.createElement("canvas");
      canvas.width = this.width;
      canvas.height = this.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(this, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = function () {
      reject(new Error("No se pudo cargar la imagen para convertir."));
    };
    img.src = url;
  });
}

async function enviarOutfits() {
  const resultadosDiv = document.getElementById("resultadosAPI");
  resultadosDiv.innerHTML = "Enviando outfits...<br>";

  const images = Array.from(document.querySelectorAll(".carousel-item img")).filter(
    img => !img.parentElement.classList.contains("mas")
  );

  if (images.length === 0) {
    resultadosDiv.innerHTML = "No hay imágenes para enviar.";
    return;
  }

  for (let i = 0; i < images.length; i++) {
    resultadosDiv.innerHTML += `<br>Procesando imagen ${i + 1} de ${images.length}...<br>`;

    try {
      const base64 = await convertirImgABase64(images[i].src);

      const payload = { base64_image: base64.split(",")[1] };

      const respuesta = await fetch(URL_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

document.getElementById("add-image-btn").onclick = abrirSelectorImagen;

document.addEventListener("click", (event) => {
  if (!popupOpciones.classList.contains("oculto")) {
    const clicDentroPopup = popupOpciones.contains(event.target);
    const clicEnAddBtn = event.target.closest("#add-image-btn");
    const clicEnAgregarMas = event.target.closest('button[onclick="abrirSelectorImagen()"]');
    if (!clicDentroPopup && !clicEnAddBtn && !clicEnAgregarMas) {
      popupOpciones.classList.add("oculto");
    }
  }
});

function abrirSelectorImagen() {
  popupOpciones.classList.remove("oculto");
}

window.abrirSelectorImagen = abrirSelectorImagen;
window.iniciarCamara = iniciarCamara;
window.capturarFoto = capturarFoto;
window.usarArchivo = usarArchivo;
window.enviarOutfits = enviarOutfits;

window.onload = () => {
  cargarImagenesGuardadas();
};

function usarArchivo() {
  document.getElementById("inputImagen").click();
  document.getElementById("popupOpciones").classList.add("oculto");
}

