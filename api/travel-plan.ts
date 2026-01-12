import type { VercelRequest, VercelResponse } from '@vercel/node';
import Groq from 'groq-sdk';

// Vercel Function Configuration
export const config = {
  maxDuration: 60, // Maximum allowed on Pro plan (10s on Hobby)
};

// SerpAPI configuration for Google Flights
const SERPAPI_URL = 'https://serpapi.com/search.json';

// Metropolitan area code to primary airport code mapping
// Google Flights sometimes returns metro area codes instead of airport codes
const METRO_TO_AIRPORT: Record<string, string> = {
  'NEW': 'DEL',  // New Delhi metropolitan area → Indira Gandhi International
  'NYC': 'JFK',  // New York City → JFK (primary)
  'LON': 'LHR',  // London → Heathrow (primary)
  'PAR': 'CDG',  // Paris → Charles de Gaulle (primary)
  'TYO': 'NRT',  // Tokyo → Narita (primary)
  'CHI': 'ORD',  // Chicago → O'Hare (primary)
  'WAS': 'IAD',  // Washington DC → Dulles (primary)
  'BUE': 'EZE',  // Buenos Aires → Ezeiza (primary)
  'MIL': 'MXP',  // Milan → Malpensa (primary)
  'OSA': 'KIX',  // Osaka → Kansai (primary)
  'SAO': 'GRU',  // São Paulo → Guarulhos (primary)
  'RIO': 'GIG',  // Rio de Janeiro → Galeão (primary)
  'MOW': 'SVO',  // Moscow → Sheremetyevo (primary)
  'BJS': 'PEK',  // Beijing → Capital (primary)
  'SHA': 'PVG',  // Shanghai → Pudong (primary)
  'SEL': 'ICN',  // Seoul → Incheon (primary)
  'STO': 'ARN',  // Stockholm → Arlanda (primary)
};

// Normalize airport code - convert metro area codes to primary airport codes
function normalizeAirportCode(code: string): string {
  const upperCode = (code || '').toUpperCase().trim();
  return METRO_TO_AIRPORT[upperCode] || upperCode;
}

// Major cities for airport code lookup
const MAJOR_CITIES = [
  { code: 'JFK', name: 'New York (JFK)' },
  { code: 'LGA', name: 'New York (LaGuardia)' },
  { code: 'EWR', name: 'Newark' },
  { code: 'LAX', name: 'Los Angeles' },
  { code: 'SFO', name: 'San Francisco' },
  { code: 'ORD', name: 'Chicago (O\'Hare)' },
  { code: 'MIA', name: 'Miami' },
  { code: 'DFW', name: 'Dallas' },
  { code: 'ATL', name: 'Atlanta' },
  { code: 'SEA', name: 'Seattle' },
  { code: 'BOS', name: 'Boston' },
  { code: 'DEN', name: 'Denver' },
  { code: 'LAS', name: 'Las Vegas' },
  { code: 'PHX', name: 'Phoenix' },
  { code: 'IAH', name: 'Houston' },
  { code: 'LHR', name: 'London (Heathrow)' },
  { code: 'LGW', name: 'London (Gatwick)' },
  { code: 'CDG', name: 'Paris (CDG)' },
  { code: 'ORY', name: 'Paris (Orly)' },
  { code: 'FRA', name: 'Frankfurt' },
  { code: 'AMS', name: 'Amsterdam' },
  { code: 'MAD', name: 'Madrid' },
  { code: 'BCN', name: 'Barcelona' },
  { code: 'FCO', name: 'Rome' },
  { code: 'MXP', name: 'Milan' },
  { code: 'ZRH', name: 'Zurich' },
  { code: 'VIE', name: 'Vienna' },
  { code: 'MUC', name: 'Munich' },
  { code: 'DXB', name: 'Dubai' },
  { code: 'AUH', name: 'Abu Dhabi' },
  { code: 'DOH', name: 'Doha' },
  { code: 'IST', name: 'Istanbul' },
  { code: 'SIN', name: 'Singapore' },
  { code: 'HKG', name: 'Hong Kong' },
  { code: 'NRT', name: 'Tokyo (Narita)' },
  { code: 'HND', name: 'Tokyo (Haneda)' },
  { code: 'ICN', name: 'Seoul (Incheon)' },
  { code: 'PEK', name: 'Beijing' },
  { code: 'PVG', name: 'Shanghai (Pudong)' },
  { code: 'BKK', name: 'Bangkok' },
  { code: 'KUL', name: 'Kuala Lumpur' },
  { code: 'SYD', name: 'Sydney' },
  { code: 'MEL', name: 'Melbourne' },
  { code: 'AKL', name: 'Auckland' },
  { code: 'DEL', name: 'New Delhi' },
  { code: 'BOM', name: 'Mumbai' },
  { code: 'BLR', name: 'Bangalore' },
  { code: 'MAA', name: 'Chennai' },
  { code: 'HYD', name: 'Hyderabad' },
  { code: 'CCU', name: 'Kolkata' },
  { code: 'GOI', name: 'Goa' },
  { code: 'COK', name: 'Kochi' },
  { code: 'JAI', name: 'Jaipur' },
  { code: 'AMD', name: 'Ahmedabad' },
  { code: 'PNQ', name: 'Pune' },
  { code: 'GRU', name: 'São Paulo' },
  { code: 'GIG', name: 'Rio de Janeiro' },
  { code: 'MEX', name: 'Mexico City' },
  { code: 'CUN', name: 'Cancun' },
  { code: 'EZE', name: 'Buenos Aires' },
  { code: 'SCL', name: 'Santiago' },
  { code: 'BOG', name: 'Bogota' },
  { code: 'LIM', name: 'Lima' },
  { code: 'JNB', name: 'Johannesburg' },
  { code: 'CPT', name: 'Cape Town' },
  { code: 'CAI', name: 'Cairo' },
  { code: 'CMB', name: 'Colombo' },
  { code: 'MLE', name: 'Maldives' },
  { code: 'HAN', name: 'Hanoi' },
  { code: 'SGN', name: 'Ho Chi Minh City' },
  { code: 'MNL', name: 'Manila' },
  { code: 'CGK', name: 'Jakarta' },
  { code: 'DPS', name: 'Bali' }
];

interface FlightSearchResult {
  flights: any[];
  returnFlights: any[];
  avgRoundTripPrice: number;
}

function parseFlightData(flight: any, currency: string, depId: string, arrId: string) {
  const currencySymbol = currency === 'INR' ? '₹' : '$';
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  
  const legs = flight?.flights || [];
  if (legs.length === 0) return null;

  const firstLeg = legs[0];
  const lastLeg = legs[legs.length - 1];
  const price = flight?.price || 0;
  const priceDisplay = `${currencySymbol}${Math.round(price).toLocaleString(locale)}`;
  const baseFare = Math.round(price * 0.85);
  const taxes = Math.round(price - baseFare);
  const layoverCities = (flight?.layovers || []).map((l: any) => l?.name || l?.id || 'Unknown');
  const stops = layoverCities.length;
  const airlines = [...new Set(legs.map((l: any) => l?.airline || 'Unknown'))];
  const airlineDisplay = airlines.length > 1 ? airlines.join(', ') : airlines[0] || 'Unknown Airline';
  const flightNumbers = legs.map((l: any) => l?.flight_number || 'N/A').join(' → ');
  const totalDuration = flight?.total_duration || 0;
  const durationStr = `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m`;
  const depTime = firstLeg?.departure_airport?.time || '';
  const arrTime = lastLeg?.arrival_airport?.time || '';
  const departureTime = depTime.includes(' ') ? depTime.split(' ')[1] : depTime;
  const arrivalTime = arrTime.includes(' ') ? arrTime.split(' ')[1] : arrTime;
  const departureDate = depTime.includes(' ') ? depTime.split(' ')[0] : '';
  const arrivalDate = arrTime.includes(' ') ? arrTime.split(' ')[0] : '';

  return {
    airline: airlineDisplay,
    flightNumber: flightNumbers,
    departureTime: departureTime || 'N/A',
    arrivalTime: arrivalTime || 'N/A',
    departureDate: departureDate,
    arrivalDate: arrivalDate,
    duration: durationStr,
    stops: stops,
    layovers: layoverCities,
    airlineLogo: flight?.airline_logo || firstLeg?.airline_logo,
    aircraft: firstLeg?.airplane || 'N/A',
    departureAirport: normalizeAirportCode(firstLeg?.departure_airport?.id || depId),
    arrivalAirport: normalizeAirportCode(lastLeg?.arrival_airport?.id || arrId),
    priceBreakup: {
      base: `${currencySymbol}${baseFare.toLocaleString(locale)}`,
      taxes: `${currencySymbol}${taxes.toLocaleString(locale)}`,
      total: priceDisplay
    },
    departureToken: flight?.departure_token || null
  };
}

async function fetchRealFlights(
  departureId: string,
  arrivalId: string,
  outboundDate: string,
  returnDate: string,
  flightClass: string,
  currency: string
): Promise<FlightSearchResult> {
  const SERPAPI_KEY = process.env.SERPAPI_KEY || process.env.SERPAPI_API_KEY || '';
  
  if (!SERPAPI_KEY) {
    console.log('No SerpAPI key configured, skipping real flight data');
    return { flights: [], returnFlights: [], avgRoundTripPrice: 0 };
  }

  try {
    const travelClassMap: Record<string, number> = {
      'Economy': 1,
      'Premium Economy': 2,
      'Business': 3,
      'First Class': 4
    };
    const travelClass = travelClassMap[flightClass] || 1;
    const depId = departureId.toUpperCase().trim();
    const arrId = arrivalId.toUpperCase().trim();

    const outboundParams = new URLSearchParams({
      engine: 'google_flights',
      departure_id: depId,
      arrival_id: arrId,
      outbound_date: outboundDate,
      return_date: returnDate,
      travel_class: String(travelClass),
      currency: currency,
      hl: 'en',
      api_key: SERPAPI_KEY
    });

    const outboundResponse = await fetch(`${SERPAPI_URL}?${outboundParams.toString()}`);
    
    if (!outboundResponse.ok) {
      return { flights: [], returnFlights: [], avgRoundTripPrice: 0 };
    }

    const outboundData = await outboundResponse.json();
    
    const allOutboundFlights = [
      ...(outboundData?.best_flights || []),
      ...(outboundData?.other_flights || []).slice(0, 3)
    ].slice(0, 5);

    const lowestPrice = outboundData?.price_insights?.lowest_price || 
      (allOutboundFlights.length > 0 ? Math.min(...allOutboundFlights.map((f: any) => f?.price || Infinity)) : 0);

    const flights: any[] = [];
    const departureTokens: string[] = [];

    for (const flight of allOutboundFlights) {
      const parsed = parseFlightData(flight, currency, depId, arrId);
      if (parsed) {
        flights.push(parsed);
        if (parsed.departureToken) {
          departureTokens.push(parsed.departureToken);
        }
      }
    }

    const returnFlights: any[] = [];
    
    if (departureTokens.length > 0) {
      const bestToken = departureTokens[0];
      
      const returnParams = new URLSearchParams({
        engine: 'google_flights',
        departure_id: depId,
        arrival_id: arrId,
        outbound_date: outboundDate,
        return_date: returnDate,
        travel_class: String(travelClass),
        currency: currency,
        hl: 'en',
        departure_token: bestToken,
        api_key: SERPAPI_KEY
      });

      try {
        const returnResponse = await fetch(`${SERPAPI_URL}?${returnParams.toString()}`);
        
        if (returnResponse.ok) {
          const returnData = await returnResponse.json();

          const allReturnFlights = [
            ...(returnData?.best_flights || []),
            ...(returnData?.other_flights || []).slice(0, 3)
          ].slice(0, 5);

          for (const flight of allReturnFlights) {
            const parsed = parseFlightData(flight, currency, arrId, depId);
            if (parsed) {
              returnFlights.push(parsed);
            }
          }
        }
      } catch (returnErr) {
        console.error('Error fetching return flights:', returnErr);
      }
    }

    if (returnFlights.length === 0 && flights.length > 0) {
      for (const f of flights) {
        returnFlights.push({
          ...f,
          departureAirport: f.arrivalAirport,
          arrivalAirport: f.departureAirport,
          layovers: [...(f.layovers || [])].reverse()
        });
      }
    }

    return { flights, returnFlights, avgRoundTripPrice: lowestPrice };
  } catch (error) {
    console.error('Error fetching flights:', error);
    return { flights: [], returnFlights: [], avgRoundTripPrice: 0 };
  }
}

function normalizeCityName(raw: string): string {
  return (raw || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
}

function getCityNameFromCode(codeOrName: string): string {
  const code = String(codeOrName || '').trim().toUpperCase();
  const found = MAJOR_CITIES.find(c => c.code.toUpperCase() === code);
  return normalizeCityName(found?.name || String(codeOrName || '').trim());
}

function buildPrompt(params: any, realFlightPrice?: number): string {
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

  const sourceCity = getCityNameFromCode(source);
  const destinationCity = getCityNameFromCode(destination);
  const nights = Math.max(days - 1, 1);
  const roomsNeeded = Math.ceil(members / 2);
  
  const flightPriceInfo = realFlightPrice && realFlightPrice > 0 
    ? `\n\nREAL-TIME FLIGHT PRICE (FROM GOOGLE FLIGHTS API - USE THIS EXACT VALUE):
The BEST ${flightClass} class ROUND TRIP fare for this route is: ${currency === 'INR' ? '₹' : '$'}${realFlightPrice.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US')} per person (lowest available fare).
- This is the complete round trip fare (outbound + return) per person.
- Total flight cost for ${members} travelers = ${currency === 'INR' ? '₹' : '$'}${(realFlightPrice * members).toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US')}
USE THIS EXACT FLIGHT COST in your totalCostEstimate calculation. Do NOT estimate or double this - it's already the round trip fare.`
    : '';

  return `
Create an ELITE travel itinerary from ${sourceCity} (${source}) to ${destinationCity} (${destination}) for ${members} people (${groupType}).
Budget: ${budgetLevel}. Flight Class: ${flightClass}. Currency: ${currency}.
Duration: ${days} days.
Hotel Standard: ${hotelRating}.
Must consider: ${Array.isArray(essentials) && essentials.length ? essentials.join(', ') : 'standard travel essentials'}.
Packing focus: ${Array.isArray(packingList) && packingList.length ? packingList.join(', ') : 'standard packing list'}.
Interests: ${activities || 'Major landmarks, top-rated local dining, and cultural hidden gems'}.

ITINERARY DEPTH REQUIREMENT (VERY IMPORTANT):
- Make the itinerary EXTENSIVE and densely packed with the must-see places + best neighbourhoods.
- For EACH day, include 7–10 activities (not 3–4). Cover: breakfast, morning highlight, late-morning, lunch, afternoon, sunset/viewpoint, dinner, and 1 optional night activity.
- Use realistic travel pacing: include short buffers and local transit time between areas.
- Avoid repetition across days; include at least 2 "hidden gem"/local neighbourhood experiences across the trip.

TITLE / LOCATION / DESCRIPTION REQUIREMENTS (VERY IMPORTANT):
- For EACH day, set day.title to the MAIN highlight area or landmark for that day using a proper noun (e.g. "Old Delhi Heritage Circuit", "South Mumbai Icons", "Montmartre & Louvre Day"). Do NOT use generic titles like "Day 1".
- For EACH activity:
  - location MUST be the specific place name as a short title (primary landmark/restaurant/neighbourhood) like "Gateway of India" or "Café de Flore".
  - description MUST be 2–4 informative sentences: what it is, why it's worth it, and 1 practical tip (best time, ticketing, what to order, viewpoint, etc).
  - NEVER leave location or description empty.

COST ACCURACY REQUIREMENT (VERY IMPORTANT):
- Every activity MUST have a costEstimate field in ${currency}.
- costEstimate format MUST be: "[amount] per person" for individual costs OR "[amount] total" for group costs.
- Example formats: "₹500 per person", "₹1,200 total for group", "Free entry", "₹300-500 per person".
- Include entry fees, transport costs, and food costs where applicable.
- Be realistic - use actual 2024/2025 prices for the destination matching ${budgetLevel} tier.
- If an activity is free, explicitly write "Free" or "₹0 (free entry)".

FLIGHT CLASS PRICING (CRITICAL - ALL FLIGHTS MUST USE ${flightClass} CLASS FARES):
The user has selected "${flightClass}" class. ALL flight prices MUST reflect ${flightClass} class fares:
${flightClass === 'Economy' ? `
- ECONOMY CLASS PRICING:
  * Short-haul (under 3 hours): $80-200 or ₹6,000-15,000 per person one-way
  * Medium-haul (3-6 hours): $150-400 or ₹12,000-30,000 per person one-way
  * Long-haul (6+ hours): $300-800 or ₹25,000-65,000 per person one-way
  * Use budget airlines like IndiGo, SpiceJet, AirAsia, Ryanair, etc.` : flightClass === 'Business' ? `
- BUSINESS CLASS PRICING:
  * Short-haul (under 3 hours): $400-800 or ₹30,000-60,000 per person one-way
  * Medium-haul (3-6 hours): $800-2,000 or ₹65,000-1,60,000 per person one-way
  * Long-haul (6+ hours): $1,500-5,000 or ₹1,20,000-4,00,000 per person one-way
  * Use premium airlines like Emirates, Singapore Airlines, Lufthansa, etc.` : `
- FIRST CLASS PRICING:
  * Short-haul (under 3 hours): $800-1,500 or ₹65,000-1,20,000 per person one-way
  * Medium-haul (3-6 hours): $1,500-4,000 or ₹1,20,000-3,20,000 per person one-way
  * Long-haul (6+ hours): $4,000-15,000 or ₹3,20,000-12,00,000 per person one-way
  * Use luxury airlines like Emirates First, Singapore Suites, Etihad Apartments, etc.`}

BUDGET TIER & HOTEL PRICING GUIDELINES:
Budget Tier: ${budgetLevel}
${budgetLevel === 'Economy' ? `- ECONOMY: 2-3 star hotels ($30-80/night or ₹2,500-6,000/night), street food & casual dining.` : budgetLevel === 'Standard' ? `- STANDARD: 3-4 star hotels ($80-180/night or ₹6,000-15,000/night), mid-range restaurants.` : `- LUXURY: 5-star luxury hotels ($200-500/night or ₹15,000-40,000/night), fine dining restaurants.`}

Hotel Standard: ${hotelRating} - prices MUST reflect this rating level.

TOTAL COST CALCULATION (CRITICAL - FOLLOW THIS FORMULA):
Calculate tripPlan.totalCostEstimate accurately as:
1. FLIGHTS: (${flightClass} class one-way fare × 2 for round trip) × ${members} travelers
2. HOTELS: (${hotelRating} hotel per night × ${nights} nights) × ${roomsNeeded} room${roomsNeeded > 1 ? 's' : ''}
3. ACTIVITIES: Sum of all daily activity costs × ${members} travelers
4. BUFFER: Add 10% for miscellaneous expenses

IMPORTANT: Flight fares MUST be ${flightClass} class fares, NOT economy fares!

Format: "₹X,XX,XXX" or "$X,XXX" (use proper Indian/US number formatting).
The total MUST reflect the selected ${flightClass} flight class and ${budgetLevel} budget tier accurately.

RESULT COUNT REQUIREMENT (STRICT):
- Return 3-4 ONWARD flight options in "flights" array (from ${sourceCity} to ${destinationCity}) - ALL must be ${flightClass} CLASS fares.
- Return 3-4 RETURN flight options in "returnFlights" array (from ${destinationCity} back to ${sourceCity}) - ALL must be ${flightClass} CLASS fares.
- Return between 3 and 4 hotel options in "hotels".

OUTPUT FORMAT (STRICT):
Return a SINGLE JSON object ONLY (no markdown) with this top-level shape:
{
  "flights": [ { "airline": "", "flightNumber": "", "departureTime": "", "arrivalTime": "", "duration": "", "priceBreakup": { "base": "", "taxes": "", "total": "" } } ],
  "returnFlights": [ { "airline": "", "flightNumber": "", "departureTime": "", "arrivalTime": "", "duration": "", "priceBreakup": { "base": "", "taxes": "", "total": "" } } ],
  "hotels": [ { "name": "", "rating": "", "pricePerNight": "", "description": "", "amenities": [""] } ],
  "bestTimeToVisit": {
    "months": "e.g. October to March",
    "season": "e.g. Winter/Dry Season",
    "weather": "e.g. Pleasant 20-28°C, low humidity",
    "crowdLevel": "e.g. Moderate to High (peak tourist season)",
    "tip": "e.g. Book accommodations 2-3 months in advance for best rates"
  },
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
            "imageQuery": "",
            "wikipediaTitle": ""
          }
        ]
      }
    ]
  }
}

CITY NAME REQUIREMENT:
- tripPlan.source MUST be the city name (use "${sourceCity}", not "${source}").
- tripPlan.destination MUST be the city name (use "${destinationCity}", not "${destination}").

MONEY FORMAT REQUIREMENT:
- ALL monetary values MUST be in ${currency} only (no mixing currencies).
- Include the currency symbol where appropriate (e.g. INR should use ₹).
- This applies to: totalCostEstimate, flight priceBreakup, hotel pricePerNight, and each activity costEstimate.

CRITICAL IMAGE INSTRUCTION:
- For every activity, provide an 'imageQuery' that is a REAL place/landmark query (best-effort matchable to Wikipedia/Wikimedia).
- Use proper nouns + city/country when needed (e.g. "Gateway of India Mumbai", "Louvre Museum Paris", "Marina Bay Sands Singapore").
- Avoid generic terms like "architecture photography", "beautiful place", "tourist spot".

WIKIPEDIA TITLE INSTRUCTION (STRICT):
- For every activity, set "wikipediaTitle" to the exact English Wikipedia page title for the primary place/landmark in that activity.
- Example: "Eiffel Tower", "Gateway of India", "British Museum".
- If you cannot confidently identify the exact page title, set "wikipediaTitle" to an empty string.
${flightPriceInfo}
`.trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.GROQ_KEY || process.env.XAI_API_KEY || process.env.GROK_API_KEY || process.env.GEMINI_API_KEY;
  const GROQ_MODEL = process.env.GROQ_MODEL || process.env.XAI_MODEL || 'meta-llama/llama-4-maverick-17b-128e-instruct';

  if (!GROQ_API_KEY) {
    return res.status(500).send('Missing GROQ_API_KEY environment variable');
  }

  const groq = new Groq({ apiKey: GROQ_API_KEY });

  try {
    const params = req.body;

    const startDate = params.startDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const days = params.days || 4;
    const returnDate = new Date(new Date(startDate).getTime() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const realFlights = await fetchRealFlights(
      params.source || 'JFK',
      params.destination || 'LHR',
      startDate,
      returnDate,
      params.flightClass || 'Economy',
      params.currency || 'INR'
    );

    const realFlightPrice = realFlights.avgRoundTripPrice > 0 ? realFlights.avgRoundTripPrice : undefined;
    const prompt = buildPrompt(params, realFlightPrice);
    
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: 'You are a meticulous travel planner. Return ONLY valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const content = completion?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      return res.status(502).send('Groq returned empty content');
    }

    let travelData: any;
    try {
      travelData = JSON.parse(content);
    } catch {
      return res.status(502).send('Model returned invalid JSON. Try fewer days or simpler interests.');
    }

    if (!travelData?.tripPlan?.itinerary) {
      return res.status(502).send('Model returned an unexpected shape (missing tripPlan/itinerary).');
    }

    // Use real flight data if available
    if (realFlights.flights.length > 0) {
      travelData.flights = realFlights.flights;
    } else if (!Array.isArray(travelData.flights)) {
      travelData.flights = [];
    } else {
      travelData.flights = travelData.flights.slice(0, 4);
    }

    if (realFlights.returnFlights.length > 0) {
      travelData.returnFlights = realFlights.returnFlights;
    } else if (!Array.isArray(travelData.returnFlights)) {
      travelData.returnFlights = travelData.flights;
    } else {
      travelData.returnFlights = travelData.returnFlights.slice(0, 4);
    }

    if (!Array.isArray(travelData.hotels)) travelData.hotels = [];
    travelData.hotels = travelData.hotels.slice(0, 4);

    if (!travelData.tripPlan) travelData.tripPlan = {};
    travelData.tripPlan.startDate = startDate;
    travelData.tripPlan.returnDate = returnDate;

    const userPackingList = Array.isArray(params?.packingList) ? params.packingList : [];
    const userEssentials = Array.isArray(params?.essentials) ? params.essentials : [];
    
    if (!Array.isArray(travelData.tripPlan.selectedPackingList) || travelData.tripPlan.selectedPackingList.length === 0) {
      travelData.tripPlan.selectedPackingList = userPackingList;
    }
    if (!Array.isArray(travelData.tripPlan.selectedEssentials) || travelData.tripPlan.selectedEssentials.length === 0) {
      travelData.tripPlan.selectedEssentials = userEssentials;
    }

    // Normalize itinerary data
    const paramsCurrency = String(params?.currency || '').toUpperCase();
    const itinerary = travelData?.tripPlan?.itinerary;
    if (Array.isArray(itinerary)) {
      for (const day of itinerary) {
        const activities = day?.activities;
        if (!Array.isArray(activities)) continue;
        for (const act of activities) {
          if (!act) continue;

          const fallbackTitle = String(act.wikipediaTitle || act.location || act.imageQuery || '').trim();
          if (typeof act.location !== 'string' || !act.location.trim()) {
            act.location = fallbackTitle || 'Local highlight';
          }
          if (typeof act.description !== 'string' || !act.description.trim()) {
            const place = String(act.location || fallbackTitle || 'this place').trim();
            const destName = getCityNameFromCode(params?.destination);
            act.description = `Visit ${place} in ${destName || 'your destination'} for a memorable local experience.`;
          }

          if (typeof act.costEstimate !== 'string' || !act.costEstimate.trim()) {
            act.costEstimate = paramsCurrency === 'INR' ? '₹0 (free)' : '0 (free)';
          }
        }

        if (typeof day?.title !== 'string' || !day.title.trim() || /^day\s*\d+\b/i.test(day.title.trim())) {
          const firstPlace = String(activities?.[0]?.location || activities?.[0]?.wikipediaTitle || activities?.[0]?.imageQuery || '').trim();
          day.title = firstPlace ? `${firstPlace} Day` : `Day ${String(day?.day ?? '').trim() || ''}`.trim();
        }
      }
    }

    return res.status(200).json(travelData);
  } catch (err: any) {
    console.error(err);
    return res.status(500).send(err?.message || 'Server error');
  }
}