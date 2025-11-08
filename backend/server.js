// server.js - Production-ready Node.js Backend
const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache

// --- Middleware ---
app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// --- API Configuration ---
const AMADEUS_CONFIG = {
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET,
  baseURL: 'https://test.api.amadeus.com', // Use 'https://api.amadeus.com' for production
};

const KIWI_CONFIG = {
  apiKey: process.env.KIWI_API_KEY,
  baseURL: 'https://api.tequila.kiwi.com',
};

const SERPAPI_CONFIG = {
  apiKey: process.env.SERPAPI_KEY,
  baseURL: 'https://serpapi.com/search',
};

const SKYSCANNER_CONFIG = {
    apiKey: process.env.SKYSCANNER_API_KEY,
    baseURL: 'https://skyscanner44.p.rapidapi.com',
};

// --- Amadeus Token Management ---
let amadeusToken = null;
let tokenExpiry = null;

async function getAmadeusToken() {
  if (amadeusToken && tokenExpiry && Date.now() < tokenExpiry) {
    return amadeusToken;
  }
  try {
    const response = await axios.post(
      `${AMADEUS_CONFIG.baseURL}/v1/security/oauth2/token`,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: AMADEUS_CONFIG.clientId,
        client_secret: AMADEUS_CONFIG.clientSecret,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    amadeusToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Refresh 1 min before expiry
    return amadeusToken;
  } catch (error) {
    console.error('Amadeus token error:', error.message);
    throw new Error('Failed to authenticate with Amadeus API');
  }
}

// --- Flight Search Providers ---

async function searchAmadeus(params) {
  try {
    const token = await getAmadeusToken();
    const response = await axios.get(`${AMADEUS_CONFIG.baseURL}/v2/shopping/flight-offers`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        originLocationCode: params.origin,
        destinationLocationCode: params.destination,
        departureDate: params.departDate,
        returnDate: params.returnDate || undefined,
        adults: params.passengers,
        max: 5,
        currencyCode: 'USD',
      },
    });
    return response.data.data.map(offer => ({
      source: 'Amadeus',
      price: parseFloat(offer.price.total),
      airline: offer.validatingAirlineCodes[0],
      stops: offer.itineraries[0].segments.length - 1,
      duration: offer.itineraries[0].duration,
      bookingUrl: `https://www.amadeus.com`,
    }));
  } catch (error) {
    console.error('Amadeus search error:', error.response?.data?.errors[0]?.detail || error.message);
    return [];
  }
}

async function searchKiwi(params) {
  try {
    const response = await axios.get(`${KIWI_CONFIG.baseURL}/v2/search`, {
      headers: { apikey: KIWI_CONFIG.apiKey },
      params: {
        fly_from: params.origin,
        fly_to: params.destination,
        date_from: params.departDate.split('-').reverse().join('/'),
        date_to: params.departDate.split('-').reverse().join('/'),
        return_from: params.returnDate ? params.returnDate.split('-').reverse().join('/') : undefined,
        return_to: params.returnDate ? params.returnDate.split('-').reverse().join('/') : undefined,
        adults: params.passengers,
        curr: 'USD',
        limit: 5,
      },
    });
    return response.data.data.map(flight => ({
      source: 'Kiwi.com',
      price: flight.price,
      airline: flight.airlines[0],
      stops: flight.route.length - 1,
      duration: `${Math.floor(flight.duration.total / 3600)}h ${Math.floor((flight.duration.total % 3600) / 60)}m`,
      bookingUrl: flight.deep_link,
    }));
  } catch (error) {
    console.error('Kiwi search error:', error.response?.data || error.message);
    return [];
  }
}

async function searchGoogleFlights(params) {
  try {
    const response = await axios.get(SERPAPI_CONFIG.baseURL, {
      params: {
        engine: 'google_flights',
        departure_id: params.origin,
        arrival_id: params.destination,
        outbound_date: params.departDate,
        return_date: params.returnDate || undefined,
        adults: params.passengers,
        currency: 'USD',
        api_key: SERPAPI_CONFIG.apiKey,
      },
    });
    const flights = response.data.best_flights || [];
    return flights.map(flight => ({
      source: 'Google Flights',
      price: flight.price,
      airline: flight.flights[0]?.airline || 'Multiple',
      stops: flight.flights.length - 1,
      duration: flight.total_duration,
      bookingUrl: `https://www.google.com/travel/flights`,
    }));
  } catch (error) {
    console.error('Google Flights search error:', error.response?.data || error.message);
    return [];
  }
}

async function searchSkyscanner(params) {
    try {
        const response = await axios.get(`${SKYSCANNER_CONFIG.baseURL}/search`, {
            headers: {
                'x-rapidapi-host': 'skyscanner44.p.rapidapi.com',
                'x-rapidapi-key': SKYSCANNER_CONFIG.apiKey,
            },
            params: {
                adults: params.passengers,
                origin: params.origin,
                destination: params.destination,
                departureDate: params.departDate,
                returnDate: params.returnDate || undefined,
                currency: 'USD',
            },
        });
        return response.data.itineraries.buckets.slice(0, 5).map(bucket => ({
            source: 'Skyscanner',
            price: bucket.items[0].price.raw,
            airline: bucket.items[0].legs[0].carriers.marketing[0].name,
            stops: bucket.items[0].legs[0].stopCount,
            duration: `${Math.floor(bucket.items[0].legs[0].duration / 60)}h ${bucket.items[0].legs[0].duration % 60}m`,
            bookingUrl: bucket.items[0].deeplink,
        }));
    } catch (error) {
        console.error('Skyscanner search error:', error.response?.data || error.message);
        return [];
    }
}

async function searchBooking(params) {
    try {
        const response = await axios.get(SERPAPI_CONFIG.baseURL, {
            params: {
                engine: 'booking_flights',
                departure_id: params.origin,
                arrival_id: params.destination,
                outbound_date: params.departDate,
                return_date: params.returnDate || undefined,
                adults: params.passengers,
                currency: 'USD',
                api_key: SERPAPI_CONFIG.apiKey,
            },
        });
        const flights = response.data.best_flights || [];
        return flights.map(flight => ({
            source: 'Booking.com',
            price: flight.price,
            airline: flight.flights[0]?.airline || 'Multiple',
            stops: flight.flights.length - 1,
            duration: flight.total_duration,
            bookingUrl: 'https://www.booking.com/flights',
        }));
    } catch (error) {
        console.error('Booking.com search error:', error.response?.data || error.message);
        return [];
    }
}

async function searchUberFlights(params) {
    // This is a mock function as Uber does not have a public flight API
    return new Promise(resolve => {
        setTimeout(() => {
            resolve([{
                source: 'Uber Flights',
                price: Math.floor(Math.random() * (600 - 300 + 1) + 300), // Random price
                airline: 'Uber Air (Mock)',
                stops: Math.floor(Math.random() * 2),
                duration: `${Math.floor(Math.random() * 10 + 2)}h ${Math.floor(Math.random() * 60)}m`,
                bookingUrl: 'https://www.uber.com/flights',
            }]);
        }, 500);
    });
}


// --- Main Search Endpoint ---
app.post('/api/search-flights', async (req, res) => {
  try {
    const { origin, destination, departDate, returnDate, passengers } = req.body;
    if (!origin || !destination || !departDate) {
      return res.status(400).json({ error: 'Missing required fields: origin, destination, departDate' });
    }

    const cacheKey = `${origin}-${destination}-${departDate}-${returnDate}-${passengers}`;
    const cachedResults = cache.get(cacheKey);
    if (cachedResults) {
      console.log('Cache hit:', cacheKey);
      return res.json({ results: cachedResults, cached: true });
    }

    console.log('Cache miss, fetching fresh data...');
    const searchParams = { origin, destination, departDate, returnDate, passengers };

    const providers = [
        searchAmadeus(searchParams),
        searchKiwi(searchParams),
        searchGoogleFlights(searchParams),
        searchSkyscanner(searchParams),
        searchBooking(searchParams),
        searchUberFlights(searchParams),
    ];

    const settledResults = await Promise.allSettled(providers);

    const allResults = settledResults
        .filter(res => res.status === 'fulfilled' && res.value)
        .flatMap(res => res.value);

    allResults.sort((a, b) => a.price - b.price);
    cache.set(cacheKey, allResults);

    res.json({ results: allResults, cached: false });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search flights', message: error.message });
  }
});

// --- Utility Endpoints ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/airports', async (req, res) => {
    try {
        const { query } = req.query;
        if (!query || query.length < 2) {
            return res.status(400).json({ error: 'Query must be at least 2 characters' });
        }
        const token = await getAmadeusToken();
        const response = await axios.get(`${AMADEUS_CONFIG.baseURL}/v1/reference-data/locations`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { keyword: query, subType: 'AIRPORT,CITY' },
        });
        res.json({ airports: response.data.data });
    } catch (error) {
        console.error('Airport search error:', error.message);
        res.status(500).json({ error: 'Failed to search airports' });
    }
});

// --- Server Start ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✈️  SkyScout Pro API running on port ${PORT}`);
  console.log(`---`);
  console.log(`🔑 Amadeus: ${AMADEUS_CONFIG.clientId ? '✓' : '✗'}`);
  console.log(`🔑 Kiwi.com: ${KIWI_CONFIG.apiKey ? '✓' : '✗'}`);
  console.log(`🔑 SerpAPI (Google/Booking): ${SERPAPI_CONFIG.apiKey ? '✓' : '✗'}`);
  console.log(`🔑 Skyscanner (RapidAPI): ${SKYSCANNER_CONFIG.apiKey ? '✓' : '✗'}`);
  console.log(`---`);
});