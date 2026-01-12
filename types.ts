
export enum GroupType {
  FRIENDS = 'Friends',
  FAMILY = 'Family',
  SOLO = 'Solo',
  COUPLE = 'Couple'
}

export enum BudgetLevel {
  ECONOMY = 'Economy',
  STANDARD = 'Standard',
  LUXURY = 'Luxury'
}

export enum FlightClass {
  ECONOMY = 'Economy',
  PREMIUM_ECONOMY = 'Premium Economy',
  BUSINESS = 'Business',
  FIRST = 'First Class'
}

export enum Currency {
  USD = 'USD',
  INR = 'INR'
}

export interface FlightOption {
  airline: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  layovers?: string[];
  airlineLogo?: string;
  aircraft?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  priceBreakup: {
    base: string;
    taxes: string;
    total: string;
  };
}

export interface HotelOption {
  name: string;
  rating: string;
  pricePerNight: string;
  description: string;
  amenities: string[];
}

export interface Activity {
  time: string;
  description: string;
  location: string;
  costEstimate: string;
  category: string;
  imageQuery: string;
  wikipediaTitle?: string;
}

export interface DayPlan {
  day: number;
  title: string;
  activities: Activity[];
}

export interface BestTimeToVisit {
  months: string;
  season: string;
  weather: string;
  crowdLevel: string;
  tip: string;
}

export interface TripPlan {
  destination: string;
  source: string;
  groupType: GroupType;
  budgetLevel: BudgetLevel;
  flightClass: FlightClass;
  currency: Currency;
  members: number;
  durationDays: number;
  totalCostEstimate: string;
  itinerary: DayPlan[];
  heroImage?: string;
  selectedPackingList?: string[];
  selectedEssentials?: string[];
  startDate?: string;
  returnDate?: string;
}

export interface TravelData {
  flights: FlightOption[];
  returnFlights?: FlightOption[];
  hotels: HotelOption[];
  bestTimeToVisit?: BestTimeToVisit;
  tripPlan: TripPlan;
}

// Import airports from the auto-generated file
import { AIRPORTS } from './airports';

// Export MAJOR_CITIES as a sorted version of AIRPORTS for backward compatibility
export const MAJOR_CITIES = AIRPORTS.sort((a, b) => a.name.localeCompare(b.name));

export function getCityByCode(codeOrName: string) {
  const code = (codeOrName || '').trim().toUpperCase();
  if (!code) return null;
  return MAJOR_CITIES.find(c => c.code.toUpperCase() === code) || null;
}

export function getCityDisplayName(codeOrName: string): string {
  const found = getCityByCode(codeOrName);
  const raw = found?.name || (codeOrName || '').trim();
  // Strip trailing "(XXX)" when present
  return raw.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

export function getAirportCode(codeOrName: string): string {
  const input = (codeOrName || '').trim();
  
  // If it's already a 3-letter IATA code, return it uppercase
  if (/^[A-Za-z]{3}$/.test(input)) return input.toUpperCase();
  
  // Extract code from "City Name (XXX)" format
  const parenMatch = input.match(/\(([A-Za-z]{3})\)/);
  if (parenMatch) return parenMatch[1].toUpperCase();
  
  // Try to find airport by searching the code field
  const upperInput = input.toUpperCase();
  const byCode = MAJOR_CITIES.find(c => c.code.toUpperCase() === upperInput);
  if (byCode) return byCode.code;
  
  // Try to find by city name (partial match)
  const byName = MAJOR_CITIES.find(c => 
    c.name.toLowerCase().includes(input.toLowerCase()) ||
    input.toLowerCase().includes(c.name.toLowerCase().split(',')[0])
  );
  if (byName) return byName.code;
  
  // Return first 3 uppercase letters as fallback
  const letters = input.replace(/[^A-Za-z]/g, '').toUpperCase();
  return letters.substring(0, 3) || 'XXX';
}
