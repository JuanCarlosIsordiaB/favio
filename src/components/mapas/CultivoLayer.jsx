import { Polygon, Popup } from 'react-leaflet';
import { COLORES_CULTIVO } from '@/lib/mapLayers.config';

/**
 * Componente overlay que renderiza los lotes coloreados según cultivo_actual
 * Útil para visualizar la distribución de cultivos en el predio
 *
 * @param {Object} props
 * @param {Array} props.lotes - Array de lotes con poligono y cultivo_actual
 * @param {boolean} props.visible - Si el overlay debe estar visible
 */
export function CultivoLayer({ lotes, visible }) {
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

  return lotes.map((lote) => {
    // Validar que el lote tiene polígono válido
    if (!lote.poligono || !lote.poligono.coordinates) {
      return null;
    }

    const posiciones = convertCoordinates(lote.poligono);
    if (posiciones.length < 3) {
      return null;
    }

    // Obtener color según cultivo
    const cultivo = lote.cultivo_actual || 'Sin cultivo';
    const color = COLORES_CULTIVO[cultivo] || '#CCCCCC';

    return (
      <Polygon
        key={`cultivo-${lote.id}`}
        positions={posiciones}
        pathOptions={{
          color: color,
          fillColor: color,
          fillOpacity: 0.6,
          weight: 2,
          opacity: 0.8
        }}
      >
        <Popup>
          <div className="space-y-1 text-sm">
            <p className="font-semibold">{lote.nombre}</p>
            <p>
              <span className="text-muted-foreground">Cultivo:</span> {cultivo}
            </p>
            {lote.superficie_total && (
              <p>
                <span className="text-muted-foreground">Superficie:</span> {lote.superficie_total} ha
              </p>
            )}
          </div>
        </Popup>
      </Polygon>
    );
  });
}
