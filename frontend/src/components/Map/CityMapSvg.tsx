import React, { useState, useRef, useEffect } from 'react';
import {
  Ambulance, Ship, Truck, Shield, Building2, AlertTriangle,
  ZoomIn, ZoomOut, Maximize2, Compass
} from 'lucide-react';
import { useReliefStore } from '../../store/useReliefStore';
import { Node, Edge, Vehicle, Incident, Shelter, Depot } from '../../lib/types';
import { WeatherCanvas } from './WeatherCanvas';
import { ChaosControls } from './ChaosControls';

export const CityMapSvg: React.FC = () => {
  const state = useReliefStore((s) => s.state);
  const chaosMode = useReliefStore((s) => s.chaosMode);
  const toggleRoad = useReliefStore((s) => s.toggleRoad);
  const createSos = useReliefStore((s) => s.createSos);
  const weatherRainEnabled = useReliefStore((s) => s.weatherRainEnabled);
  const selectedEntity = useReliefStore((s) => s.selectedEntity);
  const setSelectedEntity = useReliefStore((s) => s.setSelectedEntity);

  // Zoom and Pan
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Smooth vehicle coordinates interpolation using requestAnimationFrame
  const [animatedVehicles, setAnimatedVehicles] = useState<Record<string, { x: number; y: number; angle: number }>>({});

  useEffect(() => {
    if (!state) return;
    setAnimatedVehicles((prev) => {
      const next: Record<string, { x: number; y: number; angle: number }> = {};
      for (const [vid, veh] of Object.entries(state.vehicles)) {
        const old = prev[vid];
        if (!old) {
          next[vid] = { x: veh.x, y: veh.y, angle: 0 };
        } else {
          const dx = veh.x - old.x;
          const dy = veh.y - old.y;
          const dist = Math.hypot(dx, dy);
          const angle = dist > 0.5 ? Math.atan2(dy, dx) * (180 / Math.PI) : old.angle;
          next[vid] = {
            x: old.x + (veh.x - old.x) * 0.35,
            y: old.y + (veh.y - old.y) * 0.35,
            angle,
          };
        }
      }
      return next;
    });
  }, [state]);

  // Animation frame loop for vehicle movement easing
  useEffect(() => {
    let frameId: number;
    const animate = () => {
      if (state) {
        setAnimatedVehicles((prev) => {
          let changed = false;
          const updated = { ...prev };
          for (const [vid, veh] of Object.entries(state.vehicles)) {
            const current = updated[vid];
            if (current) {
              const dx = veh.x - current.x;
              const dy = veh.y - current.y;
              if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
                current.x += dx * 0.2;
                current.y += dy * 0.2;
                changed = true;
              }
            }
          }
          return changed ? updated : prev;
        });
      }
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [state]);

  // Pan & Zoom Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && chaosMode === 'none') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
    setZoom((z) => Math.min(2.8, Math.max(0.65, z * zoomFactor)));
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (chaosMode === 'sos') {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const clickX = (e.clientX - rect.left - pan.x) / zoom;
      const clickY = (e.clientY - rect.top - pan.y) / zoom;
      createSos(undefined, clickX, clickY);
    } else {
      // Clear selection if clicking empty space
      const target = e.target as HTMLElement;
      if (target.tagName === 'svg' || target.id === 'bg-rect') {
        setSelectedEntity(null);
      }
    }
  };

  const resetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  if (!state) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#070B14] text-slate-500 font-mono text-sm">
        Initializing Municipal Topology Stream...
      </div>
    );
  }

  const nodes = state.nodes;
  const edges = state.edges;
  const vehicles = state.vehicles;
  const incidents = state.incidents;
  const shelters = state.shelters;
  const depots = state.depots;

  return (
    <div
      className={`relative w-full h-full bg-[#070B14] overflow-hidden select-none ${
        chaosMode === 'flood' ? 'cursor-pointer' : chaosMode === 'sos' ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Floating Chaos Controls Toolbar */}
      <ChaosControls />

      {/* Weather Layer: Subtle Canvas Rain */}
      <WeatherCanvas enabled={weatherRainEnabled} intensity={state.scenario_name.includes('Cyclone') ? 1.8 : 1.0} />

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        viewBox="0 0 1000 750"
        className="w-full h-full"
        onClick={handleSvgClick}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        <defs>
          {/* Tactical Background Grid */}
          <pattern id="tac-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(56, 189, 248, 0.05)" strokeWidth="1" />
          </pattern>

          {/* Flowing Water Gradient */}
          <linearGradient id="riverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0369a1" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#0284c7" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#075985" stopOpacity="0.45" />
          </linearGradient>

          {/* Flooded Road Pulsing Hazard Stripe Pattern */}
          <pattern id="floodHatch" width="20" height="20" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="20" stroke="#38bdf8" strokeWidth="8" strokeOpacity="0.75" />
            <line x1="10" y1="0" x2="10" y2="20" stroke="#0284c7" strokeWidth="8" strokeOpacity="0.5" />
          </pattern>

          {/* Glow Filters */}
          <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="glow-red" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Base Map Background */}
        <rect id="bg-rect" width="1000" height="750" fill="#070B14" />
        <rect width="1000" height="750" fill="url(#tac-grid)" pointerEvents="none" />

        {/* 2. Stylized Urban Sectors / Terrain Footprints */}
        {/* West Sector Downtown High Ground */}
        <path
          d="M 60,60 L 410,70 L 430,420 L 330,660 L 80,640 Z"
          fill="rgba(15, 23, 42, 0.45)"
          stroke="rgba(56, 189, 248, 0.08)"
          strokeWidth="1"
        />
        {/* East Sector Coastal Plain & Lowlands */}
        <path
          d="M 570,80 L 930,90 L 950,680 L 590,660 Z"
          fill="rgba(12, 28, 48, 0.45)"
          stroke="rgba(56, 189, 248, 0.08)"
          strokeWidth="1"
        />
        {/* Far East Ocean Water Body */}
        <path
          d="M 940,0 L 1000,0 L 1000,750 L 945,750 C 930,550 940,300 940,0 Z"
          fill="rgba(2, 44, 75, 0.5)"
          stroke="rgba(56, 189, 248, 0.2)"
        />

        {/* 3. The Curving Natural River Channel */}
        <path
          d="M 450,0 C 470,120 400,240 450,380 C 490,490 530,620 570,750 L 520,750 C 480,620 440,490 400,380 C 350,240 420,120 400,0 Z"
          fill="url(#riverGrad)"
          stroke="rgba(56, 189, 248, 0.3)"
          strokeWidth="1.5"
        />
        {/* Flowing Water Texture Lines */}
        <path
          d="M 425,10 C 445,130 375,250 425,380 C 465,490 505,620 545,740"
          fill="none"
          stroke="rgba(147, 197, 253, 0.25)"
          strokeWidth="2"
          strokeDasharray="16 24"
          className="animate-pulse"
        />

        {/* 4. Road Network Edges */}
        {Object.values(edges).map((edge) => {
          const n1 = nodes[edge.from_node];
          const n2 = nodes[edge.to_node];
          if (!n1 || !n2) return null;

          const isFlooded = edge.status === 'flooded';
          const isBridge = edge.is_bridge;
          const isSelected = selectedEntity?.type === 'edge' && selectedEntity.id === edge.id;

          return (
            <g
              key={edge.id}
              onClick={(e) => {
                e.stopPropagation();
                if (chaosMode === 'flood') {
                  toggleRoad(edge.id);
                } else {
                  setSelectedEntity({ type: 'edge', id: edge.id });
                }
              }}
              className="cursor-pointer group"
            >
              {/* Invisible Wide Hitbox for Easy Clicking */}
              <line
                x1={n1.x}
                y1={n1.y}
                x2={n2.x}
                y2={n2.y}
                stroke="transparent"
                strokeWidth="22"
              />

              {/* Road Underlay */}
              <line
                x1={n1.x}
                y1={n1.y}
                x2={n2.x}
                y2={n2.y}
                stroke="#0f172a"
                strokeWidth={isBridge ? 9 : 6}
                strokeLinecap="round"
              />

              {/* Bridge Distinct Suspension / Truss Graphics */}
              {isBridge && (
                <line
                  x1={n1.x}
                  y1={n1.y}
                  x2={n2.x}
                  y2={n2.y}
                  stroke="#334155"
                  strokeWidth="11"
                  strokeDasharray="4 6"
                />
              )}

              {/* Road Main Center Line */}
              <line
                x1={n1.x}
                y1={n1.y}
                x2={n2.x}
                y2={n2.y}
                stroke={
                  isFlooded
                    ? '#ef4444'
                    : isBridge
                    ? '#38bdf8'
                    : isSelected
                    ? '#22d3ee'
                    : 'rgba(56, 189, 248, 0.45)'
                }
                strokeWidth={isFlooded ? 4 : isBridge ? 3 : 2}
                strokeDasharray={isBridge ? '8 4' : undefined}
                className={isFlooded ? 'animate-pulse' : 'group-hover:stroke-cyan-300 transition-colors'}
              />

              {/* Flooded Animated Water Wave Overlay */}
              {isFlooded && (
                <line
                  x1={n1.x}
                  y1={n1.y}
                  x2={n2.x}
                  y2={n2.y}
                  stroke="url(#floodHatch)"
                  strokeWidth="14"
                  strokeOpacity="0.85"
                  className="animate-pulse-fast"
                />
              )}

              {/* Bridge Label Pill */}
              {isBridge && (
                <g transform={`translate(${(n1.x + n2.x) / 2}, ${(n1.y + n2.y) / 2})`}>
                  <rect
                    x="-24"
                    y="-8"
                    width="48"
                    height="16"
                    rx="4"
                    fill={isFlooded ? '#7f1d1d' : '#0f172a'}
                    stroke={isFlooded ? '#ef4444' : '#38bdf8'}
                    strokeWidth="1"
                    className="shadow-md"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill={isFlooded ? '#fca5a5' : '#38bdf8'}
                    fontSize="8"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {isFlooded ? 'CLOSED' : 'BRIDGE'}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* 5. Planned Vehicle Route Trails (Glowing dashed polylines) */}
        {Object.values(vehicles).map((veh) => {
          if (!veh.path || veh.path.length < 2 || veh.state === 'idle') return null;

          const points: string[] = [`${veh.x},${veh.y}`];
          for (let i = 1; i < veh.path.length; i++) {
            const node = nodes[veh.path[i]];
            if (node) points.push(`${node.x},${node.y}`);
          }

          const routeColor =
            veh.type === 'ambulance' ? '#f43f5e' : veh.type === 'boat' ? '#06b6d4' : '#f59e0b';

          return (
            <polyline
              key={`trail_${veh.id}`}
              points={points.join(' ')}
              fill="none"
              stroke={routeColor}
              strokeWidth="2.5"
              strokeDasharray="6 6"
              strokeOpacity="0.7"
              filter="url(#glow-cyan)"
              className="pointer-events-none"
            />
          );
        })}

        {/* 6. Junction Nodes (Dots) */}
        {Object.values(nodes).map((node) => {
          if (node.type !== 'junction') return null;
          const isSelected = selectedEntity?.type === 'node' && selectedEntity.id === node.id;

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedEntity({ type: 'node', id: node.id });
              }}
              className="cursor-pointer group"
            >
              <circle
                r={isSelected ? 6 : 3.5}
                fill={isSelected ? '#22d3ee' : '#1e293b'}
                stroke={isSelected ? '#ffffff' : 'rgba(56, 189, 248, 0.4)'}
                strokeWidth={isSelected ? 2 : 1}
                className="group-hover:fill-cyan-400 transition"
              />
              <text
                y="-6"
                textAnchor="middle"
                fill="rgba(148, 163, 184, 0.65)"
                fontSize="8"
                fontFamily="monospace"
                className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              >
                {node.id}
              </text>
            </g>
          );
        })}

        {/* 7. Shelters (Safe Fortress Rings & Capacity Bars) */}
        {Object.values(shelters).map((shelter) => {
          const isOverflow = shelter.status === 'overflowed';
          const isFull = shelter.status === 'full';
          const freePct = Math.max(0, (shelter.beds_free - shelter.beds_reserved) / shelter.beds_total);
          const reservedPct = Math.min(1.0, shelter.beds_reserved / shelter.beds_total);
          const circumference = 2 * Math.PI * 18;

          return (
            <g
              key={shelter.id}
              transform={`translate(${shelter.x}, ${shelter.y})`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedEntity({ type: 'shelter', id: shelter.id });
              }}
              className="cursor-pointer group"
            >
              {/* Overflow Pulsing Red Warning Aura */}
              {isOverflow && (
                <circle
                  r="30"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="3"
                  className="animate-ping"
                />
              )}

              {/* Base Shelter Glow Ring */}
              <circle
                r="22"
                fill="#070B14"
                stroke={isOverflow ? '#ef4444' : isFull ? '#f59e0b' : '#10b981'}
                strokeWidth="2"
                className="shadow-xl"
              />

              {/* Circular Capacity Progress: Reserved (Purple) */}
              <circle
                r="18"
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="3"
                strokeDasharray={`${reservedPct * circumference} ${circumference}`}
                transform="rotate(-90)"
              />

              {/* Circular Capacity Progress: Free (Green) */}
              <circle
                r="18"
                fill="none"
                stroke={isOverflow ? '#ef4444' : '#10b981'}
                strokeWidth="3"
                strokeDasharray={`${freePct * circumference} ${circumference}`}
                transform={`rotate(${-90 + reservedPct * 360})`}
              />

              {/* Shelter Icon */}
              <g transform="translate(-8, -8)">
                <Shield
                  className={`w-4 h-4 ${
                    isOverflow ? 'text-rose-400 animate-bounce' : isFull ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                />
              </g>

              {/* Shelter Name & Capacity Badge */}
              <g transform="translate(0, 32)">
                <rect
                  x="-42"
                  y="-10"
                  width="84"
                  height="20"
                  rx="4"
                  fill="#0f172a"
                  stroke={isOverflow ? '#ef4444' : 'rgba(56, 189, 248, 0.4)'}
                  strokeWidth="1"
                  className="shadow-lg"
                />
                <text
                  x="0"
                  y="3"
                  textAnchor="middle"
                  fill={isOverflow ? '#fca5a5' : '#f8fafc'}
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {shelter.beds_free}/{shelter.beds_total} BEDS
                </text>
              </g>
            </g>
          );
        })}

        {/* 8. Vehicle Depots */}
        {Object.values(depots).map((depot) => (
          <g
            key={depot.id}
            transform={`translate(${depot.x}, ${depot.y})`}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEntity({ type: 'node', id: depot.id });
            }}
            className="cursor-pointer group"
          >
            <circle
              r="18"
              fill="#0f172a"
              stroke="#06b6d4"
              strokeWidth="2"
              className="shadow-lg group-hover:scale-110 transition-transform"
            />
            <g transform="translate(-7, -7)">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
            </g>
            <text
              y="28"
              textAnchor="middle"
              fill="#38bdf8"
              fontSize="8"
              fontFamily="monospace"
              fontWeight="bold"
            >
              DEPOT
            </text>
          </g>
        ))}

        {/* 9. SOS Emergency Incident Pins (Radar Pulse Rings & Severity Badges) */}
        {Object.values(incidents).map((inc) => {
          if (inc.status === 'resolved') return null;

          const isCritical = inc.type === 'critical_medical';
          const isStranded = inc.type === 'stranded_family';
          const pinColor = isCritical ? '#ef4444' : isStranded ? '#f59e0b' : '#06b6d4';
          const isAssigned = inc.status === 'assigned' || inc.status === 'in_progress';

          return (
            <g
              key={inc.id}
              transform={`translate(${inc.x}, ${inc.y})`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedEntity({ type: 'sos', id: inc.id });
              }}
              className="cursor-pointer"
            >
              {/* Concentric Radar Pulsing Rings */}
              <circle
                r="24"
                fill="none"
                stroke={pinColor}
                strokeWidth="1.5"
                className={isCritical ? 'animate-ping-slow' : 'animate-radar'}
                opacity="0.8"
              />
              <circle
                r="16"
                fill="none"
                stroke={pinColor}
                strokeWidth="1"
                opacity="0.5"
              />

              {/* Center Pin Aura */}
              <circle
                r="11"
                fill={pinColor}
                filter={isCritical ? 'url(#glow-red)' : 'url(#glow-cyan)'}
                className={isCritical ? 'animate-pulse' : ''}
              />

              {/* People Count Inside Pin */}
              <text
                x="0"
                y="3.5"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {inc.people_count}
              </text>

              {/* Status Pill Tag */}
              <g transform="translate(0, -18)">
                <rect
                  x="-26"
                  y="-8"
                  width="52"
                  height="16"
                  rx="4"
                  fill="#070B14"
                  stroke={pinColor}
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="3"
                  textAnchor="middle"
                  fill={pinColor}
                  fontSize="8"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {isAssigned ? 'UNIT EN ROUTE' : `PRIO ${Math.round(inc.priority_score)}`}
                </text>
              </g>
            </g>
          );
        })}

        {/* 10. Emergency Vehicles with Smooth Interpolated Heading & Status */}
        {Object.values(vehicles).map((veh) => {
          const anim = animatedVehicles[veh.id] || { x: veh.x, y: veh.y, angle: 0 };
          const isStuck = veh.state === 'stuck';
          const isRerouting = veh.reroute_flash;
          const isAmbulance = veh.type === 'ambulance';
          const isBoat = veh.type === 'boat';

          const iconColor = isAmbulance ? '#ef4444' : isBoat ? '#06b6d4' : '#f59e0b';

          return (
            <g
              key={veh.id}
              transform={`translate(${anim.x}, ${anim.y})`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedEntity({ type: 'vehicle', id: veh.id });
              }}
              className="cursor-pointer"
            >
              {/* Stuck Water Hazard Alarm */}
              {isStuck && (
                <circle
                  r="22"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="3"
                  className="animate-ping"
                />
              )}

              {/* Vehicle Hull Glow */}
              <circle
                r="14"
                fill="#0f172a"
                stroke={isStuck ? '#ef4444' : iconColor}
                strokeWidth="2"
                filter="url(#glow-cyan)"
                className="shadow-xl"
              />

              {/* Rotating Vehicle Direction Hull */}
              <g transform={`rotate(${anim.angle})`}>
                <polygon
                  points="14,0 8,-5 8,5"
                  fill={iconColor}
                />
              </g>

              {/* Vehicle Icon */}
              <g transform="translate(-7, -7)">
                {isAmbulance ? (
                  <Ambulance className="w-3.5 h-3.5 text-rose-400" />
                ) : isBoat ? (
                  <Ship className="w-3.5 h-3.5 text-cyan-400" />
                ) : (
                  <Truck className="w-3.5 h-3.5 text-amber-400" />
                )}
              </g>

              {/* Rerouting Morph Flash Badge */}
              {isRerouting && (
                <g transform="translate(0, -22)" className="animate-bounce">
                  <rect
                    x="-32"
                    y="-7"
                    width="64"
                    height="14"
                    rx="3"
                    fill="#b91c1c"
                    stroke="#fca5a5"
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="7"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    REROUTING!
                  </text>
                </g>
              )}

              {/* ETA / Load Tag */}
              {veh.state !== 'idle' && !isRerouting && (
                <g transform="translate(0, 18)">
                  <rect
                    x="-24"
                    y="-6"
                    width="48"
                    height="13"
                    rx="3"
                    fill="#020617"
                    stroke="rgba(56, 189, 248, 0.3)"
                    strokeWidth="0.8"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="7.5"
                    fontFamily="monospace"
                  >
                    {isStuck ? 'STUCK' : `ETA ${Math.max(1, Math.round(veh.eta_to_target))}m`}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Map Zoom & Pan Navigation Controls */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col space-y-1.5 glass-panel p-1.5 rounded-xl border border-cyan-500/20 shadow-2xl">
        <button
          onClick={() => setZoom((z) => Math.min(2.8, z * 1.2))}
          className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 transition"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.65, z * 0.8))}
          className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 transition"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 transition"
          title="Reset Map View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-6 left-6 z-20 glass-panel p-2.5 rounded-xl border border-slate-800 text-[11px] font-mono shadow-2xl space-y-1.5 max-w-xs select-none">
        <div className="flex items-center space-x-2 text-slate-400 font-bold border-b border-slate-800 pb-1">
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          <span>MAP TELEMETRY LEGEND</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-300">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span>Critical SOS</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Stranded Family</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span>Supply Request</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
            <span>Safe Shelter</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-1 bg-cyan-400" />
            <span>Clear Road</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-1 bg-rose-500 animate-pulse" />
            <span>Flooded Road</span>
          </div>
        </div>
      </div>
    </div>
  );
};
