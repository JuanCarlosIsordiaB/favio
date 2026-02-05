import { Polygon, Popup } from 'react-leaflet';
import { getColorByHeight } from '@/lib/mapLayers.config';
import { Badge } from '@/components/ui/badge';

/**
 * Componente overlay que renderiza los lotes coloreados según altura de pastura
 * Escala de colores: Rojo (crítico) → Naranja → Amarillo → Verde claro → Verde (óptimo)
 *
 * @param {Object} props
 * @param {Array} props.lotes - Array de lotes con poligono y altura_pastura_cm
 * @param {boolean} props.visible - Si el overlay debe estar visible
 */
export function PasturaLayer({ lotes, visible }) {
  if (!visible || !lotes || lotes.length === 0) {
    return null;
  }

  /**
   * Convierte coordenadas GeoJSON [lng, lat] a Leaflet [lat, lng]
   */
  const convertCoordinates = (poligono) => {
    if (!poligono || !poligono.coordinates || !Array.isArray(poligono.coordinates[0])) {
      return [];
    }

    return poligono.coordinates[0].map((coord) => [coord[1], coord[0]]);
  };

  /**
   * Obtiene label de estado según altura de pastura
   */
  const getHeightLabel = (altura_cm) => {
    if (!altura_cm) return 'Sin dato';
    if (altura_cm < 5) return 'Crítico';
    if (altura_cm < 10) return 'Bajo';
    if (altura_cm < 15) return 'Medio';
    if (altura_cm < 20) return 'Bueno';
    return 'Óptimo';
  };

  return lotes.map((lote) => {
    // Validar que el lote tiene polígono válido
    if (!lote.poligono || !lote.poligono.coordinates) {
      return null;
    }

    const posiciones = convertCoordinates(lote.poligono);
    if (posiciones.length < 3) {
      return null;
    }

    // Obtener color según altura
    const altura = lote.altura_pastura_cm;
    const color = getColorByHeight(altura);

    return (
      <Polygon
        key={`pastura-${lote.id}`}
        positions={posiciones}
        pathOptions={{
          color: color,
          fillColor: color,
          fillOpacity: 0.7,
          weight: 2,
          opacity: 0.8
        }}
      >
        <Popup>
          <div className="space-y-2 text-sm">
            <p className="font-semibold">{lote.nombre}</p>

            <div>
              <p className="text-muted-foreground">Altura de pastura</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-lg font-bold">{altura || 'N/A'} cm</p>
                <Badge
                  variant="outline"
                  style={{
                    backgroundColor: color,
                    color: 'white',
                    borderColor: color
                  }}
                >
                  {getHeightLabel(altura)}
                </Badge>
              </div>
            </div>

            {lote.superficie_total && (
              <p>
                <span className="text-muted-foreground">Superficie:</span> {lote.superficie_total} ha
              </p>
            )}

            {lote.fecha_medicion_pastura && (
              <p className="text-xs text-muted-foreground">
                Medición: {new Date(lote.fecha_medicion_pastura).toLocaleDateString('es-ES')}
              </p>
            )}
          </div>
        </Popup>
      </Polygon>
    );
  });
}
