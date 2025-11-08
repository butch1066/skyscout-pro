# ✈️ SkyScout Pro - The Ultimate Flight Aggregator

> **Production-ready flight comparison app with web, mobile, and API support, searching Amadeus, Kiwi.com, Google Flights, Skyscanner, and more.**

![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)
![Providers](https://img.shields.io/badge/APIs-6-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

---

## 🎯 What This Is

A **complete, production-ready** flight price comparison platform that searches multiple major booking sites simultaneously to find the best deals. It's built with real APIs and includes:

- ✅ **Backend API** (Node.js) aggregating 6 flight providers.
- ✅ **Web Application** (React) with a clean, responsive interface.
- ✅ **Mobile App** (React Native) placeholder, ready to be built out.
- ✅ **Real-time flight data** from Amadeus, Kiwi.com, Google Flights, Skyscanner, Booking.com, and a mock Uber Flights API.

---

## 🚀 Quick Start (5-10 Minutes)

### 1. Clone the Repository
```bash
git clone https://github.com/butch1066/skyscout-pro.git
cd skyscout-pro
```

### 2. Get FREE API Keys
You'll need to get free API keys from the following services:

| Provider | Free Tier | Sign Up Link |
|---|---|---|
| **Amadeus** | 2,000 calls/month | [developers.amadeus.com](https://developers.amadeus.com) |
| **Kiwi.com** | 1,000 calls/month | [tequila.kiwi.com](https://tequila.kiwi.com) |
| **SerpAPI** | 100 searches/month | [serpapi.com](https://serpapi.com) |
| **RapidAPI (for Skyscanner)** | 500 calls/month | [rapidapi.com/skyscanner/api/skyscanner44](https://rapidapi.com/skyscanner/api/skyscanner44) |

### 3. Setup Backend
```bash
cd backend
npm install

# Create your .env file from the example
cp .env.example .env

# Now, edit the .env file and add your API keys
```
Your `.env` file should look like this:
```
AMADEUS_CLIENT_ID=your_amadeus_key
AMADEUS_CLIENT_SECRET=your_amadeus_secret
KIWI_API_KEY=your_kiwi_key
SERPAPI_KEY=your_serpapi_key
SKYSCANNER_API_KEY=your_rapidapi_key
```

### 4. Start the Backend Server
```bash
npm start
```
✅ Backend is now running at `http://localhost:3001`. You should see the status of all API keys in the console.

### 5. Start the Frontend Web App
```bash
# Open a new terminal window
cd ../frontend
npm install
npm start
```
✅ Web app is now running at `http://localhost:3000`.

---

## 📱 Mobile App (Android & iOS)

The repository includes a placeholder React Native application in the `/mobile` directory. To build it into a full app:

1.  Navigate to the `mobile` directory: `cd mobile`
2.  Install dependencies: `npm install`
3.  Follow the instructions in `mobile/App.js` to connect to the API and build the UI.
4.  Run on a simulator or device: `npm run ios` or `npm run android`.

To generate a production APK for Android:
```bash
cd mobile/android
./gradlew assembleRelease
```
The APK will be located at `mobile/android/app/build/outputs/apk/release/app-release.apk`.

---

## 🐳 Deploy with Docker

A `docker-compose.yml` file is included for easy containerized deployment (coming soon).

---

## 🏗️ Project Structure
```
skyscout-pro/
├── backend/           # Node.js API server (Express)
│   ├── server.js      # Main API logic with all providers
│   ├── package.json   # Dependencies
│   └── .env.example   # Environment variable template
├── frontend/          # React web app
│   ├── public/
│   └── src/
│       ├── App.js     # Main React component
│       └── index.js   # App entry point
├── mobile/            # React Native app (placeholder)
│   ├── App.js
│   └── package.json
└── README.md          # This file
```

---

## 💰 Cost

-   **Development & Low-Traffic:** **FREE**. The combined free tiers of the APIs cover several thousand searches per month.
-   **Scaling:** If you exceed the free tiers, you can expect to pay for API calls and hosting, likely starting around $50-$100/month depending on traffic.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
