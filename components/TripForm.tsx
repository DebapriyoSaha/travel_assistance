
import React, { useState } from 'react';
import { GroupType, BudgetLevel, FlightClass, Currency, MAJOR_CITIES } from '../types';

interface TripFormProps {
  onPlan: (data: any) => void;
  isLoading: boolean;
}

const PACKING_ITEMS = [
  "Clothes", "Comfortable Footwear", "Sunglass & Sunscreen", "Travel Guidebook", "Medications & First Aid"
];

const ESSENTIALS_ITEMS = [
  "Check Visa Requirements", "Get Travel Insurance", "Currency Exchange Rate"
];

const TripForm: React.FC<TripFormProps> = ({ onPlan, isLoading }) => {
  const [source, setSource] = useState('JFK');
  const [destination, setDestination] = useState('LHR');
  const [members, setMembers] = useState(2);
  const [days, setDays] = useState(4);
  const [startDate, setStartDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    return tomorrow.toISOString().split('T')[0];
  });
  const [currency, setCurrency] = useState<Currency>(Currency.INR);
  const [groupType, setGroupType] = useState<GroupType>(GroupType.COUPLE);
  const [budget, setBudget] = useState<BudgetLevel>(BudgetLevel.STANDARD);
  const [flightClass, setFlightClass] = useState<FlightClass>(FlightClass.ECONOMY);
  const [hotelRating, setHotelRating] = useState('Any');
  const [activities, setActivities] = useState('');
  const [packingList, setPackingList] = useState<string[]>([]);
  const [essentials, setEssentials] = useState<string[]>([]);

  const toggleItem = (list: string[], setList: (l: string[]) => void, item: string) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onPlan({
      source, destination, members, groupType, budgetLevel: budget,
      flightClass, currency, hotelRating, activities, packingList, essentials, days, startDate
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-10 md:p-16 bg-white rounded-[40px] transition-all duration-700 ease-in-out">
      <div className="mb-16 text-center animate-wow">
        <h2 className="text-5xl font-black text-slate-900 mb-4 tracking-tighter leading-none">
          Define Your <span className="text-blue-600 italic serif-italic">Perfect</span> Escape
        </h2>
        <p className="text-slate-400 text-lg font-medium max-w-2xl mx-auto">
          Tailor every dimension of your journey. Our AI orchestrates global data into your personal masterpiece.
        </p>
      </div>

      <div className="space-y-16">
        {/* STEP 1: LOGISTICS */}
        <section className="animate-wow" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center space-x-4 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-slate-200">1</div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">The Core Route</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Where & For How Long</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            <div className="group space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-focus-within:text-blue-600 transition-colors">Origin City</label>
              <select 
                value={source} 
                onChange={(e) => setSource(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-6 py-5 outline-none transition-all font-bold text-slate-700 shadow-sm"
              >
                {MAJOR_CITIES.map(city => <option key={city.code} value={city.code}>{city.name}</option>)}
              </select>
            </div>
            
            <div className="group space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-focus-within:text-blue-600 transition-colors">Destination</label>
              <select 
                value={destination} 
                onChange={(e) => setDestination(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-6 py-5 outline-none transition-all font-bold text-slate-700 shadow-sm"
              >
                {MAJOR_CITIES.map(city => <option key={city.code} value={city.code}>{city.name}</option>)}
              </select>
            </div>

            <div className="group space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-focus-within:text-blue-600 transition-colors">Journey Start Date</label>
              <input
                type="date"
                value={startDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-6 py-5 outline-none transition-all font-bold text-slate-700 shadow-sm"
              />
            </div>

            <div className="group space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Duration: <span className="text-blue-600">{days} Days</span></label>
              <div className="pt-5 pb-2">
                <input
                  type="range"
                  min="1"
                  max="21"
                  step="1"
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700"
                />
                <div className="flex justify-between text-[8px] font-black text-slate-300 mt-3 uppercase tracking-widest">
                  <span>Short Trip</span>
                  <span>Extended Vacation</span>
                </div>
              </div>
            </div>
          </div>

          {/* Second row for currency */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mt-8">
            <div className="group space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Budget Currency</label>
              <div className="flex p-1.5 bg-slate-50 rounded-2xl border-2 border-slate-50 focus-within:border-blue-100 transition-all">
                {Object.values(Currency).map((cur) => (
                  <button
                    key={cur}
                    type="button"
                    onClick={() => setCurrency(cur)}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all duration-300 ${
                      currency === cur ? 'bg-white shadow-xl text-blue-600' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {cur}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* STEP 2: EXPERIENCE STYLE */}
        <section className="animate-wow" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center space-x-4 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200">2</div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">The Travel Persona</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tiers & Travelers</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            <div className="group space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">The Party</label>
              <div className="flex space-x-3">
                <input
                  type="number"
                  min="1"
                  value={members}
                  onChange={(e) => setMembers(parseInt(e.target.value))}
                  className="w-20 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-5 py-4 outline-none transition-all font-bold text-slate-700 shadow-sm"
                />
                <select
                  value={groupType}
                  onChange={(e) => setGroupType(e.target.value as GroupType)}
                  className="flex-1 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-5 py-4 outline-none transition-all font-bold text-slate-700 shadow-sm"
                >
                  {Object.values(GroupType).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>

            <div className="group space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Expense Tier</label>
              <select 
                value={budget} 
                onChange={(e) => setBudget(e.target.value as BudgetLevel)}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-5 py-4 outline-none transition-all font-bold text-slate-700 shadow-sm"
              >
                {Object.values(BudgetLevel).map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            <div className="group space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Aviation Class</label>
              <select 
                value={flightClass} 
                onChange={(e) => setFlightClass(e.target.value as FlightClass)}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-5 py-4 outline-none transition-all font-bold text-slate-700 shadow-sm"
              >
                {Object.values(FlightClass).map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            <div className="group space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Hotel Standard</label>
              <select 
                value={hotelRating} 
                onChange={(e) => setHotelRating(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-5 py-4 outline-none transition-all font-bold text-slate-700 shadow-sm"
              >
                <option value="Any">Any Exquisite Stay</option>
                <option value="3">3★ & Above</option>
                <option value="4">4★ Premium</option>
                <option value="5">5★ Ultra-Luxury</option>
              </select>
            </div>
          </div>
        </section>

        {/* STEP 3: DETAILS */}
        <section className="animate-wow" style={{ animationDelay: '0.3s' }}>
           <div className="flex items-center space-x-4 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">3</div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">The Personal Touches</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Interests & Checklists</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div className="space-y-10">
              <div className="group">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-5 block">Essential Packing</label>
                <div className="flex flex-wrap gap-3">
                  {PACKING_ITEMS.map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleItem(packingList, setPackingList, item)}
                      className={`px-5 py-3 rounded-2xl text-[11px] font-black border-2 transition-all duration-300 ${
                        packingList.includes(item) 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl translate-y-[-2px]' 
                        : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-100 hover:text-indigo-600'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="group">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-5 block">Trip Logistics</label>
                <div className="flex flex-wrap gap-3">
                  {ESSENTIALS_ITEMS.map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleItem(essentials, setEssentials, item)}
                      className={`px-5 py-3 rounded-2xl text-[11px] font-black border-2 transition-all duration-300 ${
                        essentials.includes(item) 
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xl translate-y-[-2px]' 
                        : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300 hover:text-slate-800'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="group space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block group-focus-within:text-blue-600 transition-colors">The Travel Manifesto</label>
              <textarea
                rows={6}
                placeholder="What defines your ideal day? Mention specific interests like 'authentic street food', 'brutalist architecture', or 'private sailing at sunset'..."
                className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-[32px] px-8 py-8 outline-none transition-all font-bold text-slate-700 placeholder-slate-300 leading-relaxed shadow-sm"
                value={activities}
                onChange={(e) => setActivities(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* SUBMIT */}
        <div className="pt-16 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-10 animate-wow" style={{ animationDelay: '0.4s' }}>
          <div className="text-left space-y-1">
            <div className="flex items-center space-x-2 text-blue-600">
               <i className="fas fa-check-double text-xs"></i>
               <span className="text-[10px] font-black uppercase tracking-widest">Configuration Ready</span>
            </div>
            <p className="text-slate-900 font-black text-xl tracking-tight">Generate {days}-Day {budget} Itinerary</p>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full md:w-auto overflow-hidden bg-slate-900 hover:bg-black text-white rounded-[28px] py-6 px-16 font-black text-xl transition-all shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.4)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="flex items-center justify-center space-x-4 relative z-10">
              {isLoading ? (
                <i className="fas fa-circle-notch fa-spin"></i>
              ) : (
                <i className="fas fa-magic text-blue-400 group-hover:rotate-12 transition-transform"></i>
              )}
              <span>{isLoading ? 'Architecting...' : 'Plan My Signature Journey'}</span>
            </div>
          </button>
        </div>
      </div>
    </form>
  );
};

export default TripForm;
