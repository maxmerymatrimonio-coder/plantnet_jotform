// Netlify Function: identifica pianta con PlantNET (nomi anche in italiano)

exports.handler = async (event) => {
  try {
    // Solo POST
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Metodo non consentito. Usa POST." }),
      };
    }

    const body = JSON.parse(event.body || "{}");
    const imageBase64 = body.imageBase64;
    const apiKey = process.env.PLANTNET_API_KEY;

    if (!apiKey) {
      console.error("❌ PLANTNET_API_KEY non configurata");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "PLANTNET_API_KEY non configurata" }),
      };
    }

    if (!imageBase64) {
      console.error("❌ imageBase64 mancante nel body");
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Nessuna immagine ricevuta" }),
      };
    }

    // Endpoint PlantNet con lingua italiana
    const apiUrl = `https://my-api.plantnet.org/v2/identify/all?api-key=${apiKey}&lang=it`;

    // Invio immagine come data URL in JSON (schema che ti ha già funzionato)
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        images: [`data:image/jpeg;base64,${imageBase64}`],
        organs: ["leaf"], // puoi cambiare in "flower", "fruit", ecc.
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("❌ Errore PlantNET:", response.status, text);
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
    const commonName =
      commonNames.length > 0
        ? commonNames[0]
        : "Nome comune non disponibile";

    const reliability =
      typeof result?.score === "number"
        ? (result.score * 100).toFixed(1) + "%"
        : "N/D";

    // PlantNet non fornisce allergenicità → per ora N/D
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
    console.error("❌ Errore nella funzione Netlify:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Errore server",
        detail: String(error),
      }),
    };
  }
};
