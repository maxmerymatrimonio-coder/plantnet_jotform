// ✅ Funzione Netlify: identifica pianta con PlantNet (versione stabile)
import fetch from "node-fetch";
import FormData from "form-data";

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const imageBase64 = body.imageBase64;
    const apiKey = process.env.PLANTNET_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Chiave API mancante (PLANTNET_API_KEY)" }),
      };
    }

    if (!imageBase64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Nessuna immagine ricevuta" }),
      };
    }

    // Crea il corpo multipart/form-data
    const form = new FormData();
    form.append("organs", "leaf");
    form.append("images", Buffer.from(imageBase64, "base64"), "pianta.jpg");

    // URL PlantNet con lingua italiana
    const apiUrl = `https://my-api.plantnet.org/v2/identify/all?api-key=${apiKey}&lang=it`;

    // Invio a PlantNet
    const response = await fetch(apiUrl, {
      method: "POST",
      body: form,
      headers: form.getHeaders(),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Errore PlantNet:", text);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: "Errore PlantNet",
          detail: text,
        }),
      };
    }

    const data = await response.json();
    const result = data.results?.[0];

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
    console.error("Errore server:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Errore server",
        detail: error.message,
      }),
    };
  }
};
