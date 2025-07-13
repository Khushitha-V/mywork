import React, { useState, useEffect, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';

const ROOM_OPTIONS = [
  { label: 'Living Room', value: 'livingroom' },
  { label: 'Bedroom', value: 'bedroom' },
  { label: 'Kitchen', value: 'kitchen' },
  { label: 'Others', value: 'others' },
];

const colorMap = {
  blue: '#60a5fa',
  purple: '#a78bfa',
  pink: '#f472b6',
  green: '#34d399',
  yellow: '#fde68a',
  indigo: '#818cf8',
  rose: '#fb7185',
  teal: '#2dd4bf',
  red: '#ef4444',
  orange: '#f59e42',
  brown: '#a0522d',
  gray: '#6b7280',
  black: '#111827',
  white: '#f9fafb',
  cyan: '#06b6d4',
  lime: '#84cc16',
  amber: '#fbbf24',
  violet: '#8b5cf6',
};

const SidebarLeft = ({ onApplyWallColor, onApplyWallWallpaper, onEditWall2D, selectedWall, setSelectedWall, wallCanvasData, setWallCanvasData, wallColors, wallpapers, onRoomSelect, onShowImagePopup, onSetDimensions, showRoomPopup, setShowRoomPopup, onDownloadSingleWall, selectedFrameId, onResizeSelectedFrame, frames }) => {
  const [selectedSwatch, setSelectedSwatch] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState('Center');
  const [wallpaperFile, setWallpaperFile] = useState(null);
  const [wallpaperBlobUrl, setWallpaperBlobUrl] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const fileInputRef = useRef();

  useEffect(() => {
    if (selectedWall && onEditWall2D) {
      onEditWall2D(selectedWall);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWall]);

  // Clean up blob URL when file changes
  useEffect(() => {
    if (wallpaperBlobUrl) {
      URL.revokeObjectURL(wallpaperBlobUrl);
    }
    if (wallpaperFile) {
      const url = URL.createObjectURL(wallpaperFile);
      setWallpaperBlobUrl(url);
    } else {
      setWallpaperBlobUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallpaperFile, selectedWall]);

  const swatches = [
    'blue', 'purple', 'pink', 'green', 'yellow', 'indigo', 'rose', 'teal',
    'red', 'orange', 'brown', 'gray', 'black', 'white', 'cyan', 'lime', 'amber', 'violet',
  ];
  const wallpaperSwatches = ['blue', 'purple', 'pink', 'green'];
  const positions = [
    'Top Left', 'Top Center', 'Top Right',
    'Center Left', 'Center', 'Center Right'
  ];

  // Handle wallpaper file upload and preview
  const handleWallpaperFileChange = (e) => {
    const file = e.target.files[0];
    setWallpaperFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
      setShowCropper(true);
    } else {
      setImagePreviewUrl(null);
      setShowCropper(false);
    }
  };

  // Crop complete callback
  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Apply cropped image to canvas
  const applyCroppedImage = async () => {
    const image = new window.Image();
    image.src = imagePreviewUrl;
    image.onload = () => {
      // Resize cropped image to 600x300 before applying
      const targetWidth = 600;
      const targetHeight = 300;
      const offCanvas = document.createElement('canvas');
      offCanvas.width = targetWidth;
      offCanvas.height = targetHeight;
      const offCtx = offCanvas.getContext('2d');
      offCtx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        targetWidth,
        targetHeight
      );
      const dataUrl = offCanvas.toDataURL();
      // Draw to the visible 2D canvas as well
      const canvas = document.getElementById('wall-2d-canvas');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(offCanvas, 0, 0, canvas.width, canvas.height);
      }
      setWallCanvasData(prev => ({ ...prev, [selectedWall]: dataUrl }));
      if (onApplyWallWallpaper) onApplyWallWallpaper(selectedWall, dataUrl);
      setShowCropper(false);
      setImagePreviewUrl(null);
      setWallpaperFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
  };

  const handleRoomSelect = (roomType) => {
    if (onRoomSelect) onRoomSelect(roomType);
    setShowRoomPopup(false);
  };

  const handleSaveProgress = () => {
    console.log("Progress saved");
    // Implement localStorage or backend save logic here
  };

  const handleUndo = () => {
    console.log("Undoing changes");
    // Implement undo logic here
  };

  const handleReset = () => {
    console.log("Room reset");
    // Reset to default state
  };

  const handleDownload = () => {
    const canvas = document.getElementById('wall-2d-canvas');
    if (!canvas) {
      alert('2D wall canvas not found!');
      return;
    }
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'wall-2d-design.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Find the selected frame
  const selectedFrame = Array.isArray(frames) && selectedFrameId ? frames.find(f => f.id === selectedFrameId) : null;

  // Handle frame resize from sidebar
  const handleFrameResize = (newSize) => {
    if (onResizeSelectedFrame) {
      onResizeSelectedFrame(newSize);
    }
  };
  return (
    <div className="w-full md:col-span-3 h-auto md:h-[calc(100vh-140px)]">
      <div className="glasseffect rounded-2xl p-4 md:p-6 shadow-xl h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 space-y-6">
        <h2 className="text-lg md:text-xl font-bold text-text-primary mb-4 md:mb-6 flex items-center">🪞 Customization Panel</h2>

        {/* Room Selection */}
        <div className="mb-8 space-y-6">
        <button onClick={onSetDimensions} className="bg-accent-blue text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-500 transition-all shadow-lg">
              🏠 Set Room Dimensions
            </button>
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-4">Room Selection</h3>
            <button
              className="w-full bg-gradient-to-r from-accent-blue to-accent-purple text-white p-4 rounded-xl font-medium hover:from-blue-500 hover:to-purple-500 transition-all shadow-lg text-center"
              onClick={() => setShowRoomPopup(true)}
            >
              <div className="text-2xl mb-2">🏠</div>
              <div>Select the Room You Want to Design</div>
            </button>

            {showRoomPopup && (
              <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 shadow-lg w-full max-w-xs flex flex-col items-center">
                  <h3 className="text-lg font-bold mb-4 text-text-primary">Choose a Room</h3>
                  <div className="space-y-3 w-full">
                    {ROOM_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => handleRoomSelect(opt.value)}
                        className="w-full p-3 rounded-lg bg-accent-blue text-white font-medium hover:bg-blue-500 transition-all"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowRoomPopup(false)}
                    className="mt-4 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Wall Options */}
        <div className="mb-8 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-4">Wall Options</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Choose Wall</label>
                <select
                  className="w-full p-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-all"
                  value={selectedWall}
                  onChange={e => setSelectedWall(e.target.value)}
                >
                  <option value="" disabled>Select Wall</option>
                  <option>North Wall</option>
                  <option>South Wall</option>
                  <option>East Wall</option>
                  <option>West Wall</option>
                </select>
              </div>
              <div className={selectedWall ? "" : "opacity-50 pointer-events-none"}>
                <label className="block text-sm font-medium text-text-secondary mb-2">Paint The Wall</label>
                <div className="flex flex-wrap gap-2 mb-4 items-center">
                  {swatches.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedSwatch(colorMap[color] || color)}
                      className={`w-8 h-8 rounded-full border-2 focus:outline-none transition-transform ${
                        selectedSwatch === (colorMap[color] || color)
                          ? 'ring-2 ring-accent-blue border-accent-blue scale-110'
                          : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: colorMap[color] || color }}
                      aria-label={color}
                      disabled={!selectedWall}
                    />
                  ))}
                  {/* Custom color picker circle */}
                  <label className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center cursor-pointer bg-white hover:ring-2 hover:ring-accent-blue transition-all" title="Custom color">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="10" cy="10" r="9" stroke="#888" strokeWidth="2" fill="none" />
                      <circle cx="10" cy="10" r="6" fill="#fff" />
                      <path d="M14 14L10 10" stroke="#888" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="15.5" cy="15.5" r="2.5" fill="url(#paint0_radial)" />
                      <defs>
                        <radialGradient id="paint0_radial" cx="0" cy="0" r="1" gradientTransform="translate(15.5 15.5) scale(2.5)" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#fff" />
                          <stop offset="1" stopColor="#888" />
                        </radialGradient>
                      </defs>
                    </svg>
                    <input
                      type="color"
                      className="absolute opacity-0 w-0 h-0"
                      onChange={e => setSelectedSwatch(e.target.value)}
                      tabIndex={-1}
                      disabled={!selectedWall}
                    />
                  </label>
                </div>
                <button
                  className="mt-4 w-full bg-accent-blue text-white py-2 rounded-lg font-medium hover:bg-blue-500 transition-all"
                  disabled={!selectedSwatch || !selectedWall}
                  onClick={() => {
                    onApplyWallColor(selectedWall, selectedSwatch);
                  }}
                >
                  Apply Color
                </button>
                <div className="my-6" /> {/* Add spacing here */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Wallpaper Patterns</label>
                  <div className="flex flex-col gap-2 mt-2">
                    <input
                      type="file"
                      accept="image/*,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg"
                      onChange={handleWallpaperFileChange}
                      disabled={!selectedWall}
                      ref={fileInputRef}
                    />
                    {imagePreviewUrl && showCropper && (
                      <div className="relative w-full h-64 bg-gray-100 rounded-xl overflow-hidden mb-2">
                        <Cropper
                          image={imagePreviewUrl}
                          crop={crop}
                          zoom={zoom}
                          aspect={2}
                          onCropChange={setCrop}
                          onZoomChange={setZoom}
                          onCropComplete={onCropComplete}
                          cropShape="rect"
                          showGrid={true}
                        />
                      </div>
                    )}
                    {imagePreviewUrl && showCropper && (
                      <button
                        className="w-full bg-accent-purple text-white py-2 rounded-lg font-medium hover:bg-purple-500 transition-all"
                        onClick={applyCroppedImage}
                      >
                        Crop & Apply Wallpaper
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Sticker Palette */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Sticker Palette</h3>
          {/* Place your sticker images in the public/images/ folder for them to show up here */}
          <div className="flex gap-4 flex-wrap">
            {[
              '/images/garland1.png', '/images/garland2.png', '/images/marigold1.png', '/images/marigold2.png', '/images/marigold3.png', '/images/marigold4.png',
               '/images/marigold5.png', '/images/marigold6.png', '/images/sample1.jpg', '/images/sample2.jpg','/images/table1.png','/images/table2.png',
            ].map((img, idx) => (
              <div
                key={img}
                draggable
                onDragStart={e => e.dataTransfer.setData('sticker-image-url', img)}
                className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center shadow cursor-grab border-2 border-blue-400 hover:bg-blue-100 overflow-hidden"
                title={`Sticker ${idx+1}`}
              >
                <img src={img} alt={`Sticker ${idx+1}`} className="object-contain w-full h-full" onError={e => { e.target.style.display = 'none'; e.target.parentNode.textContent = `Sticker ${idx+1}`; }} />
              </div>
            ))}
          </div>
        </div>

        {/* Frame Palette */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Frame Palette</h3>
          <div className="flex gap-4 flex-wrap">
            <div
              draggable
              onDragStart={e => e.dataTransfer.setData('frameType', 'rectangle')}
              className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center shadow cursor-grab border-2 border-blue-400 hover:bg-blue-100"
              title="Rectangle Frame"
            >
              <span className="font-bold text-blue-500">Rect</span>
            </div>
            <div
              draggable
              onDragStart={e => e.dataTransfer.setData('frameType', 'square')}
              className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center shadow cursor-grab border-2 border-green-400 hover:bg-green-100"
              title="Square Frame"
            >
              <span className="font-bold text-green-500">Square</span>
            </div>
            <div
              draggable
              onDragStart={e => e.dataTransfer.setData('frameType', 'circle')}
              className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center shadow cursor-grab border-2 border-pink-400 hover:bg-pink-100"
              title="Circle Frame"
            >
              <span className="font-bold text-pink-500">●</span>
            </div>
            <div
              draggable
              onDragStart={e => e.dataTransfer.setData('frameType', 'oval')}
              className="w-20 h-12 bg-gray-200 rounded-full flex items-center justify-center shadow cursor-grab border-2 border-purple-400 hover:bg-purple-100"
              title="Oval Frame"
            >
              <span className="font-bold text-purple-500">Oval</span>
            </div>
          </div>
        </div>

        {/* Frame Resize Slider */}
        {selectedFrame && onResizeSelectedFrame && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Resize Selected Item</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Size: {selectedFrame.width} x {selectedFrame.height}
                </label>
                <input
                  type="range"
                  min="40"
                  max="300"
                  value={selectedFrame.width}
                  onChange={e => handleFrameResize(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>40px</span>
                  <span>300px</span>
                </div>
              </div>
              <div className="text-center">
                <button
                  onClick={() => handleFrameResize(100)}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 transition-colors mr-2"
                >
                  Small (100px)
                </button>
                <button
                  onClick={() => handleFrameResize(150)}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 transition-colors mr-2"
                >
                  Medium (150px)
                </button>
                <button
                  onClick={() => handleFrameResize(200)}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 transition-colors"
                >
                  Large (200px)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Actions Section */}
        <div className="mb-8 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-4">Actions</h3>
            <div className="space-y-3">
              <button
                onClick={onShowImagePopup}
                className="w-full bg-gradient-to-r from-pink-400 to-purple-400 text-white p-3 rounded-xl font-medium hover:from-pink-500 hover:to-purple-500 transition-all shadow-lg text-center"
              >
                <div className="text-lg mb-1">🖼️</div>
                <div className="text-sm">Manage Images</div>
              </button>

             {/* Download Individual Wall */}
             <div className="mt-6">
                  <button
                    onClick={() => onDownloadSingleWall && onDownloadSingleWall(selectedWall)}
                    disabled={!selectedWall}
                    className="w-full bg-gradient-to-r from-green-400 to-teal-400 text-white p-3 rounded-xl font-medium hover:from-green-500 hover:to-teal-500 transition-all shadow-lg text-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="text-lg mb-1">📥</div>
                    <div className="text-sm">Download {selectedWall || 'Wall'}</div>
                  </button>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidebarLeft;
