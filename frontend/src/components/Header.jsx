import React from 'react';

const Header = ({onViewPrevious, onSaveRoom, onNewRoom, onDownloadWalls, user, onLogout}) => {
  return (
    <header className="glass-effect shadow-lg border-b border-white/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Room Designer
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
                onClick={onNewRoom}
                className="w-full bg-pastel-pink text-text-primary p-3 rounded-lg font-medium hover:bg-soft-pink transition-all"
              >
                🔄 Reset Room
              </button>
            <button
                onClick={onSaveRoom}
                className="w-full bg-pastel-blue text-text-primary p-3 rounded-lg font-medium hover:bg-soft-blue transition-all"
              >
                💾 Save Room
              </button>
            
            <button
                onClick={onDownloadWalls}
                className="w-full bg-gradient-to-r from-green-400 to-teal-400 text-white p-3 rounded-lg font-medium hover:from-green-500 hover:to-teal-500 transition-all"
              >
                📥 Download
              </button>
            
            <button
                onClick={onViewPrevious}
                className="w-full bg-pastel-blue text-text-primary p-3 rounded-lg font-medium hover:bg-soft-pink transition-all"
              >
               🏠 My Rooms
              </button>
            
            {user && (
              <div className="flex items-center space-x-3">
                <span className="text-gray-700 font-medium">
                  Welcome, {user.username}!
                </span>
                <button
                  onClick={onLogout}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
