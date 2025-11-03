// Funzione Netlify per chiamare l'API PlantNET
// - riceve imageBase64 dal browser
// - lo converte in "file" e lo invia a PlantNET come multipart/form-data

exports.handler = async (event) => {
  try {
    const { imageBase64 } = JSON.parse(event.body || "{}");
    const apiKey = process.env.PLANTNET_API_KEY;

    if (!apiKey) {
      console.error("PLANTNET_API_KEY non configurata");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "PLANTNET_API_KEY non configurata" })
      };
    }

    if (!imageBase64) {
      console.error("imageBase64 mancante nel body");
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Nessuna immagine ricevuta" })
      };
    }

    // Decodifica base64 in binario
    const buffer = Buffer.from(imageBase64, "base64");

    // Crea il form multipart per PlantNET
    const formData = new FormData();
    // organo osservato (leaf = foglia, flower = fiore, ecc.)
    formData.append("organs", "leaf");
    // campo "images" come file
    formData.append(
      "images",
      new Blob([buffer], { type: "image/jpeg" }),
      "photo.jpg"
    );

    // Chiamata all'API PlantNET con multipart/form-data
    const response = await fetch(
      `https://my-api.plantnet.org/v2/identify/all?api-key=${apiKey}`,
      {
        method: "POST",
        body: formData    // NIENTE Content-Type: ci pensa fetch
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Errore PlantNET:", response.status, text);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: "Errore da PlantNET", detail: text })
      };
    }

    const data = await response.json();
    const result = data.results && data.results[0];

    return {
      statusCode: 200,
      body: JSON.stringify({
        scientificName: result?.species?.scientificNameWithoutAuthor || "",
        commonName: result?.species?.commonNames?.[0] || "",
        reliability:
          typeof result?.score === "number" ? result.score.toFixed(2) : "",
        allergenicity: "N/D"
      })
    };
  } catch (error) {
    console.error("Errore nella funzione Netlify:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Errore server", detail: String(error) })
    };
  }
};
