// Importa il modulo fetch per fare richieste HTTP
const fetch = require('node-fetch');

// Handler della funzione serverless
exports.handler = async function(event, context) {
  try {
    // Ricevi l'URL dell'immagine dal corpo della richiesta
    const { imageUrl } = JSON.parse(event.body);

    // Inserisci la tua API key di PlantNet
    const apiKey = 'LA_TUA_API_KEY_PLANTNET'; // Sostituisci con la tua chiave API

    // URL dell'endpoint API di PlantNet
    const plantNetUrl = `https://my-api.plantnet.org/v2/identify/all?apiKey=${apiKey}`;

    // Prepara i dati per la richiesta
    const requestData = {
      "organs": ["leaf"], // Modifica con l'organo desiderato (es. 'flower', 'fruit', etc.)
      "images": [imageUrl]
    };

    // Fai la richiesta al servizio PlantNet
    const response = await fetch(plantNetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    // Verifica se la risposta è ok
    if (!response.ok) {
      throw new Error(`Errore nella richiesta: ${response.statusText}`);
    }

    // Elabora la risposta JSON
    const data = await response.json();

    // Verifica se sono stati trovati dei risultati
    if (data.results && data.results.length > 0) {
      // Restituisci il primo risultato
      return {
        statusCode: 200,
        body: JSON.stringify(data.results[0])
      };
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Nessun risultato trovato' })
      };
    }

  } catch (error) {
    // Gestisci eventuali errori
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message })
    };
  }
};

