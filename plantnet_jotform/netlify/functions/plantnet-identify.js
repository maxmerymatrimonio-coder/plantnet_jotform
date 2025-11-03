const fetch = require("node-fetch");

exports.handler = async (event) => {
  try {
    const { imageBase64 } = JSON.parse(event.body);
    const apiKey = process.env.PLANTNET_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "PLANTNET_API_KEY non configurata" })
      };
    }

    const response = await fetch(`https://my-api.plantnet.org/v2/identify/all?api-key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images: [imageBase64], organs: ["leaf"] })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Errore PlantNET:", text);
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
        reliability: typeof result?.score === "number" ? result.score.toFixed(2) : "",
        allergenicity: "N/D"
      })
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: "Errore server" }) };
  }
};
