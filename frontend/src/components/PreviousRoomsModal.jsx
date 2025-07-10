
import React, { useState, useEffect } from 'react';

const PreviousRoomsModal = ({ onClose, onLoadRoom }) => {
  const [savedRooms, setSavedRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSavedRooms();
  }, []);

  const fetchSavedRooms = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/rooms', {
        credentials: 'include'
      });

      if (response.ok) {
        const rooms = await response.json();
        setSavedRooms(rooms);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to fetch rooms');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadRoom = (room) => {
    if (onLoadRoom) {
      onLoadRoom(room);
    }
    onClose();
  };

  const handleDeleteRoom = async (roomId) => {
    if (!confirm('Are you sure you want to delete this room?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/rooms/${roomId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setSavedRooms(savedRooms.filter(room => room.id !== roomId));
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete room');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 shadow-lg w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4 text-center text-text-primary">Your Saved Room Designs</h2>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="spinner-border" role="status">
              <span className="sr-only">Loading...</span>
            </div>
            <p className="mt-2">Loading your rooms...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500">{error}</p>
            <button
              onClick={fetchSavedRooms}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        ) : savedRooms.length === 0 ? (
          <p className="text-center text-text-secondary py-8">No saved rooms found. Start designing your first room!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedRooms.map((room) => (
              <div key={room.id} className="border p-4 rounded-lg shadow-sm bg-gray-50 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{room.name}</h3>
                  <button
                    onClick={() => handleDeleteRoom(room.id)}
                    className="text-red-500 hover:text-red-700 text-xl"
                    title="Delete room"
                  >
                    ×
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Type:</strong> {room.room_type || room.roomType}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Dimensions:</strong> {room.dimensions?.length}m × {room.dimensions?.width}m × {room.dimensions?.height}m
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Created:</strong> {new Date(room.created_at).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  <strong>Last Updated:</strong> {new Date(room.updated_at).toLocaleDateString()}
                </p>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleLoadRoom(room)}
                    className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium"
                  >
                    Load Room
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-accent-purple text-white hover:bg-purple-600 text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreviousRoomsModal;
