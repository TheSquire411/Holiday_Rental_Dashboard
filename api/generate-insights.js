export default async function handler(req, res) {
  // Ensure this is a POST request
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  // Check if the API key is configured on the server
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API key is not configured on the server.' });
  }

  // The Gemini API URL
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;

  try {
    // Forward the request body from the client to the Gemini API
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body), // Pass the client's payload through
    });

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
        console.error('Gemini API Error:', data);
        throw new Error(data.error?.message || 'Failed to get a valid response from the Gemini API.');
    }

    // Send the successful response back to the client
    res.status(200).json(data);

  } catch (error) {
    console.error('Error proxying to Gemini API:', error);
    res.status(500).json({ error: error.message });
  }
}
