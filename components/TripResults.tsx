
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TravelData, getCityDisplayName, getAirportCode } from '../types';
import FlightCard from './FlightCard';
import HotelCard from './HotelCard';
import Itinerary from './Itinerary';
import { resolvePlaceImage } from '../services/wikiImageService';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface TripResultsProps {
  data: TravelData;
}

// Helper to parse cost string to number
function parseCostValue(costStr: string | undefined): number {
  if (!costStr) return 0;
  const cleaned = costStr.replace(/[^\d.]/g, '');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

// Helper to get currency symbol from cost string
function getCurrencySymbol(costStr: string | undefined): string {
  if (!costStr) return '₹';
  if (costStr.includes('₹')) return '₹';
  if (costStr.includes('$')) return '$';
  if (costStr.includes('€')) return '€';
  if (costStr.includes('£')) return '£';
  return '₹';
}

// Format money with proper locale
function formatMoney(amount: number, symbol: string): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const locale = symbol === '₹' ? 'en-IN' : 'en-US';
  return `${symbol}${Math.round(safe).toLocaleString(locale)}`;
}

// Recommendations for logistics items
function getLogisticsRecommendation(item: string, destination: string): string {
  const lower = item.toLowerCase();
  if (lower.includes('visa')) {
    return `Check ${destination}'s visa requirements 4-6 weeks before travel. Many countries offer e-visas or visa-on-arrival.`;
  }
  if (lower.includes('insurance')) {
    return `Get comprehensive travel insurance covering medical emergencies, trip cancellation, and lost baggage for ${destination}.`;
  }
  if (lower.includes('currency') || lower.includes('exchange')) {
    return `Compare exchange rates online before your trip. Avoid airport exchanges – use local ATMs or banks in ${destination} for better rates.`;
  }
  return `Essential preparation for your ${destination} trip – complete this before departure.`;
}

// Recommendations for packing items
function getPackingRecommendation(item: string, destination: string): string {
  const lower = item.toLowerCase();
  if (lower.includes('clothes') || lower.includes('clothing')) {
    return `Pack versatile, wrinkle-resistant clothing. Check ${destination}'s weather forecast and dress codes for religious sites.`;
  }
  if (lower.includes('footwear') || lower.includes('shoes')) {
    return `Bring broken-in walking shoes for sightseeing. Consider waterproof options if visiting ${destination} during rainy season.`;
  }
  if (lower.includes('sunglass') || lower.includes('sunscreen')) {
    return `Pack SPF 30+ sunscreen and UV-protection sunglasses. Essential for outdoor activities in ${destination}.`;
  }
  if (lower.includes('guidebook') || lower.includes('guide')) {
    return `Download offline maps and translation apps for ${destination}. Save important addresses in your phone.`;
  }
  if (lower.includes('medication') || lower.includes('first aid')) {
    return `Pack personal medications with prescriptions. Include basic first aid: band-aids, pain relievers, and anti-diarrheal medicine.`;
  }
  return `Essential item for comfortable travel in ${destination} – don't forget to pack this!`;
}

const TripResults: React.FC<TripResultsProps> = ({ data }) => {
  const resultsRef = useRef<HTMLDivElement>(null);
  const [flightTab, setFlightTab] = useState<'onward' | 'return'>('onward');
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [isHeroHovered, setIsHeroHovered] = useState(false);

  const sourceName = useMemo(() => getCityDisplayName(data.tripPlan.source), [data.tripPlan.source]);
  const destinationName = useMemo(() => getCityDisplayName(data.tripPlan.destination), [data.tripPlan.destination]);
  const sourceCode = useMemo(() => getAirportCode(data.tripPlan.source), [data.tripPlan.source]);
  const destCode = useMemo(() => getAirportCode(data.tripPlan.destination), [data.tripPlan.destination]);

  const fallbackHero = useMemo(
    () => `https://source.unsplash.com/2400x1350/?${encodeURIComponent(`${destinationName} skyline`)}`,
    [destinationName]
  );

  const [heroUrl, setHeroUrl] = useState<string | null>(data.tripPlan.heroImage || null);

  // Detect currency symbol from available data
  const currencySymbol = useMemo(() => {
    // Check flights first
    const flightPrice = data.flights?.[0]?.priceBreakup?.total;
    if (flightPrice) return getCurrencySymbol(flightPrice);
    // Check hotels
    const hotelPrice = data.hotels?.[0]?.pricePerNight;
    if (hotelPrice) return getCurrencySymbol(hotelPrice);
    // Check activities
    for (const day of data.tripPlan.itinerary || []) {
      for (const act of day.activities || []) {
        if (act.costEstimate) return getCurrencySymbol(act.costEstimate);
      }
    }
    // Fallback based on currency setting
    return data.tripPlan.currency === 'USD' ? '$' : '₹';
  }, [data]);

  // Calculate flight cost per person (price shown is per person for one way)
  const flightCostPerPerson = useMemo(() => {
    if (!data.flights?.length) return 0;
    // The price breakup total is per person for one-way
    const oneWayFarePerPerson = parseCostValue(data.flights[0]?.priceBreakup?.total);
    // Round trip = 2 × one-way per person
    return oneWayFarePerPerson * 2;
  }, [data.flights]);

  // Calculate hotel cost (per room per night - rooms are shared)
  const hotelCostPerNight = useMemo(() => {
    if (!data.hotels?.length) return 0;
    return parseCostValue(data.hotels[0]?.pricePerNight);
  }, [data.hotels]);

  // Calculate total activity cost for all days (costs shown are per person)
  const totalActivityCostPerPerson = useMemo(() => {
    let total = 0;
    for (const day of data.tripPlan.itinerary || []) {
      for (const act of day.activities || []) {
        total += parseCostValue(act.costEstimate);
      }
    }
    return total;
  }, [data.tripPlan.itinerary]);

  // Calculate complete budget breakdown - use LLM's totalCostEstimate as primary source
  const budgetBreakdown = useMemo(() => {
    const members = data.tripPlan.members || 1;
    const nights = Math.max((data.tripPlan.durationDays || 1) - 1, 1);
    const roomsNeeded = Math.ceil(members / 2);
    
    // Flight: per person cost × number of travelers (round trip)
    const flightsTotal = flightCostPerPerson * members;
    
    // Hotel: per night × nights × rooms needed
    const hotelsTotal = hotelCostPerNight * nights * roomsNeeded;
    
    // Activities: per person × number of travelers
    const activitiesTotal = totalActivityCostPerPerson * members;
    
    // Use LLM's total cost estimate as the primary budget (it considers budget tier, flight class, hotel standard)
    // Fall back to calculated total if LLM estimate is not available
    const llmTotal = parseCostValue(data.tripPlan.totalCostEstimate);
    const calculatedTotal = flightsTotal + hotelsTotal + activitiesTotal;
    
    // Use LLM estimate if it's a reasonable value, otherwise use calculated
    const grandTotal = llmTotal > 0 ? llmTotal : calculatedTotal;
    const perPerson = members > 0 ? grandTotal / members : grandTotal;
    
    return {
      flights: flightsTotal,
      hotels: hotelsTotal,
      activities: activitiesTotal,
      total: grandTotal,
      perPerson,
      nights,
      roomsNeeded,
      flightsPerPerson: flightCostPerPerson,
      hotelsPerNight: hotelCostPerNight,
      activitiesPerPerson: totalActivityCostPerPerson,
      llmEstimate: llmTotal,
      isLlmBased: llmTotal > 0
    };
  }, [flightCostPerPerson, hotelCostPerNight, totalActivityCostPerPerson, data.tripPlan.members, data.tripPlan.durationDays, data.tripPlan.totalCostEstimate]);

  const totalBudget = budgetBreakdown.total;
  const perPersonBudget = budgetBreakdown.perPerson;

  // Get top 3 attractive spots for hero carousel
  const topAttractions = useMemo(() => {
    const attractiveCategories = ['landmark', 'monument', 'temple', 'palace', 'museum', 'nature', 'beach', 'park', 'heritage', 'historic'];
    const spots: { name: string; score: number }[] = [];
    
    for (const day of data.tripPlan.itinerary || []) {
      for (const activity of day.activities || []) {
        const category = (activity.category || '').toLowerCase();
        const location = activity.wikipediaTitle || activity.location || '';
        
        if (category.includes('food') || category.includes('dining') || category.includes('breakfast') || 
            category.includes('lunch') || category.includes('dinner')) continue;
        
        let score = 0;
        for (const cat of attractiveCategories) {
          if (category.includes(cat)) score += 10;
        }
        if (activity.wikipediaTitle) score += 15;
        if (activity.location && activity.location.length > 5) score += 5;
        
        if (location) spots.push({ name: location, score });
      }
    }
    
    // Sort by score and get top 3 unique names
    const sorted = spots.sort((a, b) => b.score - a.score);
    const unique = [...new Set(sorted.map(s => s.name))].slice(0, 3);
    return unique.length > 0 ? unique : [destinationName];
  }, [data.tripPlan.itinerary, destinationName]);

  // Load hero images for carousel from top attractions
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const images: string[] = [];
      
      for (const spot of topAttractions) {
        const resolved = await resolvePlaceImage(spot, destinationName);
        if (resolved?.url && !cancelled) {
          images.push(resolved.url);
        }
      }
      
      // Add fallback if we don't have enough images
      if (images.length === 0) {
        images.push(data.tripPlan.heroImage || fallbackHero);
      }
      
      if (!cancelled) {
        setHeroImages(images);
        setHeroUrl(images[0] || data.tripPlan.heroImage || null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [topAttractions, destinationName, data.tripPlan.heroImage, fallbackHero]);

  // Auto-rotate hero carousel
  useEffect(() => {
    if (heroImages.length <= 1 || isHeroHovered) return;
    
    const interval = setInterval(() => {
      setHeroImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 6000);
    
    return () => clearInterval(interval);
  }, [heroImages.length, isHeroHovered]);

  const goToHeroSlide = (index: number) => {
    setHeroImageIndex(index);
  };

  const nextHeroSlide = () => {
    setHeroImageIndex((prev) => (prev + 1) % heroImages.length);
  };

  const prevHeroSlide = () => {
    setHeroImageIndex((prev) => (prev - 1 + heroImages.length) % heroImages.length);
  };

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    if (isGeneratingPdf) return;
    
    setIsGeneratingPdf(true);
    
    try {
      // Get the print-only section
      const printSection = document.querySelector('.print-only') as HTMLElement;
      if (!printSection) {
        window.print();
        return;
      }

      // Temporarily show the print section
      const originalDisplay = printSection.style.display;
      printSection.style.display = 'block';
      printSection.classList.remove('hidden');

      // Wait for styles to apply
      await new Promise(resolve => setTimeout(resolve, 100));

      // Generate canvas from the print section
      const canvas = await html2canvas(printSection, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: printSection.scrollWidth,
        height: printSection.scrollHeight,
      });

      // Calculate PDF dimensions (A4 size)
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add more pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Generate filename
      const fileName = `SkyBound_${destinationName.replace(/\s+/g, '_')}_${data.tripPlan.durationDays}Days_Trip.pdf`;
      
      // Download PDF
      pdf.save(fileName);

      // Restore print section visibility
      printSection.style.display = originalDisplay;
      printSection.classList.add('hidden');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Fallback to print dialog
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Get day cost helper
  const getDayCost = (day: { activities?: { costEstimate?: string }[] }) => {
    return (day.activities || []).reduce((sum, act) => sum + parseCostValue(act.costEstimate), 0);
  };

  return (
    <div ref={resultsRef} className="space-y-16 animate-wow py-6">
      
      {/* ============ PRINT-ONLY PDF LAYOUT ============ */}
      <div className="print-only hidden" style={{ paddingTop: '40px', marginTop: '20px' }}>
        {/* Professional Report Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '24px' }}>✈️</span>
            <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#1e3a8a', letterSpacing: '-0.02em', margin: 0 }}>
              SkyBound<span style={{ color: '#6366f1' }}>AI</span>
            </h1>
          </div>
          <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '4px 0' }}>
            AI-Powered Travel Intelligence Report
          </p>
          <p style={{ fontSize: '9px', color: '#94a3b8', marginTop: '8px' }}>
            Generated on {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • Personalized Itinerary & Recommendations
          </p>
        </div>

        {/* Route Header */}
        <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #7c3aed 100%)', color: 'white', padding: '24px 20px', borderRadius: '8px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 900, marginBottom: '4px', letterSpacing: '-0.02em' }}>
                {sourceName} → {destinationName}
              </h2>
              <p style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>
                {sourceCode} → {destCode} • {data.tripPlan.durationDays} Days • {data.tripPlan.members} Travelers • {data.tripPlan.budgetLevel} Tier
              </p>
              {data.tripPlan.startDate && (
                <p style={{ fontSize: '10px', opacity: 0.9, marginTop: '6px' }}>
                  📅 {new Date(data.tripPlan.startDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} 
                  {data.tripPlan.returnDate && ` → ${new Date(data.tripPlan.returnDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}`}
                </p>
              )}
            </div>
            <div style={{ textAlign: 'right', background: 'rgba(255,255,255,0.15)', padding: '12px 16px', borderRadius: '8px' }}>
              <p style={{ fontSize: '9px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>Estimated Budget</p>
              <p style={{ fontSize: '18px', fontWeight: 900 }}>{formatMoney(totalBudget, currencySymbol)}</p>
            </div>
          </div>
        </div>

        {/* Travel Preferences Table */}
        <div className="print-card" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: 'white', marginBottom: '16px' }}>
          <h3 className="print-card-header" style={{ fontSize: '11px', fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', paddingBottom: '8px', borderBottom: '2px solid #e2e8f0' }}>
            🎯 Travel Preferences
          </h3>
          <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px 12px', background: '#f8fafc', fontWeight: 600, color: '#64748b', width: '25%' }}>Travel Dates</td>
                <td style={{ padding: '8px 12px', color: '#1e293b' }}>{data.tripPlan.startDate ? new Date(data.tripPlan.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'} - {data.tripPlan.returnDate ? new Date(data.tripPlan.returnDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</td>
                <td style={{ padding: '8px 12px', background: '#f8fafc', fontWeight: 600, color: '#64748b', width: '25%' }}>Duration</td>
                <td style={{ padding: '8px 12px', color: '#1e293b' }}>{data.tripPlan.durationDays} days</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 12px', background: '#f8fafc', fontWeight: 600, color: '#64748b', width: '25%' }}>Group Type</td>
                <td style={{ padding: '8px 12px', color: '#1e293b' }}>{data.tripPlan.groupType || 'N/A'}</td>
                <td style={{ padding: '8px 12px', background: '#f8fafc', fontWeight: 600, color: '#64748b', width: '25%' }}>Travelers</td>
                <td style={{ padding: '8px 12px', color: '#1e293b' }}>{data.tripPlan.members} {data.tripPlan.members === 1 ? 'person' : 'people'}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 12px', background: '#f8fafc', fontWeight: 600, color: '#64748b' }}>Expense Tier</td>
                <td style={{ padding: '8px 12px', color: '#1e293b' }}>{data.tripPlan.budgetLevel || 'Standard'}</td>
                <td style={{ padding: '8px 12px', background: '#f8fafc', fontWeight: 600, color: '#64748b' }}>Flight Class</td>
                <td style={{ padding: '8px 12px', color: '#1e293b' }}>{data.tripPlan.flightClass || 'Economy'}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 12px', background: '#f8fafc', fontWeight: 600, color: '#64748b' }}>Currency</td>
                <td style={{ padding: '8px 12px', color: '#1e293b' }}>{data.tripPlan.currency || 'INR'}</td>
                <td style={{ padding: '8px 12px', background: '#f8fafc', fontWeight: 600, color: '#64748b' }}>Real-Time Fares</td>
                <td style={{ padding: '8px 12px', color: '#1e293b' }}>✓ Google Flights API</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Trip Details Grid */}
        <div className="print-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '16px' }}>
          {/* Budget Summary */}
          <div className="print-card" style={{ border: '2px solid #10b981', borderRadius: '8px', padding: '16px', background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%)' }}>
            <h3 className="print-card-header" style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', paddingBottom: '8px', borderBottom: '2px solid #d1fae5' }}>
              💰 Budget Summary
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ textAlign: 'center', flex: 1, padding: '12px', background: 'white', borderRadius: '6px', marginRight: '8px' }}>
                <p style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Total Budget</p>
                <p style={{ fontSize: '20px', fontWeight: 900, color: '#1e293b' }}>{formatMoney(totalBudget, currencySymbol)}</p>
              </div>
              <div style={{ textAlign: 'center', flex: 1, padding: '12px', background: 'white', borderRadius: '6px' }}>
                <p style={{ fontSize: '9px', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Per Person</p>
                <p style={{ fontSize: '20px', fontWeight: 900, color: '#2563eb' }}>{formatMoney(perPersonBudget, currencySymbol)}</p>
              </div>
            </div>
            {/* Budget Breakdown */}
            <div style={{ fontSize: '9px', color: '#64748b', borderTop: '1px dashed #d1fae5', paddingTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>✈️ Flights (round trip × {data.tripPlan.members} pax)</span>
                <span style={{ fontWeight: 700 }}>{formatMoney(budgetBreakdown.flights, currencySymbol)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>🏨 Hotels ({budgetBreakdown.nights} nights × {budgetBreakdown.roomsNeeded} room{budgetBreakdown.roomsNeeded > 1 ? 's' : ''})</span>
                <span style={{ fontWeight: 700 }}>{formatMoney(budgetBreakdown.hotels, currencySymbol)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>🎯 Activities (× {data.tripPlan.members} pax)</span>
                <span style={{ fontWeight: 700 }}>{formatMoney(budgetBreakdown.activities, currencySymbol)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Flights & Hotels */}
        <div className="print-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          {/* Onward Flights */}
          <div className="print-card" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: 'white' }}>
            <h3 className="print-card-header" style={{ fontSize: '11px', fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', paddingBottom: '8px', borderBottom: '2px solid #e2e8f0' }}>
              ✈️ Onward Flights ({sourceCode} → {destCode})
            </h3>
            {data.flights?.map((flight, idx) => (
              <div key={idx} style={{ padding: '10px', background: '#f8fafc', borderRadius: '6px', marginBottom: '8px', fontSize: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <strong style={{ color: '#1e293b' }}>{flight.airline}</strong>
                  <span style={{ color: '#2563eb', fontWeight: 700 }}>{flight.priceBreakup.total}/person</span>
                </div>
                <div style={{ color: '#64748b', display: 'flex', gap: '12px' }}>
                  <span>{flight.flightNumber}</span>
                  <span>{flight.departureTime} → {flight.arrivalTime}</span>
                  <span>{flight.duration}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Return Flights */}
          <div className="print-card" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: 'white' }}>
            <h3 className="print-card-header" style={{ fontSize: '11px', fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', paddingBottom: '8px', borderBottom: '2px solid #e2e8f0' }}>
              ✈️ Return Flights ({destCode} → {sourceCode})
            </h3>
            {(data.returnFlights || data.flights)?.map((flight, idx) => (
              <div key={idx} style={{ padding: '10px', background: '#f8fafc', borderRadius: '6px', marginBottom: '8px', fontSize: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <strong style={{ color: '#1e293b' }}>{flight.airline}</strong>
                  <span style={{ color: '#2563eb', fontWeight: 700 }}>{flight.priceBreakup.total}/person</span>
                </div>
                <div style={{ color: '#64748b', display: 'flex', gap: '12px' }}>
                  <span>{flight.flightNumber}</span>
                  <span>{flight.departureTime} → {flight.arrivalTime}</span>
                  <span>{flight.duration}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hotels */}
        <div style={{ marginBottom: '16px' }}>
          <div className="print-card" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: 'white' }}>
            <h3 className="print-card-header" style={{ fontSize: '11px', fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', paddingBottom: '8px', borderBottom: '2px solid #e2e8f0' }}>
              🏨 Recommended Hotels
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {data.hotels?.map((hotel, idx) => (
                <div key={idx} style={{ padding: '10px', background: '#f8fafc', borderRadius: '6px', fontSize: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ color: '#1e293b' }}>{hotel.name}</strong>
                    <span style={{ color: '#f59e0b' }}>★ {hotel.rating}</span>
                  </div>
                  <div style={{ color: '#64748b', marginBottom: '4px' }}>{hotel.description?.substring(0, 80)}...</div>
                  <div style={{ color: '#2563eb', fontWeight: 700 }}>{hotel.pricePerNight}/night</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pre-Trip Checklist & Packing Essentials */}
        <div className="print-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          {/* Pre-Trip Checklist */}
          <div className="print-card" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: 'white' }}>
            <h3 className="print-card-header" style={{ fontSize: '11px', fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', paddingBottom: '8px', borderBottom: '2px solid #e2e8f0' }}>
              ✅ Pre-Trip Checklist
            </h3>
            <ul style={{ fontSize: '10px', margin: 0, paddingLeft: '16px' }}>
              {(data.tripPlan.selectedEssentials && data.tripPlan.selectedEssentials.length > 0) ? (
                data.tripPlan.selectedEssentials.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '6px', color: '#334155' }}>
                    <strong>{item}</strong>
                    <span style={{ display: 'block', fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
                      {getLogisticsRecommendation(item, destinationName)}
                    </span>
                  </li>
                ))
              ) : (
                <>
                  <li style={{ marginBottom: '6px', color: '#334155' }}>Check passport validity & visa requirements</li>
                  <li style={{ marginBottom: '6px', color: '#334155' }}>Get comprehensive travel insurance</li>
                  <li style={{ marginBottom: '6px', color: '#334155' }}>Research currency exchange options</li>
                </>
              )}
            </ul>
          </div>

          {/* Packing Essentials */}
          <div className="print-card" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: 'white' }}>
            <h3 className="print-card-header" style={{ fontSize: '11px', fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', paddingBottom: '8px', borderBottom: '2px solid #e2e8f0' }}>
              🧳 Packing Essentials
            </h3>
            <ul style={{ fontSize: '10px', margin: 0, paddingLeft: '16px' }}>
              {(data.tripPlan.selectedPackingList && data.tripPlan.selectedPackingList.length > 0) ? (
                data.tripPlan.selectedPackingList.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '6px', color: '#334155' }}>
                    <strong>{item}</strong>
                    <span style={{ display: 'block', fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
                      {getPackingRecommendation(item, destinationName)}
                    </span>
                  </li>
                ))
              ) : (
                <>
                  <li style={{ marginBottom: '6px', color: '#334155' }}>Versatile clothing for various weather</li>
                  <li style={{ marginBottom: '6px', color: '#334155' }}>Comfortable walking shoes</li>
                  <li style={{ marginBottom: '6px', color: '#334155' }}>Travel adapters and chargers</li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Detailed Itinerary */}
        <div style={{ pageBreakBefore: 'always' }}>
          <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)', color: 'white', padding: '16px 20px', borderRadius: '8px', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 900, margin: 0 }}>📅 Detailed Day-by-Day Itinerary</h2>
            <p style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>
              Total Activity Budget: {formatMoney(totalActivityCostPerPerson, currencySymbol)} per person
            </p>
          </div>

          {data.tripPlan.itinerary?.map((day, dayIdx) => {
            const dayCost = getDayCost(day);
            return (
              <div key={dayIdx} className="print-day-card" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px', overflow: 'hidden', pageBreakInside: 'avoid' }}>
                {/* Day Header */}
                <div className="print-day-header" style={{ background: 'linear-gradient(135deg, #1e40af 0%, #4f46e5 100%)', color: 'white', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 900, margin: 0 }}>Day {day.day}: {day.title || 'Exploration'}</h3>
                    <p style={{ fontSize: '9px', opacity: 0.8, marginTop: '2px' }}>{day.activities?.length || 0} activities planned</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '9px', opacity: 0.7 }}>Day Budget</p>
                    <p style={{ fontSize: '16px', fontWeight: 900 }}>{formatMoney(dayCost, currencySymbol)}</p>
                    <p style={{ fontSize: '8px', opacity: 0.7 }}>per person</p>
                  </div>
                </div>

                {/* Activities */}
                <div className="print-day-content" style={{ padding: '12px 16px' }}>
                  {day.activities?.map((activity, actIdx) => (
                    <div key={actIdx} className="print-activity" style={{ display: 'flex', padding: '10px 0', borderBottom: actIdx < (day.activities?.length || 0) - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <div className="print-activity-time" style={{ width: '70px', flexShrink: 0, fontWeight: 700, color: '#6366f1', fontSize: '10px' }}>
                        {activity.time || '—'}
                      </div>
                      <div className="print-activity-details" style={{ flex: 1, paddingRight: '12px' }}>
                        <p style={{ fontWeight: 700, color: '#1e293b', fontSize: '11px', marginBottom: '2px' }}>
                          {activity.location || activity.description?.split('.')[0]}
                        </p>
                        <p style={{ color: '#64748b', fontSize: '9px', lineHeight: 1.4 }}>
                          {activity.description}
                        </p>
                        {activity.category && (
                          <span style={{ display: 'inline-block', marginTop: '4px', padding: '2px 8px', background: '#f1f5f9', borderRadius: '4px', fontSize: '8px', color: '#64748b', textTransform: 'uppercase' }}>
                            {activity.category}
                          </span>
                        )}
                      </div>
                      <div className="print-activity-cost" style={{ width: '80px', textAlign: 'right', fontWeight: 700, color: '#059669', fontSize: '10px' }}>
                        {activity.costEstimate || 'Free'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Print Footer */}
        <div className="print-footer" style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '9px', color: '#94a3b8' }}>
          <p style={{ marginBottom: '4px' }}>Generated by <strong>SkyBound AI Travel Planner</strong></p>
          <p>All prices are estimates and subject to change. Please verify with service providers before booking.</p>
        </div>
      </div>
      {/* ============ END PRINT-ONLY LAYOUT ============ */}

      {/* ============ SCREEN-ONLY UI ============ */}
      <div className="screen-only">
      {/* Hero Section with Carousel */}
      <section 
        className="relative rounded-[60px] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] h-[700px] group"
        onMouseEnter={() => setIsHeroHovered(true)}
        onMouseLeave={() => setIsHeroHovered(false)}
      >
        {/* Carousel Images */}
        {heroImages.length > 0 ? (
          heroImages.map((img, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                idx === heroImageIndex 
                  ? 'opacity-100 scale-100' 
                  : 'opacity-0 scale-105'
              }`}
            >
              <img 
                src={img} 
                alt={`${destinationName} - View ${idx + 1}`} 
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = fallbackHero;
                }}
              />
            </div>
          ))
        ) : (
          <img 
            src={heroUrl || data.tripPlan.heroImage || fallbackHero} 
            alt={destinationName} 
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackHero;
            }}
          />
        )}
        
        {/* Multi-layer Gradient Overlays for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/60 via-transparent to-slate-900/40"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/30 via-transparent to-transparent"></div>
        
        {/* Animated Particles Effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-2 h-2 bg-blue-400 rounded-full animate-ping opacity-60"></div>
          <div className="absolute top-40 right-40 w-1 h-1 bg-purple-400 rounded-full animate-pulse"></div>
          <div className="absolute bottom-40 left-1/3 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping opacity-40" style={{ animationDelay: '1s' }}></div>
        </div>
        
        {/* Carousel Navigation Arrows */}
        {heroImages.length > 1 && (
          <>
            <button 
              onClick={prevHeroSlide}
              className="absolute left-8 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 hover:bg-white/30 backdrop-blur-xl rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 transform -translate-x-4 group-hover:translate-x-0 duration-500 border border-white/20 shadow-2xl z-20"
            >
              <i className="fas fa-chevron-left text-white text-xl"></i>
            </button>
            <button 
              onClick={nextHeroSlide}
              className="absolute right-8 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 hover:bg-white/30 backdrop-blur-xl rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 duration-500 border border-white/20 shadow-2xl z-20"
            >
              <i className="fas fa-chevron-right text-white text-xl"></i>
            </button>
          </>
        )}
        
        {/* Carousel Dots */}
        {heroImages.length > 1 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-20">
            {heroImages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goToHeroSlide(idx)}
                className={`transition-all duration-500 rounded-full ${
                  idx === heroImageIndex 
                    ? 'w-10 h-3 bg-white shadow-lg shadow-white/30' 
                    : 'w-3 h-3 bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
        
        {/* Content Overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-12 md:p-20 z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
            <div className="max-w-4xl space-y-6">
              {/* AI Badge */}
              <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-2xl border border-white/20 px-6 py-3 rounded-full shadow-xl">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
                <span className="text-xs font-black text-white uppercase tracking-[0.25em]">AI-Powered Precision</span>
              </div>
              
              {/* Prominent IATA Code Display */}
              <div className="flex items-center gap-6 my-6">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-8 py-5 rounded-3xl shadow-2xl hover:bg-white/15 transition-all">
                  <p className="text-xs font-bold text-white/70 uppercase tracking-widest mb-2">From</p>
                  <p className="text-5xl md:text-7xl font-black text-white tracking-tight drop-shadow-lg">{sourceCode}</p>
                  <p className="text-sm text-white/80 mt-2 font-medium">{sourceName}</p>
                </div>
                <div className="flex flex-col items-center px-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-xl shadow-blue-500/30 animate-pulse">
                    <i className="fas fa-plane text-2xl text-white transform rotate-90 md:rotate-0"></i>
                  </div>
                  <span className="text-sm text-white/70 mt-3 font-bold">{data.tripPlan.durationDays} Days</span>
                </div>
                <div className="bg-gradient-to-br from-blue-600/30 to-indigo-600/30 backdrop-blur-xl border border-white/20 px-8 py-5 rounded-3xl shadow-2xl hover:from-blue-500/40 hover:to-indigo-500/40 transition-all">
                  <p className="text-xs font-bold text-white/70 uppercase tracking-widest mb-2">To</p>
                  <p className="text-5xl md:text-7xl font-black text-white tracking-tight drop-shadow-lg">{destCode}</p>
                  <p className="text-sm text-white/80 mt-2 font-medium">{destinationName}</p>
                </div>
              </div>
              
              {/* Title */}
              <h2 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tight">
                <span className="drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)]">Your {data.tripPlan.durationDays}-Day Adventure</span>
              </h2>
              
              {/* Tags Row */}
              <div className="flex flex-wrap items-center mt-8 gap-4">
                <span className="bg-white/10 backdrop-blur-xl px-6 py-3 rounded-2xl text-white font-bold text-sm border border-white/20 shadow-xl hover:bg-white/20 transition-all">
                  <i className="fas fa-chart-line mr-3 text-emerald-400"></i> {data.tripPlan.budgetLevel} Tier
                </span>
                <span className="bg-white/10 backdrop-blur-xl px-6 py-3 rounded-2xl text-white font-bold text-sm border border-white/20 shadow-xl hover:bg-white/20 transition-all">
                  <i className="fas fa-plane-up mr-3 text-blue-400"></i> {data.tripPlan.flightClass}
                </span>
                <span className="bg-white/10 backdrop-blur-xl px-6 py-3 rounded-2xl text-white font-bold text-sm border border-white/20 shadow-xl hover:bg-white/20 transition-all">
                  <i className="fas fa-users mr-3 text-purple-400"></i> {data.tripPlan.members} Travelers
                </span>
                
                {/* Budget Card */}
                <div className="bg-white/95 backdrop-blur-xl px-6 py-4 rounded-2xl shadow-2xl border border-white/50">
                  <div className="flex items-center gap-6">
                    <div className="text-center border-r border-slate-200 pr-6">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Budget</p>
                      <p className="text-xl font-black text-slate-900">{formatMoney(totalBudget, currencySymbol)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Per Person</p>
                      <p className="text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        {formatMoney(perPersonBudget, currencySymbol)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Download Button */}
            <button 
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className={`no-print group/btn relative bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-6 px-12 rounded-[32px] transition-all shadow-[0_20px_50px_rgba(37,99,235,0.4)] flex items-center space-x-4 self-start md:self-end overflow-hidden ${isGeneratingPdf ? 'opacity-80 cursor-wait' : 'hover:scale-[1.05] active:scale-[0.98]'}`}
            >
              <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              {isGeneratingPdf ? (
                <i className="fas fa-spinner fa-spin text-xl relative z-10"></i>
              ) : (
                <i className="fas fa-file-export text-xl group-hover/btn:-translate-y-1 transition-transform relative z-10"></i>
              )}
              <div className="text-left relative z-10">
                <p className="text-[8px] font-black uppercase tracking-widest opacity-70">
                  {isGeneratingPdf ? 'Generating...' : 'Export Plan'}
                </p>
                <p className="text-sm">{isGeneratingPdf ? 'Please wait' : 'Download PDF'}</p>
              </div>
            </button>
          </div>
        </div>
        
        {/* Shine Effect on Hover */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[60px]">
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[1.5s] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        </div>
      </section>

      {/* Summary Cards - Two Row Layout */}
      <div className="space-y-6 mt-8 no-print">
        
        {/* Row 1: Best Time to Visit + Trip DNA */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Best Time to Visit Card */}
          <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-8 rounded-[32px] text-white shadow-2xl shadow-purple-300/40 relative overflow-hidden group hover:shadow-purple-400/50 transition-all duration-500">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
            <div className="absolute top-6 right-6 text-8xl opacity-10">
              <i className="fas fa-sun"></i>
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <span className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-xl">
                  <i className="fas fa-calendar-star text-white text-2xl"></i>
                </span>
                <div>
                  <h4 className="text-xl font-black text-white">Best Time to Visit</h4>
                  <p className="text-sm text-white/70 font-medium">{destinationName}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {data.bestTimeToVisit ? (
                  <>
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <i className="fas fa-calendar-alt text-purple-200"></i>
                        <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Season</span>
                      </div>
                      <p className="text-lg font-black text-white">{data.bestTimeToVisit.months}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <i className="fas fa-cloud-sun text-blue-200"></i>
                        <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Weather</span>
                      </div>
                      <p className="text-sm font-semibold text-white">{data.bestTimeToVisit.weather}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <i className="fas fa-users text-pink-200"></i>
                        <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Crowds</span>
                      </div>
                      <p className="text-sm font-semibold text-white">{data.bestTimeToVisit.crowdLevel}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <i className="fas fa-calendar-alt text-purple-200"></i>
                        <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Season</span>
                      </div>
                      <p className="text-lg font-black text-white">Year-round</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <i className="fas fa-cloud-sun text-blue-200"></i>
                        <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Weather</span>
                      </div>
                      <p className="text-sm font-semibold text-white">Check local forecast</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <i className="fas fa-users text-pink-200"></i>
                        <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Crowds</span>
                      </div>
                      <p className="text-sm font-semibold text-white">Varies by season</p>
                    </div>
                  </>
                )}
              </div>
              
              {data.bestTimeToVisit?.tip && (
                <div className="mt-5 p-4 bg-white/15 rounded-2xl border border-white/20 backdrop-blur-sm">
                  <p className="text-sm text-white leading-relaxed">
                    <i className="fas fa-lightbulb text-yellow-300 mr-2"></i>
                    <span className="font-semibold">Pro Tip:</span> {data.bestTimeToVisit.tip}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Trip DNA Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 rounded-[32px] text-white shadow-2xl shadow-slate-400/30 relative overflow-hidden group hover:shadow-slate-500/40 transition-all duration-500">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-br from-indigo-500/5 to-pink-500/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
            <div className="absolute top-6 right-6 text-8xl opacity-5">
              <i className="fas fa-dna"></i>
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <span className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/30">
                  <i className="fas fa-fingerprint text-white text-2xl"></i>
                </span>
                <div>
                  <h4 className="text-xl font-black text-white">Trip DNA</h4>
                  <p className="text-sm text-slate-400 font-medium">Your journey profile</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 text-center">
                  <i className="fas fa-calendar-days text-amber-400 text-xl mb-2"></i>
                  <p className="text-3xl font-black text-white">{data.tripPlan.durationDays}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Days</p>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 text-center">
                  <i className="fas fa-user-group text-cyan-400 text-xl mb-2"></i>
                  <p className="text-3xl font-black text-white">{data.tripPlan.members}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Travelers</p>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 text-center">
                  <i className="fas fa-heart text-rose-400 text-xl mb-2"></i>
                  <p className="text-lg font-black text-white">{data.tripPlan.groupType}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Style</p>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 text-center">
                  <i className="fas fa-gem text-purple-400 text-xl mb-2"></i>
                  <p className="text-lg font-black text-white">{data.tripPlan.budgetLevel}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tier</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl border border-white/10">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                    <i className="fas fa-coins text-emerald-400"></i>
                  </span>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Currency</p>
                    <p className="text-lg font-black text-white">{data.tripPlan.currency}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Flight Class</p>
                    <p className="text-lg font-black text-white">{data.tripPlan.flightClass}</p>
                  </div>
                  <span className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <i className="fas fa-plane text-blue-400"></i>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Travel Logistics + Packing Essentials */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Travel Logistics Card */}
          <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/50 relative overflow-hidden group hover:shadow-2xl hover:shadow-blue-200/40 transition-all duration-500">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-blue-100/60 to-indigo-100/60 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute top-6 right-6 text-7xl opacity-5 text-blue-900">
              <i className="fas fa-clipboard-list"></i>
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <span className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                  <i className="fas fa-clipboard-check text-white text-2xl"></i>
                </span>
                <div>
                  <h4 className="text-xl font-black text-slate-800">Travel Logistics</h4>
                  <p className="text-sm text-slate-500 font-medium">Pre-Trip Checklist</p>
                </div>
              </div>
              
              <div className="space-y-3">
                {(data.tripPlan.selectedEssentials && data.tripPlan.selectedEssentials.length > 0) ? (
                  data.tripPlan.selectedEssentials.map((item, index) => (
                    <div key={item} className="flex items-start gap-4 p-4 bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all">
                      <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-black flex items-center justify-center shadow-md">{index + 1}</span>
                      <div className="flex-1">
                        <p className="text-base font-bold text-slate-800">{item}</p>
                        <p className="text-sm text-slate-500 leading-relaxed mt-1">{getLogisticsRecommendation(item, destinationName)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-2xl border border-slate-100">
                      <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-black flex items-center justify-center shadow-md">1</span>
                      <div className="flex-1">
                        <p className="text-base font-bold text-slate-800">Travel Documents</p>
                        <p className="text-sm text-slate-500 leading-relaxed mt-1">Ensure your passport is valid for 6+ months, check visa requirements, and get comprehensive travel insurance.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-2xl border border-slate-100">
                      <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-black flex items-center justify-center shadow-md">2</span>
                      <div className="flex-1">
                        <p className="text-base font-bold text-slate-800">Local Currency</p>
                        <p className="text-sm text-slate-500 leading-relaxed mt-1">Compare exchange rates before your trip. Use local ATMs in {destinationName} for better rates than airport exchanges.</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Packing Essentials Card */}
          <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/50 relative overflow-hidden group hover:shadow-2xl hover:shadow-indigo-200/40 transition-all duration-500">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-indigo-100/60 to-purple-100/60 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute top-6 right-6 text-7xl opacity-5 text-indigo-900">
              <i className="fas fa-suitcase"></i>
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <span className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                  <i className="fas fa-suitcase-rolling text-white text-2xl"></i>
                </span>
                <div>
                  <h4 className="text-xl font-black text-slate-800">Packing Essentials</h4>
                  <p className="text-sm text-slate-500 font-medium">What to bring</p>
                </div>
              </div>
              
              <div className="space-y-3">
                {(data.tripPlan.selectedPackingList && data.tripPlan.selectedPackingList.length > 0) ? (
                  data.tripPlan.selectedPackingList.map((item, index) => (
                    <div key={item} className="flex items-start gap-4 p-4 bg-gradient-to-r from-slate-50 to-indigo-50/50 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all">
                      <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-black flex items-center justify-center shadow-md">{index + 1}</span>
                      <div className="flex-1">
                        <p className="text-base font-bold text-slate-800">{item}</p>
                        <p className="text-sm text-slate-500 leading-relaxed mt-1">{getPackingRecommendation(item, destinationName)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-slate-50 to-indigo-50/50 rounded-2xl border border-slate-100">
                      <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-black flex items-center justify-center shadow-md">1</span>
                      <div className="flex-1">
                        <p className="text-base font-bold text-slate-800">Versatile Clothing</p>
                        <p className="text-sm text-slate-500 leading-relaxed mt-1">Pack wrinkle-resistant layers suitable for {destinationName}'s weather. Check dress codes for religious sites.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-slate-50 to-indigo-50/50 rounded-2xl border border-slate-100">
                      <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-black flex items-center justify-center shadow-md">2</span>
                      <div className="flex-1">
                        <p className="text-base font-bold text-slate-800">Essential Kit</p>
                        <p className="text-sm text-slate-500 leading-relaxed mt-1">Don't forget chargers, travel adapters, toiletries, and any personal medications with prescriptions.</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mt-10">
        {/* Sidebar Column */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white p-8 rounded-[36px] shadow-2xl shadow-slate-200/50 border border-slate-50 relative overflow-hidden hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.2)] transition-all duration-500">
            <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-bl-full -z-0"></div>
            <h3 className="text-xl font-black text-slate-800 mb-5 relative z-10 flex items-center">
              <span className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center mr-4 shadow-lg shadow-blue-200">
                <i className="fas fa-plane text-sm"></i>
              </span>
              Flights
            </h3>
            
            {/* Flight Tabs */}
            <div className="flex gap-2 mb-6 relative z-10">
              <button
                onClick={() => setFlightTab('onward')}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
                  flightTab === 'onward'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <i className="fas fa-plane-departure mr-1.5 text-[10px]"></i>
                {sourceCode} → {destCode}
              </button>
              <button
                onClick={() => setFlightTab('return')}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
                  flightTab === 'return'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <i className="fas fa-plane-arrival mr-1.5 text-[10px]"></i>
                {destCode} → {sourceCode}
              </button>
            </div>
            
            <div className="space-y-6 relative z-10">
              {flightTab === 'onward' ? (
                data.flights?.map((flight, idx) => (
                  <FlightCard key={idx} flight={flight} />
                ))
              ) : (
                (data.returnFlights || data.flights)?.map((flight, idx) => (
                  <FlightCard key={idx} flight={flight} />
                ))
              )}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[36px] shadow-2xl shadow-slate-200/50 border border-slate-50 relative overflow-hidden hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.2)] transition-all duration-500">
            <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-bl-full -z-0"></div>
            <h3 className="text-xl font-black text-slate-800 mb-6 relative z-10 flex items-center">
              <span className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-xl flex items-center justify-center mr-4 shadow-lg shadow-indigo-200">
                <i className="fas fa-hotel text-sm"></i>
              </span>
              Hotels
            </h3>
            <div className="space-y-6 relative z-10">
              {data.hotels?.map((hotel, idx) => (
                <HotelCard key={idx} hotel={hotel} />
              ))}
            </div>
          </div>
        </div>

        {/* Main Column */}
        <div className="lg:col-span-8">
          <div className="bg-white p-10 md:p-14 rounded-[48px] shadow-2xl shadow-slate-200/50 border border-slate-50 h-full relative hover:shadow-[0_40px_100px_-30px_rgba(0,0,0,0.15)] transition-all duration-500">
            <div id="itinerary-section" className="absolute -top-24" />
            <h3 className="text-3xl font-black text-slate-800 mb-12 flex items-center">
              <span className="w-12 h-12 bg-gradient-to-br from-slate-900 to-slate-700 text-white rounded-[18px] flex items-center justify-center mr-6 shadow-2xl shadow-slate-300">
                <i className="fas fa-map-location-dot"></i>
              </span>
              The Itinerary
            </h3>
            <Itinerary itinerary={data.tripPlan.itinerary || []} destination={destinationName} />
          </div>
        </div>
      </div>
      </div>
      {/* ============ END SCREEN-ONLY UI ============ */}
    </div>
  );
};

export default TripResults;
