// netlify/functions/plantnet-identify.js

// Netlify usa Node 18+: fetch, FormData, Blob e Buffer sono già disponibili.

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Metodo non consentito" }),
      };
    }

    const apiKey = process.env.PLANTNET_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error:
            "Manca la variabile di ambiente PLANTNET_API_KEY su Netlify.",
        }),
      };
    }

    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Body non è JSON valido" }),
      };
    }

    const { imageBase64, filename } = payload || {};
    if (!imageBase64) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error:
            "Nessuna immagine ricevuta. Invia imageBase64 nel body della richiesta.",
        }),
      };
    }

    // imageBase64 arriva SENZA "data:image/..;base64," (solo la parte dopo la virgola)
    const buffer = Buffer.from(imageBase64, "base64");
    const blob = new Blob([buffer], { type: "image/jpeg" });

    const formData = new FormData();
    formData.append("images", blob, filename || "photo.jpg");
    formData.append("organs", "auto");

    const url =
      "https://my-api.plantnet.org/v2/identify/all" +
      `?api-key=${encodeURIComponent(apiKey)}` +
      "&lang=it";

    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("Errore PlantNET:", response.status, text);
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: "Errore da PlantNET",
          status: response.status,
          detail: text,
        }),
      };
    }

    const data = await response.json();

    const best = data?.results?.[0];
    if (!best) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: false,
          message: "Nessun risultato trovato da PlantNET",
        }),
      };
    }

    const score = Math.round((best.score || 0) * 100);
    const scientificName = best.species?.scientificName || "";
    const commonName = best.species?.commonNames?.[0] || "";
    const family = best.species?.family?.scientificName || "";

    // PlantNET non fornisce vera allergenicità; per ora mettiamo testo generico
    const allergenicity =
      "Verificare eventuali allergenicità con fonti specialistiche.";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        score,
        scientificName,
        commonName,
        family,
        allergenicity,
      }),
    };
  } catch (err) {
    console.error("Errore funzione Netlify:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Errore interno funzione" }),
    };
  }
};
