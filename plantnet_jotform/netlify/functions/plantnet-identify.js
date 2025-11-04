// Netlify Function per identificare una pianta tramite l'API di PlantNet
// ✅ Versione aggiornata con lingua italiana (lang=it)

import fetch from "node-fetch";

export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const imageBase64 = body.imageBase64;

    if (!imageBase64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Nessuna immagine ricevuta." }),
      };
    }

    const API_KEY = process.env.PLANTNET_API_KEY;

    // ✅ lingua impostata su italiano
    const apiUrl = `https://my-api.plantnet.org/v2/identify/all?api-key=${API_KEY}&lang=it`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        images: [`data:image/jpeg;base64,${imageBase64}`],
        organs: ["leaf"],
      }),
    });

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          scientificName: "Non identificata",
          commonName: "Nessun risultato",
          reliability: "0",
          allergenicity: "N/D",
        }),
      };
    }

    const bestResult = data.results[0];
    const scientificName =
      bestResult.species?.scientificNameWithoutAuthor || "Sconosciuta";
    const commonName =
      bestResult.species?.commonNames?.[0] || "Nome comune non disponibile";
    const reliability = bestResult.score?.toFixed(2) || "N/D";

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
    console.error("Errore durante l'identificazione:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Errore interno del server" }),
    };
  }
}
