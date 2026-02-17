'use client';

import { useEffect, useRef, useCallback } from 'react';
import createGlobe from 'cobe';

export interface VoteLocation {
  lat: number;
  lng: number;
  vote_count: number;
  country_code?: string | null;
}

interface VoteGlobeProps {
  locations: VoteLocation[];
  width?: number;
  height?: number;
  className?: string;
}

export function VoteGlobe({ locations, width = 600, height = 600, className }: VoteGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef<[number, number]>([0, 0]);
  const phiRef = useRef(0);

  const maxVotes = Math.max(1, ...locations.map((l) => l.vote_count));

  // Convert lat/lng to cobe marker format
  const markers = locations.map((loc) => ({
    location: [loc.lat, loc.lng] as [number, number],
    size: Math.max(0.03, (loc.vote_count / maxVotes) * 0.15),
  }));

  const onRender = useCallback(
    (state: Record<string, unknown>) => {
      // Auto-rotate, but allow pointer drag to influence
      state.phi = phiRef.current;
      phiRef.current += 0.003;

      // Apply pointer interaction
      const [pointerX] = pointerRef.current;
      phiRef.current += pointerX;
      pointerRef.current[0] *= 0.95; // dampen
      state.width = width * 2;
      state.height = height * 2;
    },
    [width, height]
  );

  useEffect(() => {
    if (!canvasRef.current) return;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: width * 2,
      height: height * 2,
      phi: 0,
      theta: 0.25,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.3, 0.3, 0.3],
      markerColor: [0.4, 0.7, 1],
      glowColor: [0.15, 0.2, 0.35],
      markers,
      onRender,
    });

    return () => globe.destroy();
  }, [markers, width, height, onRender]);

  return (
    <div className={className} style={{ position: 'relative', width, height }}>
      <canvas
        ref={canvasRef}
        onPointerDown={(e) => {
          (e.target as HTMLCanvasElement).style.cursor = 'grabbing';
        }}
        onPointerUp={(e) => {
          (e.target as HTMLCanvasElement).style.cursor = 'grab';
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) {
            pointerRef.current = [
              e.movementX / 100,
              e.movementY / 100,
            ];
          }
        }}
        style={{
          width,
          height,
          cursor: 'grab',
          contain: 'layout paint size',
          opacity: 1,
        }}
      />
    </div>
  );
}
