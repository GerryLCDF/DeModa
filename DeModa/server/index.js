const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// Carpeta donde se guardan las imágenes
const uploadFolder = path.join("G:", "outfits");

console.log("Carpeta de uploads configurada en:", uploadFolder);

if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true });
  console.log("Carpeta creada:", uploadFolder);
} else {
  console.log("Carpeta ya existe:", uploadFolder);
}

app.use(cors());
app.use(express.static(uploadFolder));

// Configuración de multer para guardar con nombre secuencial ID#
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadFolder);
  },
  filename: (req, file, cb) => {
    fs.readdir(uploadFolder, (err, files) => {
      if (err) {
        return cb(null, `ID1${path.extname(file.originalname)}`);
      }
      const imagenes = files.filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f));

      let maxId = 0;
      imagenes.forEach(fileName => {
        const match = fileName.match(/^ID(\d+)\./i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxId) maxId = num;
        }
      });

      const nuevoId = maxId + 1;
      const nuevoNombre = `ID${nuevoId}${path.extname(file.originalname)}`;
      console.log("Guardando archivo como:", nuevoNombre);
      cb(null, nuevoNombre);
    });
  },
});

const upload = multer({ storage: storage });

app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const url = `http://localhost:${PORT}/${req.file.filename}`;
  console.log("Imagen subida:", url);
  res.json({ url });
});

// Listar imágenes ordenadas por ID numérico
app.get("/images", (req, res) => {
  fs.readdir(uploadFolder, (err, files) => {
    if (err) {
      console.error("Error leyendo carpeta:", err);
      return res.status(500).json({ error: "No se pueden leer las imágenes" });
    }
    const images = files
      .filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f))
      .map(f => ({
        name: f,
        number: parseInt(f.match(/^ID(\d+)\./i)?.[1] || "0", 10)
      }))
      .sort((a, b) => a.number - b.number)
      .map(f => `http://localhost:${PORT}/${f.name}`);

    res.json(images);
  });
});

// Eliminar imagen por nombre
app.delete("/delete/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadFolder, filename);

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error("Error eliminando archivo:", err);
      return res.status(500).json({ error: "No se pudo eliminar la imagen" });
    }
    console.log(`Archivo eliminado: ${filename}`);
    res.json({ message: "Imagen eliminada correctamente" });
  });
});

// Función para renombrar archivos secuencialmente (sin huecos)
function renombrarArchivosSecuencialmente() {
  return new Promise((resolve, reject) => {
    fs.readdir(uploadFolder, (err, files) => {
      if (err) return reject(err);

      const imagenes = files.filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f))
        .map(f => ({
          name: f,
          ext: path.extname(f),
          num: parseInt(f.match(/^ID(\d+)\./i)?.[1] || "0", 10)
        }))
        .sort((a, b) => a.num - b.num);

      let renamePromises = [];
      imagenes.forEach((img, index) => {
        const nuevoNombre = `ID${index + 1}${img.ext}`;
        if (img.name !== nuevoNombre) {
          const viejoPath = path.join(uploadFolder, img.name);
          const nuevoPath = path.join(uploadFolder, nuevoNombre);
          renamePromises.push(new Promise((res, rej) => {
            fs.rename(viejoPath, nuevoPath, err => {
              if (err) rej(err);
              else res();
            });
          }));
        }
      });

      Promise.all(renamePromises)
        .then(() => resolve())
        .catch(reject);
    });
  });
}

// Endpoint para renombrar archivos secuencialmente
app.post("/reordenar", async (req, res) => {
  try {
    await renombrarArchivosSecuencialmente();
    res.json({ message: "Archivos renombrados secuencialmente" });
  } catch (error) {
    console.error("Error reordenando archivos:", error);
    res.status(500).json({ error: "No se pudo renombrar archivos" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
