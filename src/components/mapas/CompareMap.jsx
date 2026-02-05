import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-side-by-side';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';

// Fix iconos de Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const SENTINEL_HUB_INSTANCE_ID = import.meta.env.VITE_SENTINEL_HUB_INSTANCE_ID;

export function CompareMap({ 
  center = [-34.9011, -56.1645], 
  zoom = 13,
  mode = 'temporal',
  lots = []
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const sideBySideControlRef = useRef(null);

  // Estados de fecha
  const today = new Date().toISOString().split('T')[0];
  const lastMonth = new Date();
  lastMonth.setDate(lastMonth.getDate() - 30);
  const monthAgo = lastMonth.toISOString().split('T')[0];

  const [leftDate, setLeftDate] = useState(monthAgo);
  const [rightDate, setRightDate] = useState(today);

  // 1. Inicialización del Mapa
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: center,
        zoom: zoom,
        zoomControl: true,
        fadeAnimation: false // Desactivar animaciones para mejorar el swipe
      });

      // Crear Pane para polígonos (zIndex alto para que estén SIEMPRE arriba)
      const polyPane = map.createPane('polyPane');
      polyPane.style.zIndex = 650; 
      polyPane.style.pointerEvents = 'none';

      mapInstanceRef.current = map;

      const resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current && mapContainerRef.current) {
            mapInstanceRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Actualización de Capas, Polígonos y Control
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // A. Limpieza total previa
    if (sideBySideControlRef.current) {
        map.removeControl(sideBySideControlRef.current);
        const sbsUI = document.querySelector('.leaflet-sbs');
        if (sbsUI) sbsUI.remove();
        sideBySideControlRef.current = null;
    }
    
    // Remover todas las capas actuales (TileLayers y Polygons)
    map.eachLayer(layer => {
        if (layer instanceof L.TileLayer || layer instanceof L.Polygon || layer instanceof L.LayerGroup) {
            map.removeLayer(layer);
        }
    });

    // Helper para params WMS
    const getWmsParams = (date) => {
      const d = new Date(date);
      const start = new Date(d);
      start.setDate(start.getDate() - 30);
      return {
        layers: 'NDVI',
        format: 'image/png',
        transparent: true,
        version: '1.1.1',
        time: `${start.toISOString().split('T')[0]}/${date}`,
        maxcc: 20
      };
    };

    const wmsUrl = `https://sh.dataspace.copernicus.eu/ogc/wms/${SENTINEL_HUB_INSTANCE_ID}`;
    const esriUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

    // B. Crear Capas de Imagen (Deben añadirse al mapa ANTES que el control)
    let leftLayer, rightLayer;
    if (mode === 'temporal') {
      leftLayer = L.tileLayer.wms(wmsUrl, getWmsParams(leftDate)).addTo(map);
    } else {
      leftLayer = L.tileLayer(esriUrl, { attribution: '&copy; Esri' }).addTo(map);
    }
    rightLayer = L.tileLayer.wms(wmsUrl, getWmsParams(rightDate)).addTo(map);

    // C. Dibujar Polígonos
    lots.forEach(lot => {
        if (!lot.polygon_data) return;
        
        try {
            // El dato viene como string JSON o como array directo
            const positions = typeof lot.polygon_data === 'string' 
                ? JSON.parse(lot.polygon_data) 
                : lot.polygon_data;

            if (Array.isArray(positions) && positions.length >= 3) {
                const poly = L.polygon(positions, {
                    color: '#ffffff',
                    weight: 2,
                    fillColor: 'transparent',
                    fillOpacity: 0,
                    dashArray: '5, 5',
                    pane: 'polyPane',
                    interactive: false
                }).addTo(map);
                
                poly.bindTooltip(lot.name, { 
                    permanent: true, 
                    direction: 'center', 
                    className: 'lot-label-tooltip',
                    pane: 'polyPane'
                });
            }
        } catch (e) {
            console.error("Error dibujando lote:", lot.name);
        }
    });

    // D. Inicializar Control SideBySide (SIEMPRE AL FINAL de añadir capas)
    // @ts-ignore
    if (L.control.sideBySide) {
      sideBySideControlRef.current = L.control.sideBySide(leftLayer, rightLayer);
      sideBySideControlRef.current.addTo(map);
    }

    // --- AUTO-ZOOM ---
    const allPoints = [];
    lots.forEach(lot => {
        if (!lot.polygon_data) return;
        try {
            const positions = typeof lot.polygon_data === 'string' 
                ? JSON.parse(lot.polygon_data) 
                : lot.polygon_data;
            
            if (Array.isArray(positions) && positions.length > 0) {
                allPoints.push(...positions);
            }
        } catch(e) {}
    });

    if (allPoints.length > 0) {
        const bounds = L.latLngBounds(allPoints);
        map.fitBounds(bounds, { padding: [50, 50] });
    } else {
        map.setView(center, zoom);
    }

    // Forzar el redimensionado final
    setTimeout(() => map.invalidateSize(), 100);

  }, [mode, leftDate, rightDate, JSON.stringify(lots)]);

  return (
    <Card className="relative h-[600px] w-full overflow-hidden border-slate-200 shadow-sm group">
      
      {/* UI Selectores */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2 pointer-events-auto">
        <Badge variant="secondary" className="bg-white/90 text-slate-800 shadow-sm border-slate-300 self-start">
          ◀ {mode === 'temporal' ? 'Fecha Anterior' : 'Imagen Satelital'}
        </Badge>
        {mode === 'temporal' && (
          <div className="flex items-center gap-2 bg-white/90 p-1.5 rounded-lg shadow-sm border border-slate-300">
            <Calendar className="w-3 h-3 text-slate-500" />
            <input 
              type="date" 
              value={leftDate} 
              onChange={(e) => setLeftDate(e.target.value)}
              className="text-xs bg-transparent border-none p-0 focus:ring-0 w-24 cursor-pointer"
            />
          </div>
        )}
      </div>

      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2 items-end pointer-events-auto">
        <Badge variant="secondary" className="bg-white/90 text-slate-800 shadow-sm border-slate-300">
          {mode === 'temporal' ? 'Fecha Actual' : 'Análisis NDVI'} ▶
        </Badge>
        <div className="flex items-center gap-2 bg-white/90 p-1.5 rounded-lg shadow-sm border border-slate-300">
          <Calendar className="w-3 h-3 text-slate-500" />
          <input 
            type="date" 
            value={rightDate} 
            onChange={(e) => setRightDate(e.target.value)}
            className="text-xs bg-transparent border-none p-0 focus:ring-0 w-24 text-right cursor-pointer"
          />
        </div>
      </div>

      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', background: '#eee' }} />
    </Card>
  );
}
