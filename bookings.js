// /api/bookings.js

export default async function handler(req, res) {
  const LODGIFY_API_KEY = process.env.LODGIFY_API_KEY; // Your key stored securely
  const LODGIFY_API_URL = 'https://api.lodgify.com/v2/reservations/bookings';

  try {
    const response = await fetch(LODGIFY_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-ApiKey': LODGIFY_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Lodgify API Error: ${response.status}`);
    }

    const data = await response.json();

    // Allow your frontend to access this endpoint
    res.setHeader('Access-Control-Allow-Origin', '*'); // Or be more specific with your domain
    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
