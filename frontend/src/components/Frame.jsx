import React, { useRef, useState } from 'react';
import { Rnd } from 'react-rnd';

const Frame = ({ x, y, width, height, image, onUpdate, onDelete, bounds, style }) => {
  const inputRef = useRef();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteTimeoutRef = useRef();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onUpdate({ image: url });
  };

  const handleDeleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete();
  };

  // Hide confirmation if user clicks anywhere else
  React.useEffect(() => {
    if (!showDeleteConfirm) return;
    const handleClick = () => setShowDeleteConfirm(false);
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [showDeleteConfirm]);

  return (
    <Rnd
      size={{ width, height }}
      position={{ x, y }}
      bounds="parent"
      minWidth={60}
      minHeight={60}
      onDragStop={(e, d) => onUpdate({ x: d.x, y: d.y })}
      enableResizing={false}
      style={{ zIndex: 2 }}
    >
      <div className={`relative w-full h-full rounded-lg shadow-lg border-4 border-white overflow-hidden bg-white flex items-center justify-center ${!image ? 'border-dashed border-2 border-gray-300' : ''}`}>
        {image ? (
          <img
            src={image}
            alt="Frame"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full">
            <button
              className="px-3 py-1 bg-blue-500 text-white rounded shadow hover:bg-blue-600 text-xs mb-2"
              onClick={() => inputRef.current && inputRef.current.click()}
            >
              Add Image
            </button>
            <span className="text-gray-400 text-xs">Empty Frame</span>
            <input
              type="file"
              accept="image/*"
              ref={inputRef}
              style={{ display: 'none' }}
              onChange={handleImageChange}
            />
          </div>
        )}
        <button
          className={`absolute top-1 right-1 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow transition-all duration-200 bg-red-500 hover:bg-red-600`}
          onClick={handleDeleteClick}
          style={{ zIndex: 3 }}
          title="Delete frame"
        >
          ×
        </button>
      </div>
    </Rnd>
  );
};

export default Frame; 