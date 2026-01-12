
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="trip-gradient pt-16 pb-32 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        <div className="flex items-center space-x-2 mb-4">
          <i className="fas fa-paper-plane text-4xl text-blue-400"></i>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            SkyBound<span className="text-blue-400">AI</span>
          </h1>
        </div>
        <p className="text-slate-300 text-lg max-w-2xl">
          Transform your travel dreams into professional, data-backed itineraries in seconds. 
          Powered by real-time intelligence.
        </p>
      </div>
    </header>
  );
};

export default Header;
