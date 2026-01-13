
import React, { useState, useEffect } from 'react';
import { HotelOption } from '../types';

interface HotelCardProps {
  hotel: HotelOption;
}

// Fallback images if API fails
const fallbackImages = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80',
  'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
];

// Amenity icon mapping
const getAmenityIcon = (amenity: string): string => {
  const lower = amenity.toLowerCase();
  if (lower.includes('wifi') || lower.includes('internet')) return 'fa-wifi';
  if (lower.includes('pool') || lower.includes('swimming')) return 'fa-swimming-pool';
  if (lower.includes('spa') || lower.includes('wellness')) return 'fa-spa';
  if (lower.includes('gym') || lower.includes('fitness')) return 'fa-dumbbell';
  if (lower.includes('restaurant') || lower.includes('dining')) return 'fa-utensils';
  if (lower.includes('bar') || lower.includes('lounge')) return 'fa-glass-martini-alt';
  if (lower.includes('parking')) return 'fa-parking';
  if (lower.includes('breakfast')) return 'fa-coffee';
  if (lower.includes('air') || lower.includes('ac')) return 'fa-snowflake';
  if (lower.includes('room service')) return 'fa-concierge-bell';
  if (lower.includes('laundry')) return 'fa-tshirt';
  if (lower.includes('beach')) return 'fa-umbrella-beach';
  return 'fa-check';
};

const HotelCard: React.FC<HotelCardProps> = ({ hotel }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [hotelImages, setHotelImages] = useState<string[]>(fallbackImages);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Fetch actual hotel images from Unsplash
  useEffect(() => {
    const fetchHotelImages = async () => {
      try {
        const searchQuery = `${hotel.name} hotel`;
        const response = await fetch(`/api/unsplash-search?query=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          const images = data.results.slice(0, 3).map((img: any) => 
            img.urls?.regular || img.urls?.small || fallbackImages[0]
          );
          setHotelImages(images.length >= 3 ? images : [...images, ...fallbackImages].slice(0, 3));
        }
      } catch (error) {
        console.log('Using fallback images for hotel');
      } finally {
        setImagesLoaded(true);
      }
    };

    fetchHotelImages();
  }, [hotel.name]);

  // Auto-rotate carousel
  useEffect(() => {
    if (!isHovered) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % hotelImages.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isHovered, hotelImages.length]);

  const goToSlide = (index: number) => {
    setCurrentImageIndex(index);
  };

  const nextSlide = () => {
    setCurrentImageIndex((prev) => (prev + 1) % hotelImages.length);
  };

  const prevSlide = () => {
    setCurrentImageIndex((prev) => (prev - 1 + hotelImages.length) % hotelImages.length);
  };

  // Parse rating to show stars
  const ratingNum = parseFloat(hotel.rating) || 4;
  const fullStars = Math.floor(ratingNum);
  const hasHalfStar = ratingNum % 1 >= 0.5;

  return (
    <div 
      className="group relative bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-lg hover:shadow-xl hover:shadow-indigo-100/50 transition-all duration-500 hover:-translate-y-1 border border-slate-100"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Carousel Section */}
      <div className="relative h-28 sm:h-36 overflow-hidden">
        {/* Loading shimmer */}
        {!imagesLoaded && (
          <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse"></div>
        )}
        
        {/* Images */}
        {hotelImages.map((img, idx) => (
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
              alt={`${hotel.name} - View ${idx + 1}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = fallbackImages[idx] || fallbackImages[0];
              }}
            />
          </div>
        ))}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/30 to-purple-900/20"></div>
        
        {/* Navigation Arrows */}
        <button 
          onClick={prevSlide}
          className="absolute left-1.5 sm:left-2 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0 duration-300 border border-white/20"
        >
          <i className="fas fa-chevron-left text-white text-[7px] sm:text-[8px]"></i>
        </button>
        <button 
          onClick={nextSlide}
          className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 duration-300 border border-white/20"
        >
          <i className="fas fa-chevron-right text-white text-[7px] sm:text-[8px]"></i>
        </button>
        
        {/* Carousel Dots */}
        <div className="absolute bottom-1.5 sm:bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5 sm:gap-1">
          {hotelImages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goToSlide(idx)}
              className={`transition-all duration-300 rounded-full ${
                idx === currentImageIndex 
                  ? 'w-2.5 h-1 sm:w-3 sm:h-1 bg-white' 
                  : 'w-1 h-1 bg-white/50 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
        
        {/* Rating Badge - Top Left */}
        <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 flex items-center gap-0.5 sm:gap-1 bg-white/95 backdrop-blur-md rounded-md sm:rounded-lg px-1.5 py-0.5 sm:px-2 sm:py-1 shadow-lg">
          <div className="flex items-center">
            {[...Array(fullStars)].map((_, i) => (
              <i key={i} className="fas fa-star text-amber-400 text-[7px] sm:text-[8px]"></i>
            ))}
            {hasHalfStar && <i className="fas fa-star-half-alt text-amber-400 text-[7px] sm:text-[8px]"></i>}
          </div>
          <span className="text-[9px] sm:text-[10px] font-black text-slate-700">{hotel.rating}</span>
        </div>
        
        {/* Price Badge - Top Right */}
        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-md sm:rounded-lg px-2 py-0.5 sm:px-2.5 sm:py-1 shadow-lg">
          <p className="text-xs sm:text-sm font-black text-white tracking-tight drop-shadow">{hotel.pricePerNight}</p>
          <p className="text-[5px] sm:text-[6px] font-bold text-indigo-100 uppercase tracking-wider text-center">/night</p>
        </div>
        
        {/* Hotel Name - Bottom */}
        <div className="absolute bottom-2 sm:bottom-3 left-1.5 right-1.5 sm:left-2 sm:right-2">
          <h4 className="text-xs sm:text-sm font-black text-white drop-shadow leading-tight line-clamp-1">{hotel.name}</h4>
        </div>
      </div>
      
      {/* Bottom Info Section */}
      <div className="px-2 py-2 sm:px-3 sm:py-2.5 bg-gradient-to-b from-slate-50/80 to-white">
        {/* Description */}
        <p className="text-[9px] sm:text-[10px] text-slate-600 leading-relaxed line-clamp-2 mb-1.5 sm:mb-2">{hotel.description}</p>
        
        {/* Amenities */}
        <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-1.5 sm:mb-2">
          {hotel.amenities?.slice(0, 4).map((amenity, i) => (
            <span 
              key={i} 
              className="flex items-center gap-0.5 sm:gap-1 text-[7px] sm:text-[8px] bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-sm sm:rounded-md text-indigo-700 font-semibold"
            >
              <i className={`fas ${getAmenityIcon(amenity)} text-[6px] sm:text-[7px] text-indigo-500`}></i>
              {amenity}
            </span>
          ))}
          {hotel.amenities && hotel.amenities.length > 4 && (
            <span className="text-[7px] sm:text-[8px] bg-slate-100 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-sm sm:rounded-md text-slate-500 font-semibold">
              +{hotel.amenities.length - 4} more
            </span>
          )}
        </div>
        
        {/* Price Footer */}
        <div className="flex items-center justify-between pt-1.5 sm:pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1">
            <i className="fas fa-user text-[7px] sm:text-[8px] text-indigo-400"></i>
            <span className="text-[7px] sm:text-[8px] text-slate-500 font-medium">per person / night</span>
          </div>
          <div className="flex items-center gap-1 text-indigo-600">
            <i className="fas fa-bed text-[8px] sm:text-[10px]"></i>
            <span className="text-[8px] sm:text-[9px] font-bold">Available</span>
          </div>
        </div>
      </div>
      
      {/* Animated Shine Effect on Hover */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl sm:rounded-2xl">
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      </div>
    </div>
  );
};

export default HotelCard;
