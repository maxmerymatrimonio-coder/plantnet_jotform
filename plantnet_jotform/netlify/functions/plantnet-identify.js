// Funzione Netlify: chiama PlantNET e restituisce
// nome scientifico, nome comune (in italiano) e affidabilità.

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const imageBase64 = body.imageBase64;
    const apiKey = process.env.PLANTNET_API_KEY;

    if (!apiKey) {
      console.error("PLANTNET_API_KEY non configurata");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "PLANTNET_API_KEY non configurata" }),
      };
    }

    if (!imageBase64) {
      console.error("imageBase64 mancante nel body");
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Nessuna immagine ricevuta" }),
      };
    }

    // Decodifica base64 in binario
    const buffer = Buffer.from(imageBase64, "base64");

    // Crea form-data multipart come richiesto da PlantNET
    const formData = new FormData();
    formData.append("organs", "leaf"); // puoi cambiare in "flower", "fruit", ecc.
    formData.append(
      "images",
      new Blob([buffer], { type: "image/jpeg" }),
      "photo.jpg"
    );

    // ✅ lingua italiana
    const url = `https://my-api.plantnet.org/v2/identify/all?api-key=${apiKey}&lang=it`;

    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Errore PlantNET:", response.status, text);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: "Errore da PlantNET", detail: text }),
      };
    }

    const data = await response.json();
    const result = data.results && data.results[0];

    const scientificName =
      result?.species?.scientificNameWithoutAuthor || "Sconosciuta";

    const commonNames = result?.species?.commonNames || [];
    const commonName =
      commonNames[0] || "Nome comune non disponibile";

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
