import http from 'node:http';
import { URL } from 'node:url';
import fs from 'node:fs';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';

import { fileURLToPath } from 'node:url';

// Load env vars from .env.local (preferred) or .env
const envLocalPath = fileURLToPath(new URL('../.env.local', import.meta.url));
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  dotenv.config();
}

const PORT = Number(process.env.PORT || 8787);
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.GROQ_KEY || process.env.XAI_API_KEY || process.env.GROK_API_KEY || process.env.GEMINI_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || process.env.XAI_MODEL || 'openai/gpt-oss-120b';

if (!GROQ_API_KEY) {
  console.error('Missing API key. Set GROQ_API_KEY in .env.local (recommended).');
  console.error('Backward compatibility: XAI_API_KEY, GROK_API_KEY, or GEMINI_API_KEY are also accepted.');
  process.exit(1);
}

const groq = new Groq({ apiKey: GROQ_API_KEY });

function sendJson(res, statusCode, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(body);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(text);
}

async function readJsonBody(req) {
  return await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 2_000_000) {
        reject(new Error('Request too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function buildPrompt(params) {
  const {
    source,
    destination,
    members,
    groupType,
    budgetLevel,
    flightClass,
    currency,
    hotelRating,
    activities,
    packingList,
    essentials,
    days
  } = params;

  return `
Create an ELITE travel itinerary from ${source} to ${destination} for ${members} people (${groupType}).
Budget: ${budgetLevel}. Flight Class: ${flightClass}. Currency: ${currency}.
Duration: ${days} days.
Hotel Standard: ${hotelRating}.
Must consider: ${Array.isArray(essentials) && essentials.length ? essentials.join(', ') : 'standard travel essentials'}.
Packing focus: ${Array.isArray(packingList) && packingList.length ? packingList.join(', ') : 'standard packing list'}.
Interests: ${activities || 'Major landmarks, top-rated local dining, and cultural hidden gems'}.

OUTPUT FORMAT (STRICT):
Return a SINGLE JSON object ONLY (no markdown) with this top-level shape:
{
  "flights": [ { "airline": "", "flightNumber": "", "departureTime": "", "arrivalTime": "", "duration": "", "priceBreakup": { "base": "", "taxes": "", "total": "" } } ],
  "hotels": [ { "name": "", "rating": "", "pricePerNight": "", "description": "", "amenities": [""] } ],
  "tripPlan": {
    "destination": "",
    "source": "",
    "groupType": "${groupType}",
    "budgetLevel": "${budgetLevel}",
    "flightClass": "${flightClass}",
    "currency": "${currency}",
    "members": ${members},
    "durationDays": ${days},
    "totalCostEstimate": "",
    "selectedPackingList": ${JSON.stringify(packingList || [])},
    "selectedEssentials": ${JSON.stringify(essentials || [])},
    "itinerary": [
      {
        "day": 1,
        "title": "",
        "activities": [
          {
            "time": "",
            "description": "",
            "location": "",
            "costEstimate": "",
            "category": "",
            "imageQuery": ""
          }
        ]
      }
    ]
  }
}

MONEY FORMAT REQUIREMENT:
- ALL monetary values MUST be in ${currency} only (no mixing currencies).
- Include the currency symbol where appropriate (e.g. INR should use ₹).
- This applies to: totalCostEstimate, flight priceBreakup, hotel pricePerNight, and each activity costEstimate.

CRITICAL IMAGE INSTRUCTION:
- For every activity, provide an 'imageQuery' that is extremely specific (4-6 words) for high-quality photo search.
- Make the query about the place/landmark/experience, not generic words.
`.trim();
}

async function callGroqChat({ model, messages }) {
  const completion = await groq.chat.completions.create({
    model,
    messages,
    temperature: 0.7,
    response_format: { type: 'json_object' }
  });

  const content = completion?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('Groq returned empty content');
  }

  return content;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
      return res.end();
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      return sendJson(res, 200, { ok: true, model: GROQ_MODEL });
    }

    if (req.method === 'POST' && url.pathname === '/api/travel-plan') {
      const params = await readJsonBody(req);

      const prompt = buildPrompt(params);
      const content = await callGroqChat({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a meticulous travel planner. Return ONLY valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      let travelData;
      try {
        travelData = JSON.parse(content);
      } catch {
        return sendText(res, 502, 'Model returned invalid JSON. Try fewer days or simpler interests.');
      }

      if (!travelData?.tripPlan?.itinerary) {
        return sendText(res, 502, 'Model returned an unexpected shape (missing tripPlan/itinerary).');
      }

      return sendJson(res, 200, travelData);
    }

    return sendText(res, 404, 'Not found');
  } catch (err) {
    console.error(err);
    return sendText(res, 500, err?.message || 'Server error');
  }
});

server.listen(PORT, () => {
  console.log(`Groq proxy listening on http://localhost:${PORT}`);
  console.log(`Using model: ${GROQ_MODEL}`);
});
