import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, LayersControl, Tooltip, useMap } from 'react-leaflet';
import { Save, X, Trash2, Undo, Layers, Eye, Beef } from 'lucide-react';
import L from 'leaflet';
import { COLORES_CULTIVO, COLORES_USO_SUELO, getColorByHeight, getPasturaHeightLegend } from '../lib/mapLayers.config';
import { calcularSuperficie } from '../services/geospatial';

// Componente para renderizar NDVI real desde Sentinel Hub
function NDVIWMSLayer({ ndviDate }) {
  const map = useMap();
  const layerRef = useRef(null);
  const SENTINEL_HUB_INSTANCE_ID = import.meta.env.VITE_SENTINEL_HUB_INSTANCE_ID;

  useEffect(() => {
    if (!map || !SENTINEL_HUB_INSTANCE_ID) return;

    // Calcular fechas para el satélite (ventana de 30 días)
    let endDate, startDate;
    if (ndviDate) {
      const date = new Date(ndviDate);
      endDate = date.toISOString().split('T')[0];
      const start = new Date(date);
      start.setDate(start.getDate() - 30);
      startDate = start.toISOString().split('T')[0];
    } else {
      endDate = new Date().toISOString().split('T')[0];
      const start = new Date();
      start.setDate(start.getDate() - 30);
      startDate = start.toISOString().split('T')[0];
    }

    // Crear layer WMS de Sentinel Hub
    const wmsLayer = L.tileLayer.wms(
      `https://sh.dataspace.copernicus.eu/ogc/wms/${SENTINEL_HUB_INSTANCE_ID}`,
      {
        layers: 'NDVI',
        format: 'image/png',
        transparent: true,
        version: '1.1.1',
        time: `${startDate}/${endDate}`,
        maxcc: 20, // Máximo 20% de nubes
        zIndex: 1000, // Forzar que esté por encima de la capa base (Esri)
        opacity: 1
      }
    );

    wmsLayer.addTo(map);
    layerRef.current = wmsLayer;

    return () => {
      if (layerRef.current && map.hasLayer(layerRef.current)) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [map, ndviDate, SENTINEL_HUB_INSTANCE_ID]);

  return null;
}

// Leyenda del mapa mejorada
function MapLegend({ mode }) {
  if (mode === 'crop') {
    return (
      <div className="leaflet-bottom leaflet-right" style={{ marginBottom: '20px', marginRight: '10px', pointerEvents: 'auto', zIndex: 1000 }}>
        <div className="bg-white p-3 rounded-lg shadow-md border border-slate-200 text-xs">
          <h4 className="font-semibold mb-2 text-slate-800">Referencia de Cultivos</h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {Object.entries(COLORES_CULTIVO).map(([cultivo, color]) => (
              <div key={cultivo} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color, border: '1px solid rgba(0,0,0,0.1)' }}></div>
                <span className="capitalize text-slate-600">{cultivo.replace('_', ' ')}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
              <div className="w-3 h-3 rounded-sm bg-[url(#mixed-crop-pattern)] border border-slate-300"></div>
              <span className="text-slate-600">Mixto / Varios</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'height') {
    const legend = getPasturaHeightLegend();
    return (
      <div className="leaflet-bottom leaflet-right" style={{ marginBottom: '20px', marginRight: '10px', pointerEvents: 'auto', zIndex: 1000 }}>
        <div className="bg-white p-3 rounded-lg shadow-md border border-slate-200 text-xs">
          <h4 className="font-semibold mb-2 text-slate-800">Índice de Altura (cm)</h4>
          <div className="space-y-1">
            {legend.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color, border: '1px solid rgba(0,0,0,0.1)' }}></div>
                <span className="text-slate-600">{item.rango} ({item.label})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Fix for default marker icon in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapEvents({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

function FitBounds({ points, siblingLots }) {
  const map = useMap();
  
  useEffect(() => {
    const allPoints = [];
    
    // Add current polygon points
    if (points && points.length > 0) {
      allPoints.push(...points);
    }
    
    // Add sibling lots points
    if (siblingLots && siblingLots.length > 0) {
      siblingLots.forEach(lot => {
        if (lot.polygon_data && Array.isArray(lot.polygon_data)) {
          allPoints.push(...lot.polygon_data);
        }
      });
    }

    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [points, siblingLots, map]);

  return null;
}

export default function LotMapEditor({ 
  initialPolygon, 
  onSave, 
  onCancel, 
  lotName, 
  isViewMode = false, 
  lotData = null, 
  siblingLots = [], 
  onLotClick,
  animalCountsByLot = {}
}) {
  const [points, setPoints] = useState(initialPolygon || []);
  const [viewMode, setViewMode] = useState('satellite'); // 'satellite', 'crop', 'height', or 'ndvi'
  const [showLabels, setShowLabels] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentArea, setCurrentArea] = useState(0); // Área en tiempo real

  // Calcular área cada vez que cambian los puntos
  useEffect(() => {
    if (points.length >= 3) {
        try {
            const coordinates = points.map(p => [p[1], p[0]]);
            // Cerrar visualmente para el cálculo
            coordinates.push(coordinates[0]);
            const area = calcularSuperficie({ type: 'Polygon', coordinates: [coordinates] });
            setCurrentArea(area);
        } catch (e) {
            setCurrentArea(0);
        }
    } else {
        setCurrentArea(0);
    }
  }, [points]);
  
  // Inject Leaflet CSS
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const handleMapClick = (latlng) => {
    if (isViewMode) return;
    setPoints([...points, [latlng.lat, latlng.lng]]);
  };

  const handleUndo = () => {
    setPoints(points.slice(0, -1));
  };

  const handleClear = () => {
    setPoints([]);
  };

  const handleSave = () => {
    if (points.length < 3) {
      alert('El polígono debe tener al menos 3 puntos.');
      return;
    }
    
    // Convertir Leaflet [lat, lng] a GeoJSON [lng, lat] y cerrar el polígono
    const coordinates = points.map(p => [p[1], p[0]]);
    // Asegurar cierre
    if (coordinates.length > 0 && (coordinates[0][0] !== coordinates[coordinates.length-1][0] || coordinates[0][1] !== coordinates[coordinates.length-1][1])) {
        coordinates.push(coordinates[0]);
    }
    
    const geoJsonPoly = {
        type: 'Polygon',
        coordinates: [coordinates]
    };

    const areaHa = calcularSuperficie(geoJsonPoly);
    onSave(points, areaHa);
  };

  // Determine polygon color based on viewMode and data
  const getPolygonColor = (data) => {
    if (viewMode === 'ndvi') {
      return { 
        color: '#ffffff', 
        fillColor: 'transparent', 
        fillOpacity: 0,
        weight: 2 
      };
    }

    if (viewMode === 'height') {
        const color = getColorByHeight(parseFloat(data?.pasture_height || 0));
        return { color: color, fillColor: color, fillOpacity: 0.6 };
    }

    if (viewMode === 'satellite') return { color: '#059669', fillColor: '#10b981' };
    
    // Crop colors logic
    const cropRaw = data?.crops?.toLowerCase() || '';
    const landUseRaw = data?.land_use?.toLowerCase() || '';
    
    // Check for mixed crops
    if (cropRaw.includes(',') || cropRaw.includes(' y ') || cropRaw.includes(' + ')) {
      return { 
        color: '#0f766e', 
        fillColor: 'url(#mixed-crop-pattern)', 
        className: 'lot-polygon-mixed' 
      };
    }

    // Normalize string: remove accents, lowercase
    const normalize = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : '';
    
    const crop = normalize(cropRaw);
    const landUse = normalize(landUseRaw);

    // Búsqueda en configuración
    for (const [key, color] of Object.entries(COLORES_CULTIVO)) {
        if (crop.includes(normalize(key)) || key === crop) {
            return { color: color, fillColor: color };
        }
    }

    for (const [key, color] of Object.entries(COLORES_USO_SUELO)) {
        if (landUse.includes(normalize(key)) || key === landUse) {
            return { color: color, fillColor: color };
        }
    }
    
    // Default fallback
    return { color: '#059669', fillColor: '#10b981' }; 
  };

  const currentPolyStyle = getPolygonColor(lotData);

  // Center map on Uruguay or the first point
  const center = points.length > 0 ? points[0] : [-31.7, -55.9]; // Tacuarembó approx
  const zoom = points.length > 0 ? 15 : 10;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
      {/* SVG Patterns for Maps */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <pattern id="mixed-crop-pattern" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="20" height="20" fill="#fef08a" fillOpacity="0.6" />
            <line x1="0" y1="0" x2="0" y2="20" stroke="#f97316" strokeWidth="4" />
            <line x1="0" y1="0" x2="20" y2="0" stroke="#f97316" strokeWidth="4" />
          </pattern>
        </defs>
      </svg>
      <style>{`
        .lot-polygon-mixed {
          fill: url(#mixed-crop-pattern) !important;
          fill-opacity: 0.8 !important;
          stroke: #f97316 !important;
          stroke-width: 2px !important;
          stroke-dasharray: 5, 5;
        }
        .lot-label-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          color: white !important;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.9) !important;
          font-weight: bold !important;
          font-size: 11px !important;
          pointer-events: none !important;
        }
        .lot-label-tooltip::before { display: none !important; }
        .custom-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          color: white;
          text-shadow: 1px 1px 2px black, 0 0 1em black;
          font-weight: bold;
          font-size: 12px;
          white-space: nowrap;
        }
        .custom-tooltip::before {
          display: none !important;
        }
      `}</style>

      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="font-semibold text-slate-800">
              {isViewMode ? `Visualizando: ${lotName}` : `Editor de Mapa - ${lotName || 'Nuevo Lote'}`}
            </h3>
            <p className="text-xs text-slate-500">
              {isViewMode 
                ? 'Visualiza la ubicación y forma del lote' 
                : 'Haz clic en el mapa para definir los puntos del polígono'}
            </p>
          </div>
          
          {/* Selector de Fecha para NDVI */}
          {isViewMode && viewMode === 'ndvi' && (
            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-2 py-1 shadow-sm animate-in fade-in zoom-in duration-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Fecha:</span>
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-medium text-slate-700 border-none focus:ring-0 p-0 cursor-pointer"
              />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {isViewMode ? (
            <>
              <div className="flex bg-white rounded-lg border border-slate-300 p-1">
                <button
                  onClick={() => setViewMode('satellite')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    viewMode === 'satellite' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Relieve
                </button>
                <button
                  onClick={() => setViewMode('crop')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    viewMode === 'crop' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Ver Cultivo
                </button>
                <button
                  onClick={() => setViewMode('height')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    viewMode === 'height' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Índice Altura
                </button>
                <button
                  onClick={() => setViewMode('ndvi')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    viewMode === 'ndvi' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Satélite (NDVI)
                </button>
              </div>
              <button
                onClick={() => setShowLabels(!showLabels)}
                className={`p-2 rounded-lg border transition-colors ${showLabels ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-300 text-slate-400'}`}
                title="Mostrar/Ocultar Etiquetas"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={onCancel}
                className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleUndo}
                disabled={points.length === 0}
                className="p-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                title="Deshacer último punto"
              >
                <Undo className="w-4 h-4" />
              </button>
              <button
                onClick={handleClear}
                disabled={points.length === 0}
                className="p-2 text-red-600 bg-white border border-slate-300 rounded-lg hover:bg-red-50 disabled:opacity-50"
                title="Borrar todo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="w-px h-8 bg-slate-300 mx-1"></div>
              <button
                onClick={onCancel}
                className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm"
              >
                <Save className="w-4 h-4" />
                Guardar Mapa
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 relative z-0">
        <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked={!isViewMode || viewMode === 'satellite' || viewMode === 'ndvi'} name="Satélite (Esri)">
              <TileLayer
                attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer checked={isViewMode && (viewMode === 'crop' || viewMode === 'height')} name="Mapa Estándar">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
            
            <LayersControl.Overlay checked={showLabels} name="Etiquetas y Lugares">
               <TileLayer
                 url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
               />
            </LayersControl.Overlay>
          </LayersControl>

          {/* Activar NDVI Real cuando el modo sea NDVI */}
          {isViewMode && viewMode === 'ndvi' && <NDVIWMSLayer ndviDate={selectedDate} />}
          
          {/* Leyenda de cultivos/altura */}
          <MapLegend mode={viewMode} />

          {!isViewMode && <MapEvents onMapClick={handleMapClick} />}
          
          <FitBounds points={points} siblingLots={siblingLots} />
          
          {/* Sibling Lots */}
          {siblingLots.map(lot => {
            if (!lot.polygon_data || (lotData && lot.id === lotData.id)) return null; 
            const style = getPolygonColor(lot);
            return (
              <Polygon 
                key={lot.id}
                positions={(() => {
                    if (Array.isArray(lot.polygon_data)) return lot.polygon_data;
                    if (lot.polygon_data?.coordinates?.[0]) return lot.polygon_data.coordinates[0].map(c => [c[1], c[0]]);
                    return [];
                })()}
                eventHandlers={{
                  click: () => onLotClick && onLotClick(lot)
                }}
                pathOptions={{ 
                  color: style.color, 
                  fillColor: style.fillColor, 
                  fillOpacity: style.fillOpacity ?? 0.4,
                  weight: style.weight ?? 1,
                  className: style.className || ''
                }}
              >
                {showLabels && (
                  <Tooltip 
                    direction="center" 
                    permanent={true} 
                    className="lot-label-tooltip"
                    opacity={1}
                  >
                    <div className="text-center font-sans drop-shadow-md leading-tight">
                      <span className="text-xs font-bold text-white uppercase tracking-wide block">{lot.name}</span>
                      <span className="text-[10px] text-white/90 font-medium block">{lot.area_hectares} ha</span>
                      {lot.crops && <span className="text-[9px] text-yellow-300 block italic">{lot.crops}</span>}
                      
                      {/* Badge Ganadero */}
                      {animalCountsByLot[lot.id] > 0 && (
                        <div className="mt-1 flex items-center justify-center gap-1 bg-emerald-500 text-white px-1.5 py-0.5 rounded-full text-[9px] font-black border border-white/50 animate-in zoom-in duration-300">
                          <Beef size={8} /> {animalCountsByLot[lot.id]}
                        </div>
                      )}
                    </div>
                  </Tooltip>
                )}
              </Polygon>
            );
          })}

          {/* Current Lot */}
          {points.length > 0 && (
            <>
              <Polygon 
                positions={points} 
                pathOptions={{ 
                  color: currentPolyStyle.color, 
                  fillColor: currentPolyStyle.fillColor, 
                  fillOpacity: currentPolyStyle.fillOpacity ?? 0.6,
                  weight: currentPolyStyle.weight ?? 3,
                  className: currentPolyStyle.className || ''
                }} 
              >
                 {isViewMode && (
                    <Tooltip direction="center" permanent className="custom-tooltip">
                      <div className="text-center">
                        {lotName}<br/>
                        <span className="text-[10px] font-normal">{lotData?.area_hectares} ha</span>
                      </div>
                    </Tooltip>
                 )}
              </Polygon>
              {!isViewMode && points.map((pos, idx) => (
                <Marker key={idx} position={pos} />
              ))}
            </>
          )}
        </MapContainer>
      </div>
      
      <div className="p-2 bg-slate-50 text-xs text-slate-500 text-center border-t border-slate-200 flex justify-between items-center px-4">
        <div className="flex items-center gap-4">
            <span>
            {isViewMode 
                ? `Visualizando ${points.length} puntos.` 
                : `${points.length} puntos. ${points.length < 3 ? '(Mínimo 3)' : 'Listo.'}`
            }
            </span>
            {!isViewMode && points.length >= 3 && (
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    Superficie: {currentArea} ha
                </span>
            )}
        </div>
        {viewMode === 'ndvi' && (
          <div className="flex items-center gap-2">
            <span className="font-medium">Escala NDVI (Sentinel-2):</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-[#f97316] rounded-sm"></div><span className="text-[10px]">Suelo Desnudo</span>
              <div className="w-3 h-3 bg-[#eab308] rounded-sm"></div>
              <div className="w-3 h-3 bg-[#84cc16] rounded-sm"></div>
              <div className="w-3 h-3 bg-[#15803d] rounded-sm"></div>
              <div className="w-3 h-3 bg-[#065f46] rounded-sm"></div><span className="text-[10px]">Vigor Máximo</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
