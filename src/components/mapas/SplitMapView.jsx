import { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, X } from 'lucide-react';
import { COLORES_USO_SUELO } from '@/types/lotes.types';
import { AdvancedLayerControl } from './AdvancedLayerControl';
import { CultivoLayer } from './CultivoLayer';
import { PasturaLayer } from './PasturaLayer';
import { BASE_LAYERS } from '@/lib/mapLayers.config';

/**
 * Componente que sincroniza dos MapContainers
 * Hace que ambos mapas se muevan y hagan zoom juntos
 */
function SyncMapControls({ mapId, otherMapRef }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !otherMapRef?.current) return;

    const syncEvents = (sourceMap, targetMap) => {
      const handleMove = () => {
        const center = sourceMap.getCenter();
        const zoom = sourceMap.getZoom();
        targetMap.setView(center, zoom, { animate: false });
      };

      sourceMap.on('move', handleMove);
      sourceMap.on('zoom', handleMove);

      return () => {
        sourceMap.off('move', handleMove);
        sourceMap.off('zoom', handleMove);
      };
    };

    return syncEvents(map, otherMapRef.current);
  }, [map, otherMapRef]);

  return null;
}

/**
 * Componente que renderiza NDVI desde Sentinel Hub usando WMS
 * Específicamente para SplitMapView
 */
function NDVIWMSLayerSplit({ ndviDate }) {
  const map = useMap();
  const layerRef = useRef(null);
  const SENTINEL_HUB_INSTANCE_ID = import.meta.env.VITE_SENTINEL_HUB_INSTANCE_ID;

  useEffect(() => {
    if (!map || !SENTINEL_HUB_INSTANCE_ID) return;

    // Calcular fechas
    let endDate, startDate;
    if (ndviDate) {
      const date = new Date(ndviDate);
      endDate = ndviDate;
      const start = new Date(date);
      start.setDate(start.getDate() - 30);
      startDate = start.toISOString().split('T')[0];
    } else {
      endDate = new Date().toISOString().split('T')[0];
      const start = new Date();
      start.setDate(start.getDate() - 30);
      startDate = start.toISOString().split('T')[0];
    }

    console.log('[NDVI WMS Split] Creando layer WMS', { startDate, endDate });

    // Crear layer WMS
    const wmsLayer = L.tileLayer.wms(
      `https://sh.dataspace.copernicus.eu/ogc/wms/${SENTINEL_HUB_INSTANCE_ID}`,
      {
        layers: 'NDVI',
        styles: '',
        format: 'image/png',
        transparent: true,
        version: '1.1.1',
        time: `${startDate}/${endDate}`,
        maxcc: 20
      }
    );

    // Agregar al mapa
    wmsLayer.addTo(map);
    layerRef.current = wmsLayer;

    console.log('[NDVI WMS Split] ✓ Layer WMS agregado al mapa');

    // Limpiar cuando el componente se desmonta o cambian las dependencias
    return () => {
      if (layerRef.current && map.hasLayer(layerRef.current)) {
        map.removeLayer(layerRef.current);
        console.log('[NDVI WMS Split] Layer removido del mapa');
      }
    };
  }, [map, ndviDate, SENTINEL_HUB_INSTANCE_ID]);

  return null;
}

/**
 * Panel individual de mapa dentro de SplitMapView
 */
function MapPanel({
  side,
  bounds,
  lotes,
  predioUbicacion,
  otherMapRef,
  config,
  onConfigChange,
}) {
  const mapRef = useRef(null);

  const baseLayer = config.baseLayer;
  const setBaseLayer = (value) => {
    const newValue = typeof value === 'function' ? value(baseLayer) : value;
    onConfigChange('baseLayer', newValue);
  };

  const overlays = config.overlays;
  const setOverlays = (value) => {
    const newValue = typeof value === 'function' ? value(overlays) : value;
    onConfigChange('overlays', newValue);
  };

  const ndviDate = config.ndviDate;
  const setNdviDate = (value) => {
    const newValue = typeof value === 'function' ? value(ndviDate) : value;
    onConfigChange('ndviDate', newValue);
  };


  const getColorUsoSuelo = (valor) => {
    return COLORES_USO_SUELO[valor] || '#6b7280';
  };

  const convertirCoordenadasGeoJSON = (poligono) => {
    if (!poligono || !poligono.coordinates) return [];
    const anillo = poligono.coordinates[0];
    return anillo.map((coord) => [coord[1], coord[0]]);
  };

  return (
    <div className="flex-1 space-y-2">
      <div className="text-sm font-medium text-muted-foreground">
        {side === 'left' ? 'Izquierda' : 'Derecha'}
      </div>

      <MapContainer
        ref={mapRef}
        bounds={bounds}
        style={{ height: '500px', width: '100%' }}
        boundsOptions={{ padding: [50, 50] }}
      >
        {/* Capa base (no es NDVI) */}
        {baseLayer !== 'ndvi' && (
          <TileLayer
            attribution={BASE_LAYERS[baseLayer]?.attribution || '&copy; OpenStreetMap'}
            url={BASE_LAYERS[baseLayer]?.url || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
          />
        )}

        {/* Capa NDVI (usa WMS) */}
        {baseLayer === 'ndvi' && <NDVIWMSLayerSplit ndviDate={ndviDate} />}

        {/* Control avanzado */}
        <AdvancedLayerControl
          baseLayer={baseLayer}
          onBaseLayerChange={setBaseLayer}
          overlays={overlays}
          onOverlayToggle={(overlayId, enabled) => {
            setOverlays((prev) => ({ ...prev, [overlayId]: enabled }));
          }}
          ndviDate={ndviDate}
          onNDVIDateChange={setNdviDate}
        />

        {/* Overlays */}
        <CultivoLayer lotes={lotes} visible={overlays.cultivo} />
        <PasturaLayer lotes={lotes} visible={overlays.pastura} />

        {/* Sincronización con otro mapa */}
        <SyncMapControls mapId={side} otherMapRef={otherMapRef} />

        {/* Polígonos de lotes */}
        {lotes.map((lote) => {
          if (!lote.poligono || !lote.poligono.coordinates) return null;

          const coordenadas = convertirCoordenadasGeoJSON(lote.poligono);
          if (coordenadas.length < 3) return null;

          const color = getColorUsoSuelo(lote.uso_suelo);

          return (
            <Polygon
              key={`${side}-${lote.id}`}
              positions={coordenadas}
              color={color}
              fillColor={color}
              fillOpacity={0.4}
              weight={2}
              opacity={1}
              interactive={true}
            >
              <Popup>
                <div className="space-y-1 text-sm">
                  <p className="font-semibold">{lote.nombre}</p>
                  <p>
                    <span className="text-muted-foreground">Superficie:</span> {lote.superficie_total} ha
                  </p>
                  {lote.uso_suelo && (
                    <p>
                      <span className="text-muted-foreground">Uso:</span> {lote.uso_suelo}
                    </p>
                  )}
                  {lote.cultivo_actual && (
                    <p>
                      <span className="text-muted-foreground">Cultivo:</span> {lote.cultivo_actual}
                    </p>
                  )}
                </div>
              </Popup>
            </Polygon>
          );
        })}
      </MapContainer>
    </div>
  );
}

/**
 * Vista dividida de mapas para comparación temporal/por capas
 * Sincroniza automáticamente zoom y posición entre ambos mapas
 *
 * @param {Object} props
 * @param {Array} props.lotes - Array de lotes a mostrar
 * @param {Array} props.bounds - Límites del mapa
 * @param {Object} props.predioUbicacion - Ubicación del predio
 * @param {Function} props.onClose - Callback para cerrar la vista dividida
 */
export function SplitMapView({
  lotes = [],
  bounds = [[-34.9211, -56.1845], [-34.8811, -56.1445]],
  predioUbicacion = null,
  onClose = () => {},
}) {
  const leftMapRef = useRef(null);
  const rightMapRef = useRef(null);

  // Configuración independiente para cada mapa
  const [leftConfig, setLeftConfig] = useState({
    baseLayer: 'satellite',
    overlays: { cultivo: false, pastura: false },
    ndviDate: null,
    ndviUrl: null,
  });

  const [rightConfig, setRightConfig] = useState({
    baseLayer: 'ndvi',
    overlays: { cultivo: false, pastura: false },
    ndviDate: null,
    ndviUrl: null,
  });

  if (lotes.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="h-96 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No hay lotes para mostrar en vista dividida</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Vista Dividida - Comparación</h2>
        <Button variant="outline" size="sm" onClick={onClose} className="gap-2">
          <X className="h-4 w-4" />
          Cerrar
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-2 gap-0 h-full">
            {/* Mapa Izquierdo */}
            <div className="border-r">
              <MapPanel
                side="left"
                bounds={bounds}
                lotes={lotes}
                predioUbicacion={predioUbicacion}
                otherMapRef={rightMapRef}
                config={{
                  baseLayer: leftConfig.baseLayer,
                  overlays: leftConfig.overlays,
                  ndviDate: leftConfig.ndviDate,
                  ndviUrl: leftConfig.ndviUrl,
                }}
                onConfigChange={(key, value) => {
                  setLeftConfig((prev) => ({ ...prev, [key]: value }));
                }}
              />
            </div>

            {/* Mapa Derecho */}
            <div>
              <MapPanel
                side="right"
                bounds={bounds}
                lotes={lotes}
                predioUbicacion={predioUbicacion}
                otherMapRef={leftMapRef}
                config={{
                  baseLayer: rightConfig.baseLayer,
                  overlays: rightConfig.overlays,
                  ndviDate: rightConfig.ndviDate,
                  ndviUrl: rightConfig.ndviUrl,
                }}
                onConfigChange={(key, value) => {
                  setRightConfig((prev) => ({ ...prev, [key]: value }));
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
        💡 Los mapas están sincronizados: zoom y posición se mueven juntos. Cada mapa puede tener
        capas y overlays diferentes para comparación.
      </div>
    </div>
  );
}
