import React, { useState, useEffect } from 'react';

const RoomDimensionModal = ({ onClose, onSave, initialValues }) => {
  const [dimensions, setDimensions] = useState({ length: '', width: '', height: '' });

  useEffect(() => {
    if (initialValues) setDimensions(initialValues);
  }, [initialValues]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDimensions(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(dimensions);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-4 md:p-6 shadow-lg w-full max-w-xs md:max-w-md mx-2">
        <h2 className="text-lg md:text-2xl font-bold mb-4 text-center text-text-primary">Set Room Dimensions (in feet)</h2>
        <div className="space-y-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-secondary mb-1">Length (feet)</label>
            <input
              type="number"
              name="length"
              value={dimensions.length}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-all"
              placeholder="Enter length in feet"
              min={1}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-secondary mb-1">Width (feet)</label>
            <input
              type="number"
              name="width"
              value={dimensions.width}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-all"
              placeholder="Enter width in feet"
              min={1}
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-secondary mb-1">Height (feet)</label>
            <input
              type="number"
              name="height"
              value={dimensions.height}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-all"
              placeholder="Enter height in feet"
              min={1}
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-accent-blue text-white hover:bg-blue-600 text-sm font-medium"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomDimensionModal;
