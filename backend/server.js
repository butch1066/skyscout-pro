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
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// --- API Configuration ---
const AMADEUS_CONFIG = {
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET,
  baseURL: 'https://test.api.amadeus.com',
};

const KIWI_CONFIG = {
  apiKey: process.env.KIWI_API_KEY,
  baseURL: 'https://api.tequila.kiwi.com',
};

const SERPAPI_CONFIG = {
  apiKey: process.env.SERPAPI_KEY,
  baseURL: 'https://serpapi.com/search',
};

const RAPIDAPI_CONFIG = {
    key: process.env.RAPIDAPI_KEY,
    blueScraperHost: 'blue-scraper.p.rapidapi.com',
    googleFlightsHost: 'google-flights2.p.rapidapi.com',
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
    tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;
    return amadeusToken;
  } catch (error) {
    console.error('Amadeus token error:', error.message);
    throw new Error('Failed to authenticate with Amadeus API');
  }
}

// --- Flight Search Providers ---

async function searchAmadeus(params) {
  // Unchanged from previous version
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
  // Unchanged from previous version
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

async function searchBooking(params) {
  // Unchanged, still uses SerpAPI
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

// --- NEW/REWRITTEN PROVIDERS ---

async function searchGoogleFlightsRapidAPI(params) {
  try {
    const response = await axios.get(`https://${RAPIDAPI_CONFIG.googleFlightsHost}/api/v1/searchFlights`, {
      headers: {
        'x-rapidapi-host': RAPIDAPI_CONFIG.googleFlightsHost,
        'x-rapidapi-key': RAPIDAPI_CONFIG.key,
      },
      params: {
        departure_id: params.origin,
        arrival_id: params.destination,
        departure_date: params.departDate,
        return_date: params.returnDate || undefined,
        adults: params.passengers,
        currency: 'USD',
        country_code: 'US',
        search_type: 'best',
      },
    });
    return response.data.data.flights.slice(0, 5).map(flight => ({
        source: 'Google Flights (New)',
        price: flight.price.total,
        airline: flight.airline_name,
        stops: flight.stops,
        duration: flight.total_duration,
        bookingUrl: flight.url,
    }));
  } catch (error) {
    console.error('Google Flights (RapidAPI) search error:', error.response?.data || error.message);
    return [];
  }
}

async function searchBlueScraper(params) {
    // This API requires a special 'skyId'. We will try to look it up first.
    const getLocationSkyId = async (query) => {
        try {
            const response = await axios.get(`https://${RAPIDAPI_CONFIG.blueScraperHost}/1.0/flights/search-location`, {
                headers: {
                    'x-rapidapi-host': RAPIDAPI_CONFIG.blueScraperHost,
                    'x-rapidapi-key': RAPIDAPI_CONFIG.key,
                },
                params: { query },
            });
            // Assuming the first result is the correct one
            return response.data[0]?.skyId;
        } catch (error) {
            console.error(`Failed to get SkyId for ${query}:`, error.response?.data || error.message);
            return null;
        }
    };

    const originSkyId = await getLocationSkyId(params.origin);
    const destinationSkyId = await getLocationSkyId(params.destination);

    if (!originSkyId || !destinationSkyId) {
        console.error('Could not retrieve SkyIds for Blue Scraper search.');
        return [];
    }

    try {
        const response = await axios.get(`https://${RAPIDAPI_CONFIG.blueScraperHost}/1.0/flights/search-roundtrip`, {
            headers: {
                'x-rapidapi-host': RAPIDAPI_CONFIG.blueScraperHost,
                'x-rapidapi-key': RAPIDAPI_CONFIG.key,
            },
            params: {
                originSkyId: originSkyId,
                destinationSkyId: destinationSkyId,
                departureDate: params.departDate,
                returnDate: params.returnDate || undefined,
                adults: params.passengers,
                currency: 'USD',
            },
        });
        return response.data.flights.slice(0, 5).map(flight => ({
            source: 'Blue Scraper',
            price: flight.price,
            airline: flight.legs[0].carriers[0].name,
            stops: flight.legs[0].stops,
            duration: `${Math.floor(flight.legs[0].duration / 60)}h ${flight.legs[0].duration % 60}m`,
            bookingUrl: flight.deeplink,
        }));
    } catch (error) {
        console.error('Blue Scraper search error:', error.response?.data || error.message);
        return [];
    }
}


// --- Main Search Endpoint ---
app.post('/api/search-flights', async (req, res) => {
  try {
    const { origin, destination, departDate, returnDate, passengers } = req.body;
    if (!origin || !destination || !departDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const cacheKey = `v2-${origin}-${destination}-${departDate}-${returnDate}-${passengers}`;
    const cachedResults = cache.get(cacheKey);
    if (cachedResults) {
      console.log('Cache hit:', cacheKey);
      return res.json({ results: cachedResults, cached: true });
    }

    console.log('Cache miss, fetching fresh data with new providers...');
    const searchParams = { origin, destination, departDate, returnDate, passengers };

    const providers = [
        searchAmadeus(searchParams),
        searchKiwi(searchParams),
        searchBooking(searchParams),
        searchGoogleFlightsRapidAPI(searchParams),
        searchBlueScraper(searchParams),
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
  console.log(`✈️  SkyScout Pro API (v2) running on port ${PORT}`);
  console.log(`---`);
  console.log(`🔑 Amadeus: ${AMADEUS_CONFIG.clientId ? '✓' : '✗'}`);
  console.log(`🔑 Kiwi.com: ${KIWI_CONFIG.apiKey ? '✓' : '✗'}`);
  console.log(`🔑 SerpAPI (Booking.com): ${SERPAPI_CONFIG.apiKey ? '✓' : '✗'}`);
  console.log(`🔑 RapidAPI (Google/Skyscanner): ${RAPIDAPI_CONFIG.key ? '✓' : '✗'}`);
  console.log(`---`);
});