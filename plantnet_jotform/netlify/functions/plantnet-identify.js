// netlify/functions/plantnet-identify.js
// Chiama PlantNet con immagini in multipart/form-data
// Preferisce nomi comuni in italiano (lang=it) e ha fallback sicuri.

export async function handler(event) {
  try {
    // Solo POST
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Metodo non consentito" }),
      };
    }

    // Legge il body JSON inviato dalla pagina
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

    // Converte il base64 in buffer binario
    const imageBuffer = Buffer.from(imageBase64, "base64");

    // Costruisce il form multipart per PlantNet
    const form = new FormData();
    // Puoi cambiare "leaf" in "flower", "fruit", ecc. se vuoi
    form.append("organs", "leaf");
    form.append("images", new Blob([imageBuffer]), "photo.jpg");

    // lang=it → PlantNet prova a dare nomi comuni in italiano
    const apiUrl =
      `https://my-api.plantnet.org/v2/identify/all?lang=it&api-key=${apiKey}`;

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

    // Nome scientifico (base)
    const scientificName = best?.species?.scientificNameWithoutAuthor || "";

    // Fallback per i nomi comuni:
    // 1) se ci sono commonNames li unisce con ", "
    // 2) se non ci sono, usa comunque il nome scientifico
    let commonName = "";
    const commonNamesArr = Array.isArray(best?.species?.commonNames)
      ? best.species.commonNames
      : [];

    if (commonNamesArr.length > 0) {
      commonName = commonNamesArr.join(", ");
    } else if (scientificName) {
      commonName = scientificName;
    } else {
      commonName = "";
    }

    // Affidabilità (score 0–1 → due decimali)
    const reliability =
      typeof best?.score === "number" ? best.score.toFixed(2) : "";

    // Per ora non abbiamo un vero dato di allergenicità da PlantNet
    const allergenicity = "N/D";

    // Risposta “pulita” per il frontend
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
