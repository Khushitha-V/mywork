import React, { useEffect, useState } from 'react';

const PreviousRoomsModal = ({ onClose }) => {
  const [savedRooms, setSavedRooms] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('savedRooms') || '[]');
    setSavedRooms(stored);
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 shadow-lg w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-4 text-center text-text-primary">Previous Room Designs</h2>
        {savedRooms.length === 0 ? (
          <p className="text-center text-text-secondary">No saved rooms found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedRooms.map((room, index) => (
              <div key={index} className="border p-4 rounded-lg shadow-sm bg-gray-50">
                <h3 className="font-semibold mb-2">Room #{index + 1}</h3>
                <p><strong>Dimensions:</strong> {room.dimensions?.length}m x {room.dimensions?.width}m x {room.dimensions?.height}m</p>
                <p><strong>Wall Color:</strong> {room.wallColor}</p>
                <p><strong>Position:</strong> {room.position}</p>
                <p><strong>Images:</strong> {room.images?.length || 0} uploaded</p>
              </div>
            ))}
          </div>
        )}
        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-accent-purple text-white hover:bg-purple-600 text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreviousRoomsModal;
