import React, { useMemo, useState, useEffect } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Sofa from './Sofa';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

function Wall({ position, rotation, size, color, wallpaperUrl, wallName }) {
  const [texture, setTexture] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!wallpaperUrl) {
      setTexture(null);
      setError(false);
      return;
    }
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      wallpaperUrl,
      (tex) => {
        setTexture(tex);
        setError(false);
      },
      undefined,
      () => {
        setTexture(null);
        setError(true);
      }
    );
  }, [wallpaperUrl, wallName]);

  const [w, h, t] = size;
  const wallThickness = t;
  const tiny = 0.01;
  let planePosition = [0, 0, 0];
  let planeRotation = [0, 0, 0];
  let textPosition = [0, 0, 0];
  let textRotation = [0, 0, 0];

  if (wallName === 'North Wall') {
    planePosition = [0, 0, wallThickness / 2 + tiny];
    planeRotation = [0, 0, 0];
    textPosition = [0, h / 2 + 0.1, wallThickness / 2 + tiny + 0.01];
    textRotation = [0, 0, 0];
  } else if (wallName === 'South Wall') {
    planePosition = [0, 0, -(wallThickness / 2 + tiny)];
    planeRotation = [0, Math.PI, 0];
    textPosition = [0, h / 2 + 0.1, -(wallThickness / 2 + tiny + 0.01)];
    textRotation = [0, Math.PI, 0];
  } else if (wallName === 'East Wall') {
    planePosition = [0,0,-(wallThickness / 2 + tiny)];
    planeRotation = [0, -Math.PI / 1, 0];
    textPosition = [0,h/2+0.1,-(wallThickness / 2 + tiny + 0.01)];
    textRotation = [0, -Math.PI, 0];
  } else if (wallName === 'West Wall') {
    planePosition = [0,0,wallThickness / 2 + tiny];
    planeRotation = [0, 0 , 0];
    textPosition = [0,h/2+0.1,(wallThickness / 2 + tiny + 0.01)];
    textRotation = [0, 0, 0];
  }

  // Inset the wallpaper so it doesn't get blocked by adjacent walls
  const wallpaperWidth = w;
  const wallpaperHeight = h;
  const wallpaperLength = (size && size.length > 0 ? size[0] : 0);

  // Show the wallpaper plane and debug toggle for any wall if a wallpaper is set or texture is loaded
  const showWallpaperPlane = (wallpaperUrl && texture);

  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} />
      </mesh>
      {showWallpaperPlane && (
        <>
          <mesh position={planePosition} rotation={planeRotation}>
            <planeGeometry args={[w, h]} />
            {texture && !error ? (
              <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
            ) : (
              <meshBasicMaterial color="yellow" opacity={0.3} transparent side={THREE.DoubleSide} />
            )}
          </mesh>
          {/* Wall name label */}
          <Text
            position={[
              textPosition[0],
              textPosition[1],
              textPosition[2] + (textRotation[1] === 0 ? 0.08 : -0.08) // Nudge forward from the wall
            ]}
            rotation={textRotation}
            fontSize={0.7}
            color="#fff"
            anchorX="center"
            anchorY="middle"
            outlineColor="#111"
            outlineWidth={0.12}
            fontWeight="bold"
          >
            {wallName}
          </Text>
        </>
      )}
    </group>
  );
}

function LivingRoom({ dimensions, wallColors = {}, wallpapers = {}, wallName }) {
  const { length, width, height } = dimensions;
  return (
    <>
      {/* Floor */}
      <mesh receiveShadow position={[0, -1, 0]}>
        <boxGeometry args={[width, 0.2, length]} />
        <meshStandardMaterial color="#e0cda9" />
      </mesh>
      {/* Back Wall (North) */}
      <Wall position={[0, height / 2 - 1, -length / 2]} rotation={[0, 0, 0]} size={[width, height, 0.2]} color={wallColors['North Wall'] || "#b0b0b0"} wallpaperUrl={wallpapers['North Wall']} wallName="North Wall" />
      {/* Left Wall (West) */}
      <Wall position={[-width / 2, height / 2 - 1, 0]} rotation={[0, Math.PI / 2, 0]} size={[length, height, 0.2]} color={wallColors['West Wall'] || "#8a7b94"} wallpaperUrl={wallpapers['West Wall']} wallName="West Wall" />
      {/* Right Wall (East) */}
      <Wall position={[width / 2, height / 2 - 1, 0]} rotation={[0, Math.PI / 2, 0]} size={[length, height, 0.2]} color={wallColors['East Wall'] || "#8a7b94"} wallpaperUrl={wallpapers['East Wall']} wallName="East Wall" />
      {/* Front Wall (South) */}
      <Wall position={[0, height / 2 - 1, length / 2]} rotation={[0, 0, 0]} size={[width, height, 0.2]} color={wallColors['South Wall'] || "#b0b0b0"} wallpaperUrl={wallpapers['South Wall']} wallName="South Wall" />
      {/* Realistic Sofa Set (static, facing North Wall) */}
      <Sofa position={[0, -0.7, -length / 4]} length={length} />
      {/* Table */}
      <mesh position={[0, -0.9, 0]}>
        <boxGeometry args={[1, 0.2, 1]} />
        <meshStandardMaterial color="#a67c52" />
      </mesh>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
    </>
  );
}

function Bedroom({ dimensions, wallColors = {}, wallpapers = {}, wallName }) {
  const { length, width, height } = dimensions;
  return (
    <>
      {/* Floor */}
      <mesh receiveShadow position={[0, -1, 0]}>
        <boxGeometry args={[width, 0.2, length]} />
        <meshStandardMaterial color="#e6e2d3" />
      </mesh>
      {/* Back Wall (North) */}
      <Wall position={[0, height / 2 - 1, -length / 2]} rotation={[0, 0, 0]} size={[width, height, 0.2]} color={wallColors['North Wall'] || "#b0b0b0"} wallpaperUrl={wallpapers['North Wall']} wallName="North Wall" />
      {/* Left Wall (West) */}
      <Wall position={[-width / 2, height / 2 - 1, 0]} rotation={[0, Math.PI / 2, 0]} size={[length, height, 0.2]} color={wallColors['West Wall'] || "#b0a1ba"} wallpaperUrl={wallpapers['West Wall']} wallName="West Wall" />
      {/* Right Wall (East) */}
      <Wall position={[width / 2, height / 2 - 1, 0]} rotation={[0, Math.PI / 2, 0]} size={[length, height, 0.2]} color={wallColors['East Wall'] || "#b0a1ba"} wallpaperUrl={wallpapers['East Wall']} wallName="East Wall" />
      {/* Front Wall (South) */}
      <Wall position={[0, height / 2 - 1, length / 2]} rotation={[0, 0, 0]} size={[width, height, 0.2]} color={wallColors['South Wall'] || "#b0b0b0"} wallpaperUrl={wallpapers['South Wall']} wallName="South Wall" />
      {/* Bed */}
      <mesh position={[0, -0.7, length / 4]}>
        <boxGeometry args={[3, 0.5, 2]} />
        <meshStandardMaterial color="#c2b280" />
      </mesh>
      {/* Pillow */}
      <mesh position={[0, -0.4, length / 4 + 0.8]}>
        <boxGeometry args={[2.5, 0.2, 0.4]} />
        <meshStandardMaterial color="#fff" />
      </mesh>
      {/* Side Table */}
      <mesh position={[-width / 2 + 0.6, -0.85, length / 4]}>
        <boxGeometry args={[0.4, 0.3, 0.8]} />
        <meshStandardMaterial color="#a67c52" />
      </mesh>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
    </>
  );
}

function Kitchen({ dimensions, wallColors = {}, wallpapers = {}, wallName }) {
  const { length, width, height } = dimensions;
  return (
    <>
      {/* Floor */}
      <mesh receiveShadow position={[0, -1, 0]}>
        <boxGeometry args={[width, 0.2, length]} />
        <meshStandardMaterial color="#f5e6cc" />
      </mesh>
      {/* Back Wall (North) */}
      <Wall position={[0, height / 2 - 1, -length / 2]} rotation={[0, 0, 0]} size={[width, height, 0.2]} color={wallColors['North Wall'] || "#b0b0b0"} wallpaperUrl={wallpapers['North Wall']} wallName="North Wall" />
      {/* Left Wall (West) */}
      <Wall position={[-width / 2, height / 2 - 1, 0]} rotation={[0, Math.PI / 2, 0]} size={[length, height, 0.2]} color={wallColors['West Wall'] || "#b0a1ba"} wallpaperUrl={wallpapers['West Wall']} wallName="West Wall" />
      {/* Right Wall (East) */}
      <Wall position={[width / 2, height / 2 - 1, 0]} rotation={[0, Math.PI / 2, 0]} size={[length, height, 0.2]} color={wallColors['East Wall'] || "#b0a1ba"} wallpaperUrl={wallpapers['East Wall']} wallName="East Wall" />
      {/* Front Wall (South) */}
      <Wall position={[0, height / 2 - 1, length / 2]} rotation={[0, 0, 0]} size={[width, height, 0.2]} color={wallColors['South Wall'] || "#b0b0b0"} wallpaperUrl={wallpapers['South Wall']} wallName="South Wall" />
      {/* Kitchen Counter */}
      <mesh position={[-width / 4, -0.7, length / 4]}>
        <boxGeometry args={[3, 0.7, 1]} />
        <meshStandardMaterial color="#d9b382" />
      </mesh>
      {/* Fridge */}
      <mesh position={[width / 4, -0.3, length / 4 + 1]}>
        <boxGeometry args={[0.7, 1.4, 0.7]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
    </>
  );
}

function Others({ dimensions, wallColors = {}, wallpapers = {}, wallName }) {
  const { length, width, height } = dimensions;
  return (
    <>
      {/* Floor */}
      <mesh receiveShadow position={[0, -1, 0]}>
        <boxGeometry args={[width, 0.2, length]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>
      {/* Back Wall (North) */}
      <Wall position={[0, height / 2 - 1, -length / 2]} rotation={[0, 0, 0]} size={[width, height, 0.2]} color={wallColors['North Wall'] || "#b0b0b0"} wallpaperUrl={wallpapers['North Wall']} wallName="North Wall" />
      {/* Left Wall (West) */}
      <Wall position={[-width / 2, height / 2 - 1, 0]} rotation={[0, Math.PI / 2, 0]} size={[length, height, 0.2]} color={wallColors['West Wall'] || "#b0a1ba"} wallpaperUrl={wallpapers['West Wall']} wallName="West Wall" />
      {/* Right Wall (East) */}
      <Wall position={[width / 2, height / 2 - 1, 0]} rotation={[0, Math.PI / 2, 0]} size={[length, height, 0.2]} color={wallColors['East Wall'] || "#b0a1ba"} wallpaperUrl={wallpapers['East Wall']} wallName="East Wall" />
      {/* Front Wall (South) */}
      <Wall position={[0, height / 2 - 1, length / 2]} rotation={[0, 0, 0]} size={[width, height, 0.2]} color={wallColors['South Wall'] || "#b0b0b0"} wallpaperUrl={wallpapers['South Wall']} wallName="South Wall" />
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
    </>
  );
}

const RoomCanvas = ({ dimensions, roomType, wallColors, wallpapers: propWallpapers }) => {
  // Per-wall wallpaper state
  const [wallpapers, setWallpapers] = useState({
    'North Wall': null,
    'South Wall': null,
    'East Wall': null,
    'West Wall': null,
  });
  const [selectedWall, setSelectedWall] = useState('North Wall');

  // If propWallpapers is provided, merge it in (for backward compatibility)
  useEffect(() => {
    if (propWallpapers) {
      setWallpapers({ ...propWallpapers });
    }
  }, [propWallpapers]);

  let RoomComponent;
  if (roomType === 'livingroom') RoomComponent = LivingRoom;
  else if (roomType === 'bedroom') RoomComponent = Bedroom;
  else if (roomType === 'kitchen') RoomComponent = Kitchen;
  else RoomComponent = Others;

  return (
    <div className="col-span-6">
      <div className="glass-effect rounded-2xl p-8 shadow-xl h-full flex flex-col items-start justify-start relative border-4 border-transparent bg-clip-padding">
        {/* House icon at the top-left with text */}
        <div className="flex items-center space-x-3 z-10 mb-4">
          <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-br from-accent-blue to-accent-purple rounded-2xl shadow-lg">
            <span className="text-5xl">🏠</span>
          </div>
          <span className="text-2xl font-semibold text-text-primary">Start Designing !</span>
        </div>
        {/* Highlighted border around 3D canvas only */}
        <div className="w-full h-[400px] flex items-center justify-center border-4 border-transparent bg-clip-padding rounded-2xl" style={{
          borderImage: 'linear-gradient(90deg, var(--tw-gradient-from, #60a5fa), var(--tw-gradient-to, #a78bfa)) 1',
          borderRadius: '1rem'
        }}>
          <Canvas shadows camera={{ position: [0, 2, 8], fov: 50 }}>
            <RoomComponent dimensions={dimensions} wallColors={wallColors} wallpapers={wallpapers} />
            <OrbitControls 
              enablePan={true} 
              enableZoom={true} 
              enableRotate={true} 
              minPolarAngle={Math.PI / 6}
              maxPolarAngle={Math.PI - 0.2}
              minAzimuthAngle={-Infinity}
              maxAzimuthAngle={Infinity}
            />
          </Canvas>
        </div>
      </div>
    </div>
  );
};

export default RoomCanvas;