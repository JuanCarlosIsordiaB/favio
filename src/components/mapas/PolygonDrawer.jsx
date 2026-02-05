import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Trash2, AlertCircle, Info } from 'lucide-react';
import { GeomanControl } from './GeomanControl';
import { LayerControl } from './LayerControl';
import { calcularSuperficie, validarPoligono } from '@/services/geospatial';
import '@/lib/leafletConfig';

/**
 * Componente para recalcular el tamaño del mapa
 * Importante en modales donde Leaflet no calcula bien el tamaño inicial
 */
function InvalidateSize() {
  const map = useMap();

  console.log('[InvalidateSize] Component mounted, map state:', {
    mapExists: !!map,
    mapType: map?.constructor?.name,
    mapCRS: map?._crs?.constructor?.name,
    mapCRSNull: map?._crs === null,
  });

  useEffect(() => {
    console.log('[InvalidateSize] useEffect running, about to invalidateSize');
    // Recalcular tamaño después de que el mapa esté en el DOM
    const timer = setTimeout(() => {
      try {
        console.log('[InvalidateSize] Calling invalidateSize on map:', {
          mapExists: !!map,
          mapCRS: map?._crs?.constructor?.name,
        });
        map.invalidateSize();
        console.log('[InvalidateSize] invalidateSize completed successfully');
      } catch (err) {
        console.error('[InvalidateSize] Error calling invalidateSize:', err);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

/**
 * Componente para ajuste automático del mapa a los bounds del polígono
 */
function FitBounds({ polygon, center }) {
  const map = useMap();

  console.log('[FitBounds] Component mounted:', {
    hasPolygon: !!polygon,
    hasCenter: !!center,
    mapExists: !!map,
    mapCRS: map?._crs?.constructor?.name,
  });

  useEffect(() => {
    console.log('[FitBounds] useEffect running, about to adjust bounds');
    const timer = setTimeout(() => {
      try {
        console.log('[FitBounds] Executing fitBounds/setView:', {
          hasPolygon: !!polygon,
          hasCenter: !!center,
          mapExists: !!map,
          mapCRS: map?._crs?.constructor?.name,
          mapCRSNull: map?._crs === null,
        });

        if (polygon && polygon.coordinates && Array.isArray(polygon.coordinates[0]) && polygon.coordinates[0].length > 0) {
          // Validar que tenemos coordenadas válidas
          const validCoords = polygon.coordinates[0].filter(
            (c) => Array.isArray(c) && c.length === 2 && !isNaN(c[0]) && !isNaN(c[1])
          );

          if (validCoords.length >= 2) {
            const bounds = validCoords.map((coord) => [coord[1], coord[0]]); // [lat, lng]
            console.log('[FitBounds] Calling fitBounds with:', { bounds });
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
            console.log('[FitBounds] fitBounds completed successfully');
          } else if (center && Array.isArray(center) && center.length === 2) {
            console.log('[FitBounds] Calling setView with center:', center);
            map.setView(center, 15);
            console.log('[FitBounds] setView completed successfully');
          }
        } else if (center && Array.isArray(center) && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
          console.log('[FitBounds] Calling setView with center (else case):', center);
          map.setView(center, 15);
          console.log('[FitBounds] setView completed successfully (else case)');
        } else {
          console.log('[FitBounds] No valid polygon or center to adjust');
        }
      } catch (err) {
        console.error('[FitBounds] Error in fitBounds/setView:', err);
        console.error('[FitBounds] Error stack:', err.stack);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [polygon?.coordinates, center, map]);

  return null;
}

/**
 * Componente para dibujar/editar polígonos de lotes
 * Integra Geoman para interacción geográfica
 *
 * @param {Object} props
 * @param {GeoJSONPolygon|null} props.initialPolygon - Polígono inicial
 * @param {Function} props.onPolygonChange - Callback al cambiar polígono
 * @param {'create'|'edit'} props.mode - Modo de operación
 * @param {[number, number]} props.predioUbicacion - Centro del mapa
 * @param {boolean} props.readonly - Solo lectura
 * @param {Array} props.lotesExistentes - Lotes del predio (para contexto)
 */
// Constante fuera del componente para evitar re-creaciones
const DEFAULT_CENTER = [-34.9011, -56.1645];

export function PolygonDrawer({
  initialPolygon = null,
  onPolygonChange = () => {},
  mode = 'create',
  predioUbicacion = DEFAULT_CENTER, // Uruguay por defecto
  readonly = false,
  lotesExistentes = [],
}) {
  const [currentPolygon, setCurrentPolygon] = useState(initialPolygon);
  const [superficie, setSuperficie] = useState(0);
  const [validation, setValidation] = useState({ isValid: true, error: null });
  const [activeLayer, setActiveLayer] = useState('osm');

  // Validar que predioUbicacion sea un array válido de coordenadas
  const isValidUbicacion =
    predioUbicacion &&
    Array.isArray(predioUbicacion) &&
    predioUbicacion.length === 2 &&
    typeof predioUbicacion[0] === 'number' &&
    typeof predioUbicacion[1] === 'number' &&
    !isNaN(predioUbicacion[0]) &&
    !isNaN(predioUbicacion[1]);

  // Inicializar mapCenter con validación
  const initialCenter = isValidUbicacion ? predioUbicacion : DEFAULT_CENTER;
  const [mapCenter, setMapCenter] = useState(initialCenter);

  // Calcular superficie cuando cambia el polígono
  useEffect(() => {
    if (currentPolygon) {
      const area = calcularSuperficie(currentPolygon);
      setSuperficie(area);

      const validationResult = validarPoligono(currentPolygon);
      setValidation(validationResult);
    } else {
      setSuperficie(0);
      setValidation({ isValid: true, error: null });
    }
  }, [currentPolygon]);

  // Sincronizar con prop externa
  useEffect(() => {
    setCurrentPolygon(initialPolygon);
  }, [initialPolygon]);

  // Actualizar centro del mapa cuando cambia predioUbicacion
  useEffect(() => {
    if (isValidUbicacion) {
      setMapCenter(predioUbicacion);
    } else {
      setMapCenter(DEFAULT_CENTER);
    }
  }, [isValidUbicacion, predioUbicacion]);

  const handlePolygonCreated = (geoJSONPolygon) => {
    setCurrentPolygon(geoJSONPolygon);
    onPolygonChange(geoJSONPolygon);

    // Actualizar centro del mapa al primer punto del polígono
    if (geoJSONPolygon?.coordinates?.[0]?.[0]) {
      const firstCoord = geoJSONPolygon.coordinates[0][0];
      const newCenter = [firstCoord[1], firstCoord[0]];
      setMapCenter(newCenter);
    }
  };

  const handlePolygonEdited = (geoJSONPolygon) => {
    setCurrentPolygon(geoJSONPolygon);
    onPolygonChange(geoJSONPolygon);

    // Actualizar centro del mapa al editar
    if (geoJSONPolygon?.coordinates?.[0]?.[0]) {
      const firstCoord = geoJSONPolygon.coordinates[0][0];
      setMapCenter([firstCoord[1], firstCoord[0]]);
    }
  };

  const handlePolygonDeleted = () => {
    setCurrentPolygon(null);
    onPolygonChange(null);
  };

  const handleClear = () => {
    setCurrentPolygon(null);
    onPolygonChange(null);
  };

  // Convertir GeoJSON [lng, lat] a Leaflet [lat, lng]
  const convertCoordinates = (polygon) => {
    if (!polygon || !polygon.coordinates) return [];
    return polygon.coordinates[0].map((coord) => [coord[1], coord[0]]);
  };

  // Calcular centro del mapa
  const getMapCenter = () => {
    if (
      currentPolygon &&
      currentPolygon.coordinates &&
      currentPolygon.coordinates[0].length > 0
    ) {
      const firstCoord = currentPolygon.coordinates[0][0];
      return [firstCoord[1], firstCoord[0]]; // [lat, lng]
    }
    // Usar predioUbicacion si existe, sino default de Uruguay
    return predioUbicacion || [-34.9011, -56.1645];
  };


  return (
    <div className="space-y-4">
      {/* Información y estadísticas */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {mode === 'create' ? 'Dibujar Polígono' : 'Editar Polígono'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {readonly
              ? 'Vista de solo lectura'
              : 'Usa las herramientas del mapa para dibujar o editar el polígono del lote'}
          </p>
        </div>

        {currentPolygon && !readonly && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Alertas y validaciones */}
      {!currentPolygon && !readonly && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Haz clic en el botón de polígono (🔺) en la esquina superior izquierda del mapa y dibuja el lote.
            Mínimo 3 puntos. Haz clic en el primer punto para cerrar.
          </AlertDescription>
        </Alert>
      )}

      {validation.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validation.error}</AlertDescription>
        </Alert>
      )}

      {/* Estadísticas del polígono */}
      {currentPolygon && (
        <div className="flex gap-4 flex-wrap">
          <Badge variant={validation.isValid ? 'default' : 'destructive'} className="text-sm">
            Superficie: {superficie.toFixed(2)} ha
          </Badge>
          <Badge variant="outline" className="text-sm">
            Puntos: {currentPolygon.coordinates[0].length - 1}
          </Badge>
          {validation.isValid && (
            <Badge variant="outline" className="text-sm text-green-600">
              ✓ Polígono válido
            </Badge>
          )}
        </div>
      )}

      {/* Mapa interactivo */}
      <Card>
        <CardContent className="p-0">
          <MapContainer
            bounds={[
              [mapCenter[0] - 0.02, mapCenter[1] - 0.02],
              [mapCenter[0] + 0.02, mapCenter[1] + 0.02],
            ]}
            boundsOptions={{ padding: [50, 50] }}
            style={{ height: '400px', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution={
                activeLayer === 'satellite'
                  ? '&copy; Esri'
                  : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              }
              url={
                activeLayer === 'satellite'
                  ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              }
            />

            {/* Control para cambiar capas */}
            <LayerControl activeLayer={activeLayer} onLayerChange={setActiveLayer} />

            {/* Recalcular tamaño del mapa (importante en modales) */}
            <InvalidateSize />

            {/* Control de Geoman (solo si no es readonly) */}
            {!readonly && (
              <GeomanControl
                onPolygonCreated={handlePolygonCreated}
                onPolygonEdited={handlePolygonEdited}
                onPolygonDeleted={handlePolygonDeleted}
                enableDraw={mode === 'create' || !currentPolygon}
                enableEdit={mode === 'edit' && !!currentPolygon}
              />
            )}

            {/* Lotes existentes del predio (como contexto) */}
            {lotesExistentes.map((lote) => {
              if (!lote.poligono || !lote.poligono.coordinates) return null;

              return (
                <Polygon
                  key={lote.id}
                  positions={convertCoordinates(lote.poligono)}
                  color="#94a3b8"
                  fillColor="#cbd5e1"
                  fillOpacity={0.2}
                  weight={1}
                  interactive={false}
                />
              );
            })}

            {/* Polígono actual (destacado) */}
            {currentPolygon && (
              <Polygon
                positions={convertCoordinates(currentPolygon)}
                color={validation.isValid ? '#22c55e' : '#ef4444'}
                fillColor={validation.isValid ? '#86efac' : '#fca5a5'}
                fillOpacity={0.4}
                weight={3}
              />
            )}

            {/* Ajustar bounds automáticamente */}
            <FitBounds polygon={currentPolygon} center={predioUbicacion} />
          </MapContainer>
        </CardContent>
      </Card>

      {/* Instrucciones */}
      {!readonly && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Instrucciones:</strong>
            <br />
            • <strong>Dibujar:</strong> Haz clic en el botón 🔺 y dibuja en el mapa
            <br />
            • <strong>Editar:</strong> Activa el modo edición (✏️) y arrastra los puntos
            <br />• <strong>Eliminar:</strong> Usa el botón 🗑️ o el botón "Limpiar"
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
