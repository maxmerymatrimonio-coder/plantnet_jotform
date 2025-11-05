// netlify/functions/plantnet-identify.js
// Versione aggiornata: invia immagini in multipart/form-data
// e richiede i nomi comuni in italiano (lang=it)

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Metodo non consentito" }),
      };
    }

    const { imageBase64 } = JSON.parse(event.body || "{}");
    if (!imageBase64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Nessuna immagine ricevuta" }),
      };
    }

    const apiKey = process.env.PLANTNET_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "PLANTNET_API_KEY non configurata" }),
      };
    }

    // Conversione base64 in buffer binario
    const imageBuffer = Buffer.from(imageBase64, "base64");

    // Costruzione del form multipart
    const form = new FormData();
    form.append("organs", "leaf");
    form.append("images", new Blob([imageBuffer]), "photo.jpg");

    // Aggiungiamo lang=it per ottenere i nomi comuni in italiano
    const apiUrl = `https://my-api.plantnet.org/v2/identify/all?lang=it&api-key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      body: form,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Errore PlantNet:", response.status, text);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Errore server PlantNet",
          status: response.status,
          detail: text,
        }),
      };
    }

    const data = await response.json();
    const best = data.results?.[0];

    // Estrai i dati principali (in lingua italiana se disponibili)
    const scientificName = best?.species?.scientificNameWithoutAuthor || "";
    const commonName =
      (best?.species?.commonNames?.[0] &&
        best.species.commonNames[0].toString()) ||
      "";
    const reliability =
      typeof best?.score === "number" ? best.score.toFixed(2) : "";

    // Placeholder per allergenicità
    const allergenicity = "N/D";

    return {
      statusCode: 200,
      body: JSON.stringify({
        scientificName,
        commonName,
        reliability,
        allergenicity,
      }),
    };
  } catch (err) {
    console.error("Errore nella function plantnet-identify:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Errore server",
        detail: err.message,
      }),
    };
  }
}
