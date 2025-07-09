import React from 'react';
const Header = ({onViewPrevious, user }) => {
  // Compute initials from user name, fallback to "GG"
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "GG";

  return (
    <header className="w-full pt-4 px-2 md:pt-6 md:px-6 mb-8" style={{backdropFilter: 'blur(8px)'}}>
      <div className="w-full rounded-2xl shadow-2xl bg-gradient-to-r from-accent-blue/80 via-accent-purple/70 to-pastel-purple/80 border-b-4 border-accent-purple flex flex-col md:flex-row md:justify-between md:items-center items-center p-4 md:p-6 space-y-4 md:space-y-0">
        {/* Profile Badge */}
        <div className="flex items-center space-x-3 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg mb-2 md:mb-0">
          <div className="w-10 h-10 bg-gradient-to-r from-accent-blue to-accent-purple rounded-full flex items-center justify-center text-white font-semibold">
            {initials}
          </div>
          <span className="text-text-primary font-medium text-base md:text-lg">
            {user?.name || "GalleryGrid"}
          </span>
        </div>

        {/* Header Buttons */}
        <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4 w-full md:w-auto">
          <button onClick={onViewPrevious} className="w-full md:w-auto bg-pastel-blue text-text-secondary px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium hover:bg-soft-blue transition-all">
            📋 View Previous Edited Rooms
          </button>
          <button className="w-full md:w-auto bg-gradient-to-r from-pink-400 to-red-400 text-white px-4 md:px-6 py-2 md:py-3 rounded-xl font-medium text-sm md:text-base hover:from-pink-500 hover:to-red-500 transition-all shadow-lg">
            🚪 Logout
          </button>
        </div>
      </div>
    </header>
  );
}
export default Header;
