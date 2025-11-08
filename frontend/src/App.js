import React, { useState } from 'axios';
import axios from 'axios';
import './App.css';

// --- Helper Components ---
const Loader = () => <div className="loader">✈️</div>;

const SourceLogo = ({ source }) => {
  const logos = {
    'Amadeus': 'https://icdn.kiwi.com/airlines/64/AM.png',
    'Kiwi.com': 'https://icdn.kiwi.com/airlines/64/KK.png',
    'Google Flights (New)': 'https://www.gstatic.com/travel-frontend/images/travel_logo_200.png',
    'Blue Scraper': 'https://www.skyscanner.net/images/favicon.ico', // Using Skyscanner logo as it's a Skyscanner scraper
    'Booking.com': 'https://www.booking.com/favicon.ico',
  };
  // Fallback for sources without a specific logo
  const defaultLogo = 'https://www.gstatic.com/images/branding/product/1x/google_cloud_48dp.png';
  return <img src={logos[source] || defaultLogo} alt={source} className="source-logo" title={source} />;
};

const ResultCard = ({ flight }) => (
  <div className="result-card">
    <div className="card-header">
      <SourceLogo source={flight.source} />
      <span className="price">${flight.price.toFixed(2)}</span>
    </div>
    <div className="card-body">
      <p><strong>Airline:</strong> {flight.airline}</p>
      <p><strong>Duration:</strong> {flight.duration}</p>
      <p><strong>Stops:</strong> {flight.stops}</p>
    </div>
    <div className="card-footer">
      <a href={flight.bookingUrl} target="_blank" rel="noopener noreferrer" className="book-button">
        Book Now
      </a>
    </div>
  </div>
);

// --- Main App Component ---
function App() {
  const [searchParams, setSearchParams] = useState({
    origin: 'JFK',
    destination: 'LAX',
    departDate: '2025-12-15',
    returnDate: '',
    passengers: 1,
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setSearchParams({ ...searchParams, [e.target.name]: e.target.value });
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults([]);
    try {
      const response = await axios.post('/api/search-flights', searchParams);
      setResults(response.data.results);
    } catch (err) {
      setError('Failed to fetch flight data. Please check the backend server and API keys.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>✈️ SkyScout Pro</h1>
        <p>Your Ultimate Flight Deal Aggregator</p>
      </header>

      <main>
        <form className="search-form" onSubmit={handleSearch}>
          <div className="form-row">
            <input
              name="origin"
              value={searchParams.origin}
              onChange={handleInputChange}
              placeholder="Origin (e.g., JFK)"
              required
            />
            <input
              name="destination"
              value={searchParams.destination}
              onChange={handleInputChange}
              placeholder="Destination (e.g., LAX)"
              required
            />
          </div>
          <div className="form-row">
            <input
              name="departDate"
              type="date"
              value={searchParams.departDate}
              onChange={handleInputChange}
              required
            />
            <input
              name="returnDate"
              type="date"
              value={searchParams.returnDate}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-row">
            <input
              name="passengers"
              type="number"
              min="1"
              value={searchParams.passengers}
              onChange={handleInputChange}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Searching...' : 'Search Flights'}
            </button>
          </div>
        </form>

        {error && <p className="error-message">{error}</p>}

        <div className="results-container">
          {loading && <Loader />}
          {results.map((flight, index) => (
            <ResultCard key={index} flight={flight} />
          ))}
        </div>
      </main>

      <footer>
        <p>SkyScout Pro © 2025</p>
      </footer>
    </div>
  );
}

export default App;
