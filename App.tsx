
import React, { useState } from 'react';
import Header from './components/Header';
import TripForm from './components/TripForm';
import TripResults from './components/TripResults';
import { TravelData, GroupType, BudgetLevel, FlightClass, Currency } from './types';
import { generateTravelPlan } from './services/geminiService';

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TravelData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePlanTrip = async (formData: {
    source: string;
    destination: string;
    members: number;
    days: number;
    currency: Currency;
    groupType: GroupType;
    budgetLevel: BudgetLevel;
    flightClass: FlightClass;
    hotelRating: string;
    activities: string;
    packingList: string[];
    essentials: string[];
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateTravelPlan(formData);
      setData(result);
      // Smooth scroll to results after a short delay for rendering
      setTimeout(() => {
        const resultsEl = document.getElementById('itinerary-results');
        if (resultsEl) {
          resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    } catch (err: any) {
      console.error(err);
      if (err instanceof SyntaxError || err.message?.includes('JSON')) {
        setError("The travel plan was too detailed for our AI to complete in one pass. Try reducing the number of days or simplifying your custom interests.");
      } else {
        setError("We encountered an error crafting your trip. Please check your network and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10">
        <div className="space-y-6">
          <section className="bg-white/95 backdrop-blur-xl rounded-[40px] shadow-[0_30px_100px_rgba(0,0,0,0.15)] overflow-hidden border border-white/50 no-print transform hover:shadow-[0_40px_120px_rgba(0,0,0,0.2)] transition-all duration-500">
            <TripForm onPlan={handlePlanTrip} isLoading={loading} />
          </section>

          {loading && (
            <div className="flex flex-col items-center justify-center py-24 space-y-8 animate-wow no-print">
              <div className="relative">
                <div className="animate-spin rounded-full h-28 w-28 border-t-4 border-b-4 border-blue-600"></div>
                <div className="absolute inset-0 animate-ping rounded-full h-28 w-28 border-2 border-blue-400 opacity-20"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <i className="fas fa-paper-plane text-blue-600 text-2xl animate-bounce"></i>
                </div>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-slate-900 tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Curating Your Signature Journey
                </p>
                <p className="text-slate-400 font-medium mt-2 text-base">Orchestrating real-time data for an unparalleled experience...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-gradient-to-r from-red-50 to-rose-50 border-l-[8px] border-red-500 p-6 rounded-[28px] animate-wow shadow-xl no-print">
              <div className="flex items-start">
                <div className="flex-shrink-0 bg-red-100 p-3 rounded-xl">
                  <i className="fas fa-exclamation-triangle text-red-600 text-xl"></i>
                </div>
                <div className="ml-5">
                  <h3 className="text-lg font-black text-red-900 tracking-tight">Plan Execution Interrupted</h3>
                  <p className="text-red-700 font-medium mt-1 text-base leading-relaxed">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div id="itinerary-results">
            {data && !loading && <TripResults data={data} />}
          </div>
        </div>
      </main>

      <footer className="mt-32 py-16 border-t border-slate-200 text-center no-print bg-gradient-to-b from-transparent to-slate-50">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <i className="fas fa-paper-plane text-blue-500 text-xl"></i>
          <span className="font-black text-slate-900 tracking-tighter text-2xl">SkyBound<span className="text-blue-500">AI</span></span>
        </div>
        <p className="text-slate-400 font-medium">© 2026 SkyBound Travel Intelligence. Professional Itinerary Architecture.</p>
        <a 
          href="https://www.linkedin.com/in/debapriyo-saha/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:text-blue-700 font-semibold transition-colors"
        >
          <i className="fab fa-linkedin text-lg"></i>
          <span>Debapriyo Saha</span>
        </a>
      </footer>
    </div>
  );
};

export default App;
