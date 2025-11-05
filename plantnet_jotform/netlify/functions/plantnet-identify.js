const Busboy = require("busboy");
const FormData = require("form-data");
const fetch = require("node-fetch");
const sharp = require("sharp");

// ⚙️ Imposta la tua API Key PlantNet come variabile d'ambiente Netlify
// Esempio: netlify env:set PLANTNET_API_KEY "la-tua-api-key"
const PLANTNET_API_KEY = process.env.PLANTNET_API_KEY;
const PLANTNET_ENDPOINT = "https://my.plantnet.org/v2/identify/all"; // Cambia se usi un altro endpoint

// 🔧 Converte HEIC/HEIF in JPEG, altrimenti restituisce il buffer com'è
async function normalizeImageToJpeg(buffer, mimeType, fileName = "") {
  const lowerMime = (mimeType || "").toLowerCase();
  const lowerName = (fileName || "").toLowerCase();

  const isHeic =
    lowerMime.includes("image/heic") ||
    lowerMime.includes("image/heif") ||
    lowerName.endsWith(".heic") ||
    lowerName.endsWith(".heif");

  if (!isHeic) {
    return { buffer, mimeType, fileName };
  }

  console.log("🔁 Conversione HEIC → JPEG...");
  const jpegBuffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();

  const newName = lowerName
    ? lowerName.replace(/\.heic$|\.heif$/i, ".jpg")
    : "image.jpg";

  return {
    buffer: jpegBuffer,
    mimeType: "image/jpeg",
    fileName: newName,
  };
}

// 🚀 Funzione Netlify principale
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const contentType =
      event.headers["content-type"] || event.headers["Content-Type"];

    if (!contentType || !contentType.startsWith("multipart/form-data")) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Content-Type non valido" }),
      };
    }

    // 1️⃣ Estrae TUTTI i file dal body (supporto multi-immagine)
    const files = await new Promise((resolve, reject) => {
      const bb = Busboy({
        headers: { "content-type": contentType },
      });

      const collectedFiles = [];

      bb.on("file", (fieldname, file, info) => {
        const { mimeType, filename } = info;

        let fileBuffer = Buffer.alloc(0);

        file.on("data", (data) => {
          fileBuffer = Buffer.concat([fileBuffer, data]);
        });

        file.on("end", () => {
          if (fileBuffer.length) {
            collectedFiles.push({
              buffer: fileBuffer,
              mimeType,
              fileName: filename,
            });
          }
        });
      });

      bb.on("error", reject);

      bb.on("finish", () => {
        if (!collectedFiles.length) {
          return reject(new Error("Nessun file ricevuto"));
        }
        resolve(collectedFiles);
      });

      bb.end(Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8"));
    });

    console.log(`📸 Ricevute ${files.length} immagini`);

    // 2️⃣ Converte eventuali HEIC → JPEG
    const normalizedFiles = await Promise.all(
      files.map((f) => normalizeImageToJpeg(f.buffer, f.mimeType, f.fileName))
    );

    // 3️⃣ Prepara la richiesta per PlantNet con più immagini
    const form = new FormData();

    normalizedFiles.forEach((nf, index) => {
      form.append("images", nf.buffer, {
        filename: nf.fileName || `image-${index + 1}.jpg`,
        contentType: nf.mimeType || "image/jpeg",
      });
    });

    // Parametri aggiuntivi: adatta alle tue esigenze
    // Puoi usare organs diversi, es: "leaf,flower,fruit"
    form.append("organs", "leaf");
    form.append("api-key", PLANTNET_API_KEY);

    // 4️⃣ Invio a PlantNet
    const response = await fetch(PLANTNET_ENDPOINT, {
      method: "POST",
      body: form,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("❌ Errore da PlantNet:", response.status, text);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Errore da PlantNet",
          status: response.status,
          details: text.slice(0, 300),
        }),
      };
    }

    const result = await response.json();

    // 5️⃣ Risposta al frontend
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error("💥 Errore interno:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal server error",
        message: err.message,
      }),
    };
  }
};
