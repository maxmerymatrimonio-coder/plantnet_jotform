// ✅ Funzione Netlify: identifica pianta con PlantNet
// Usa fetch, FormData e Blob nativi di Node 18 (niente form-data esterno)

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
        body: JSON.stringify({
          error: "Chiave API mancante (PLANTNET_API_KEY)",
        }),
      };
    }

    // 📸 Controllo immagine
    if (!imageBase64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Nessuna immagine ricevuta" }),
      };
    }

    // 🔄 Converte la base64 in Blob (come in un browser)
    const buffer = Buffer.from(imageBase64, "base64");
    const blob = new Blob([buffer], { type: "image/jpeg" });

    // 🧩 Costruisce il multipart nativo
    const form = new FormData();
    form.append("images", blob, "pianta.jpg");
    form.append("organs", "leaf"); // puoi cambiare in "flower", ecc.

    // 🌿 URL PlantNet con lingua italiana
    const apiUrl = `https://my-api.plantnet.org/v2/identify/all?api-key=${apiKey}&lang=it`;

    // 🚀 Invio a PlantNet (nessun header manuale: ci pensa fetch)
    const response = await fetch(apiUrl, {
      method: "POST",
      body: form,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Errore PlantNet:", response.status, text);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: "Errore da PlantNET",
          status: response.status,
          detail: text,
        }),
      };
    }

    // 📦 Analizza la risposta
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
      statusCode: 500,
      body: JSON.stringify({
        error: "Errore server",
        detail: String(error),
      }),
    };
  }
};
