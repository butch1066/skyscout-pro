// SkyScout Pro - Enhanced Production Backend
// Searches 4 flight sources: Amadeus, Skyscanner, Google Flights x2

const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const cache = new NodeCache({ stdTTL: 3600 });

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

// API Keys - Pre-configured
const APIS = {
  amadeus: {
    clientId: process.env.AMADEUS_CLIENT_ID || 'iu3QA42HvCJ081kRvGGWUDe7nnQTHfSi',
    clientSecret: process.env.AMADEUS_CLIENT_SECRET || 'tVMfZRJ83sU22jqe',
    baseURL: 'https://api.amadeus.com/v2'
  },
  rapidAPI: process.env.RAPIDAPI_KEY || '3e9fb24955mshdc4b06a4eeec1e3p191f30jsnb2b8a52188e8',
  serpAPI: process.env.SERPAPI_KEY || '6ae4a09f488ab268a66072c6f32b1015af989ba0c2dcbda5fe9e02a5fa8109b5'
};

let amadeusToken = null;
let tokenExpiry = null;

async function getAmadeusToken() {
  if (amadeusToken && tokenExpiry && Date.now() < tokenExpiry) return amadeusToken;
  try {
    const res = await axios.post('https://api.amadeus.com/v1/security/oauth2/token',
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: APIS.amadeus.clientId,
        client_secret: APIS.amadeus.clientSecret
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    amadeusToken = res.data.access_token;
    tokenExpiry = Date.now() + (res.data.expires_in * 1000) - 60000;
    return amadeusToken;
  } catch (err) {
    console.error('Amadeus auth error:', err.message);
    return null;
  }
}

async function searchAmadeus(p) {
  try {
    const token = await getAmadeusToken();
    if (!token) return [];
    const res = await axios.get(`${APIS.amadeus.baseURL}/shopping/flight-offers`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        originLocationCode: p.origin,
        destinationLocationCode: p.destination,
        departureDate: p.departDate,
        returnDate: p.returnDate || undefined,
        adults: p.passengers,
        max: 15,
        currencyCode: 'USD'
      },
      timeout: 10000
    });
    return res.data.data.map(o => ({
      source: 'Amadeus',
      price: parseFloat(o.price.total),
      currency: 'USD',
      airline: o.validatingAirlineCodes[0],
      stops: o.itineraries[0].segments.length - 1,
      duration: o.itineraries[0].duration,
      bookingUrl: 'https://www.amadeus.com'
    }));
  } catch (err) {
    console.error('Amadeus error:', err.message);
    return [];
  }
}

async function searchSkyscanner(p) {
  try {
    const url = p.returnDate
      ? 'https://blue-scraper.p.rapidapi.com/1.0/flights/search-roundtrip'
      : 'https://blue-scraper.p.rapidapi.com/1.0/flights/search-oneway';
    const res = await axios.get(url, {
      headers: {
        'x-rapidapi-host': 'blue-scraper.p.rapidapi.com',
        'x-rapidapi-key': APIS.rapidAPI
      },
      params: {
        originSkyId: p.origin,
        destinationSkyId: p.destination,
        departureDate: p.departDate,
        returnDate: p.returnDate,
        adults: p.passengers,
        currency: 'USD'
      },
      timeout: 15000
    });
    const flights = res.data.data?.flights || [];
    return flights.slice(0, 10).map(f => ({
      source: 'Skyscanner',
      price: f.price?.amount || 0,
      currency: 'USD',
      airline: f.carriers?.[0] || 'Multiple',
      stops: f.stops || 0,
      duration: `${Math.floor(f.duration / 60)}h ${f.duration % 60}m`,
      bookingUrl: f.deeplink || 'https://www.skyscanner.com'
    }));
  } catch (err) {
    console.error('Skyscanner error:', err.message);
    return [];
  }
}

async function searchGoogleFlightsV2(p) {
  try {
    const res = await axios.get('https://google-flights2.p.rapidapi.com/api/v1/searchFlights', {
      headers: {
        'x-rapidapi-host': 'google-flights2.p.rapidapi.com',
        'x-rapidapi-key': APIS.rapidAPI
      },
      params: {
        departure_id: p.origin,
        arrival_id: p.destination,
        outbound_date: p.departDate,
        return_date: p.returnDate,
        adults: p.passengers,
        travel_class: 'ECONOMY',
        currency: 'USD',
        search_type: 'best'
      },
      timeout: 15000
    });
    const flights = res.data.data?.flights || [];
    return flights.slice(0, 10).map(f => ({
      source: 'Google Flights',
      price: f.price?.value || 0,
      currency: 'USD',
      airline: f.airline || 'Multiple',
      stops: f.stops || 0,
      duration: f.duration || 'N/A',
      bookingUrl: f.booking_url || 'https://www.google.com/travel/flights'
    }));
  } catch (err) {
    console.error('Google Flights v2 error:', err.message);
    return [];
  }
}

async function searchSerpAPI(p) {
  try {
    const res = await axios.get('https://serpapi.com/search', {
      params: {
        engine: 'google_flights',
        departure_id: p.origin,
        arrival_id: p.destination,
        outbound_date: p.departDate,
        return_date: p.returnDate,
        adults: p.passengers,
        currency: 'USD',
        api_key: APIS.serpAPI
      },
      timeout: 10000
    });
    const flights = res.data.best_flights || [];
    return flights.slice(0, 10).map(f => ({
      source: 'Google Flights (Serp)',
      price: f.price,
      currency: 'USD',
      airline: f.flights?.[0]?.airline || 'Multiple',
      stops: f.flights?.length - 1 || 0,
      duration: f.total_duration,
      bookingUrl: 'https://www.google.com/travel/flights'
    }));
  } catch (err) {
    console.error('SerpAPI error:', err.message);
    return [];
  }
}

app.post('/api/search-flights', async (req, res) => {
  try {
    const { origin, destination, departDate, returnDate, passengers } = req.body;
    if (!origin || !destination || !departDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const cacheKey = `${origin}-${destination}-${departDate}-${returnDate}-${passengers}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ results: cached, cached: true });
    }
    console.log('Searching all sources...');
    const [a, b, c, d] = await Promise.allSettled([
      searchAmadeus({ origin, destination, departDate, returnDate, passengers }),
      searchSkyscanner({ origin, destination, departDate, returnDate, passengers }),
      searchGoogleFlightsV2({ origin, destination, departDate, returnDate, passengers }),
      searchSerpAPI({ origin, destination, departDate, returnDate, passengers })
    ]);
    const all = [
      ...(a.status === 'fulfilled' ? a.value : []),
      ...(b.status === 'fulfilled' ? b.value : []),
      ...(c.status === 'fulfilled' ? c.value : []),
      ...(d.status === 'fulfilled' ? d.value : [])
    ];
    const unique = [];
    const seen = new Set();
    all.forEach(f => {
      const key = `${f.airline}-${f.price}-${f.stops}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(f);
      }
    });
    unique.sort((x, y) => x.price - y.price);
    cache.set(cacheKey, unique);
    console.log(`Found ${unique.length} unique flights`);
    res.json({
      results: unique,
      cached: false,
      sources: {
        amadeus: a.status === 'fulfilled' ? a.value.length : 0,
        skyscanner: b.status === 'fulfilled' ? b.value.length : 0,
        googleV2: c.status === 'fulfilled' ? c.value.length : 0,
        serp: d.status === 'fulfilled' ? d.value.length : 0
      }
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed', message: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    apis: {
      amadeus: APIS.amadeus.clientId ? '✓' : '✗',
      rapidAPI: APIS.rapidAPI ? '✓' : '✗',
      serpAPI: APIS.serpAPI ? '✓' : '✗'
    },
    cache: { keys: cache.keys().length, stats: cache.getStats() }
  });
});

app.get('/api/airports', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Query too short' });
    }
    const token = await getAmadeusToken();
    if (!token) return res.status(500).json({ error: 'Auth failed' });
    const r = await axios.get('https://api.amadeus.com/v1/reference-data/locations', {
      headers: { Authorization: `Bearer ${token}` },
      params: { keyword: query, subType: 'AIRPORT,CITY' }
    });
    const airports = r.data.data.map(l => ({
      code: l.iataCode,
      name: l.name,
      city: l.address?.cityName,
      country: l.address?.countryName
    }));
    res.json({ airports });
  } catch (err) {
    res.status(500).json({ error: 'Airport search failed' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n✈️  SkyScout Pro API`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🌐 Port: ${PORT}`);
  console.log(`🔑 Amadeus: ✓`);
  console.log(`🔑 Skyscanner: ✓`);
  console.log(`🔑 Google Flights: ✓`);
  console.log(`🔑 SerpAPI: ✓`);
  console.log(`🚀 Ready!\n`);
});