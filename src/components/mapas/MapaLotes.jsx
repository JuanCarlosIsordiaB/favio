import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { COLORES_USO_SUELO } from '@/types/lotes.types';
import { AdvancedLayerControl } from './AdvancedLayerControl';
import { CultivoLayer } from './CultivoLayer';
import { PasturaLayer } from './PasturaLayer';
import { BASE_LAYERS } from '@/lib/mapLayers.config';
import '@/lib/leafletConfig';

/**
 * Helper component que ajusta automáticamente el zoom del mapa
 * cuando se selecciona un lote desde la lista
 */
function ZoomToSelected({ lote }) {
  const map = useMap();

  useEffect(() => {
    if (!lote || !lote.poligono?.coordinates || !Array.isArray(lote.poligono.coordinates[0])) {
      return;
    }

    const timer = setTimeout(() => {
      try {
        const coords = lote.poligono.coordinates[0];
        // Validar que tenemos coordenadas válidas
        const validCoords = coords.filter(
          (c) => Array.isArray(c) && c.length === 2 && !isNaN(c[0]) && !isNaN(c[1])
        );

        if (validCoords.length >= 2) {
          const bounds = validCoords.map((coord) => [coord[1], coord[0]]); // [lat, lng]
          map.fitBounds(bounds, {
            padding: [80, 80],
            maxZoom: 16,
            animate: true,
            duration: 0.5,
          });
        }
      } catch (err) {
        console.warn('Error en ZoomToSelected:', err);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [lote?.id, map]);

  return null;
}

/**
 * Componente que renderiza NDVI desde Sentinel Hub usando WMS
 */
function NDVIWMSLayer({ ndviDate }) {
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

    console.log('[NDVI WMS] Creando layer WMS', { startDate, endDate });

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

    console.log('[NDVI WMS] ✓ Layer WMS agregado al mapa');

    // Limpiar cuando el componente se desmonta o cambian las dependencias
    return () => {
      if (layerRef.current && map.hasLayer(layerRef.current)) {
        map.removeLayer(layerRef.current);
        console.log('[NDVI WMS] Layer removido del mapa');
      }
    };
  }, [map, ndviDate, SENTINEL_HUB_INSTANCE_ID]);

  return null;
}

/**
 * Componente que renderiza un mapa Leaflet con los lotes
 * @param {Object} props
 * @param {Array} props.lotes - Array de lotes a mostrar
 * @param {Object} props.selectedLote - Lote seleccionado
 * @param {Object} props.predioUbicacion - Ubicación del predio para centrar el mapa
 * @param {Object} props.alertasPorLote - Alertas agrupadas por lote_id: { loteId: [alertas] }
 * @param {Function} props.onSelectLote - Callback cuando se selecciona un lote
 */
export function MapaLotes({
  lotes = [],
  selectedLote = null,
  predioUbicacion = null,
  alertasPorLote = {},
  onSelectLote = () => {},
}) {
  const mapRef = useRef(null);
  const [baseLayer, setBaseLayer] = useState('osm');
  const [overlays, setOverlays] = useState({ cultivo: false, pastura: false });
  const [ndviDate, setNdviDate] = useState(null);

  const getColorUsoSuelo = (valor) => {
    return COLORES_USO_SUELO[valor] || '#6b7280';
  };

  const convertirCoordenadasGeoJSON = (poligono) => {
    if (!poligono || !poligono.coordinates) return [];

    // GeoJSON usa [lng, lat], pero Leaflet usa [lat, lng]
    const anillo = poligono.coordinates[0];
    return anillo.map((coord) => [coord[1], coord[0]]);
  };

  // Calcular los límites del mapa basado en todos los lotes o ubicación del predio
  const calcularBounds = () => {
    // Si no hay lotes, usar ubicación del predio (si es válida) o región por defecto
    if (lotes.length === 0) {
      if (isValidPredioUbicacion) {
        const [lat, lng] = predioUbicacion;
        return [[lat - 0.02, lng - 0.02], [lat + 0.02, lng + 0.02]];
      }
      // Ubicación por defecto si no hay ubicación válida ni lotes
      return [[-34.9211, -56.1845], [-34.8811, -56.1445]]; // Región de Uruguay
    }

    // Calcular bounds de todos los lotes
    let minLat = 90,
      maxLat = -90,
      minLng = 180,
      maxLng = -180;

    lotes.forEach((lote) => {
      if (lote.poligono && lote.poligono.coordinates) {
        const coords = lote.poligono.coordinates[0];
        coords.forEach((coord) => {
          const [lng, lat] = coord;
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
        });
      }
    });

    if (minLat === 90) {
      // Si no se encontraron coordenadas válidas, usar región por defecto
      return [[-34.9011, -56.1645], [-34.8011, -56.0645]];
    }

    // Agregar padding del 10% alrededor
    const latPad = (maxLat - minLat) * 0.1;
    const lngPad = (maxLng - minLng) * 0.1;

    return [
      [minLat - latPad, minLng - lngPad],
      [maxLat + latPad, maxLng + lngPad],
    ];
  };

  // Validar que predioUbicacion sea un array válido de coordenadas
  const isValidPredioUbicacion =
    predioUbicacion &&
    Array.isArray(predioUbicacion) &&
    predioUbicacion.length === 2 &&
    typeof predioUbicacion[0] === 'number' &&
    typeof predioUbicacion[1] === 'number' &&
    !isNaN(predioUbicacion[0]) &&
    !isNaN(predioUbicacion[1]);

  const bounds = calcularBounds();

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold px-2">Mapa de Lotes</h2>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {lotes.length === 0 ? (
            <div className="h-96 bg-muted flex items-center justify-center">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  Crea un lote para visualizarlo en el mapa
                </p>
              </div>
            </div>
          ) : (
            <MapContainer
              ref={mapRef}
              bounds={bounds}
              style={{ height: '400px', width: '100%' }}
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
              {baseLayer === 'ndvi' && <NDVIWMSLayer ndviDate={ndviDate} />}

              {/* Control avanzado para cambiar capas base y overlays */}
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

              {/* Overlays de cultivo y pastura */}
              <CultivoLayer lotes={lotes} visible={overlays.cultivo} />
              <PasturaLayer lotes={lotes} visible={overlays.pastura} />

              {/* Zoom automático al seleccionar un lote */}
              {selectedLote && <ZoomToSelected lote={selectedLote} />}

              {/* Renderizar polígonos de lotes */}
              {lotes.map((lote) => {
                if (!lote.poligono || !lote.poligono.coordinates) {
                  return null;
                }

                const coordenadas = convertirCoordenadasGeoJSON(lote.poligono);
                if (coordenadas.length < 3) {
                  return null;
                }

                // Obtener alertas para este lote
                const alertasLote = alertasPorLote[lote.id] || [];
                const tieneAlertas = alertasLote.length > 0;

                // Determinar color: rojo si hay alertas, sino color del uso de suelo
                const color = tieneAlertas ? '#ef4444' : getColorUsoSuelo(lote.uso_suelo);
                const isSelected = selectedLote?.id === lote.id;

                return (
                  <Polygon
                    key={lote.id}
                    positions={coordenadas}
                    color={color}
                    fillColor={color}
                    fillOpacity={isSelected ? 0.7 : 0.4}
                    weight={tieneAlertas ? 3 : isSelected ? 3 : 2}
                    opacity={1}
                    onClick={() => onSelectLote(lote)}
                    interactive={true}
                  >
                    <Popup>
                      <div className="space-y-2 text-sm max-w-xs">
                        <p className="font-semibold">{lote.nombre}</p>

                        <p>
                          <span className="text-muted-foreground">
                            Superficie:
                          </span>{' '}
                          {lote.superficie_total} ha
                        </p>

                        {lote.uso_suelo && (
                          <p>
                            <span className="text-muted-foreground">
                              Uso:
                            </span>{' '}
                            {lote.uso_suelo}
                          </p>
                        )}

                        {lote.cultivo_actual && (
                          <p>
                            <span className="text-muted-foreground">
                              Cultivo:
                            </span>{' '}
                            {lote.cultivo_actual}
                          </p>
                        )}

                        {/* Sección de alertas */}
                        {tieneAlertas && (
                          <div className="mt-2 pt-2 border-t">
                            <p className="font-semibold text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-4 h-4" />
                              {alertasLote.length} alerta(s) activa(s)
                            </p>
                            <ul className="list-disc list-inside text-xs text-red-700 mt-1 space-y-0.5">
                              {alertasLote.map((alerta, idx) => (
                                <li key={idx} className="truncate" title={alerta.titulo}>
                                  {alerta.titulo}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Polygon>
                );
              })}
            </MapContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
