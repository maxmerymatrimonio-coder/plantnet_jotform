// ✅ Funzione Netlify: identifica pianta con PlantNet (senza node-fetch, solo fetch globale)
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
        body: JSON.stringify({ error: "Chiave API mancante (PLANTNET_API_KEY)" }),
      };
    }

    // 📸 Controllo immagine
    if (!imageBase64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Nessuna immagine ricevuta" }),
      };
    }

    // 🧩 Crea il form-data multipart corretto
    const form = new FormData();
    const buffer = Buffer.from(imageBase64, "base64");
    form.append("organs", "leaf");
    form.append("images", buffer, {
      filename: "pianta.jpg",
      contentType: "image/jpeg",
    });

    // 🌿 URL PlantNet con lingua italiana
    const apiUrl = `https://my-api.plantnet.org/v2/identify/all?api-key=${apiKey}&lang=it`;

    // 🚀 Chiamata a PlantNet usando il fetch GLOBALE di Node 18 / Netlify
    const response = await fetch(apiUrl, {
      method: "POST",
      body: form,
      headers: form.getHeaders(),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Errore PlantNet:", response.status, text);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: "Errore da PlantNet",
          status: response.status,
          detail: text,
        }),
      };
    }

    const data = await response.json();
    const result = data.results && data.results[0];

    const scientificName =
      result?.species?.scientificNameWithoutAuthor || "Sconosciuta";

    const commonNames = result?.species?.commonNames || [];
    const commonName = commonNames[0] || "Nome comune non disponibile";

    const reliability =
      typeof result?.score === "number" ? result.score.toFixed(2) : "N/D";

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
