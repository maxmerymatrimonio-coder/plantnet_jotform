// netlify/functions/plantnet-identify.js

const Busboy = require("busboy");
const sharp = require("sharp");
const fetch = require("node-fetch");
const FormData = require("form-data");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Metodo non consentito" }),
      };
    }

    // Corpo della richiesta: immagine in base64
    const { imageBase64 } = JSON.parse(event.body || "{}");
    if (!imageBase64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Nessuna immagine fornita" }),
      };
    }

    const apiKey = process.env.PLANTNET_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Chiave API PlantNet mancante" }),
      };
    }

    // Conversione Base64 → Buffer → JPEG ottimizzato
    const imageBuffer = Buffer.from(imageBase64, "base64");
    const jpegBuffer = await sharp(imageBuffer)
      .jpeg({ quality: 90 })
      .toBuffer();

    // Preparo form-data per l’upload a PlantNet
    const formData = new FormData();
    formData.append("organs", "auto"); // lascia decidere a PlantNet
    formData.append("images", jpegBuffer, {
      filename: "upload.jpg",
      contentType: "image/jpeg",
    });

    const apiUrl = `https://my-api.plantnet.org/v2/identify/all?api-key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Errore PlantNet:", text);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: "Errore da PlantNet API" }),
      };
    }

    const data = await response.json();

    // Estraggo il primo risultato utile
    const best = data.results && data.results[0];
    if (!best) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          scientificName: "Non riconosciuto",
          commonName: "",
          reliability: 0,
          allergenicity: "N/D",
        }),
      };
    }

    const scientificName =
      best.species?.scientificNameWithoutAuthor ||
      best.species?.scientificName ||
      "Specie non identificata";

    const commonName =
      best.species?.commonNames?.[0] || "Nome comune non disponibile";

    const reliability = best.score || 0;

    // 🔸 Risposta finale al browser
    return {
      statusCode: 200,
      body: JSON.stringify({
        scientificName,
        commonName,
        reliability,
        allergenicity: "N/D",
      }),
    };
  } catch (error) {
    console.error("Errore interno funzione:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Errore interno", details: error.message }),
    };
  }
};
