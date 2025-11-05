// netlify/functions/plantnet-identify.js
import fetch from "node-fetch";
import FormData from "form-data";

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const PLANTNET_API_KEY = process.env.PLANTNET_API_KEY || "INSERISCI_LA_TUA_CHIAVE_API";
    const PLANTNET_ENDPOINT = `https://my-api.plantnet.org/v2/identify/all?include-related-images=false&lang=it&api-key=${PLANTNET_API_KEY}`;

    // --- ricezione del file dal client ---
    const contentType = event.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
      return { statusCode: 400, body: "Nessun file ricevuto" };
    }

    // usa Netlify parse-multipart per decodificare i dati binari
    const multipart = await import("parse-multipart-data");
    const boundary = multipart.getBoundary(contentType);
    const parts = multipart.parse(Buffer.from(event.body, "base64"), boundary);

    if (!parts.length) {
      return { statusCode: 400, body: "Nessun file trovato nel form" };
    }

    const imagePart = parts[0];
    const formData = new FormData();
    formData.append("organs", "leaf");
    formData.append("images", imagePart.data, {
      filename: imagePart.filename,
      contentType: imagePart.type,
    });

    // --- chiamata API PlantNET ---
    const response = await fetch(PLANTNET_ENDPOINT, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("PlantNET error:", errText);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: "Errore da PlantNET", details: errText }),
      };
    }

    const result = await response.json();

    // --- estraiamo il miglior match ---
    const best = result?.results?.[0];
    const score = best?.score ? Math.round(best.score * 100) + "%" : "";
    const commonNameIt = best?.species?.commonNames?.[0] || "";
    const scientificName = best?.species?.scientificNameWithoutAuthor || "";
    const allergenicita = best?.species?.family?.scientificName || "";

    const output = {
      scoreFormatted: score,
      commonNameIt,
      scientificName,
      allergenicita,
    };

    return {
      statusCode: 200,
      body: JSON.stringify(output),
    };
  } catch (error) {
    console.error("ERRORE SERVER:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Errore interno", details: error.message }),
    };
  }
};
