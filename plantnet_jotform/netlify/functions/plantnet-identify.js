// Netlify Function: identifica pianta con PlantNET
// Versione che lavora con imageBase64 e restituisce
// scientificName, commonName, reliability, allergenicity
const fetch = require("node-fetch");

exports.handler = async (event) => {
  try {
    // Accettiamo solo POST
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Metodo non consentito" }),
      };
    }

    const body = JSON.parse(event.body || "{}");
    const imageBase64 = body.imageBase64;
    const apiKey = process.env.PLANTNET_API_KEY;

    if (!apiKey) {
      console.error("PLANTNET_API_KEY non configurata");
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "PLANTNET_API_KEY non configurata",
        }),
      };
    }

    if (!imageBase64) {
      console.error("imageBase64 mancante nel body");
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Nessuna immagine ricevuta",
        }),
      };
    }

    // ✅ lingua italiana per i nomi comuni quando disponibili
    const apiUrl = `https://my-api.plantnet.org/v2/identify/all?api-key=${apiKey}&lang=it`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        images: [`data:image/jpeg;base64,${imageBase64}`],
        // puoi cambiare organs se vuoi (leaf / flower / fruit / habit...)
        organs: ["leaf"],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Errore PlantNET:", response.status, text);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: "Errore da PlantNET",
          detail: text,
        }),
      };
    }

    const data = await response.json();
    const result = data.results && data.results[0];

    const scientificName =
      result?.species?.scientificNameWithoutAuthor ||
      result?.species?.scientificName ||
      "Sconosciuta";

    const commonNames = result?.species?.commonNames || [];
    const commonName = commonNames[0] || "Nome comune non disponibile";

    const reliability =
      typeof result?.score === "number"
        ? result.score.toFixed(2)
        : "N/D";

    // Al momento non abbiamo vera info di allergenicità
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
