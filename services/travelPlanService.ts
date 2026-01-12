import { TravelData, GroupType, BudgetLevel, FlightClass, Currency } from "../types";

export async function generateTravelPlan(params: {
  source: string,
  destination: string,
  members: number,
  groupType: GroupType,
  budgetLevel: BudgetLevel,
  flightClass: FlightClass,
  currency: Currency,
  hotelRating: string,
  activities: string,
  packingList: string[],
  essentials: string[],
  days: number,
  startDate: string
}): Promise<TravelData> {
  const response = await fetch('/api/travel-plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Grok request failed: ${response.status}`);
  }

  const travelData = (await response.json()) as TravelData;

  if (!travelData?.tripPlan?.itinerary) {
    throw new Error('Invalid response format: Missing tripPlan/itinerary');
  }

  if (!travelData.tripPlan.heroImage) {
    travelData.tripPlan.heroImage = `https://source.unsplash.com/1600x900/?${encodeURIComponent(travelData.tripPlan.destination)}%20skyline`;
  }

  return travelData;
}
