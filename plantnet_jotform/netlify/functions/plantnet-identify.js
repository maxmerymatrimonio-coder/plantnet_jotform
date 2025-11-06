// netlify/functions/plantnet-identify.js
// Funzione Netlify SENZA dipendenze esterne (usa solo fetch/FormData/Blob di Node 18)

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Metodo non consentito" }),
      };
    }

    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Corpo richiesta non valido" }),
      };
    }

    const imageBase64 = body.imageBase64;
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

    const imageBuffer = Buffer.from(imageBase64, "base64");

    const blob = new Blob([imageBuffer], { type: "image/jpeg" });
    const formData = new FormData();
    formData.append("organs", "auto");
    formData.append("images", blob, "upload.jpg");

    // lingua italiana per i nomi comuni
    const apiUrl = `https://my-api.plantnet.org/v2/identify/all?lang=it&api-key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("Errore PlantNet:", response.status, text);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: "Errore da PlantNet API" }),
      };
    }

    const data = await response.json();

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
      (best.species &&
        (best.species.scientificNameWithoutAuthor ||
          best.species.scientificName)) ||
      "Specie non identificata";

    const commonName =
      (best.species &&
        best.species.commonNames &&
        best.species.commonNames[0]) ||
      "Nome comune non disponibile";

    const reliability = typeof best.score === "number" ? best.score : 0;

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
      body: JSON.stringify({
        error: "Errore interno",
        details: error.message,
      }),
    };
  }
};
