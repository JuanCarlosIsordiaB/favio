import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, useMap } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle } from 'lucide-react';
import { usePredioCoverage } from '@/hooks/usePredioCoverage';
import '@/lib/leafletConfig';

/**
 * Helper component para ajustar el mapa a todos los lotes
 */
function FitAllBounds({ lotes, predio }) {
  const map = useMap();

  useEffect(() => {
    if (!map) {
      return;
    }

    const timer = setTimeout(() => {
      try {
        if (!lotes || lotes.length === 0) {
          if (predio?.ubicacion && Array.isArray(predio.ubicacion) && predio.ubicacion.length === 2) {
            const [lat, lng] = predio.ubicacion;
            if (!isNaN(lat) && !isNaN(lng)) {
              map.setView([lat, lng], 13);
            }
          }
          return;
        }

        // Calcular bounds de todos los lotes
        let minLat = 90,
          maxLat = -90,
          minLng = 180,
          maxLng = -180;
        let foundCoords = false;

        lotes.forEach((lote) => {
          if (lote.poligono?.coordinates && Array.isArray(lote.poligono.coordinates[0])) {
            const coords = lote.poligono.coordinates[0];
            coords.forEach((coord) => {
              if (Array.isArray(coord) && coord.length === 2 && !isNaN(coord[0]) && !isNaN(coord[1])) {
                const [lng, lat] = coord;
                minLat = Math.min(minLat, lat);
                maxLat = Math.max(maxLat, lat);
                minLng = Math.min(minLng, lng);
                maxLng = Math.max(maxLng, lng);
                foundCoords = true;
              }
            });
          }
        });

        if (foundCoords && minLat !== 90) {
          const bounds = [
            [minLat, minLng],
            [maxLat, maxLng],
          ];
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        } else if (predio?.ubicacion && Array.isArray(predio.ubicacion) && predio.ubicacion.length === 2) {
          // Fallback a ubicación del predio
          const [lat, lng] = predio.ubicacion;
          if (!isNaN(lat) && !isNaN(lng)) {
            map.setView([lat, lng], 13);
          }
        }
      } catch (err) {
        console.warn('Error ajustando bounds en MapaPredioCompleto:', err);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [lotes?.length, predio?.ubicacion, map]);

  return null;
}

/**
 * Componente para visualizar todos los lotes del predio en un mapa completo
 * Muestra ocupación, lotes individuales y permite interacción
 *
 * @param {Object} props
 * @param {Array} props.lotes - Array de lotes del predio
 * @param {Object} props.predio - Información del predio
 * @param {Object} props.selectedLote - Lote actualmente seleccionado
 * @param {Function} props.onSelectLote - Callback cuando se selecciona un lote
 */
export function MapaPredioCompleto({
  lotes = [],
  predio = {},
  selectedLote = null,
  onSelectLote = () => {},
}) {
  const coverage = usePredioCoverage(lotes, parseFloat(predio.superficie_total) || 0);
  const defaultCenter = [-34.9011, -56.1645]; // Centro por defecto (Uruguay)
  const [mapCenter, setMapCenter] = useState(defaultCenter);

  // Validar que predio.ubicacion sea un array válido de coordenadas
  const isValidPredioUbicacion =
    predio?.ubicacion &&
    Array.isArray(predio.ubicacion) &&
    predio.ubicacion.length === 2 &&
    typeof predio.ubicacion[0] === 'number' &&
    typeof predio.ubicacion[1] === 'number' &&
    !isNaN(predio.ubicacion[0]) &&
    !isNaN(predio.ubicacion[1]);

  // Establecer centro inicial del mapa
  useEffect(() => {
    if (isValidPredioUbicacion) {
      setMapCenter(predio.ubicacion);
    } else {
      setMapCenter(defaultCenter);
    }
  }, [predio?.id, isValidPredioUbicacion, defaultCenter]);

  // Convertir coordenadas GeoJSON a Leaflet
  const convertCoordinates = (polygon) => {
    if (!polygon || !polygon.coordinates) return [];
    return polygon.coordinates[0].map((coord) => [coord[1], coord[0]]);
  };

  // Obtener color para el lote
  const getColorLote = (lote) => {
    if (selectedLote?.id === lote.id) {
      return '#22c55e'; // Verde si está seleccionado
    }
    return '#3b82f6'; // Azul por defecto
  };

  const getFillOpacity = (lote) => {
    return selectedLote?.id === lote.id ? 0.5 : 0.3;
  };

  const getWeight = (lote) => {
    return selectedLote?.id === lote.id ? 3 : 2;
  };

  return (
    <div className="space-y-4">
      {/* Panel de Ocupación del Predio */}
      <Card className={coverage.excedido ? 'border-destructive' : ''}>
        <CardHeader>
          <CardTitle className="text-lg">Ocupación del Predio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Ocupado */}
            <div>
              <p className="text-sm text-muted-foreground">Ocupado</p>
              <p className="text-2xl font-bold">
                {coverage.ocupado.toFixed(2)}
                <span className="text-sm ml-1">ha</span>
              </p>
            </div>

            {/* Disponible */}
            <div>
              <p className="text-sm text-muted-foreground">Disponible</p>
              <p className={`text-2xl font-bold ${coverage.disponible <= 0 ? 'text-destructive' : ''}`}>
                {coverage.disponible.toFixed(2)}
                <span className="text-sm ml-1">ha</span>
              </p>
            </div>

            {/* Total */}
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">
                {predio.superficie_total}
                <span className="text-sm ml-1">ha</span>
              </p>
            </div>
          </div>

          {/* Barra de progreso */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold">Ocupación</p>
              <Badge
                variant={coverage.excedido ? 'destructive' : coverage.porcentaje > 80 ? 'secondary' : 'default'}
              >
                {coverage.porcentaje.toFixed(1)}%
              </Badge>
            </div>
            <Progress
              value={coverage.porcentaje}
              className="h-3"
            />
          </div>

          {/* Alerta si está excedido */}
          {coverage.excedido && (
            <div className="flex gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-destructive">
                  Predio excedido
                </p>
                <p className="text-xs text-destructive/80">
                  Superficie usada supera la total en {Math.abs(coverage.disponible).toFixed(2)} ha
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mapa con todos los lotes */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {lotes.length === 0 ? (
            <div className="h-[600px] bg-muted flex items-center justify-center">
              <p className="text-muted-foreground">No hay lotes dibujados aún</p>
            </div>
          ) : (
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: '600px', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Renderizar todos los lotes */}
              {lotes.map((lote) => {
                if (!lote.poligono || !lote.poligono.coordinates) {
                  return null;
                }

                const coords = convertCoordinates(lote.poligono);
                if (coords.length < 3) {
                  return null;
                }

                return (
                  <Polygon
                    key={lote.id}
                    positions={coords}
                    color={getColorLote(lote)}
                    fillColor={getColorLote(lote)}
                    fillOpacity={getFillOpacity(lote)}
                    weight={getWeight(lote)}
                    opacity={1}
                    interactive={true}
                    onClick={() => onSelectLote(lote)}
                  >
                    <Popup>
                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="font-semibold text-base">{lote.nombre}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Superficie</p>
                          <p className="font-semibold">
                            {lote.superficie_total} ha
                          </p>
                        </div>

                        {lote.uso_suelo && (
                          <div>
                            <p className="text-muted-foreground">Uso</p>
                            <p className="font-semibold capitalize">
                              {lote.uso_suelo}
                            </p>
                          </div>
                        )}

                        {lote.cultivo_actual && (
                          <div>
                            <p className="text-muted-foreground">Cultivo</p>
                            <p className="font-semibold">{lote.cultivo_actual}</p>
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Polygon>
                );
              })}

              {/* Ajustar bounds automáticamente */}
              <FitAllBounds lotes={lotes} predio={predio} />
            </MapContainer>
          )}
        </CardContent>
      </Card>

      {/* Información adicional */}
      {lotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Información de Lotes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="text-muted-foreground">Total de lotes:</span>{' '}
                <span className="font-semibold">{lotes.length}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Superficie usada:</span>{' '}
                <span className="font-semibold">{coverage.ocupado.toFixed(2)} ha</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Superficie disponible:</span>{' '}
                <span
                  className={`font-semibold ${coverage.disponible < 0 ? 'text-destructive' : ''}`}
                >
                  {coverage.disponible.toFixed(2)} ha
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
