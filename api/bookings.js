// /api/bookings.js
// This file acts as a secure server-side proxy to the Lodgify API.

export default async function handler(req, res) {
  // Retrieve the secret API key from Vercel's environment variables.
  const LODGIFY_API_KEY = process.env.LODGIFY_API_KEY;
  
  // UPDATED: Added '?include=financials' to get detailed revenue data.
  const LODGIFY_API_URL = 'https://api.lodgify.com/v2/reservations/bookings?include=financials';

  // Check if the API key is configured on the server.
  if (!LODGIFY_API_KEY) {
    return res.status(500).json({ error: "API key is not configured on the server." });
  }

  try {
    // Make the request from the server to the Lodgify API.
    const response = await fetch(LODGIFY_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-ApiKey': LODGIFY_API_KEY,
      },
    });

    if (!response.ok) {
      // Pass along the error from the Lodgify API if the request fails.
      throw new Error(`Lodgify API Error: ${response.status} - ${await response.text()}`);
    }

    const data = await response.json();
    
    // Send the data back to your React application.
    res.status(200).json(data);

  } catch (error) {
    console.error("Error in serverless function:", error);
    res.status(500).json({ error: error.message });
  }
}

