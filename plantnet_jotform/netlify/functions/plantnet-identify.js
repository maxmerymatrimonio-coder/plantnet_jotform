// Netlify Function: proxy sicuro verso PlantNET
// Versione con priorità nomi comuni italiani (lang=it)
// e invio dell'immagine come base64 "puro" (senza data:image/...).

exports.handler = async (event) => {
  try {
    // Permettiamo solo POST
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Method Not Allowed" }),
      };
    }

    // Proviamo a leggere il body JSON
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (e) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Body non valido (JSON)" }),
      };
    }

    const imageBase64 = body.imageBase64;
    if (!imageBase64) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Nessuna immagine ricevuta (imageBase64 mancante)",
        }),
      };
    }

    const apiKey = process.env.PLANTNET_API_KEY;
    if (!apiKey) {
      console.error("❌ PLANTNET_API_KEY non configurata su Netlify!");
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Chiave API PlantNET mancante sul server" }),
      };
    }

    // ✅ API PlantNET con lingua italiana
    const apiUrl = `https://my-api.plantnet.org/v2/identify/all?api-key=${apiKey}&lang=it`;

    // In Node 18+ su Netlify fetch è globale
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // 👇 qui mandiamo il base64 "puro", senza prefisso data:image/...
        images: [imageBase64],
        organs: ["leaf"], // puoi cambiare in "flower", "fruit", ecc.
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Errore PlantNET:", response.status, text);
      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Errore da PlantNET",
          status: response.status,
          detail: text,
        }),
      };
    }

    const data = await response.json();
    const result = data.results && data.results[0];

    // Nome scientifico
    const scientificName =
      result?.species?.scientificNameWithoutAuthor || "Sconosciuta";

    // Nome comune (priorità italiano, grazie a lang=it)
    let commonName = "Nome comune non disponibile";
    if (result?.species?.commonNames?.length > 0) {
      commonName = result.species.commonNames[0];
    }

    // Affidabilità
    const reliability =
      typeof result?.score === "number" ? result.score.toFixed(2) : "N/D";

    // Allergenicità (per ora placeholder)
    const allergenicity = "N/D";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Errore server",
        detail: String(error),
      }),
    };
  }
};
