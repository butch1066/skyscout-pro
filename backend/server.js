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

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// API Configuration
const AMADEUS_CONFIG = {
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET,
  baseURL: 'https://test.api.amadeus.com/v2'
};

const KIWI_CONFIG = {
  apiKey: process.env.KIWI_API_KEY,
  baseURL: 'https://api.tequila.kiwi.com'
};

const SERPAPI_CONFIG = {
  apiKey: process.env.SERPAPI_KEY,
  baseURL: 'https://serpapi.com/search'
};

// Amadeus Token Management
let amadeusToken = null;
let tokenExpiry = null;

async function getAmadeusToken() {
  if (amadeusToken && tokenExpiry && Date.now() < tokenExpiry) {
    return amadeusToken;
  }

  try {
    const response = await axios.post(
      'https://test.api.amadeus.com/v1/security/oauth2/token',
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: AMADEUS_CONFIG.clientId,
        client_secret: AMADEUS_CONFIG.clientSecret
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    amadeusToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;
    return amadeusToken;
  } catch (error) {
    console.error('Amadeus token error:', error.message);
    throw new Error('Failed to authenticate with Amadeus API');
  }
}

// Search Amadeus Flights
async function searchAmadeus(params) {
  try {
    const token = await getAmadeusToken();
    const response = await axios.get(`${AMADEUS_CONFIG.baseURL}/shopping/flight-offers`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        originLocationCode: params.origin,
        destinationLocationCode: params.destination,
        departureDate: params.departDate,
        returnDate: params.returnDate || undefined,
        adults: params.passengers,
        max: 10,
        currencyCode: 'USD'
      }
    });

    return response.data.data.map(offer => ({
      source: 'Amadeus',
      price: parseFloat(offer.price.total),
      currency: offer.price.currency,
      airline: offer.validatingAirlineCodes[0],
      stops: offer.itineraries[0].segments.length - 1,
      duration: offer.itineraries[0].duration,
      segments: offer.itineraries[0].segments.map(seg => ({
        departure: seg.departure.iataCode,
        arrival: seg.arrival.iataCode,
        departureTime: seg.departure.at,
        arrivalTime: seg.arrival.at,
        carrier: seg.carrierCode,
        flightNumber: seg.number
      })),
      bookingUrl: `https://www.amadeus.com`,
      deepLink: offer.id
    }));
  } catch (error) {
    console.error('Amadeus search error:', error.response?.data || error.message);
    return [];
  }
}

// Search Kiwi.com Flights
async function searchKiwi(params) {
  try {
    const response = await axios.get(`${KIWI_CONFIG.baseURL}/v2/search`, {
      headers: { apikey: KIWI_CONFIG.apiKey },
      params: {
        fly_from: params.origin,
        fly_to: params.destination,
        date_from: params.departDate,
        date_to: params.departDate,
        return_from: params.returnDate || undefined,
        return_to: params.returnDate || undefined,
        adults: params.passengers,
        curr: 'USD',
        limit: 10
      }
    });

    return response.data.data.map(flight => ({
      source: 'Kiwi.com',
      price: flight.price,
      currency: flight.currency,
      airline: flight.airlines[0],
      stops: flight.route.length - 1,
      duration: `${Math.floor(flight.duration.total / 3600)}h ${Math.floor((flight.duration.total % 3600) / 60)}m`,
      segments: flight.route.map(seg => ({
        departure: seg.flyFrom,
        arrival: seg.flyTo,
        departureTime: new Date(seg.dTime * 1000).toISOString(),
        arrivalTime: new Date(seg.aTime * 1000).toISOString(),
        carrier: seg.airline,
        flightNumber: seg.flight_no
      })),
      bookingUrl: flight.deep_link,
      deepLink: flight.booking_token
    }));
  } catch (error) {
    console.error('Kiwi search error:', error.response?.data || error.message);
    return [];
  }
}

// Main Search Endpoint
app.post('/api/search-flights', async (req, res) => {
  try {
    const { origin, destination, departDate, returnDate, passengers } = req.body;

    if (!origin || !destination || !departDate) {
      return res.status(400).json({ 
        error: 'Missing required fields: origin, destination, departDate' 
      });
    }

    const cacheKey = `${origin}-${destination}-${departDate}-${returnDate}-${passengers}`;
    
    const cachedResults = cache.get(cacheKey);
    if (cachedResults) {
      console.log('Cache hit:', cacheKey);
      return res.json({ results: cachedResults, cached: true });
    }

    console.log('Cache miss, fetching fresh data...');

    const [amadeusResults, kiwiResults] = await Promise.allSettled([
      searchAmadeus({ origin, destination, departDate, returnDate, passengers }),
      searchKiwi({ origin, destination, departDate, returnDate, passengers })
    ]);

    const allResults = [
      ...(amadeusResults.status === 'fulfilled' ? amadeusResults.value : []),
      ...(kiwiResults.status === 'fulfilled' ? kiwiResults.value : [])
    ];

    allResults.sort((a, b) => a.price - b.price);
    cache.set(cacheKey, allResults);

    res.json({ 
      results: allResults, 
      cached: false,
      sources: {
        amadeus: amadeusResults.status === 'fulfilled' ? amadeusResults.value.length : 0,
        kiwi: kiwiResults.status === 'fulfilled' ? kiwiResults.value.length : 0
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      error: 'Failed to search flights',
      message: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    cache: {
      keys: cache.keys().length,
      stats: cache.getStats()
    }
  });
});

// Airport search endpoint
app.get('/api/airports', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const token = await getAmadeusToken();
    const response = await axios.get(
      'https://test.api.amadeus.com/v1/reference-data/locations',
      {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          keyword: query,
          subType: 'AIRPORT,CITY'
        }
      }
    );

    const airports = response.data.data.map(loc => ({
      code: loc.iataCode,
      name: loc.name,
      city: loc.address?.cityName,
      country: loc.address?.countryName
    }));

    res.json({ airports });
  } catch (error) {
    console.error('Airport search error:', error.message);
    res.status(500).json({ error: 'Failed to search airports' });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✈️  Flight Aggregator API running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 Amadeus: ${AMADEUS_CONFIG.clientId ? '✓' : '✗'}`);
  console.log(`🔑 Kiwi: ${KIWI_CONFIG.apiKey ? '✓' : '✗'}`);
});