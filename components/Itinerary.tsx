
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { DayPlan, Activity } from '../types';
import { resolvePlaceImage } from '../services/wikiImageService';

interface ItineraryProps {
  itinerary: DayPlan[];
  destination: string;
}

// Collect all activities across all days for the carousel
function getAllActivities(itinerary: DayPlan[]): Array<{ activity: Activity; dayNum: number }> {
  const all: Array<{ activity: Activity; dayNum: number }> = [];
  for (const day of itinerary) {
    for (const activity of day.activities || []) {
      all.push({ activity, dayNum: day.day });
    }
  }
  return all;
}

// Helper to check if an activity is a tourist spot (not food/dining)
function isTouristSpot(activity: Activity): boolean {
  const category = (activity.category || '').toLowerCase();
  const foodKeywords = ['food', 'dining', 'breakfast', 'lunch', 'dinner', 'restaurant', 'cafe', 'meal', 'eat', 'cuisine'];
  return !foodKeywords.some(keyword => category.includes(keyword));
}

const Itinerary: React.FC<ItineraryProps> = ({ itinerary, destination }) => {
  const [activeDay, setActiveDay] = useState(0);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselImages, setCarouselImages] = useState<Map<number, string>>(new Map());

  if (!itinerary || itinerary.length === 0) return null;

  // Get tourist spots only for the carousel (no restaurants/food)
  const carouselActivities = useMemo(() => {
    const highlights: Array<{ activity: Activity; dayNum: number }> = [];
    for (const day of itinerary) {
      const activities = day.activities || [];
      // Filter to only tourist spots (landmarks, museums, parks, etc.)
      const touristSpots = activities.filter(act => 
        isTouristSpot(act) && (act.location || act.wikipediaTitle)
      );
      // Take first 2 tourist spots from each day
      touristSpots.slice(0, 2).forEach(act => {
        highlights.push({ activity: act, dayNum: day.day });
      });
    }
    return highlights.slice(0, 10); // Max 10 for carousel
  }, [itinerary]);

  // Build unique image query for an activity - extract the most specific place name
  const getActivityImageQuery = useCallback((activity: Activity): string => {
    // Priority 1: Wikipedia title is usually the best match
    if (activity.wikipediaTitle && activity.wikipediaTitle.length > 2) {
      return activity.wikipediaTitle;
    }
    
    // Priority 2: Use imageQuery if it's specific (not just the destination)
    if (activity.imageQuery && activity.imageQuery !== destination && activity.imageQuery.length > 3) {
      return activity.imageQuery;
    }
    
    // Priority 3: Use location if specific
    if (activity.location && activity.location !== destination && activity.location.length > 3) {
      // Clean up common prefixes
      const cleanLocation = activity.location
        .replace(/^(visit|explore|see|tour)\s+/i, '')
        .replace(/^the\s+/i, '')
        .trim();
      if (cleanLocation.length > 3) return cleanLocation;
    }
    
    // Priority 4: Extract place names from description
    const desc = activity.description || '';
    
    // Look for quoted place names first
    const quotedMatch = desc.match(/["']([^"']+)["']/i);
    if (quotedMatch && quotedMatch[1].length > 3) return quotedMatch[1];
    
    // Look for "at/to/visit [Place Name]" patterns
    const atMatch = desc.match(/(?:at|to|visit|explore|see)\s+(?:the\s+)?([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,4})/i);
    if (atMatch && atMatch[1].length > 3) return atMatch[1];
    
    // Look for capitalized proper nouns (place names)
    const properNouns = desc.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g);
    if (properNouns && properNouns.length > 0) {
      // Filter out common words and pick the longest match
      const filtered = properNouns.filter(n => 
        !['The', 'This', 'That', 'Day', 'Morning', 'Evening', 'Night'].includes(n.split(' ')[0])
      );
      if (filtered.length > 0) {
        return filtered.sort((a, b) => b.length - a.length)[0];
      }
    }
    
    // Fallback to destination
    return destination;
  }, [destination]);

  // Load carousel images
  useEffect(() => {
    carouselActivities.forEach(async (item, idx) => {
      const query = getActivityImageQuery(item.activity);
      const result = await resolvePlaceImage(query, destination);
      if (result?.url) {
        setCarouselImages(prev => new Map(prev).set(idx, result.url));
      }
    });
  }, [carouselActivities, destination, getActivityImageQuery]);

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCarouselIndex(prev => (prev + 1) % Math.max(carouselActivities.length, 1));
    }, 5000);
    return () => clearInterval(timer);
  }, [carouselActivities.length]);

  const currentDay = itinerary[activeDay];

  const totalTripCost = useMemo(() => {
    let total = 0;
    let symbol = '₹';
    for (const day of itinerary) {
      for (const act of day.activities || []) {
        total += parseCostToNumber(act?.costEstimate);
        if (act?.costEstimate?.includes('₹')) symbol = '₹';
        else if (act?.costEstimate?.includes('$')) symbol = '$';
      }
    }
    return { total, symbol };
  }, [itinerary]);

  const getDayCost = useCallback((day: DayPlan) => {
    const activities = day.activities || [];
    const symbol = inferCurrencySymbol(activities.map(a => a?.costEstimate || ''));
    const total = activities.reduce((sum, act) => sum + parseCostToNumber(act?.costEstimate), 0);
    return { total, symbol };
  }, []);

  return (
    <div className="space-y-4 sm:space-y-8">
      {/* Hero Carousel - Beautiful Tourist Spots */}
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-900 shadow-2xl">
        {/* Main Carousel Image */}
        <div className="relative h-[280px] sm:h-[400px] md:h-[520px]">
          {carouselActivities.map((item, idx) => {
            // Use picsum.photos with a seed based on index for varied but consistent fallback images
            const imgUrl = carouselImages.get(idx) || `https://picsum.photos/seed/${idx + 100}/1600/900`;
            const isActive = idx === carouselIndex;
            const title = item.activity.wikipediaTitle || item.activity.location || 'Explore';
            return (
              <div
                key={idx}
                className={`absolute inset-0 transition-all duration-700 ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
              >
                <img
                  src={imgUrl}
                  alt={title}
                  className="w-full h-full object-cover"
                  loading={idx < 2 ? 'eager' : 'lazy'}
                />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/10" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
                
                {/* Content on Image */}
                <div className={`absolute inset-0 flex flex-col justify-end p-3 sm:p-6 md:p-12 transition-all duration-500 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                  <div className="max-w-3xl">
                    {/* Top Tags */}
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-2 sm:mb-4">
                      <span className="px-2 py-1 sm:px-4 sm:py-1.5 bg-white/20 backdrop-blur-md rounded-full text-white text-[9px] sm:text-xs font-black uppercase tracking-wider border border-white/20">
                        <i className="fas fa-calendar-day mr-1 sm:mr-2 text-blue-400"></i>
                        Day {item.dayNum}
                      </span>
                      <span className="px-2 py-1 sm:px-4 sm:py-1.5 bg-blue-600/80 backdrop-blur-md rounded-full text-white text-[9px] sm:text-xs font-black uppercase tracking-wider">
                        <i className={`fas ${getActivityIcon(item.activity.category)} mr-1 sm:mr-2`}></i>
                        {item.activity.category || 'Landmark'}
                      </span>
                      {!isFreeCost(item.activity.costEstimate) && (
                        <span className="px-2 py-1 sm:px-4 sm:py-1.5 bg-emerald-600/80 backdrop-blur-md rounded-full text-white text-[9px] sm:text-xs font-black uppercase tracking-wider">
                          <i className="fas fa-tag mr-1 sm:mr-2"></i>
                          {item.activity.costEstimate}
                        </span>
                      )}
                      {isFreeCost(item.activity.costEstimate) && (
                        <span className="px-2 py-1 sm:px-4 sm:py-1.5 bg-green-500/80 backdrop-blur-md rounded-full text-white text-[9px] sm:text-xs font-black uppercase tracking-wider">
                          <i className="fas fa-gift mr-1 sm:mr-2"></i>
                          Free Entry
                        </span>
                      )}
                    </div>
                    
                    {/* Main Title */}
                    <h3 className="text-2xl sm:text-4xl md:text-6xl font-black text-white mb-2 sm:mb-4 leading-[1.1] drop-shadow-2xl">
                      {title}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-white/90 text-sm sm:text-base md:text-lg leading-relaxed line-clamp-2 sm:line-clamp-3 mb-3 sm:mb-6 max-w-2xl font-medium">
                      {item.activity.description || `Discover ${title}, one of the must-visit attractions in ${destination}.`}
                    </p>
                    
                    {/* Bottom Info Row */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
                      <div className="flex items-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-4 sm:py-2.5 bg-white/10 backdrop-blur-md rounded-lg sm:rounded-xl border border-white/20">
                        <i className="fas fa-clock text-amber-400 text-[10px] sm:text-sm"></i>
                        <span className="text-white text-[10px] sm:text-sm font-bold">{item.activity.time || 'Best time to visit'}</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-4 sm:py-2.5 bg-white/10 backdrop-blur-md rounded-lg sm:rounded-xl border border-white/20">
                        <i className="fas fa-map-marker-alt text-rose-400 text-[10px] sm:text-sm"></i>
                        <span className="text-white text-[10px] sm:text-sm font-bold">{destination}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Slide Number Indicator */}
                <div className="absolute top-3 right-3 sm:top-6 sm:right-6 flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-4 sm:py-2 bg-black/40 backdrop-blur-md rounded-full">
                  <span className="text-white text-xs sm:text-sm font-black">{idx + 1}</span>
                  <span className="text-white/50 text-xs sm:text-sm">/</span>
                  <span className="text-white/70 text-xs sm:text-sm">{carouselActivities.length}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Carousel Navigation */}
        <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-4 flex items-center justify-between">
          <button
            onClick={() => setCarouselIndex(prev => (prev - 1 + carouselActivities.length) % Math.max(carouselActivities.length, 1))}
            className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/40 transition-all border border-white/20 text-xs sm:text-base"
          >
            <i className="fas fa-chevron-left"></i>
          </button>
          
          <div className="flex items-center gap-1 sm:gap-2">
            {carouselActivities.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCarouselIndex(idx)}
                className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${idx === carouselIndex ? 'w-6 sm:w-10 bg-white' : 'w-1.5 sm:w-2 bg-white/40 hover:bg-white/60'}`}
              />
            ))}
          </div>

          <button
            onClick={() => setCarouselIndex(prev => (prev + 1) % Math.max(carouselActivities.length, 1))}
            className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/40 transition-all border border-white/20 text-xs sm:text-base"
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>

      {/* Trip Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-white">
          <p className="text-blue-100 text-[9px] sm:text-xs font-bold uppercase tracking-wider mb-0.5 sm:mb-1">Duration</p>
          <p className="text-lg sm:text-2xl font-black">{itinerary.length} Days</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-white">
          <p className="text-emerald-100 text-[9px] sm:text-xs font-bold uppercase tracking-wider mb-0.5 sm:mb-1">Total Spots</p>
          <p className="text-lg sm:text-2xl font-black">{getAllActivities(itinerary).length}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-white">
          <p className="text-purple-100 text-[9px] sm:text-xs font-bold uppercase tracking-wider mb-0.5 sm:mb-1">Activity Budget</p>
          <p className="text-lg sm:text-2xl font-black">{formatMoney(totalTripCost.total, totalTripCost.symbol)}</p>
          <p className="text-purple-200 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider mt-0.5"><i className="fas fa-user mr-1"></i>Per Person</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-white">
          <p className="text-amber-100 text-[9px] sm:text-xs font-bold uppercase tracking-wider mb-0.5 sm:mb-1">Destination</p>
          <p className="text-base sm:text-xl font-black truncate">{destination}</p>
        </div>
      </div>

      {/* Compact Day-wise Itinerary */}
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Day Tabs */}
        <div className="flex overflow-x-auto border-b border-slate-100 bg-slate-50/50">
          {itinerary.map((day, idx) => {
            const isActive = activeDay === idx;
            const cost = getDayCost(day);
            return (
              <button
                key={idx}
                onClick={() => setActiveDay(idx)}
                className={`flex-shrink-0 px-4 py-3 sm:px-6 sm:py-4 flex flex-col items-center gap-0.5 sm:gap-1 transition-all border-b-2 ${
                  isActive 
                    ? 'bg-white border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-white/50'
                }`}
              >
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Day {day.day}</span>
                <span className={`text-base sm:text-lg font-black ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>
                  {formatMoney(cost.total, cost.symbol)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Day Content */}
        <div className="p-6">
          {/* Day Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-2xl font-black text-slate-900">{currentDay.title || `Day ${currentDay.day}`}</h3>
              <p className="text-slate-500 text-sm mt-1">{currentDay.activities?.length || 0} activities planned</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Day Budget</p>
              <p className="text-2xl font-black text-blue-600">{formatMoney(getDayCost(currentDay).total, getDayCost(currentDay).symbol)}</p>
              <p className="text-[9px] text-blue-400 font-bold uppercase tracking-wider"><i className="fas fa-user mr-1"></i>Per Person</p>
            </div>
          </div>

          {/* Activities Timeline */}
          <div className="space-y-3">
            {currentDay.activities?.map((activity, idx) => (
              <ActivityRow key={idx} activity={activity} index={idx} destination={destination} />
            ))}
          </div>
        </div>

        {/* Day Navigation */}
        <div className="flex items-center justify-between p-4 bg-slate-50 border-t border-slate-100">
          <button
            disabled={activeDay === 0}
            onClick={() => setActiveDay(prev => prev - 1)}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-blue-600 disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            <i className="fas fa-arrow-left"></i>
            <span className="font-bold">Previous Day</span>
          </button>
          
          <span className="text-sm font-bold text-slate-400">
            {activeDay + 1} of {itinerary.length}
          </span>

          <button
            disabled={activeDay === itinerary.length - 1}
            onClick={() => setActiveDay(prev => prev + 1)}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-blue-600 disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            <span className="font-bold">Next Day</span>
            <i className="fas fa-arrow-right"></i>
          </button>
        </div>
      </div>

      {/* Full Day Overview - Expandable Cards */}
      <div className="space-y-4">
        <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
          <span className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
            <i className="fas fa-calendar-days text-sm"></i>
          </span>
          Complete Trip Overview
        </h3>
        
        <div className="grid gap-4">
          {itinerary.map((day, dayIdx) => (
            <DayCard key={dayIdx} day={day} destination={destination} isExpanded={dayIdx === activeDay} onToggle={() => setActiveDay(dayIdx)} />
          ))}
        </div>
      </div>
    </div>
  );
};

// Collapsible Day Card Component
const DayCard: React.FC<{ day: DayPlan; destination: string; isExpanded: boolean; onToggle: () => void }> = ({ day, destination, isExpanded, onToggle }) => {
  const cost = useMemo(() => {
    const activities = day.activities || [];
    const symbol = inferCurrencySymbol(activities.map(a => a?.costEstimate || ''));
    const total = activities.reduce((sum, act) => sum + parseCostToNumber(act?.costEstimate), 0);
    return { total, symbol };
  }, [day]);

  return (
    <div className={`bg-white rounded-2xl border transition-all ${isExpanded ? 'border-blue-200 shadow-lg' : 'border-slate-100 shadow-sm hover:shadow-md'}`}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${isExpanded ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {day.day}
          </div>
          <div>
            <h4 className="font-bold text-slate-900">{day.title || `Day ${day.day}`}</h4>
            <p className="text-sm text-slate-500">{day.activities?.length || 0} activities</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Budget</p>
            <p className="font-black text-slate-900">{formatMoney(cost.total, cost.symbol)}</p>
          </div>
          <i className={`fas fa-chevron-down text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}></i>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2 border-t border-slate-100 pt-4">
          {day.activities?.map((activity, idx) => (
            <div key={idx} className="flex items-center gap-3 py-2 px-3 bg-slate-50 rounded-xl">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getCategoryBg(activity.category)}`}>
                <i className={`fas ${getActivityIcon(activity.category)} text-sm`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 text-sm truncate">{activity.location || activity.wikipediaTitle || 'Activity'}</p>
                <p className="text-xs text-slate-500">{activity.time || 'Flexible timing'}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-lg ${isFreeCost(activity.costEstimate) ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-700 border border-slate-200'}`}>
                {activity.costEstimate || 'Free'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Compact Activity Row Component
const ActivityRow: React.FC<{ activity: Activity; index: number; destination: string }> = ({ activity, index, destination }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const title = activity.wikipediaTitle || activity.location || 'Local Spot';
  const isFree = isFreeCost(activity.costEstimate);

  // Build a unique image query using all available activity info - extract most specific place name
  const imageQuery = useMemo(() => {
    // Priority 1: Wikipedia title is usually the best match
    if (activity.wikipediaTitle && activity.wikipediaTitle.length > 2) {
      return activity.wikipediaTitle;
    }
    
    // Priority 2: Use imageQuery if it's specific (not just the destination)
    if (activity.imageQuery && activity.imageQuery !== destination && activity.imageQuery.length > 3) {
      return activity.imageQuery;
    }
    
    // Priority 3: Use location if specific
    if (activity.location && activity.location !== destination && activity.location.length > 3) {
      const cleanLocation = activity.location
        .replace(/^(visit|explore|see|tour)\s+/i, '')
        .replace(/^the\s+/i, '')
        .trim();
      if (cleanLocation.length > 3) return cleanLocation;
    }
    
    // Priority 4: Extract place names from description
    const desc = activity.description || '';
    
    // Look for quoted place names first
    const quotedMatch = desc.match(/["']([^"']+)["']/i);
    if (quotedMatch && quotedMatch[1].length > 3) return quotedMatch[1];
    
    // Look for "at/to/visit [Place Name]" patterns
    const atMatch = desc.match(/(?:at|to|visit|explore|see)\s+(?:the\s+)?([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,4})/i);
    if (atMatch && atMatch[1].length > 3) return atMatch[1];
    
    // Look for capitalized proper nouns (place names)
    const properNouns = desc.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g);
    if (properNouns && properNouns.length > 0) {
      const filtered = properNouns.filter(n => 
        !['The', 'This', 'That', 'Day', 'Morning', 'Evening', 'Night'].includes(n.split(' ')[0])
      );
      if (filtered.length > 0) {
        return filtered.sort((a, b) => b.length - a.length)[0];
      }
    }
    
    return destination;
  }, [activity, destination]);

  useEffect(() => {
    let cancelled = false;
    resolvePlaceImage(imageQuery, destination).then(result => {
      if (!cancelled && result?.url) setImageUrl(result.url);
    });
    return () => { cancelled = true; };
  }, [imageQuery, destination]);

  // Use picsum.photos with a hash of the title for consistent fallback images
  const titleHash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 1000;
  const fallbackImg = `https://picsum.photos/seed/${titleHash}/200/200`;

  return (
    <div className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-all">
      {/* Image Thumbnail */}
      <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-slate-100">
        <img
          src={imageUrl || fallbackImg}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          loading="lazy"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            {activity.time || `Stop ${index + 1}`}
          </span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getCategoryBg(activity.category)}`}>
            <i className={`fas ${getActivityIcon(activity.category)} mr-1`}></i>
            {activity.category || 'Visit'}
          </span>
        </div>
        <h4 className="font-bold text-slate-900 truncate">{title}</h4>
        <p className="text-xs text-slate-500 line-clamp-1">{activity.description || `Experience ${title}`}</p>
      </div>

      {/* Cost */}
      <div className="flex-shrink-0 text-right">
        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-bold ${
          isFree ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-900'
        }`}>
          {isFree ? <i className="fas fa-gift"></i> : <i className="fas fa-tag text-blue-500"></i>}
          {activity.costEstimate || 'Free'}
        </span>
      </div>
    </div>
  );
};

// Helper functions
function isFreeCost(raw: string | undefined): boolean {
  const v = String(raw || '').toLowerCase();
  if (!v) return false;
  if (v.includes('free')) return true;
  return /(?:^|\b)[\$₹€]?\s*0(?:\.0+)?(?:\b|\s)/.test(v);
}

function inferCurrencySymbol(samples: string[]): string {
  const joined = samples.join(' ');
  if (joined.includes('₹')) return '₹';
  if (joined.includes('$')) return '$';
  if (joined.includes('€')) return '€';
  if (joined.includes('£')) return '£';
  return '₹';
}

function parseCostToNumber(raw: string | undefined): number {
  const s = String(raw || '').toLowerCase().replace(/,/g, '');
  if (!s || s.includes('free')) return 0;
  
  // Look for "total" amounts first (group costs)
  const totalMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:total|for\s*(?:group|all))/i);
  if (totalMatch) {
    const n = Number(totalMatch[1]);
    if (Number.isFinite(n)) return n;
  }
  
  // Otherwise extract the first meaningful number
  const matches = s.match(/[\$₹€£]?\s*(\d+(?:,\d{3})*(?:\.\d+)?)/g) || [];
  let max = 0;
  for (const m of matches) {
    const cleaned = m.replace(/[^\d.]/g, '');
    const n = Number(cleaned);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

function formatMoney(amount: number, symbol: string): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const locale = symbol === '₹' ? 'en-IN' : 'en-US';
  return `${symbol}${Math.round(safe).toLocaleString(locale)}`;
}

function getActivityIcon(category: string = ''): string {
  const c = category.toLowerCase();
  if (c.includes('food') || c.includes('dining') || c.includes('breakfast') || c.includes('lunch') || c.includes('dinner')) return 'fa-utensils';
  if (c.includes('landmark') || c.includes('monument')) return 'fa-monument';
  if (c.includes('nature') || c.includes('park') || c.includes('garden')) return 'fa-leaf';
  if (c.includes('culture') || c.includes('museum') || c.includes('art')) return 'fa-masks-theater';
  if (c.includes('experience') || c.includes('adventure')) return 'fa-bolt-lightning';
  if (c.includes('shopping') || c.includes('market')) return 'fa-bag-shopping';
  if (c.includes('night') || c.includes('evening')) return 'fa-moon';
  if (c.includes('view') || c.includes('sunset')) return 'fa-sun';
  if (c.includes('temple') || c.includes('religious')) return 'fa-place-of-worship';
  if (c.includes('beach')) return 'fa-umbrella-beach';
  return 'fa-map-pin';
}

function getCategoryBg(category: string = ''): string {
  const c = category.toLowerCase();
  if (c.includes('food') || c.includes('dining') || c.includes('breakfast') || c.includes('lunch') || c.includes('dinner')) return 'bg-orange-100 text-orange-600';
  if (c.includes('landmark') || c.includes('monument')) return 'bg-blue-100 text-blue-600';
  if (c.includes('nature') || c.includes('park') || c.includes('garden')) return 'bg-emerald-100 text-emerald-600';
  if (c.includes('culture') || c.includes('museum') || c.includes('art')) return 'bg-purple-100 text-purple-600';
  if (c.includes('experience') || c.includes('adventure')) return 'bg-rose-100 text-rose-600';
  if (c.includes('shopping') || c.includes('market')) return 'bg-pink-100 text-pink-600';
  if (c.includes('night') || c.includes('evening')) return 'bg-indigo-100 text-indigo-600';
  if (c.includes('view') || c.includes('sunset')) return 'bg-amber-100 text-amber-600';
  if (c.includes('temple') || c.includes('religious')) return 'bg-red-100 text-red-600';
  if (c.includes('beach')) return 'bg-cyan-100 text-cyan-600';
  return 'bg-blue-100 text-blue-600';
}

export default Itinerary;
