
import React, { useState, useEffect } from 'react';
import { FlightOption } from '../types';

interface FlightCardProps {
  flight: FlightOption;
}

// HD Travel/Flight Images for Carousel
const flightCarouselImages = [
  'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80', // Airplane wing at sunset
  'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&q=80', // Airplane flying through clouds
  'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=800&q=80', // Airport terminal sunset
];

const FlightCard: React.FC<FlightCardProps> = ({ flight }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const stopsLabel = flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`;

  // Auto-rotate carousel
  useEffect(() => {
    if (!isHovered) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % flightCarouselImages.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [isHovered]);

  const goToSlide = (index: number) => {
    setCurrentImageIndex(index);
  };

  const nextSlide = () => {
    setCurrentImageIndex((prev) => (prev + 1) % flightCarouselImages.length);
  };

  const prevSlide = () => {
    setCurrentImageIndex((prev) => (prev - 1 + flightCarouselImages.length) % flightCarouselImages.length);
  };
  
  return (
    <div 
      className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-500 hover:-translate-y-1 border border-slate-100"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Carousel Section */}
      <div className="relative h-40 overflow-hidden">
        {/* Images */}
        {flightCarouselImages.map((img, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-all duration-700 ease-in-out ${
              idx === currentImageIndex 
                ? 'opacity-100 scale-100' 
                : 'opacity-0 scale-110'
            }`}
          >
            <img
              src={img}
              alt={`Flight view ${idx + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
        
        {/* Gradient Overlay for Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 to-indigo-900/20"></div>
        
        {/* Navigation Arrows */}
        <button 
          onClick={prevSlide}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0 duration-300 border border-white/20"
        >
          <i className="fas fa-chevron-left text-white text-[10px]"></i>
        </button>
        <button 
          onClick={nextSlide}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 duration-300 border border-white/20"
        >
          <i className="fas fa-chevron-right text-white text-[10px]"></i>
        </button>
        
        {/* Carousel Dots */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {flightCarouselImages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goToSlide(idx)}
              className={`transition-all duration-300 rounded-full ${
                idx === currentImageIndex 
                  ? 'w-4 h-1.5 bg-white' 
                  : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
        
        {/* Airline Badge - Top Left */}
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-white/95 backdrop-blur-md rounded-xl px-2.5 py-1.5 shadow-lg border border-white/50">
          {flight.airlineLogo ? (
            <img 
              src={flight.airlineLogo} 
              alt={flight.airline}
              className="w-7 h-7 rounded-lg object-contain bg-white p-0.5"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center ${flight.airlineLogo ? 'hidden' : ''}`}>
            <i className="fas fa-plane text-white text-[10px]"></i>
          </div>
          <div>
            <p className="font-bold text-slate-800 text-xs leading-tight">{flight.airline}</p>
            <p className="text-[8px] font-semibold text-blue-600 tracking-wide">{flight.flightNumber}</p>
          </div>
        </div>
        
        {/* Price Badge - Top Right */}
        <div className="absolute top-3 right-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl px-3 py-1.5 shadow-lg">
          <p className="text-base font-black text-white tracking-tight drop-shadow">{flight.priceBreakup.total}</p>
          <p className="text-[7px] font-bold text-emerald-100 uppercase tracking-wider text-center">per person</p>
        </div>
        
        {/* Flight Route - Bottom */}
        <div className="absolute bottom-4 left-3 right-3">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <p className="text-xl font-black text-white drop-shadow tracking-tight">{flight.departureTime}</p>
              <p className="text-[10px] font-semibold text-blue-200 tracking-wide">{flight.departureAirport || 'DEP'}</p>
            </div>
            
            <div className="flex-1 px-3 flex flex-col items-center">
              <div className="flex items-center gap-1 mb-1">
                <i className="fas fa-clock text-[8px] text-blue-300"></i>
                <span className="text-[10px] font-bold text-white drop-shadow">{flight.duration}</span>
              </div>
              <div className="w-full flex items-center gap-0.5">
                <div className="w-2 h-2 bg-blue-400 rounded-full shadow shadow-blue-400/50 animate-pulse"></div>
                <div className="flex-1 h-px bg-gradient-to-r from-blue-400 via-white to-green-400 relative">
                  {flight.stops > 0 && flight.layovers?.slice(0, 2).map((_, idx) => (
                    <div 
                      key={idx}
                      className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-amber-400 rounded-full border border-white"
                      style={{ left: `${((idx + 1) / (flight.stops + 1)) * 100}%` }}
                    />
                  ))}
                </div>
                <div className="w-2 h-2 bg-green-400 rounded-full shadow shadow-green-400/50"></div>
              </div>
              <span className={`text-[8px] font-bold mt-1 px-2 py-0.5 rounded-full ${
                flight.stops === 0 
                  ? 'bg-green-500/90 text-white' 
                  : 'bg-amber-500/90 text-white'
              }`}>
                {stopsLabel}
              </span>
            </div>
            
            <div className="text-right">
              <p className="text-xl font-black text-white drop-shadow tracking-tight">{flight.arrivalTime}</p>
              <p className="text-[10px] font-semibold text-green-200 tracking-wide">{flight.arrivalAirport || 'ARR'}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom Info Section */}
      <div className="px-3 py-2.5 bg-gradient-to-b from-slate-50/80 to-white">
        {/* Layover info */}
        {flight.stops > 0 && flight.layovers && flight.layovers.length > 0 && (
          <div className="mb-2 px-2 py-1.5 bg-amber-50 border border-amber-100 rounded-lg">
            <p className="text-[10px] font-semibold text-amber-700 flex items-center gap-1.5">
              <span className="w-4 h-4 bg-amber-500 rounded flex items-center justify-center">
                <i className="fas fa-exchange-alt text-white text-[7px]"></i>
              </span>
              <span className="text-slate-500">Via:</span>
              <span className="text-amber-800 font-bold">{flight.layovers.slice(0, 2).map(l => l.split(' ')[0]).join(' → ')}</span>
            </p>
          </div>
        )}

        {/* Price Breakdown */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100/80 rounded-lg">
            <i className="fas fa-ticket text-blue-500 text-[10px]"></i>
            <span className="text-[10px] font-medium text-slate-500">Base:</span>
            <span className="text-xs font-bold text-slate-700">{flight.priceBreakup.base}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100/80 rounded-lg">
            <i className="fas fa-receipt text-indigo-500 text-[10px]"></i>
            <span className="text-[10px] font-medium text-slate-500">Taxes:</span>
            <span className="text-xs font-bold text-slate-700">{flight.priceBreakup.taxes}</span>
          </div>
          {flight.aircraft && flight.aircraft !== 'N/A' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50/80 rounded-lg">
              <i className="fas fa-plane text-blue-500 text-[10px]"></i>
              <span className="text-[10px] font-bold text-blue-700">{flight.aircraft}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Animated Shine Effect on Hover */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      </div>
    </div>
  );
};

export default FlightCard;
