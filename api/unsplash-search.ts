import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }

  const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_KEY || '';

  if (!UNSPLASH_ACCESS_KEY) {
    return res.status(200).json({ error: 'Missing UNSPLASH_ACCESS_KEY', results: [] });
  }

  const query = req.query.query as string || '';

  if (!query.trim()) {
    return res.status(400).json({ error: 'Missing query parameter', results: [] });
  }

  try {
    const unsplashUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape&content_filter=high`;
    
    const response = await fetch(unsplashUrl, {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        'Accept-Version': 'v1'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Unsplash API error: ${response.status}`, results: [] });
    }

    const data = await response.json();
    
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).json(data);
  } catch (err: any) {
    console.error('Unsplash API error:', err);
    return res.status(500).json({ error: err?.message || 'Server error', results: [] });
  }
}