<div align="center">

# ✈️ SkyBound AI Travel Planner

<img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React 19" />
<img src="https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 6" />
<img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 5" />
<img src="https://img.shields.io/badge/TailwindCSS-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
<img src="https://img.shields.io/badge/Groq-AI-FF6B6B?style=for-the-badge" alt="Groq AI" />

**🌍 Your AI-Powered Travel Companion for Crafting Perfect Itineraries**

[Live Demo](https://skybound-ai-travel-planner.vercel.app) • [Report Bug](https://github.com/DebapriyoSaha/travel_assistance/issues) • [Request Feature](https://github.com/DebapriyoSaha/travel_assistance/issues)

</div>

---

## ✨ Features

### 🤖 AI-Powered Itinerary Generation
- **Smart Planning**: Leverages Groq's Llama model to generate detailed day-by-day itineraries
- **Personalized**: Adapts to your group type, budget level, and interests
- **Rich Details**: Each activity includes descriptions, costs, and Wikipedia integration

### ✈️ Real-Time Flight Data
- **Live Prices**: Integration with SerpAPI for Google Flights data
- **Multiple Options**: Compare 3-4 flight options for both outbound and return journeys
- **Class Selection**: Support for Economy, Business, and First Class

### 🏨 Smart Hotel Recommendations
- **Curated Picks**: 3-4 hotel options matching your budget tier
- **Amenity Icons**: Smart icon mapping for hotel amenities
- **HD Carousels**: Beautiful image carousels with WOW effects

### 📸 Visual Excellence
- **Wikipedia Images**: High-quality images from Wikimedia Commons
- **Unsplash Integration**: Stunning HD photos for destinations
- **Interactive Carousels**: Smooth auto-rotating image galleries
- **Gradient Overlays**: Professional text readability on images

### 📄 PDF Export
- **One-Click Download**: Automatic PDF generation of your complete trip
- **Professional Layout**: Clean, printable itinerary format
- **Offline Access**: Save your plans for offline viewing

### 💰 Multi-Currency Support
- **INR & USD**: Full support for Indian Rupees and US Dollars
- **Proper Formatting**: Locale-aware number formatting
- **Accurate Estimates**: Real-time cost calculations

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.x or higher
- **npm** or **yarn**
- **API Keys** (see Environment Variables)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/DebapriyoSaha/travel_assistance.git
   cd travel_assistance
   git checkout skyboundai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Required: Groq API Key for AI itinerary generation
   GROQ_API_KEY=your_groq_api_key_here
   
   # Optional: Groq Model (defaults to llama-4-maverick)
   GROQ_MODEL=meta-llama/llama-4-maverick-17b-128e-instruct
   
   # Optional: SerpAPI Key for real-time flight data
   SERPAPI_KEY=your_serpapi_key_here
   
   # Optional: Unsplash API Key for HD images
   UNSPLASH_ACCESS_KEY=your_unsplash_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 🌐 Deploy to Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/DebapriyoSaha/travel_assistance&env=GROQ_API_KEY,SERPAPI_KEY,UNSPLASH_ACCESS_KEY&envDescription=API%20Keys%20required%20for%20the%20app&envLink=https://github.com/DebapriyoSaha/travel_assistance#environment-variables)

### Manual Deployment

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Set Environment Variables**
   
   In Vercel Dashboard → Project Settings → Environment Variables:
   - `GROQ_API_KEY` (Required)
   - `SERPAPI_KEY` (Optional - for real flight data)
   - `UNSPLASH_ACCESS_KEY` (Optional - for HD images)

5. **Production Deployment**
   ```bash
   vercel --prod
   ```

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | ✅ Yes | Groq API key for AI model access. Get it at [console.groq.com](https://console.groq.com) |
| `GROQ_MODEL` | ❌ No | Groq model to use (default: `meta-llama/llama-4-maverick-17b-128e-instruct`) |
| `SERPAPI_KEY` | ❌ No | SerpAPI key for Google Flights data. Get it at [serpapi.com](https://serpapi.com) |
| `UNSPLASH_ACCESS_KEY` | ❌ No | Unsplash API key for HD images. Get it at [unsplash.com/developers](https://unsplash.com/developers) |

> **Note**: Legacy keys `XAI_API_KEY`, `GROK_API_KEY`, and `GEMINI_API_KEY` are also supported for backward compatibility.

---

## 📁 Project Structure

```
skybound-ai-travel-planner/
├── api/                      # Vercel Serverless Functions
│   ├── travel-plan.ts        # AI itinerary generation endpoint
│   └── unsplash-search.ts    # Unsplash image proxy
├── components/               # React Components
│   ├── FlightCard.tsx        # Flight option card with carousel
│   ├── Header.tsx            # App header
│   ├── HotelCard.tsx         # Hotel option card with amenities
│   ├── Itinerary.tsx         # Day-by-day itinerary display
│   ├── TripForm.tsx          # Trip planning form
│   └── TripResults.tsx       # Complete trip results view
├── services/                 # Service Layer
│   ├── travelPlanService.ts  # API client for travel plan
│   └── wikiImageService.ts   # Wikipedia/Wikimedia image fetcher
├── server/                   # Development Server (Vite plugin)
│   ├── index.mjs             # Standalone server
│   └── travelPlanRoute.ts    # Vite middleware plugin
├── App.tsx                   # Main React App component
├── index.tsx                 # React entry point
├── types.ts                  # TypeScript type definitions
├── vercel.json               # Vercel configuration
└── vite.config.ts            # Vite configuration
```

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 19, TypeScript 5, Vite 6 |
| **Styling** | Tailwind CSS, Custom Gradients |
| **AI Model** | Groq (Llama 4 Maverick) |
| **APIs** | SerpAPI (Flights), Unsplash (Images), Wikipedia/Wikimedia |
| **PDF Generation** | html2canvas, jsPDF |
| **Deployment** | Vercel (Serverless Functions) |
| **Icons** | Font Awesome 6 |

---

## 📝 API Endpoints

### POST `/api/travel-plan`

Generate a complete travel itinerary.

**Request Body:**
```json
{
  "source": "DEL",
  "destination": "DXB",
  "members": 2,
  "groupType": "Couple",
  "budgetLevel": "Standard",
  "flightClass": "Economy",
  "currency": "INR",
  "hotelRating": "4 Star",
  "activities": "Sightseeing, Adventure",
  "packingList": ["Sunglasses", "Sunscreen"],
  "essentials": ["Passport", "Visa"],
  "days": 5,
  "startDate": "2026-02-01"
}
```

**Response:** Complete `TravelData` object with flights, hotels, and itinerary.

### GET `/api/unsplash-search`

Proxy for Unsplash image search.

**Query Parameters:**
- `query`: Search term (e.g., "Dubai skyline")

---

## 🎨 Screenshots

<div align="center">

### Trip Planning Form
*Intuitive form for entering your travel preferences*

### AI-Generated Itinerary
*Detailed day-by-day activities with costs and images*

### Flight & Hotel Cards
*Beautiful cards with HD image carousels and WOW effects*

</div>

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🙏 Acknowledgments

- [Groq](https://groq.com) for lightning-fast AI inference
- [SerpAPI](https://serpapi.com) for Google Flights data
- [Unsplash](https://unsplash.com) for beautiful images
- [Wikipedia/Wikimedia](https://commons.wikimedia.org) for destination images
- [Vercel](https://vercel.com) for seamless deployment

---

<div align="center">

**Made with ❤️ by [Debapriya Saha](https://github.com/DebapriyoSaha)**

⭐ Star this repo if you found it helpful!

</div>
