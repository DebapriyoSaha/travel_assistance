
import streamlit as st
import json
import requests
import os
# from serpapi import GoogleSearch 
from dotenv import load_dotenv
from urllib.parse import quote
from agno.agent import Agent
from langchain.agents import Tool
from langchain_community.tools.tavily_search import TavilySearchResults
# from agno.models.google import Gemini
from datetime import date, timedelta, datetime
# from huggingface_hub import login

from agno.models.groq import Groq
from agno.tools.duckduckgo import DuckDuckGoTools

from agno.models.huggingface import HuggingFace

load_dotenv()

# HF_TOKEN = os.getenv("HF_TOKEN")
# login(token=HF_TOKEN)

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

tavily_tool = TavilySearchResults(tavily_api_key=TAVILY_API_KEY)

model_id = "mistralai/Mistral-7B-Instruct-v0.3"
# model_id = "meta-llama/Llama-3.3-70B-Instruct"

def TavilySearch(query: str) -> str:
    return tavily_tool.run(query)


# Set up Streamlit UI with a travel-friendly theme
st.set_page_config(page_title="🌍 AI Travel Planner", layout="wide")
st.markdown(
    """
    <style>
        .title {
            text-align: center;
            font-size: 36px;
            font-weight: bold;
            color: #ff5733;
        }
        .subtitle {
            text-align: center;
            font-size: 20px;
            color: #555;
        }
        .stSlider > div {
            background-color: #f9f9f9;
            padding: 10px;
            border-radius: 10px;
        }
    </style>
    """,
    unsafe_allow_html=True,
)

# Title and subtitle
st.markdown('<h1 class="title">✈️ AI-Powered Travel Planner</h1>', unsafe_allow_html=True)
st.markdown('<p class="subtitle">Plan your dream trip with AI! Get personalized recommendations for flights, hotels, and activities.</p>', unsafe_allow_html=True)

# User Inputs Section
# st.markdown("### 🌍 Where are you headed?")
# source = st.text_input("🛫 Departure City (IATA Code):", "BOM")  # Example: BOM for Mumbai
# destination = st.text_input("🛬 Destination (IATA Code):", "DEL")  # Example: DEL for Delhi

# List of airports with city and IATA code
airports = [
    {"city": "Mumbai", "iata": "BOM"},
    {"city": "Delhi", "iata": "DEL"},
    {"city": "Bengaluru", "iata": "BLR"},
    {"city": "Chennai", "iata": "MAA"},
    {"city": "Kolkata", "iata": "CCU"},
    {"city": "Hyderabad", "iata": "HYD"},
    {"city": "Ahmedabad", "iata": "AMD"},
    {"city": "Pune", "iata": "PNQ"},
    {"city": "Goa", "iata": "GOI"},
    {"city": "Jaipur", "iata": "JAI"},
    {"city": "Lucknow", "iata": "LKO"},
    {"city": "Patna", "iata": "PAT"},
    {"city": "Indore", "iata": "IDR"},
    {"city": "Coimbatore", "iata": "CJB"},
    {"city": "Nagpur", "iata": "NAG"},
    {"city": "Kochi", "iata": "COK"},
    {"city": "Thiruvananthapuram", "iata": "TRV"},
    {"city": "Bhubaneswar", "iata": "BBI"},
    {"city": "Varanasi", "iata": "VNS"},
    {"city": "Srinagar", "iata": "SXR"},
    {"city": "Amritsar", "iata": "ATQ"},
    {"city": "Raipur", "iata": "RPR"},
    {"city": "Ranchi", "iata": "IXR"},
    {"city": "Guwahati", "iata": "GAU"},
    {"city": "Chandigarh", "iata": "IXC"},
    {"city": "Visakhapatnam", "iata": "VTZ"},
    {"city": "Madurai", "iata": "IXM"},
    {"city": "Dehradun", "iata": "DED"},
    {"city": "Agartala", "iata": "IXA"},
    {"city": "Imphal", "iata": "IMF"},
    {"city": "Leh", "iata": "IXL"},
    {"city": "Jammu", "iata": "IXJ"},
    {"city": "Port Blair", "iata": "IXZ"},
    {"city": "Tiruchirappalli", "iata": "TRZ"},
    {"city": "Mangaluru", "iata": "IXE"},
    {"city": "Vadodara", "iata": "BDQ"},
    {"city": "Rajkot", "iata": "RAJ"},
    {"city": "Aurangabad", "iata": "IXU"},
    {"city": "Bhopal", "iata": "BHO"},
    {"city": "Gaya", "iata": "GAY"},
    {"city": "Jodhpur", "iata": "JDH"},
    {"city": "Udaipur", "iata": "UDR"},
    {"city": "Bagdogra", "iata": "IXB"},
    {"city": "Dibrugarh", "iata": "DIB"},
    {"city": "Silchar", "iata": "IXS"},
    {"city": "Jorhat", "iata": "JRH"},
    {"city": "Tezpur", "iata": "TEZ"},
    {"city": "Lilabari", "iata": "IXI"},
    {"city": "Shillong", "iata": "SHL"},
    {"city": "Aizawl", "iata": "AJL"},
    {"city": "Dimapur", "iata": "DMU"},
    {"city": "Agra", "iata": "AGR"},
    {"city": "Kanpur", "iata": "KNU"},
    {"city": "Bareilly", "iata": "BEK"},
    {"city": "Jabalpur", "iata": "JLR"},
    {"city": "Gwalior", "iata": "GWL"},
    {"city": "Durgapur", "iata": "RDP"},
    {"city": "Kozhikode", "iata": "CCJ"},
    {"city": "Salem", "iata": "SXV"},
    {"city": "Tuticorin", "iata": "TCR"},
    {"city": "Belgaum", "iata": "IXG"},
    {"city": "Hubli", "iata": "HBX"},
    {"city": "Kolhapur", "iata": "KLH"},
    {"city": "Nashik", "iata": "ISK"},
    {"city": "Solapur", "iata": "SSE"},
    {"city": "Jamnagar", "iata": "JGA"},
    {"city": "Bhuj", "iata": "BHJ"},
    {"city": "Surat", "iata": "STV"},
    {"city": "Tirupati", "iata": "TIR"},
    {"city": "Vijayawada", "iata": "VGA"},
    {"city": "Warangal", "iata": "WGC"},
    {"city": "Kurnool", "iata": "KJB"},
    {"city": "Kadapa", "iata": "CDP"},
    {"city": "Nanded", "iata": "NDC"},
    {"city": "Akola", "iata": "AKD"},
    {"city": "Latur", "iata": "LTU"},
    {"city": "Sindhudurg", "iata": "SDW"},
    {"city": "Ratnagiri", "iata": "RTC"},
    {"city": "Diu", "iata": "DIU"},
    {"city": "Daman", "iata": "NMB"},
    {"city": "Pondicherry", "iata": "PNY"},
    {"city": "Agatti", "iata": "AGX"},
    {"city": "Kavaratti", "iata": "KVA"},
    {"city": "Kangra", "iata": "DHM"},
    {"city": "Kullu", "iata": "KUU"},
    {"city": "Shimla", "iata": "SLV"},
    {"city": "Pantnagar", "iata": "PGH"},
    {"city": "Pithoragarh", "iata": "NNS"},
    {"city": "Kishangarh", "iata": "KQH"},
    {"city": "Bikaner", "iata": "BKB"},
    {"city": "Jaisalmer", "iata": "JSA"},
    {"city": "Kota", "iata": "KTU"},
]

# Dropdown options as "City (IATA)"
airport_options = [f"{a['city']} ({a['iata']})" for a in airports]

# User Inputs Section
st.markdown("### 🌍 Where are you headed?")
source_option = st.selectbox("🛫 Departure City:", airport_options, index=airport_options.index("Mumbai (BOM)"))
destination_option = st.selectbox("🛬 Destination City:", airport_options, index=airport_options.index("Delhi (DEL)"))

# Extract IATA codes from selection
source = source_option.split("(")[-1][:-1]
destination = destination_option.split("(")[-1][:-1]

st.markdown("### 📅 Plan Your Adventure")
num_days = st.slider("🕒 Trip Duration (days):", 1, 14, 5)
travel_theme = st.selectbox(
    "🎭 Select Your Travel Theme:",
    ["💑 Couple Getaway", "👨‍👩‍👧‍👦 Family Vacation", "🏔️ Adventure Trip", "🧳 Solo Exploration"]
)

# Divider for aesthetics
st.markdown("---")

st.markdown(
    f"""
    <div style="
        text-align: center; 
        padding: 15px; 
        background-color: #c2b280; 
        border-radius: 10px; 
        margin-top: 20px;
    ">
        <h3>🌟 Your {travel_theme} to {destination} is about to begin! 🌟</h3>
        <p>Let's find the best flights, stays, and experiences for your unforgettable journey.</p>
    </div>
    """,
    unsafe_allow_html=True,
)

def format_datetime(iso_string):
    try:
        dt = datetime.strptime(iso_string, "%Y-%m-%d %H:%M")
        return dt.strftime("%b-%d, %Y | %I:%M %p")  # Example: Mar-06, 2025 | 6:20 PM
    except:
        return "N/A"

activity_preferences = st.text_area(
    "🌍 What activities do you enjoy? (e.g., relaxing on the beach, exploring historical sites, nightlife, adventure)",
    "Relaxing on the beach, exploring historical sites"
)

# Default values
default_departure = date.today() + timedelta(days=1)
default_return = date.today() + timedelta(days=5)

# Date inputs with defaults
departure_date = st.date_input("Departure Date", value=default_departure, min_value=date.today())
return_date = st.date_input("Return Date", value=default_return, min_value=date.today())

# Validation flags
dates_valid = True

if departure_date == return_date:
    st.error("❌ Departure and return date cannot be the same.")
    dates_valid = False
elif departure_date > return_date:
    st.error("❌ Departure date cannot be after the return date.")
    dates_valid = False

# Sidebar Setup
st.sidebar.title("🌎 Travel Assistant")
st.sidebar.subheader("Personalize Your Trip")

# Travel Preferences
budget = st.sidebar.radio("💰 Budget Preference:", ["Economy", "Standard", "Luxury"])
flight_class = st.sidebar.radio("✈️ Flight Class:", ["Economy", "Business", "First Class"])
hotel_rating = st.sidebar.selectbox("🏨 Preferred Hotel Rating:", ["Any", "3⭐", "4⭐", "5⭐"])

# Packing Checklist
st.sidebar.subheader("🎒 Packing Checklist")
packing_list = {
    "👕 Clothes": True,
    "🩴 Comfortable Footwear": True,
    "🕶️ Sunglasses & Sunscreen": False,
    "📖 Travel Guidebook": False,
    "💊 Medications & First-Aid": True
}
for item, checked in packing_list.items():
    st.sidebar.checkbox(item, value=checked)

# Travel Essentials
st.sidebar.subheader("🛂 Travel Essentials")
visa_required = st.sidebar.checkbox("🛃 Check Visa Requirements")
travel_insurance = st.sidebar.checkbox("🛡️ Get Travel Insurance")
currency_converter = st.sidebar.checkbox("💱 Currency Exchange Rates")


def fetch_flights(source, destination, departure_date, return_date, flight_class):
    url = "https://sky-scanner3.p.rapidapi.com/flights/search-roundtrip"

    querystring = {"fromEntityId":source,
                   "toEntityId": destination,
                   "departDate":departure_date,
                   "returnDate":return_date,
                   "market":"IN",
                   "currency":"INR",
                   "stops":"direct",
                   "adults":"1",
                   "cabinClass":flight_class}

    headers = {
	"x-rapidapi-key": "001e4c7098mshbfc01f99ee0ab59p126902jsn76fad3cedad3",
	"x-rapidapi-host": "sky-scanner3.p.rapidapi.com"
}

    response = requests.get(url, headers=headers, params=querystring)

    if response.status_code == 200:
        return response.json()
    else:
        print("❌ Error fetching flight data:", response.status_code)
        return {}

def format_datetime(iso_str: str) -> str:
    try:
        dt = datetime.fromisoformat(iso_str)
        return dt.strftime("%d %b %Y, %I:%M %p")
    except Exception as e:
        return "Invalid date"


def extract_cheapest_flights(flight_data, top_n=3, direct_only=False):
    itineraries = flight_data.get("data", {}).get("itineraries", [])
    
    # Filter for direct flights if required
    if direct_only:
        itineraries = [f for f in itineraries if f.get('stops') == 'Direct']

    # Sort by total price (safe fallback to avoid KeyErrors)
    sorted_flights = sorted(
        itineraries,
        key=lambda f: f.get('price', {}).get('raw', float('inf'))
    )
    return sorted_flights[:top_n]


def generate_booking_link(origin_code, dest_code, depart_date, return_date=None, flight_class="economy"):
    base_url = "https://www.ixigo.com/search/result/flight"

    def format_date(d):
        return datetime.fromisoformat(d).strftime("%d%m%Y")

    date = format_date(depart_date)
    return_dt = format_date(return_date) if return_date else ""

    if flight_class.lower() == "business":
        class_code = "b"
    elif flight_class.lower() == "first class":
        class_code = "w"
    else:
        class_code = "e"

    query = f"?from={quote(origin_code)}&to={quote(dest_code)}&date={date}&adults=1&children=0&infants=0&class={class_code}&source=Search+Form&hbs=true"

    if return_dt:
        query += f"&returnDate={return_dt}"

    return base_url + query



# AI Agents
researcher = Agent(
    name="Researcher",
    instructions=[
        "Identify the travel destination specified by the user.",
        "Gather detailed information on the destination, including climate, culture, and safety tips.",
        "Find popular attractions, landmarks, and must-visit places.",
        "Search for activities that match the user’s interests and travel style.",
        "Prioritize information from reliable sources and official travel guides.",
        "Provide well-structured summaries with key insights and recommendations."
    ],
    # model=HuggingFace(
    #     id=model_id, max_tokens=4096, temperature=0
    # ),

    # model=Gemini(id="gemini-2.0-flash-exp"),
    model=Groq(id="llama-3.3-70b-versatile",api_key=GROQ_API_KEY),
    tools=[DuckDuckGoTools()],
    # tools=[SerpApiTools(api_key=SERPAPI_KEY)],
    # tools=[TavilySearch],
    add_datetime_to_instructions=True,
)

planner = Agent(
    name="Planner",
    instructions=[
        "Gather details about the user's travel preferences and budget.",
        "Create a detailed itinerary with scheduled activities and estimated costs.",
        "Show the cost in INR only.",
        "Ensure the itinerary includes transportation options and travel time estimates.",
        "Optimize the schedule for convenience and enjoyment.",
        "Present the itinerary in a structured format."
    ],
    # model=Gemini(id="gemini-2.0-flash-exp"),
    add_datetime_to_instructions=True,
    model=Groq(id="llama-3.3-70b-versatile",api_key=GROQ_API_KEY),
    # model=HuggingFace(
    #     id=model_id, max_tokens=4096, temperature=0
    # ),
    # tools=[DuckDuckGoTools()]
)

hotel_restaurant_finder = Agent(
    name="Hotel & Restaurant Finder",
    instructions=[
        "Identify key locations in the user's travel itinerary.",
        "Search for highly rated hotels near those locations.",
        "Search for top-rated restaurants based on cuisine preferences and proximity.",
        "Prioritize results based on user preferences, ratings, and availability.",
        "Provide direct booking links or reservation options where possible."
    ],
    # model=Gemini(id="gemini-2.0-flash-exp"),
    # tools=[SerpApiTools(api_key=SERPAPI_KEY)],
    # tools=[TavilySearch],
    # model=HuggingFace(
    #     id=model_id, max_tokens=4096, temperature=0
    # ),
    add_datetime_to_instructions=True,
    model=Groq(id="llama-3.3-70b-versatile",api_key=GROQ_API_KEY),
    tools=[DuckDuckGoTools()]
)

if dates_valid:
    # Generate Travel Plan
    if st.button("🚀 Generate Travel Plan"):
        with st.spinner("✈️ Fetching best flight options..."):
            flight_data = fetch_flights(source, destination, departure_date, return_date,flight_class)
            cheapest_flights = extract_cheapest_flights(flight_data)

        # AI Processing
        with st.spinner("🔍 Researching best attractions & activities..."):
            research_prompt = (
                f"Research the best attractions and activities in {destination} for a {num_days}-day {travel_theme.lower()} trip. "
                f"The traveler enjoys: {activity_preferences}. Budget: {budget}. Flight Class: {flight_class}. "
                f"Hotel Rating: {hotel_rating}. Visa Requirement: {visa_required}. Travel Insurance: {travel_insurance}."
            )
            research_results = researcher.run(research_prompt, stream=False)

        with st.spinner("🏨 Searching for hotels & restaurants..."):
            hotel_restaurant_prompt = (
                f"Find the best hotels and restaurants near popular attractions in {destination} for a {travel_theme.lower()} trip. "
                f"Budget: {budget}. Hotel Rating: {hotel_rating}. Preferred activities: {activity_preferences}."
            )
            hotel_restaurant_results = hotel_restaurant_finder.run(hotel_restaurant_prompt, stream=False)

        with st.spinner("🗺️ Creating your personalized itinerary..."):
            planning_prompt = (
                f"Based on the following data, create a {num_days}-day itinerary for a {travel_theme.lower()} trip to {destination}. "
                f"The traveler enjoys: {activity_preferences}. Budget: {budget}. Flight Class: {flight_class}. Hotel Rating: {hotel_rating}. "
                f"Visa Requirement: {visa_required}. Travel Insurance: {travel_insurance}. Research: {research_results.content}. "
                f"Flights: {json.dumps(cheapest_flights)}. Hotels & Restaurants: {hotel_restaurant_results.content}."
            )
            itinerary = planner.run(planning_prompt, stream=False)

        # Display Results
        st.subheader("✈️ Cheapest Flight Options")
        if cheapest_flights:
            cols = st.columns(len(cheapest_flights))
            for idx, flight in enumerate(cheapest_flights):
                with cols[idx]:
                    # General info
                    price = flight.get('price', {}).get('raw', 0)
                    formatted_price = flight.get('price', {}).get('formatted', '₹0')
                    
                    onward = flight.get('legs', [])[0]
                    ret = flight.get('legs', [])[1]

                    # Airline details (assuming same for both legs)
                    airline_name = onward.get('carriers', {}).get('marketing', [{}])[0].get('name', 'Unknown Airline')
                    flight_code = onward.get('carriers', {}).get('marketing', [{}])[0].get('alternateId', 'N/A').upper()
                    airline_logo = onward.get('carriers', {}).get('marketing', [{}])[0].get('logoUrl', '')

                    # Onward flight details
                    departure_city = onward.get('origin', {}).get('city', 'Unknown')
                    arrival_city = onward.get('destination', {}).get('city', 'Unknown')
                    origin_code = onward.get('origin', {}).get('displayCode', 'N/A')
                    dest_code = onward.get('destination', {}).get('displayCode', 'N/A')
                    departure_time = format_datetime(onward.get('departure', ''))
                    arrival_time = format_datetime(onward.get('arrival', ''))
                    flight_duration = f"{onward.get('durationInMinutes', 0)} mins"

                    # Return flight details
                    return_departure_city = ret.get('origin', {}).get('city', 'Unknown')
                    return_arrival_city = ret.get('destination', {}).get('city', 'Unknown')
                    return_departure_code = ret.get('origin', {}).get('displayCode', 'N/A')
                    return_arrival_code = ret.get('destination', {}).get('displayCode', 'N/A')
                    return_departure_time = format_datetime(ret.get('departure', ''))
                    return_arrival_time = format_datetime(ret.get('arrival', ''))
                    return_duration = f"{ret.get('durationInMinutes', 0)} mins"

                    booking_link = generate_booking_link(
                    origin_code,
                    dest_code,
                    onward.get('departure', ''),
                    return_date=ret.get('departure', ''),
                    flight_class="economy"
                    )
    
                    st.markdown(
                            f"""
                            <div style="
                                border-radius: 10px;
                                padding: 12px;
                                background-color: #f8f9fa;
                                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
                                font-family: 'Segoe UI', sans-serif;
                                color: #212529;
                                margin: 10px auto;
                                border: 1px solid #dee2e6;
                                max-width: 500px;
                            ">
                                <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 8px;">
                                    <img src="{airline_logo}" alt="{airline_name} Logo" width="40" style="flex-shrink: 0;" />
                                    <div style="text-align: center;">
                                        <h3 style="margin: 0; color: #343a40; font-size: 16px; line-height: 1.2;">{airline_name}</h3>
                                        <p style="color: #6c757d; font-size: 11px; margin: 2px 0 0 0;">Flight: <strong>{flight_code}</strong></p>
                                    </div>
                                </div>
                                <hr style="border: none; border-top: 1px solid #dee2e6; margin: 10px auto; width: 90%;" />
                                <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
                                    <div style="text-align: left; min-width: 180px;">
                                        <h4 style="color: #007bff; margin: 6px 0; font-size: 14px;">🛫 Onward</h4>
                                        <p style="margin: 4px 0; font-size: 12px;"><strong>From:</strong> {departure_city} ({origin_code})</p>
                                        <p style="margin: 4px 0; font-size: 12px;"><strong>To:</strong> {arrival_city} ({dest_code})</p>
                                        <p style="margin: 4px 0; font-size: 12px;"><strong>Depart:</strong> {departure_time}</p>
                                        <p style="margin: 4px 0; font-size: 12px;"><strong>Arrive:</strong> {arrival_time}</p>
                                        <p style="margin: 4px 0; font-size: 12px;"><strong>Duration:</strong> {flight_duration}</p>
                                    </div>
                                    <div style="text-align: left; min-width: 180px;">
                                        <h4 style="color: #17a2b8; margin: 6px 0; font-size: 14px;">🔁 Return</h4>
                                        <p style="margin: 4px 0; font-size: 12px;"><strong>From:</strong> {arrival_city} ({dest_code})</p>
                                        <p style="margin: 4px 0; font-size: 12px;"><strong>To:</strong> {departure_city} ({origin_code})</p>
                                        <p style="margin: 4px 0; font-size: 12px;"><strong>Depart:</strong> {return_departure_time}</p>
                                        <p style="margin: 4px 0; font-size: 12px;"><strong>Arrive:</strong> {return_arrival_time}</p>
                                        <p style="margin: 4px 0; font-size: 12px;"><strong>Duration:</strong> {return_duration}</p>
                                    </div>
                                </div>
                                <div style="text-align: center; margin-top: 12px;">
                                    <div style="display: inline-block; background: #e8f4ff; padding: 6px 12px; border-radius: 20px;">
                                        <span style="color: #28a745; font-size: 18px; font-weight: bold;">₹{price:,.0f}</span>
                                    </div>
                                    <div style="margin-top: 8px;">
                                        <a href="{booking_link}" target="_blank" style="
                                            background-color: #007bff;
                                            color: white;
                                            padding: 6px 16px;
                                            text-decoration: none;
                                            border-radius: 20px;
                                            font-weight: bold;
                                            font-size: 12px;
                                            transition: background-color 0.2s;
                                            display: inline-block;
                                        "onmouseover="this.style.backgroundColor='#0069d9'" 
                                        onmouseout="this.style.backgroundColor='#007bff'">Book Now</a>
                                    </div>
                                </div>
                            </div>
                            """, 
                            unsafe_allow_html=True
                        )



        else:
            st.warning("⚠️ No flights found.")


        st.subheader("🏨 Hotels & Restaurants")
        st.write(hotel_restaurant_results.content)

        st.subheader("🗺️ Your Personalized Itinerary")
        st.write(itinerary.content)

        st.success("✅ Travel plan generated successfully!")
else:
    st.warning("⚠️ Please correct the date errors before generating the travel plan.")        

st.markdown("---")
st.markdown("📝 Developed by [Debapriyo Saha](https://www.linkedin.com/in/debapriyo-saha/)")