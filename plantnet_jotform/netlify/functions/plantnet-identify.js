// netlify/functions/plantnet-identify.js

// Function Netlify che riceve una foto in base64 dal frontend,
// chiama PlantNet e restituisce i campi che il tuo index.html si aspetta:
//  - scientificName
//  - commonName
//  - reliability
//  - allergenicity

export async function handler(event) {
  try {
    // Controllo metodo
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Metodo non consentito" }),
      };
    }

    // Parsing del body JSON
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (err) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Body non è JSON valido" }),
      };
    }

    const { imageBase64 } = body;

    if (!imageBase64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Nessuna immagine ricevuta" }),
      };
    }

    // Chiave PlantNet dalle variabili d'ambiente Netlify
    const apiKey = process.env.PLANTNET_API_KEY;
    if (!apiKey) {
      console.error("PLANTNET_API_KEY non impostata nelle env di Netlify");
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Configurazione server mancante (API key)",
        }),
      };
    }

    // Endpoint PlantNet (adatta se usi un endpoint diverso)
    const apiUrl = `https://my-api.plantnet.org/v2/identify/all?api-key=${apiKey}`;

    // Chiamata a PlantNet usando la fetch nativa (NON fetch2!)
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // PlantNet si aspetta le immagini come data URL oppure URL pubblici
        images: [`data:image/jpeg;base64,${imageBase64}`],
        // Organi indicativi: puoi adattarli
        organs: ["leaf", "flower", "fruit", "bark"],
      }),
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
    const best = (data && data.results && data.results[0]) || {};

    // Estrazione dati con fallback sicuri
    const scientificName =
      (best.species && best.species.scientificNameWithoutAuthor) || "";
    const commonName =
      (best.species &&
        Array.isArray(best.species.commonNames) &&
        best.species.commonNames[0]) ||
      "";
    const reliability =
      typeof best.score === "number" ? best.score.toFixed(2) : "";

    // Per ora allergenicità non arriva da PlantNet -> placeholder
    const allergenicity = "N/D";

    // Risposta per il frontend (index.html)
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
        detail: err.message || String(err),
      }),
    };
  }
}
