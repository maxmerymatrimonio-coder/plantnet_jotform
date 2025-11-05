// netlify/functions/plantnet-identify.js

// Function Netlify: riceve un'immagine in base64 dal frontend,
// invia la richiesta multipart a PlantNet e restituisce il risultato.

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

    // Creazione di un form-data multipart
    const form = new FormData();
    form.append("organs", "leaf");
    form.append("images", new Blob([imageBuffer]), "photo.jpg");

    const apiUrl = `https://my-api.plantnet.org/v2/identify/all?api-key=${apiKey}`;

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

    return {
      statusCode: 200,
      body: JSON.stringify({
        scientificName: best?.species?.scientificNameWithoutAuthor || "",
        commonName: best?.species?.commonNames?.[0] || "",
        reliability:
          typeof best?.score === "number" ? best.score.toFixed(2) : "",
        allergenicity: "N/D",
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
