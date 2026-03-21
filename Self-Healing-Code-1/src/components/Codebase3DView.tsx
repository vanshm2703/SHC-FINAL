"use client";

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { calculateQualityMetrics, getGradeFromScore } from '@/lib/types';

// @ts-ignore
const R3FCanvas = Canvas as any;
// @ts-ignore
const R3FHtml = Html as any;
// @ts-ignore
const R3FOrbitControls = OrbitControls as any;

// Type definitions
interface GitHubError {
  type: 'error' | 'warning';
  severity?: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  line: number;
  suggestion?: string;
}

interface AnalysisResult {
  filename: string;
  errors: GitHubError[];
}

interface FileWithStatus {
  filename: string;
  errors: GitHubError[];
  status: 'red' | 'yellow' | 'green';
  isHealing?: boolean;
  isHealed?: boolean;
  prCreated?: boolean;
  prUrl?: string;
  pointsEarned?: number;
  normalizedScore?: number;  // 0-100 score with bonuses
  grade?: string;            // Letter grade
  rawContribution?: number;  // Raw contribution points
  metrics?: any;             // Full metrics object
}

interface Codebase3DViewProps {
  analysisResults: {
    totalFiles: number;
    analyzedFiles: number;
    filesWithErrors: number;
    results: AnalysisResult[];
    repoName: string;
  };
  onClose: () => void;
  repoUrl?: string;
  branchName?: string;
  githubToken?: string;
  userId?: string;
  userEmail?: string;
  totalPoints?: number;
  onPointsEarned?: (points: number) => void;
}

// Bug Monster Component - appears on buggy buildings
const BugMonster: React.FC<{ position: [number, number, number]; isVisible: boolean }> = ({ position, isVisible }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [opacity, setOpacity] = useState(isVisible ? 1 : 0);
  
  useFrame((state) => {
    if (groupRef.current && isVisible) {
      // Floating animation
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.15;
      groupRef.current.rotation.y += 0.02;
    }
    // Fade effect
    setOpacity(prev => isVisible ? Math.min(prev + 0.05, 1) : Math.max(prev - 0.1, 0));
  });

  if (opacity <= 0) return null;

  return (
    <group ref={groupRef} position={position}>
      {/* Bug body */}
      <mesh>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color="#8b0000" transparent opacity={opacity} emissive="#ff0000" emissiveIntensity={0.5} />
      </mesh>
      {/* Bug eyes */}
      <mesh position={[0.1, 0.1, 0.2]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={1} transparent opacity={opacity} />
      </mesh>
      <mesh position={[-0.1, 0.1, 0.2]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={1} transparent opacity={opacity} />
      </mesh>
      {/* Bug legs */}
      {[-0.2, 0, 0.2].map((z, i) => (
        <React.Fragment key={i}>
          <mesh position={[0.25, -0.1, z]} rotation={[0, 0, Math.PI / 4]}>
            <cylinderGeometry args={[0.02, 0.02, 0.2]} />
            <meshStandardMaterial color="#4a0000" transparent opacity={opacity} />
          </mesh>
          <mesh position={[-0.25, -0.1, z]} rotation={[0, 0, -Math.PI / 4]}>
            <cylinderGeometry args={[0.02, 0.02, 0.2]} />
            <meshStandardMaterial color="#4a0000" transparent opacity={opacity} />
          </mesh>
        </React.Fragment>
      ))}
      {/* Bug antennas */}
      <mesh position={[0.1, 0.25, 0.1]} rotation={[0.3, 0, 0.3]}>
        <cylinderGeometry args={[0.01, 0.02, 0.2]} />
        <meshStandardMaterial color="#4a0000" transparent opacity={opacity} />
      </mesh>
      <mesh position={[-0.1, 0.25, 0.1]} rotation={[0.3, 0, -0.3]}>
        <cylinderGeometry args={[0.01, 0.02, 0.2]} />
        <meshStandardMaterial color="#4a0000" transparent opacity={opacity} />
      </mesh>
    </group>
  );
};

// Repair Drone Component - flies to fix bugs
const RepairDrone: React.FC<{ 
  startPos: [number, number, number]; 
  targetPos: [number, number, number]; 
  isActive: boolean;
  onComplete: () => void;
}> = ({ startPos, targetPos, isActive, onComplete }) => {
  const droneRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0);
  const phaseRef = useRef<'flying' | 'fixing' | 'done'>('flying');
  const completedRef = useRef(false);
  
  useFrame((state) => {
    if (!droneRef.current || !isActive) {
      progressRef.current = 0;
      phaseRef.current = 'flying';
      completedRef.current = false;
      return;
    }
    
    if (phaseRef.current === 'flying') {
      progressRef.current = Math.min(progressRef.current + 0.012, 1);
      
      if (progressRef.current >= 1) {
        phaseRef.current = 'fixing';
      }
      
      // Interpolate position with arc
      const p = progressRef.current;
      droneRef.current.position.x = THREE.MathUtils.lerp(startPos[0], targetPos[0], p);
      droneRef.current.position.y = THREE.MathUtils.lerp(startPos[1], targetPos[1] + 1.5, p) + Math.sin(p * Math.PI) * 3;
      droneRef.current.position.z = THREE.MathUtils.lerp(startPos[2], targetPos[2], p);
      
    } else if (phaseRef.current === 'fixing') {
      // Fixing animation - hover and pulse
      droneRef.current.position.y = targetPos[1] + 1.8 + Math.sin(state.clock.elapsedTime * 5) * 0.1;
      
      // Check if fixing is complete (after ~2 seconds)
      if (!completedRef.current && state.clock.elapsedTime % 10 > 2) {
        completedRef.current = true;
        phaseRef.current = 'done';
        onComplete();
      }
    }
    
    // Propeller rotation
    droneRef.current.rotation.y += 0.15;
  });

  if (!isActive) return null;

  return (
    <group ref={droneRef} position={startPos}>
      {/* Drone body */}
      <mesh>
        <boxGeometry args={[0.4, 0.15, 0.4]} />
        <meshStandardMaterial color="#00bfff" emissive="#00bfff" emissiveIntensity={0.5} metalness={0.8} />
      </mesh>
      {/* Drone propellers */}
      {[[0.25, 0.1, 0.25], [-0.25, 0.1, 0.25], [0.25, 0.1, -0.25], [-0.25, 0.1, -0.25]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <cylinderGeometry args={[0.15, 0.15, 0.03, 16]} />
          <meshStandardMaterial color="#333" transparent opacity={0.8} />
        </mesh>
      ))}
      {/* Repair beam when fixing */}
      {phaseRef.current === 'fixing' && (
        <mesh position={[0, -0.7, 0]}>
          <cylinderGeometry args={[0.08, 0.25, 1.2]} />
          <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={1} transparent opacity={0.7} />
        </mesh>
      )}
      {/* AI label */}
      <R3FHtml position={[0, 0.4, 0]} center>
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg">
          🤖 AI Drone
        </div>
      </R3FHtml>
    </group>
  );
};

// Building Component
const Building: React.FC<{
  position: [number, number, number];
  file: FileWithStatus;
  onClick: (file: FileWithStatus) => void;
  isSelected: boolean;
}> = ({ position, file, onClick, isSelected }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  
  // Show celebration when healed
  useEffect(() => {
    if (file.isHealed && file.prCreated) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [file.isHealed, file.prCreated]);
  
  const getColor = () => {
    if (file.isHealed) return '#FFD700'; // Gold for palace
    if (file.errors.length === 0) return '#22c55e';
    if (file.errors.some(e => e.type === 'error')) return '#ef4444';
    if (file.errors.some(e => e.type === 'warning')) return '#eab308';
    return '#22c55e';
  };

  useFrame((state) => {
    if (meshRef.current) {
      // Scale animation on hover
      const targetScale = hovered || isSelected ? 1.08 : 1;
      meshRef.current.scale.x = THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, 0.1);
      meshRef.current.scale.z = THREE.MathUtils.lerp(meshRef.current.scale.z, targetScale, 0.1);
      
      // Healing pulse effect
      if (file.isHealing) {
        const pulse = Math.sin(state.clock.elapsedTime * 8) * 0.05 + 1;
        meshRef.current.scale.x = pulse;
        meshRef.current.scale.z = pulse;
      }
    }
  });

  const height = 1 + Math.min(file.errors.length * 0.5, 2.5);
  const hasBugs = file.errors.length > 0 && !file.isHealed;
  const currentColor = getColor();

  // HEALED PALACE - Golden transformed building
  if (file.isHealed) {
    return (
      <group position={position}>
        {/* Palace base */}
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.8, 1, 0.2, 8]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
        
        {/* Palace main structure */}
        <mesh position={[0, 1.2, 0]}>
          <boxGeometry args={[1.2, 2, 1.2]} />
          <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.3} metalness={0.6} />
        </mesh>
        
        {/* Palace towers */}
        {[[-0.5, 0, -0.5], [0.5, 0, -0.5], [-0.5, 0, 0.5], [0.5, 0, 0.5]].map((pos, i) => (
          <group key={i} position={pos as [number, number, number]}>
            <mesh position={[0, 1.8, 0]}>
              <cylinderGeometry args={[0.15, 0.18, 1.2, 8]} />
              <meshStandardMaterial color="#DAA520" metalness={0.5} />
            </mesh>
            <mesh position={[0, 2.5, 0]}>
              <coneGeometry args={[0.22, 0.4, 8]} />
              <meshStandardMaterial color="#B8860B" />
            </mesh>
            {/* Tower flag */}
            <mesh position={[0, 2.9, 0.1]}>
              <boxGeometry args={[0.02, 0.3, 0.15]} />
              <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
            </mesh>
          </group>
        ))}
        
        {/* Central dome */}
        <mesh position={[0, 2.4, 0]}>
          <sphereGeometry args={[0.4, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.4} metalness={0.7} />
        </mesh>
        
        {/* Dome top ornament */}
        <mesh position={[0, 2.85, 0]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color="#FFF" emissive="#FFF" emissiveIntensity={1} />
        </mesh>
        
        {/* Palace windows */}
        {[-0.3, 0.3].map((x, i) => (
          <mesh key={i} position={[0.61, 1.2, x]}>
            <boxGeometry args={[0.05, 0.5, 0.25]} />
            <meshStandardMaterial color="#87CEEB" emissive="#87CEEB" emissiveIntensity={0.5} />
          </mesh>
        ))}
        
        {/* Grand entrance */}
        <mesh position={[0, 0.5, 0.62]}>
          <boxGeometry args={[0.4, 0.8, 0.1]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
        
        {/* Celebration particles */}
        {showCelebration && (
          <>
            <pointLight position={[0, 3, 0]} intensity={3} distance={5} color="#FFD700" />
            <R3FHtml position={[0, 3.5, 0]} center>
              <div className="animate-bounce text-center">
                <div className="text-4xl">🎉</div>
                <div className="space-y-1">
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg">
                    Score: +{file.normalizedScore || 0}/100
                  </div>
                  {file.grade && (
                    <div
                      className="text-white text-[10px] px-2 py-0.5 rounded-full font-bold inline-block shadow-lg"
                      style={{ backgroundColor: file.metrics?.gradeInfo?.color || '#gray' }}
                    >
                      Grade {file.grade}
                    </div>
                  )}
                </div>
              </div>
            </R3FHtml>
          </>
        )}
        
        {/* PR Created badge */}
        {file.prCreated && (
          <R3FHtml position={[0, 3, 0]} center>
            <div className="flex flex-col items-center gap-2">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-3 py-1.5 rounded-lg font-bold shadow-xl animate-pulse whitespace-nowrap">
                ✅ PR Created!
              </div>
              {file.prUrl && (
                <a 
                  href={file.prUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold shadow-lg whitespace-nowrap flex items-center gap-1 cursor-pointer"
                >
                  👁️ View PR →
                </a>
              )}
            </div>
          </R3FHtml>
        )}
        
        {/* File name */}
        <R3FHtml position={[0, -0.2, 0]} center distanceFactor={12}>
          <div className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-xs font-bold px-3 py-1 rounded-lg whitespace-nowrap shadow-lg">
            👑 {file.filename.length > 12 ? file.filename.slice(0, 9) + '...' : file.filename}
          </div>
        </R3FHtml>
      </group>
    );
  }

  // REGULAR/BUGGY BUILDING
  return (
    <group position={position}>
      {/* Building shadow/base */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.6, 16]} />
        <meshStandardMaterial color="#111" transparent opacity={0.5} />
      </mesh>
      
      {/* Main building */}
      <mesh
        ref={meshRef}
        position={[0, height / 2, 0]}
        onClick={(e: any) => {
          e.stopPropagation();
          onClick(file);
        }}
        onPointerOver={(e: any) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <boxGeometry args={[0.9, height, 0.9]} />
        <meshStandardMaterial 
          color={currentColor}
          emissive={currentColor}
          emissiveIntensity={isSelected ? 0.5 : hasBugs ? 0.3 : 0.15}
          metalness={0.2}
          roughness={0.6}
        />
      </mesh>

      {/* Windows - front and back */}
      {Array.from({ length: Math.floor(height / 0.5) }).map((_, i) => (
        <React.Fragment key={i}>
          <mesh position={[0.4, 0.35 + i * 0.5, 0.25]}>
            <boxGeometry args={[0.08, 0.25, 0.08]} />
            <meshStandardMaterial color="#fffde7" emissive="#fffde7" emissiveIntensity={0.8} />
          </mesh>
          <mesh position={[0.4, 0.35 + i * 0.5, -0.25]}>
            <boxGeometry args={[0.08, 0.25, 0.08]} />
            <meshStandardMaterial color="#fffde7" emissive="#fffde7" emissiveIntensity={0.8} />
          </mesh>
          <mesh position={[-0.4, 0.35 + i * 0.5, 0.25]}>
            <boxGeometry args={[0.08, 0.25, 0.08]} />
            <meshStandardMaterial color="#fffde7" emissive="#fffde7" emissiveIntensity={0.6} />
          </mesh>
        </React.Fragment>
      ))}

      {/* Roof */}
      <mesh position={[0, height + 0.08, 0]}>
        <boxGeometry args={[1, 0.15, 1]} />
        <meshStandardMaterial color="#333" metalness={0.5} />
      </mesh>

      {/* Bug Monster */}
      <BugMonster 
        position={[0, height + 0.7, 0]} 
        isVisible={hasBugs && !file.isHealing}
      />

      {/* Healing glow effect */}
      {file.isHealing && (
        <>
          <mesh position={[0, height / 2, 0]}>
            <sphereGeometry args={[0.8, 16, 16]} />
            <meshStandardMaterial 
              color="#00ff00" 
              emissive="#00ff00" 
              emissiveIntensity={2}
              transparent 
              opacity={0.2}
            />
          </mesh>
          <pointLight position={[0, height / 2, 0]} intensity={2} distance={3} color="#00ff00" />
          <R3FHtml position={[0, height + 1, 0]} center>
            <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
              🔧 Creating PR...
            </div>
          </R3FHtml>
        </>
      )}

      {/* File name label */}
      <R3FHtml position={[0, -0.2, 0]} center distanceFactor={12}>
        <div className={`text-xl font-bold px-2 py-1 rounded-lg whitespace-nowrap shadow-lg ${
          hasBugs ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {file.filename.length > 14 ? file.filename.slice(0, 11) + '...' : file.filename}
        </div>
      </R3FHtml>

      {/* Error count badge */}
      {file.errors.length > 0 && !file.isHealed && (
        <R3FHtml position={[0.55, height + 0.3, 0]} center>
          <div className="bg-red-500 text-white text-xl w-7 h-7 rounded-full flex items-center justify-center font-bold shadow-lg border-2 border-white animate-pulse">
            {file.errors.length}
          </div>
        </R3FHtml>
      )}
    </group>
  );
};

// Ground with roads and grass
const CityGround: React.FC<{ gridSize: number; isDarkMode: boolean }> = ({ gridSize, isDarkMode }) => {
  const size = gridSize * 3.5 + 25; // Larger to accommodate SVKM campus
  const grassColor = isDarkMode ? '#1a472a' : '#4a9d6f';
  const grassPatchColor = isDarkMode ? '#2d5a27' : '#5fb87d';
  const roadColor = isDarkMode ? '#2a2a2a' : '#888888';
  
  return (
    <group>
      {/* Main grass area */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color={grassColor} />
      </mesh>
      
      {/* Lighter grass patches */}
      {Array.from({ length: 20 }).map((_, i) => (
        <mesh 
          key={`grass${i}`}
          rotation={[-Math.PI / 2, 0, Math.random() * Math.PI]} 
          position={[
            (Math.random() - 0.5) * size * 0.8,
            0.01,
            (Math.random() - 0.5) * size * 0.8
          ]}
        >
          <circleGeometry args={[0.5 + Math.random() * 1, 8]} />
          <meshStandardMaterial color={grassPatchColor} />
        </mesh>
      ))}
      
      {/* Main roads */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[size, 1.5]} />
        <meshStandardMaterial color={roadColor} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.02, 0]}>
        <planeGeometry args={[size, 1.5]} />
        <meshStandardMaterial color={roadColor} />
      </mesh>

      {/* Road markings - center lines */}
      {Array.from({ length: 15 }).map((_, i) => (
        <React.Fragment key={`mark${i}`}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(i - 7) * 2, 0.03, 0]}>
            <planeGeometry args={[1, 0.1]} />
            <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.2} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.03, (i - 7) * 2]}>
            <planeGeometry args={[1, 0.1]} />
            <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.2} />
          </mesh>
        </React.Fragment>
      ))}

      {/* Sidewalks around buildings area */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, gridSize + 2]}>
        <planeGeometry args={[gridSize * 3, 0.8]} />
        <meshStandardMaterial color={isDarkMode ? '#666' : '#aaa'} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -gridSize - 2]}>
        <planeGeometry args={[gridSize * 3, 0.8]} />
        <meshStandardMaterial color={isDarkMode ? '#666' : '#aaa'} />
      </mesh>
    </group>
  );
};

// Trees for decoration
const Tree: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.8]} />
        <meshStandardMaterial color="#5D4037" />
      </mesh>
      {/* Foliage layers */}
      <mesh position={[0, 0.9, 0]}>
        <coneGeometry args={[0.4, 0.7, 8]} />
        <meshStandardMaterial color="#1B5E20" />
      </mesh>
      <mesh position={[0, 1.3, 0]}>
        <coneGeometry args={[0.3, 0.5, 8]} />
        <meshStandardMaterial color="#2E7D32" />
      </mesh>
      <mesh position={[0, 1.6, 0]}>
        <coneGeometry args={[0.2, 0.4, 8]} />
        <meshStandardMaterial color="#388E3C" />
      </mesh>
    </group>
  );
};

// ============================================
// SVKM CAMPUS LANDMARK BUILDINGS
// ============================================

// DJSCE - DJ Sanghvi College of Engineering (Modern glass building with blue accents)
const DJSCEBuilding: React.FC<{ position: [number, number, number]; scale: number }> = ({ position, scale }) => {
  const s = scale;
  return (
    <group position={position} scale={[s, s, s]}>
      {/* Main tower */}
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[2, 5, 1.5]} />
        <meshStandardMaterial color="#1565C0" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Glass panels */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[0.85, 0.8 + i * 0.55, 0.3 + (i % 2) * 0.4 - 0.2]}>
          <boxGeometry args={[0.15, 0.4, 0.3]} />
          <meshStandardMaterial color="#81D4FA" emissive="#81D4FA" emissiveIntensity={0.3} transparent opacity={0.8} />
        </mesh>
      ))}
      {/* Side wing */}
      <mesh position={[1.3, 1.2, 0]}>
        <boxGeometry args={[1, 2.4, 1.2]} />
        <meshStandardMaterial color="#1976D2" metalness={0.5} />
      </mesh>
      {/* Entrance */}
      <mesh position={[0, 0.4, 0.8]}>
        <boxGeometry args={[1.2, 0.8, 0.3]} />
        <meshStandardMaterial color="#0D47A1" />
      </mesh>
      {/* DJSCE sign */}
      <R3FHtml position={[0, 5.2, 0]} center distanceFactor={15}>
        <div className="bg-blue-800 text-white text-xlarge px-2 py-1 rounded font-bold shadow-lg whitespace-nowrap">
          🎓 DJSCE
        </div>
      </R3FHtml>
    </group>
  );
};

// Bhagubhai Diploma College (Traditional red brick style)
const BhagubhaiBuilding: React.FC<{ position: [number, number, number]; scale: number }> = ({ position, scale }) => {
  const s = scale;
  return (
    <group position={position} scale={[s, s, s]}>
      {/* Main building */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[2.5, 3, 1.2]} />
        <meshStandardMaterial color="#8D6E63" />
      </mesh>
      {/* Pillars */}
      {[-0.8, 0, 0.8].map((x, i) => (
        <mesh key={i} position={[x, 1.2, 0.65]}>
          <cylinderGeometry args={[0.1, 0.12, 2.4]} />
          <meshStandardMaterial color="#EFEBE9" />
        </mesh>
      ))}
      {/* Roof */}
      <mesh position={[0, 3.2, 0]}>
        <boxGeometry args={[2.7, 0.3, 1.4]} />
        <meshStandardMaterial color="#5D4037" />
      </mesh>
      {/* Windows */}
      {[-0.6, 0.6].map((x, i) => (
        <React.Fragment key={i}>
          <mesh position={[x, 2, 0.62]}>
            <boxGeometry args={[0.4, 0.5, 0.1]} />
            <meshStandardMaterial color="#FFF9C4" emissive="#FFF9C4" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[x, 1, 0.62]}>
            <boxGeometry args={[0.4, 0.5, 0.1]} />
            <meshStandardMaterial color="#FFF9C4" emissive="#FFF9C4" emissiveIntensity={0.5} />
          </mesh>
        </React.Fragment>
      ))}
      {/* Sign */}
      <R3FHtml position={[0, 3.8, 0]} center distanceFactor={15}>
        <div className="bg-amber-800 text-white text-xl px-2 py-1 rounded font-bold shadow-lg whitespace-nowrap">
          📚 Bhagubhai Diploma
        </div>
      </R3FHtml>
    </group>
  );
};

// CNMS School (School building with flag)
const CNMSBuilding: React.FC<{ position: [number, number, number]; scale: number }> = ({ position, scale }) => {
  const s = scale;
  return (
    <group position={position} scale={[s, s, s]}>
      {/* Main building */}
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[2.2, 2.4, 1]} />
        <meshStandardMaterial color="#F5F5F5" />
      </mesh>
      {/* Colored stripe */}
      <mesh position={[0, 2.3, 0.51]}>
        <boxGeometry args={[2.2, 0.3, 0.05]} />
        <meshStandardMaterial color="#FF5722" />
      </mesh>
      {/* Flag pole */}
      <mesh position={[0.9, 2.5, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 2]} />
        <meshStandardMaterial color="#9E9E9E" metalness={0.8} />
      </mesh>
      {/* Flag */}
      <mesh position={[0.9, 3.3, 0.15]}>
        <boxGeometry args={[0.02, 0.4, 0.6]} />
        <meshStandardMaterial color="#FF9933" />
      </mesh>
      <mesh position={[0.9, 3.3, 0.15]}>
        <boxGeometry args={[0.025, 0.13, 0.6]} />
        <meshStandardMaterial color="#138808" />
      </mesh>
      {/* Windows grid */}
      {[-0.5, 0, 0.5].map((x, i) => (
        <React.Fragment key={i}>
          <mesh position={[x, 1.6, 0.52]}>
            <boxGeometry args={[0.35, 0.4, 0.08]} />
            <meshStandardMaterial color="#81D4FA" emissive="#81D4FA" emissiveIntensity={0.2} />
          </mesh>
          <mesh position={[x, 0.8, 0.52]}>
            <boxGeometry args={[0.35, 0.4, 0.08]} />
            <meshStandardMaterial color="#81D4FA" emissive="#81D4FA" emissiveIntensity={0.2} />
          </mesh>
        </React.Fragment>
      ))}
      {/* Sign */}
      <R3FHtml position={[0, 2.8, 0]} center distanceFactor={15}>
        <div className="bg-orange-600 text-white text-xl px-2 py-1 rounded font-bold shadow-lg whitespace-nowrap">
          🏫 CNMS School
        </div>
      </R3FHtml>
    </group>
  );
};

// Mukesh Patel Auditorium (Dome shaped)
const MukeshPatelAuditorium: React.FC<{ position: [number, number, number]; scale: number }> = ({ position, scale }) => {
  const s = scale;
  return (
    <group position={position} scale={[s, s, s]}>
      {/* Base */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[1.5, 1.8, 1, 16]} />
        <meshStandardMaterial color="#78909C" />
      </mesh>
      {/* Main dome */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[1.3, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#546E7A" metalness={0.4} />
      </mesh>
      {/* Entrance */}
      <mesh position={[0, 0.4, 1.5]}>
        <boxGeometry args={[1, 0.8, 0.5]} />
        <meshStandardMaterial color="#37474F" />
      </mesh>
      {/* Decorative ring */}
      <mesh position={[0, 1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.5, 0.08, 8, 32]} />
        <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.3} metalness={0.8} />
      </mesh>
      {/* Top light */}
      <mesh position={[0, 2.7, 0]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color="#FFF9C4" emissive="#FFF9C4" emissiveIntensity={1} />
      </mesh>
      <pointLight position={[position[0], position[1] + 2.7 * s, position[2]]} intensity={0.3} distance={5} color="#FFF9C4" />
      {/* Sign */}
      <R3FHtml position={[0, 3.2, 0]} center distanceFactor={15}>
        <div className="bg-gray-700 text-white text-xl px-2 py-1 rounded font-bold shadow-lg whitespace-nowrap">
          🎭 Mukesh Patel Auditorium
        </div>
      </R3FHtml>
    </group>
  );
};

// NMIMS Building (Tall corporate tower)
const NMIMSBuilding: React.FC<{ position: [number, number, number]; scale: number }> = ({ position, scale }) => {
  const s = scale;
  return (
    <group position={position} scale={[s, s, s]}>
      {/* Main tower */}
      <mesh position={[0, 3, 0]}>
        <boxGeometry args={[1.5, 6, 1.2]} />
        <meshStandardMaterial color="#263238" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Glass facade */}
      <mesh position={[0.76, 3, 0]}>
        <boxGeometry args={[0.05, 5.5, 1]} />
        <meshStandardMaterial color="#4DD0E1" emissive="#4DD0E1" emissiveIntensity={0.2} transparent opacity={0.7} />
      </mesh>
      <mesh position={[-0.76, 3, 0]}>
        <boxGeometry args={[0.05, 5.5, 1]} />
        <meshStandardMaterial color="#4DD0E1" emissive="#4DD0E1" emissiveIntensity={0.2} transparent opacity={0.7} />
      </mesh>
      {/* Floor markers */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={i} position={[0, 0.6 + i * 0.55, 0.61]}>
          <boxGeometry args={[1.4, 0.03, 0.02]} />
          <meshStandardMaterial color="#37474F" />
        </mesh>
      ))}
      {/* Top section */}
      <mesh position={[0, 6.2, 0]}>
        <boxGeometry args={[1.6, 0.4, 1.3]} />
        <meshStandardMaterial color="#1A237E" />
      </mesh>
      {/* NMIMS logo area */}
      <mesh position={[0, 5.5, 0.62]}>
        <boxGeometry args={[0.8, 0.4, 0.05]} />
        <meshStandardMaterial color="#7C4DFF" emissive="#7C4DFF" emissiveIntensity={0.5} />
      </mesh>
      {/* Sign */}
      <R3FHtml position={[0, 6.8, 0]} center distanceFactor={15}>
        <div className="bg-indigo-900 text-white text-xl px-2 py-1 rounded font-bold shadow-lg whitespace-nowrap">
          🏛️ NMIMS
        </div>
      </R3FHtml>
    </group>
  );
};

// SVKM Campus Component - Places all landmark buildings
const SVKMCampus: React.FC<{ 
  centerRadius: number; 
  errorCount: number;
  maxErrors: number;
}> = ({ centerRadius, errorCount, maxErrors }) => {
  // Dynamic scale: buildings shrink as more errors exist (min 0.5, max 1.0)
  const baseScale = Math.max(0.5, 1 - (errorCount / Math.max(maxErrors, 10)) * 0.4);
  const campusRadius = centerRadius + 6;
  
  return (
    <group>
      {/* DJSCE - Engineering college at front */}
      <DJSCEBuilding 
        position={[0, 0, -campusRadius]} 
        scale={baseScale} 
      />
      
      {/* NMIMS - Tall building at back */}
      <NMIMSBuilding 
        position={[0, 0, campusRadius]} 
        scale={baseScale} 
      />
      
      {/* Mukesh Patel Auditorium - Right side */}
      <MukeshPatelAuditorium 
        position={[campusRadius, 0, 0]} 
        scale={baseScale} 
      />
      
      {/* Bhagubhai Diploma - Left side */}
      <BhagubhaiBuilding 
        position={[-campusRadius, 0, 0]} 
        scale={baseScale} 
      />
      
      {/* CNMS School - Corner */}
      <CNMSBuilding 
        position={[-campusRadius * 0.7, 0, -campusRadius * 0.7]} 
        scale={baseScale * 0.9} 
      />

      {/* Campus entrance gate */}
      <group position={[0, 0, -campusRadius - 3]}>
        {/* Gate pillars */}
        <mesh position={[-1.5, 1, 0]}>
          <boxGeometry args={[0.4, 2, 0.4]} />
          <meshStandardMaterial color="#8D6E63" />
        </mesh>
        <mesh position={[1.5, 1, 0]}>
          <boxGeometry args={[0.4, 2, 0.4]} />
          <meshStandardMaterial color="#8D6E63" />
        </mesh>
        {/* Gate arch */}
        <mesh position={[0, 2.2, 0]}>
          <boxGeometry args={[3.4, 0.4, 0.3]} />
          <meshStandardMaterial color="#5D4037" />
        </mesh>
        {/* SVKM sign */}
        <R3FHtml position={[0, 2.8, 0]} center distanceFactor={12}>
          <div className="bg-gradient-to-r from-amber-700 to-amber-900 text-white text-xl px-4 py-2 rounded-lg font-bold shadow-xl border-2 border-amber-500 whitespace-nowrap">
            🏛️ SVKM Campus
          </div>
        </R3FHtml>
      </group>
    </group>
  );
};

// Street lamp
const StreetLamp: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  return (
    <group position={position}>
      {/* Pole */}
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 1.6]} />
        <meshStandardMaterial color="#37474F" metalness={0.8} />
      </mesh>
      {/* Lamp arm */}
      <mesh position={[0.15, 1.5, 0]} rotation={[0, 0, Math.PI / 6]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3]} />
        <meshStandardMaterial color="#37474F" metalness={0.8} />
      </mesh>
      {/* Light bulb */}
      <mesh position={[0.25, 1.45, 0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#FFF9C4" emissive="#FFF9C4" emissiveIntensity={2} />
      </mesh>
      {/* Light glow */}
      <pointLight position={[position[0] + 0.25, position[1] + 1.45, position[2]]} intensity={0.5} distance={4} color="#FFF9C4" />
    </group>
  );
};

// Sky and atmosphere
const Environment: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const starsRef = useRef<THREE.Points>(null);
  const skyColor = isDarkMode ? '#0a0a1f' : '#e0f2ff';
  
  useFrame(() => {
    if (starsRef.current) {
      starsRef.current.rotation.y += 0.0001;
    }
  });

  // Generate star positions
  const starCount = isDarkMode ? 800 : 200; // Fewer stars in light mode
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 45 + Math.random() * 5;
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = Math.abs(r * Math.sin(phi) * Math.sin(theta)); // Only upper hemisphere
    starPositions[i * 3 + 2] = r * Math.cos(phi);
  }

  return (
    <>
      {/* Sky dome */}
      <mesh>
        <sphereGeometry args={[50, 32, 32]} />
        <meshBasicMaterial color={skyColor} side={THREE.BackSide} />
      </mesh>
      
      {/* Stars */}
      {isDarkMode && (
        <points ref={starsRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={starCount}
              array={starPositions}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial size={0.15} color="#ffffff" sizeAttenuation transparent opacity={0.8} />
        </points>
      )}

      {/* Moon/Sun */}
      <mesh position={isDarkMode ? [20, 25, -20] : [15, 35, -15]}>
        <sphereGeometry args={[2, 16, 16]} />
        <meshStandardMaterial 
          color={isDarkMode ? '#fffde7' : '#ffeb3b'} 
          emissive={isDarkMode ? '#fffde7' : '#ffeb3b'} 
          emissiveIntensity={isDarkMode ? 0.3 : 0.8}
        />
      </mesh>
    </>
  );
};

// Main Scene
const Scene: React.FC<{
  files: FileWithStatus[];
  onSelectFile: (file: FileWithStatus | null) => void;
  selectedFile: FileWithStatus | null;
  healingFile: string | null;
  onHealComplete: () => void;
  isDarkMode: boolean;
}> = ({ files, onSelectFile, selectedFile, healingFile, onHealComplete, isDarkMode }) => {
  const gridSize = Math.ceil(Math.sqrt(Math.max(files.length, 1)));
  const spacing = 2.8;
  
  // Calculate error count for SVKM buildings scaling
  const errorCount = files.filter(f => f.errors.length > 0 && !f.isHealed).length;
  const centerRadius = gridSize * spacing / 2 + 2;
  
  // Drone base position (corner of city)
  const droneBase: [number, number, number] = [gridSize * spacing / 2 + 4, 4, gridSize * spacing / 2 + 4];
  
  // Find healing file position
  const healingFileIndex = files.findIndex(f => f.filename === healingFile);
  const healingFilePos: [number, number, number] = healingFileIndex >= 0 
    ? [
        (healingFileIndex % gridSize) * spacing - (gridSize * spacing) / 2 + spacing / 2,
        0,
        Math.floor(healingFileIndex / gridSize) * spacing - (gridSize * spacing) / 2 + spacing / 2
      ]
    : [0, 0, 0];

  return (
    <>
      <R3FOrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={6}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 1, 0]}
        autoRotate={!selectedFile && !healingFile}
        autoRotateSpeed={0.3}
      />
      
      {/* Lighting */}
      <ambientLight intensity={isDarkMode ? 0.35 : 0.7} />
      <directionalLight position={[15, 25, 15]} intensity={isDarkMode ? 0.6 : 1} castShadow />
      <pointLight position={[-15, 20, -15]} intensity={isDarkMode ? 0.3 : 0.15} color={isDarkMode ? '#6366f1' : '#87ceeb'} />
      <hemisphereLight intensity={isDarkMode ? 0.25 : 0.4} color="#ffffff" groundColor={isDarkMode ? '#1a472a' : '#5fb87d'} />
      
      {/* Environment */}
      <Environment isDarkMode={isDarkMode} />
      <fog attach="fog" args={[isDarkMode ? '#0a0a1f' : '#e0f2ff', 35, 70]} />
      
      {/* City ground */}
      <CityGround gridSize={gridSize} isDarkMode={isDarkMode} />
      
      {/* SVKM Campus Landmark Buildings */}
      <SVKMCampus 
        centerRadius={centerRadius}
        errorCount={errorCount}
        maxErrors={10}
      />
      
      {/* Trees around the campus perimeter */}
      {Array.from({ length: 20 }).map((_, i) => {
        const angle = (i / 20) * Math.PI * 2;
        const radius = centerRadius + 12; // Further out past SVKM buildings
        return (
          <Tree 
            key={`tree${i}`} 
            position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]} 
          />
        );
      })}
      
      {/* Street lamps around code buildings */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const radius = gridSize * spacing / 2 + 1.5;
        return (
          <StreetLamp 
            key={`lamp${i}`} 
            position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]} 
          />
        );
      })}

      {/* Buildings */}
      {files.map((file, index) => {
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        const x = col * spacing - (gridSize * spacing) / 2 + spacing / 2;
        const z = row * spacing - (gridSize * spacing) / 2 + spacing / 2;
        
        return (
          <Building
            key={file.filename}
            position={[x, 0, z]}
            file={file}
            onClick={onSelectFile}
            isSelected={selectedFile?.filename === file.filename}
          />
        );
      })}

      {/* AI Repair Drone */}
      <RepairDrone 
        startPos={droneBase}
        targetPos={healingFilePos}
        isActive={!!healingFile}
        onComplete={onHealComplete}
      />

      {/* AI Headquarters Building */}
      <group position={[droneBase[0], 0, droneBase[2]]}>
        {/* Foundation platform */}
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[2.2, 2.5, 0.2, 12]} />
          <meshStandardMaterial color="#1e3a5f" metalness={0.7} roughness={0.3} />
        </mesh>
        
        {/* Main building base */}
        <mesh position={[0, 1.2, 0]}>
          <boxGeometry args={[2.5, 2, 2.5]} />
          <meshStandardMaterial color="#1e40af" metalness={0.5} roughness={0.4} />
        </mesh>
        
        {/* Building middle section */}
        <mesh position={[0, 2.7, 0]}>
          <boxGeometry args={[2, 1.2, 2]} />
          <meshStandardMaterial color="#2563eb" metalness={0.6} roughness={0.3} />
        </mesh>
        
        {/* Control tower top */}
        <mesh position={[0, 3.8, 0]}>
          <cylinderGeometry args={[0.8, 1, 1, 8]} />
          <meshStandardMaterial color="#3b82f6" metalness={0.7} roughness={0.2} />
        </mesh>
        
        {/* Dome on top */}
        <mesh position={[0, 4.4, 0]}>
          <sphereGeometry args={[0.7, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#60a5fa" metalness={0.6} roughness={0.2} transparent opacity={0.8} />
        </mesh>
        
        {/* Glowing AI core */}
        <mesh position={[0, 4.2, 0]}>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} />
        </mesh>
        <pointLight position={[0, 4.2, 0]} intensity={2} distance={8} color="#00ffff" />
        
        {/* Windows - horizontal rows */}
        {[0.6, 1.2, 1.8].map((y, i) => (
          <React.Fragment key={i}>
            {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((angle, j) => (
              <mesh key={j} position={[Math.sin(angle) * 1.26, y, Math.cos(angle) * 1.26]} rotation={[0, angle, 0]}>
                <boxGeometry args={[0.6, 0.35, 0.05]} />
                <meshStandardMaterial color="#87CEEB" emissive="#87CEEB" emissiveIntensity={0.6} />
              </mesh>
            ))}
          </React.Fragment>
        ))}
        
        {/* Helipad on roof */}
        <mesh position={[0.8, 2.26, 0.8]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 0.35, 16]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0.8, 2.27, 0.8]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
          <boxGeometry args={[0.08, 0.25, 0.02]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0.8, 2.27, 0.8]} rotation={[-Math.PI / 2, 0, -Math.PI / 4]}>
          <boxGeometry args={[0.08, 0.25, 0.02]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
        </mesh>
        
        {/* Antenna array */}
        <mesh position={[0.8, 3.6, -0.8]}>
          <cylinderGeometry args={[0.03, 0.03, 1.2]} />
          <meshStandardMaterial color="#666" metalness={0.8} />
        </mesh>
        <mesh position={[0.8, 4.2, -0.8]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={1} />
        </mesh>
        <mesh position={[-0.8, 3.4, -0.8]}>
          <cylinderGeometry args={[0.025, 0.025, 0.8]} />
          <meshStandardMaterial color="#666" metalness={0.8} />
        </mesh>
        
        {/* Satellite dish */}
        <group position={[-0.8, 3.6, 0.8]} rotation={[Math.PI / 4, 0, 0]}>
          <mesh>
            <cylinderGeometry args={[0.3, 0.05, 0.1, 16]} />
            <meshStandardMaterial color="#888" metalness={0.6} />
          </mesh>
        </group>
        
        {/* Building entrance */}
        <mesh position={[0, 0.5, 1.3]}>
          <boxGeometry args={[0.8, 0.8, 0.1]} />
          <meshStandardMaterial color="#1e3a5f" />
        </mesh>
        <mesh position={[0, 0.5, 1.35]}>
          <boxGeometry args={[0.6, 0.6, 0.02]} />
          <meshStandardMaterial color="#87CEEB" emissive="#87CEEB" emissiveIntensity={0.4} />
        </mesh>
        
        {/* AI HQ Label */}
        <R3FHtml position={[0, 5, 0]} center>
          <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm px-4 py-2 rounded-xl font-bold shadow-2xl border-2 border-cyan-300 whitespace-nowrap">
            🤖 AI Repair HQ
          </div>
        </R3FHtml>
        
        {/* Active status when healing */}
        {!!healingFile && (
          <R3FHtml position={[0, 5.8, 0]} center>
            <div className="bg-green-500 text-white text-xs px-3 py-1.5 rounded-full font-bold animate-pulse shadow-xl">
              🔄 Dispatching Drone...
            </div>
          </R3FHtml>
        )}
      </group>
    </>
  );
};

// File Details Panel
const FileDetailsPanel: React.FC<{ 
  file: FileWithStatus | null; 
  onClose: () => void;
  onHeal: () => void;
  isHealing: boolean;
  isDarkMode?: boolean;
}> = ({ file, onClose, onHeal, isHealing, isDarkMode = true }) => {
  if (!file) return null;

  const errorCount = file.errors.filter(e => e.type === 'error').length;
  const warningCount = file.errors.filter(e => e.type === 'warning').length;
  const hasBugs = file.errors.length > 0 && !file.isHealed;

  return (
    <div className={`absolute top-24 right-4 w-96 ${isDarkMode ? 'bg-gray-900/95 border-gray-600' : 'bg-white/95 border-gray-300'} backdrop-blur-md border rounded-2xl p-5 ${isDarkMode ? 'text-white' : 'text-gray-900'} shadow-2xl z-10`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-4 h-4 rounded-full ${
            file.isHealed ? 'bg-green-500 shadow-green-500/50' : 
            hasBugs ? 'bg-red-500 animate-pulse shadow-red-500/50' : 
            'bg-green-500 shadow-green-500/50'
          } shadow-lg`}></div>
          <h3 className={`text-lg font-bold truncate max-w-[200px] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{file.filename}</h3>
        </div>
        <button onClick={onClose} className={`${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} text-xl transition-colors`}>✕</button>
      </div>
      
      {/* Stats badges */}
      <div className="flex gap-3 mb-5">
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 rounded-xl border border-red-500/30">
          <span className="text-xl">🐛</span>
          <span className="font-bold text-lg">{errorCount}</span>
          <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>bugs</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 rounded-xl border border-yellow-500/30">
          <span className="text-xl">⚠️</span>
          <span className="font-bold text-lg">{warningCount}</span>
          <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>warnings</span>
        </div>
      </div>

      {file.isHealed ? (
        <div className="text-center py-6 bg-gradient-to-br from-yellow-500/20 via-amber-500/20 to-orange-500/20 rounded-xl border border-yellow-500/30">
          <span className="text-5xl block mb-3">🏰</span>
          <p className={`font-bold text-lg ${isDarkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>Palace Built!</p>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Building transformed after healing</p>
          
          {/* Points earned with breakdown */}
          {file.pointsEarned && file.pointsEarned > 0 && file.metrics && (
            <div className={`mt-4 rounded-lg p-3 space-y-2 ${isDarkMode ? 'bg-yellow-500/20' : 'bg-yellow-500/30'}`}>
              <div className="flex items-center justify-between">
                <span className={`font-bold text-lg ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                  +{file.normalizedScore}/100
                </span>
                <span
                  className="px-2 py-0.5 rounded text-white text-sm font-bold"
                  style={{ backgroundColor: file.metrics?.gradeInfo?.color || '#gray' }}
                >
                  {file.grade}
                </span>
              </div>
              <div className="text-xs space-y-1 bg-white bg-opacity-20 rounded p-2">
                <div className="flex justify-between">
                  <span>Base:</span>
                  <span className="font-mono font-bold">{Math.round(((file.rawContribution ?? 0) / 100) * 100)}</span>
                </div>
                {file.metrics?.severityBreakdown?.critical > 0 && (
                  <div className="flex justify-between">
                    <span>🔴 Critical Bonus:</span>
                    <span className="font-mono font-bold text-green-600">+10</span>
                  </div>
                )}
                {file.metrics?.severityBreakdown?.high > 0 && file.metrics?.severityBreakdown?.critical === 0 && (
                  <div className="flex justify-between">
                    <span>🟠 High Bonus:</span>
                    <span className="font-mono font-bold text-green-600">+5</span>
                  </div>
                )}
                {file.metrics?.diversityBonus > 0 && (
                  <div className="flex justify-between">
                    <span>🎯 Diversity:</span>
                    <span className="font-mono font-bold text-green-600">+{file.metrics.diversityBonus}</span>
                  </div>
                )}
              </div>
              <div className="text-[10px] text-gray-500 text-center">
                Raw: {file.rawContribution ?? 0} pts
              </div>
            </div>
          )}
          
          {/* PR Created badge */}
          {file.prCreated && (
            <div className="mt-4 flex flex-col items-center justify-center gap-3">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                <span>🔀</span> Auto-Fix PR Created!
              </div>
              {file.prUrl && (
                <a 
                  href={file.prUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg hover:shadow-green-500/30 transition-all"
                >
                  <span>👁️</span> View PR on GitHub
                  <span>→</span>
                </a>
              )}
            </div>
          )}
        </div>
      ) : hasBugs ? (
        <>
          {/* Heal button */}
          <button
            onClick={onHeal}
            disabled={isHealing}
            className={`w-full py-4 px-4 rounded-xl font-bold text-white mb-5 flex items-center justify-center gap-3 transition-all text-lg ${
              isHealing 
                ? 'bg-blue-700 cursor-wait' 
                : 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 shadow-lg hover:shadow-purple-500/30'
            }`}
          >
            {isHealing ? (
              <>
                <span className="animate-spin text-2xl">🤖</span>
                <span>AI Drone Fixing...</span>
              </>
            ) : (
              <>
                <span className="text-2xl">🚀</span>
                <span>Deploy AI Fix Drone</span>
              </>
            )}
          </button>

          {/* Error list */}
          <div className="max-h-52 overflow-y-auto space-y-3 pr-1">
            {file.errors.map((error, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-xl border-l-4 ${
                  error.type === 'error' ? 'bg-red-500/10 border-red-500' : 'bg-yellow-500/10 border-yellow-500'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg">{error.type === 'error' ? '🐛' : '⚠️'}</span>
                  <div className="flex-1">
                    <div className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Line {error.line}</div>
                    <div className={`text-sm mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{error.message}</div>
                    {error.suggestion && (
                      <div className={`text-xs mt-2 flex items-start gap-1 p-2 rounded-lg ${
                        isDarkMode
                          ? 'text-blue-400 bg-blue-500/10'
                          : 'text-blue-700 bg-blue-500/20'
                      }`}>
                        <span>💡</span>
                        <span>{error.suggestion}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-8 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl border border-green-500/30">
          <span className="text-5xl block mb-3">✅</span>
          <p className="text-green-400 font-bold text-lg">Clean code!</p>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No bugs detected</p>
        </div>
      )}
    </div>
  );
};

// Main Component
const Codebase3DView: React.FC<Codebase3DViewProps> = ({ analysisResults, onClose, repoUrl, branchName, githubToken, totalPoints = 0, onPointsEarned, userId, userEmail }) => {
  const [selectedFile, setSelectedFile] = useState<FileWithStatus | null>(null);
  const [healingFile, setHealingFile] = useState<string | null>(null);
  const [filesState, setFilesState] = useState<FileWithStatus[]>([]);
  const [userTotalPoints, setUserTotalPoints] = useState<number>(totalPoints);
  const [prsCreated, setPrsCreated] = useState<number>(0);
  const [isCreatingPR, setIsCreatingPR] = useState<boolean>(false);
  const [latestPrUrl, setLatestPrUrl] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('system');
  const [isThemeOpen, setIsThemeOpen] = useState(false);

  // Update points when prop changes
  useEffect(() => {
    setUserTotalPoints(totalPoints);
  }, [totalPoints]);

  // Initialize files - only show REAL files from the repo
  useEffect(() => {
    const files: FileWithStatus[] = analysisResults.results.map(file => ({
      ...file,
      status: file.errors.some(e => e.type === 'error') ? 'red' as const : file.errors.some(e => e.type === 'warning') ? 'yellow' as const : 'green' as const,
      isHealing: false,
      isHealed: false,
      prCreated: false,
      pointsEarned: 0,
      normalizedScore: 0,
      grade: 'F',
      rawContribution: 0,
      metrics: null
    }));

    // No fake placeholders - only show actual analyzed files from the repo
    setFilesState(files);
  }, [analysisResults]);

  // Handle healing initiation
  const handleHealFile = (filename: string) => {
    if (healingFile) return; // Already healing
    
    setHealingFile(filename);
    
    // Mark file as healing
    setFilesState(prev => prev.map(f => 
      f.filename === filename ? { ...f, isHealing: true } : f
    ));
  };

  // Handle heal completion - creates actual PR
  const handleHealComplete = async () => {
    if (!healingFile) return;

    // Calculate points using realistic quality metrics
    const healedFileData = filesState.find(f => f.filename === healingFile);
    const errorsFixed = healedFileData?.errors || [];
    const metrics = calculateQualityMetrics(errorsFixed as any);
    const pointsEarned = metrics.rawContribution;  // Use raw contribution for cumulative points

    let prCreated = false;
    let prUrl: string | undefined = undefined;
    
    // Actually create PR if we have credentials
    if (repoUrl && githubToken && healedFileData) {
      setIsCreatingPR(true);
      try {
        const response = await fetch('/api/create-pr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repoUrl,
            branchName: branchName || 'main',
            githubToken,
            analysisResults: [healedFileData] // Only the healed file
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('PR created:', data);
          prCreated = true;
          prUrl = data.prUrl;
          setLatestPrUrl(data.prUrl);
        } else {
          const errorData = await response.json();
          console.error('Failed to create PR:', errorData);
          alert(`Failed to create PR: ${errorData.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error creating PR:', error);
        alert('Error creating PR. Check console for details.');
      } finally {
        setIsCreatingPR(false);
      }
    } else {
      // No credentials available
      alert('GitHub credentials not provided. PR simulation only.');
      prCreated = true; // For demo purposes
    }
    
    // Mark as healed with PR created and points
    setFilesState(prev => prev.map(f =>
      f.filename === healingFile ? {
        ...f,
        isHealing: false,
        isHealed: true,
        prCreated: prCreated,
        prUrl: prUrl,
        pointsEarned: pointsEarned,
        normalizedScore: metrics.normalizedScore,
        grade: metrics.grade,
        rawContribution: metrics.rawContribution,
        metrics: metrics,
        errors: [],
        status: 'green' as const
      } : f
    ));

    // Update selected file if it was the one being healed
    setSelectedFile(prev =>
      prev?.filename === healingFile ? {
        ...prev,
        isHealed: true,
        prCreated: prCreated,
        prUrl: prUrl,
        pointsEarned: pointsEarned,
        normalizedScore: metrics.normalizedScore,
        grade: metrics.grade,
        rawContribution: metrics.rawContribution,
        metrics: metrics,
        errors: [],
        status: 'green' as const
      } : prev
    );

    // Update total points and PR count - notify parent
    setUserTotalPoints(prev => prev + metrics.normalizedScore);
    if (onPointsEarned) {
      onPointsEarned(metrics.normalizedScore);
    }
    if (prCreated) {
      setPrsCreated(prev => prev + 1);
    }

    // Save points to database
    if (userId) {
      try {
        await fetch('/api/save-points', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            userEmail: userEmail || '',
            points: metrics.rawContribution,  // Raw contribution points
            score: metrics.normalizedScore,   // Normalized score 0-100
            grade: metrics.grade,             // Letter grade
            prUrl: prUrl,
            prNumber: 0,
            repoName: analysisResults.repoName || '',
            branchName: branchName || 'main',
            bugsFixed: errorsFixed.map(e => ({
              filename: healingFile,
              severity: e.severity || 'low',
              message: e.message,
            })),
            severityBreakdown: metrics.severityBreakdown,
            qualityMetrics: metrics,
          }),
        });
      } catch (err) {
        console.error('Failed to save points to database:', err);
      }
    }

    setHealingFile(null);
  };

  const bugsRemaining = filesState.filter(f => f.errors.length > 0 && !f.isHealed).length;
  const healedCount = filesState.filter(f => f.isHealed).length;

  // Determine if dark mode is active
  const isDarkMode = themeMode === 'dark' || (themeMode === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div className={`fixed inset-0 z-[6000] ${isDarkMode ? 'bg-gradient-to-b from-gray-900 via-gray-900 to-black' : 'bg-gradient-to-b from-gray-50 via-white to-gray-100'}`}>
      {/* Header */}
      <div className={`absolute top-0 left-0 right-0 z-20 ${isDarkMode ? 'bg-gradient-to-b from-black/95 to-transparent' : 'bg-gradient-to-b from-gray-100/95 to-transparent'} p-4 pb-8`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h2 className={`text-3xl font-bold flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <span className="text-4xl">🏙️</span> 
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Code City
              </span>
              <span className={`text-lg font-normal ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>- Self Healing View</span>
            </h2>
            <p className={`text-sm mt-1 ml-14 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{analysisResults.repoName}</p>
          </div>
          
          {/* Points & Stats Display */}
          <div className="flex items-center gap-4">
            {/* User Total Points */}
            <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/50 rounded-xl px-5 py-2.5 flex items-center gap-3">
              <span className="text-2xl">⭐</span>
              <div>
                <p className={`text-xs font-medium ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>TOTAL POINTS</p>
                <p className={`text-2xl font-bold ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>{userTotalPoints.toLocaleString()}</p>
              </div>
            </div>

            {/* PRs Created */}
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/50 rounded-xl px-5 py-2.5 flex items-center gap-3">
              <span className="text-2xl">🔀</span>
              <div>
                <p className={`text-xs font-medium ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>PRs CREATED</p>
                <p className={`text-2xl font-bold ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>{prsCreated}</p>
              </div>
            </div>

            {/* Bugs Fixed */}
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-xl px-5 py-2.5 flex items-center gap-3">
              <span className="text-2xl">🏰</span>
              <div>
                <p className={`text-xs font-medium ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>PALACES BUILT</p>
                <p className={`text-2xl font-bold ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>{healedCount}</p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className={`px-6 py-2.5 rounded-xl transition-all font-medium flex items-center gap-2 ml-2 ${
                isDarkMode
                  ? 'bg-white/10 hover:bg-white/20 border border-white/30 text-white'
                  : 'bg-gray-900/10 hover:bg-gray-900/20 border border-gray-900/30 text-gray-900'
              }`}
            >
              <span>←</span> Back
            </button>

            {/* Theme Toggle */}
            <div className="relative ml-3">
              <button
                onClick={() => setIsThemeOpen(!isThemeOpen)}
                className={`p-2.5 transition-all rounded-xl ${
                  isDarkMode 
                    ? 'bg-white/10 hover:bg-white/20 border border-white/30 text-white' 
                    : 'bg-gray-900/10 hover:bg-gray-900/20 border border-gray-900/30 text-gray-900'
                }`}
                title="Toggle theme"
              >
                {themeMode === 'light' && <span className="text-lg">☀️</span>}
                {themeMode === 'dark' && <span className="text-lg">🌙</span>}
                {themeMode === 'system' && <span className="text-lg">🖥️</span>}
              </button>

              {isThemeOpen && (
                <div className={`absolute right-0 mt-2 w-40 border rounded-xl shadow-2xl z-50 ${
                  isDarkMode
                    ? 'bg-gray-900/95 border-white/30'
                    : 'bg-white/95 border-gray-300'
                }`}>
                  <button
                    onClick={() => {
                      setThemeMode('light');
                      setIsThemeOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left flex items-center gap-2 transition-all border-b ${
                      themeMode === 'light'
                        ? isDarkMode
                          ? 'bg-blue-500/30 border-white/10 text-white'
                          : 'bg-blue-500/20 border-gray-300 text-gray-900'
                        : isDarkMode
                          ? 'border-white/10 text-gray-300 hover:bg-white/5'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-900/5'
                    }`}
                  >
                    <span>☀️</span> Light
                  </button>
                  <button
                    onClick={() => {
                      setThemeMode('dark');
                      setIsThemeOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left flex items-center gap-2 transition-all border-b ${
                      themeMode === 'dark'
                        ? isDarkMode
                          ? 'bg-blue-500/30 border-white/10 text-white'
                          : 'bg-blue-500/20 border-gray-300 text-gray-900'
                        : isDarkMode
                          ? 'border-white/10 text-gray-300 hover:bg-white/5'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-900/5'
                    }`}
                  >
                    <span>🌙</span> Dark
                  </button>
                  <button
                    onClick={() => {
                      setThemeMode('system');
                      setIsThemeOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left flex items-center gap-2 transition-all rounded-b-xl ${
                      themeMode === 'system'
                        ? isDarkMode
                          ? 'bg-blue-500/30 text-white'
                          : 'bg-blue-500/20 text-gray-900'
                        : isDarkMode
                          ? 'text-gray-300 hover:bg-white/5'
                          : 'text-gray-600 hover:bg-gray-900/5'
                    }`}
                  >
                    <span>🖥️</span> System
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Legend Panel */}
      <div className={`absolute bottom-4 left-4 z-20 ${isDarkMode ? 'bg-gray-900/95 border-gray-700' : 'bg-white/95 border-gray-300'} backdrop-blur-md border rounded-2xl p-5 shadow-xl`}>
        <h4 className={`font-bold mb-4 flex items-center gap-2 text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          <span>📍</span> How It Works
        </h4>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-green-500 shadow-lg shadow-green-500/40"></div>
            <span className={isDarkMode ? 'text-gray-200' : 'text-gray-700'}>✅ Clean building</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-yellow-500 shadow-lg shadow-yellow-500/40"></div>
            <span className={isDarkMode ? 'text-gray-200' : 'text-gray-700'}>⚠️ Has warnings</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-red-500 shadow-lg shadow-red-500/40 animate-pulse"></div>
            <span className={isDarkMode ? 'text-gray-200' : 'text-gray-700'}>🐛 Bug monster!</span>
          </div>
        </div>
        <div className={`mt-5 pt-4 border-t ${isDarkMode ? 'border-gray-700 text-gray-400' : 'border-gray-300 text-gray-600'} space-y-2 text-xs`}>
          <p className="flex items-center gap-2">
            <span className="text-base">1️⃣</span> Buggy code → Red building + Bug monster
          </p>
          <p className="flex items-center gap-2">
            <span className="text-base">2️⃣</span> Click building → Deploy AI drone
          </p>
          <p className="flex items-center gap-2">
            <span className="text-base">3️⃣</span> Drone fixes → Monster vanishes
          </p>
          <p className="flex items-center gap-2">
            <span className="text-base">4️⃣</span> Building turns green! ✨
          </p>
        </div>
        <div className={`mt-4 pt-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
          <p className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>🏛️ SVKM Campus Landmarks:</p>
          <div className={`grid grid-cols-2 gap-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <span>🎓 DJSCE</span>
            <span>🏛️ NMIMS</span>
            <span>📚 Bhagubhai</span>
            <span>🎭 Mukesh Patel</span>
            <span>🏫 CNMS</span>
          </div>
        </div>
      </div>

      {/* Stats Panel */}
      <div className={`absolute bottom-4 right-4 z-20 ${isDarkMode ? 'bg-gray-900/95 border-gray-700' : 'bg-white/95 border-gray-300'} backdrop-blur-md border rounded-2xl p-5 shadow-xl`}>
        <div className="grid grid-cols-3 gap-6 text-center mb-4">
          <div>
            <div className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{analysisResults.totalFiles}</div>
            <div className={`text-xs text-gray-400 mt-1 ${!isDarkMode ? 'text-gray-600' : ''}`}>Total Files</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-400">{analysisResults.analyzedFiles}</div>
            <div className={`text-xs text-gray-400 mt-1 ${!isDarkMode ? 'text-gray-600' : ''}`}>Analyzed</div>
          </div>
          <div>
            <div className={`text-3xl font-bold ${bugsRemaining > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {bugsRemaining}
            </div>
            <div className={`text-xs text-gray-400 mt-1 ${!isDarkMode ? 'text-gray-600' : ''}`}>Bugs Left</div>
          </div>
        </div>
        
        {/* Auto-heal button */}
        {bugsRemaining > 0 && (
          <button
            onClick={() => {
              const buggyFile = filesState.find(f => f.errors.length > 0 && !f.isHealed && !f.isHealing);
              if (buggyFile) handleHealFile(buggyFile.filename);
            }}
            disabled={!!healingFile}
            className={`w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              healingFile 
                ? 'bg-gray-600 cursor-wait' 
                : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-green-500/30'
            }`}
          >
            {healingFile ? (
              <>
                <span className="animate-spin">🤖</span> Healing in progress...
              </>
            ) : (
              <>
                <span>🚀</span> Auto-Heal Bug
              </>
            )}
          </button>
        )}
        
        {bugsRemaining === 0 && filesState.length > 0 && (
          <div className="text-center py-3 bg-green-500/20 rounded-xl border border-green-500/30">
            <span className="text-2xl">🎉</span>
            <p className="text-green-400 font-bold text-sm mt-1">All bugs fixed!</p>
          </div>
        )}
      </div>

      {/* File Details Panel */}
      <FileDetailsPanel 
        file={selectedFile} 
        onClose={() => setSelectedFile(null)}
        onHeal={() => selectedFile && handleHealFile(selectedFile.filename)}
        isHealing={!!healingFile}
        isDarkMode={isDarkMode}
      />

      {/* 3D Canvas */}
      <div className="absolute inset-0 w-full h-full">
        <R3FCanvas 
          shadows
          camera={{ position: [20, 16, 20], fov: 50 }}
          style={{ width: '100%', height: '100%' }}
          onClick={() => setSelectedFile(null)}
        >
          <color attach="background" args={[isDarkMode ? '#05050f' : '#d4eef5']} />
          <Suspense fallback={null}>
            <Scene 
              files={filesState} 
              onSelectFile={setSelectedFile}
              selectedFile={selectedFile}
              healingFile={healingFile}
              onHealComplete={handleHealComplete}
              isDarkMode={isDarkMode}
            />
          </Suspense>
        </R3FCanvas>
      </div>

      {/* Controls hint */}
      <div className="absolute top-24 left-4 z-20 bg-black/60 backdrop-blur-sm rounded-xl p-3 text-sm text-gray-300">
        <p className="flex items-center gap-2 mb-1"><span>🖱️</span> Drag to orbit</p>
        <p className="flex items-center gap-2 mb-1"><span>🔍</span> Scroll to zoom</p>
        <p className="flex items-center gap-2"><span>👆</span> Click building for details</p>
      </div>
    </div>
  );
};

export default Codebase3DView;
