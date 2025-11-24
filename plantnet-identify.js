// netlify/functions/plantnet-identify.js
// Funzione Netlify senza dipendenze esterne.
// Usa fetch / FormData / Blob di Node 18 per chiamare PlantNet
// e traduce il nome comune EN -> IT con Google Translate.

async function translateToItalian(text) {
  if (!text) return "";
  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=it&dt=t&q=${encodeURIComponent(
        text
      )}`
    );
    const data = await res.json();
    // struttura tipica: [[[ "traduzione", "originale", ... ]]]
    return data[0]?.[0]?.[0] || text;
  } catch (e) {
    console.warn("Traduzione non riuscita:", e);
    return text; // in caso di errore, restituiamo comunque il testo originale
  }
}

exports.handler = async (event) => {
  // Consente solo POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    // Parse del body
    const body = JSON.parse(event.body || "{}");
    const imageBase64 = body.imageBase64;

    if (!imageBase64 || typeof imageBase64 !== "string") {
      console.error("Manca imageBase64 o non è una stringa");
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing imageBase64" }),
      };
    }

    const apiKey = process.env.PLANTNET_API_KEY;
    if (!apiKey) {
      console.error("Manca PLANTNET_API_KEY nelle variabili d'ambiente Netlify");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing PLANTNET_API_KEY" }),
      };
    }

    // Ricostruiamo un JPEG dal base64
    const buffer = Buffer.from(imageBase64, "base64");
    const blob = new Blob([buffer], { type: "image/jpeg" });

    // Creiamo il form-data per PlantNet
    const formData = new FormData();
    formData.append("images", blob, "photo.jpg");
    // puoi usare altri organi ("flower","fruit",...) se vuoi;
    // per ora usiamo "leaf" come default
    formData.append("organs", "leaf");

    const url = `https://my-api.plantnet.org/v2/identify/all?api-key=${apiKey}`;

    const plantnetResponse = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!plantnetResponse.ok) {
      const text = await plantnetResponse.text();
      console.error("Errore dalla PlantNet API:", plantnetResponse.status, text);
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: "PlantNet API error",
          status: plantnetResponse.status,
          details: text,
        }),
      };
    }

    const data = await plantnetResponse.json();

    // Miglior risultato
    const best = (data.results && data.results[0]) || null;
    if (!best) {
      console.warn("Nessun risultato utile da PlantNet");
      return {
        statusCode: 200,
        body: JSON.stringify({
          scientificName: "",
          commonName: "",
          reliability: 0,
          allergenicity: "N/D",
        }),
      };
    }

    const species = best.species || {};

    const scientificName =
      species.scientificNameWithoutAuthor ||
      species.scientificName ||
      "";

    const commonNames = species.commonNames || [];
    const commonNameEn = commonNames[0] || "";

    // Traduzione automatica EN -> IT
    const commonNameIt = await translateToItalian(commonNameEn);

    return {
      statusCode: 200,
      body: JSON.stringify({
        scientificName,
        commonName: commonNameIt || commonNameEn || "",
        reliability: best.score || 0,
        allergenicity: "N/D",
      }),
    };
  } catch (err) {
    console.error("Errore interno nella funzione Netlify:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal server error",
        details: String(err),
      }),
    };
  }
};

// TODO: Merge loadUserDataFromStorage, saveUserDataToStorage, clearUserDataFromStorageAndForm updates as provided in chat.
