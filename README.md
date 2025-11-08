# ✈️ SkyScout Pro - The Ultimate Flight Aggregator

> **Production-ready flight comparison app, rewritten to use the latest user-provided APIs.**

![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)
![Providers](https://img.shields.io/badge/APIs-5-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

---

## ⚠️ Important Security Notice

This project was updated based on user-provided API keys. If you are the user who provided them, please ensure you have **revoked those keys** and are using new ones in your local configuration. See the setup guide below.

---

## 🎯 What This Is

A **complete, production-ready** flight price comparison platform that has been rewritten to use a new set of APIs. It includes:

- ✅ **Backend API** (Node.js) aggregating 5 flight providers.
- ✅ **Web Application** (React) with a clean, responsive interface.
- ✅ **Mobile App** (React Native) placeholder, ready to be built out.
- ✅ **Real-time flight data** from Amadeus, Kiwi.com, Booking.com (via SerpAPI), and new versions of Google Flights & Skyscanner (via RapidAPI).

---

## 🚀 Quick Start (5-10 Minutes)

### 1. Clone the Repository
```bash
git clone https://github.com/butch1066/skyscout-pro.git
cd skyscout-pro
```

### 2. Get Your NEW API Keys
You will need to get new, non-compromised API keys from the following services:

| Provider | Purpose | Sign Up Link |
|---|---|---|
| **Amadeus** | Core flight data | [developers.amadeus.com](https://developers.amadeus.com) |
| **Kiwi.com** | Low-cost carrier data | [tequila.kiwi.com](https://tequila.kiwi.com) |
| **SerpAPI** | Booking.com data | [serpapi.com](https://serpapi.com) |
| **RapidAPI** | Google Flights & Skyscanner data | [rapidapi.com/hub](https://rapidapi.com/hub) |

### 3. Setup Backend
```bash
cd backend
npm install

# Create your .env file from the example
cp .env.example .env

# Now, edit the .env file and add your NEW API keys
```
Your `.env` file should look like this:
```
# Amadeus API
AMADEUS_CLIENT_ID=your_new_amadeus_key
AMADEUS_CLIENT_SECRET=your_new_amadeus_secret

# Kiwi.com API
KIWI_API_KEY=your_new_kiwi_key

# SerpAPI (for Booking.com)
SERPAPI_KEY=your_new_serpapi_key

# RapidAPI (for Google Flights & Blue Scraper)
RAPIDAPI_KEY=your_new_rapidapi_key
```

### 4. Start the Backend Server
```bash
npm start
```
✅ Backend is now running at `http://localhost:3001`.

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

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📄 License

This project is licensed under the MIT License.
