// ✅ Netlify Function: identifica pianta con PlantNET (versione corretta per lingua italiana)
const FormData = require("form-data");

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const imageBase64 = body.imageBase64;
    const apiKey = process.env.PLANTNET_API_KEY;

    // 🔒 Controllo chiave API
    if (!apiKey) {
      console.error("PLANTNET_API_KEY non configurata");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Chiave API mancante" }),
      };
    }

    // 📸 Controllo immagine
    if (!imageBase64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Nessuna immagine ricevuta" }),
      };
    }

    // 🧩 Crea form multipart
    const formData = new FormData();
    const buffer = Buffer.from(imageBase64, "base64");
    formData.append("images", buffer, { filename: "pianta.jpg" });
    formData.append("organs", "leaf"); // puoi cambiare in "flower", "fruit", ecc.

    // 🌿 URL con lingua italiana
    const apiUrl = `https://my-api.plantnet.org/v2/identify/all?api-key=${apiKey}&lang=it`;

    // 🚀 Chiamata PlantNET (senza node-fetch)
    const response = await fetch(apiUrl, {
      method: "POST",
      body: formData,
    });

    // ⚠️ Gestione errori risposta
    if (!response.ok) {
      const text = await response.text();
      console.error("Errore PlantNET:", text);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: "Errore da PlantNET",
          detail: text,
        }),
      };
    }

    // 📦 Analizza risposta JSON
    const data = await response.json();
    const result = data.results && data.results[0];

    const scientificName =
      result?.species?.scientificNameWithoutAuthor || "Sconosciuta";

    const commonNames = result?.species?.commonNames || [];
    const commonName = commonNames[0] || "Nome comune non disponibile";

    const reliability =
      typeof result?.score === "number" ? result.score.toFixed(2) : "N/D";

    // ✅ Ritorno dati
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
    console.error("Errore nella funzione Netlify:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Errore server",
        detail: String(error),
      }),
    };
  }
};
