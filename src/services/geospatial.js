/**
 * Servicios geoespaciales usando Turf.js
 */
import { area, centroid, intersect, booleanIntersects, booleanContains, featureCollection } from '@turf/turf';

/**
 * Convierte manualmente a un objeto GeoJSON Feature válido para Turf
 * Entrada esperada: String o Array de coordenadas Leaflet [[Lat, Lng], ...]
 * Salida: Feature<Polygon> con coordenadas [[Lng, Lat], ...]
 */
function toGeoJSONFeature(input) {
  try {
    let coords = input;
    
    // 1. Parsear string
    if (typeof coords === 'string') {
      try {
        coords = JSON.parse(coords);
      } catch (e) {
        return null;
      }
    }

    // 2. Si ya es Feature o Geometry, devolverlo
    if (coords.type === 'Feature') return coords;
    if (coords.type === 'Polygon') return { type: 'Feature', properties: {}, geometry: coords };

    // 3. Procesar Array de puntos [[Lat, Lng], ...]
    if (Array.isArray(coords) && coords.length > 0) {
      // Verificar profundidad. Si es [[Lat, Lng], ...], el primer elemento es un número.
      if (Array.isArray(coords[0]) && typeof coords[0][0] === 'number') {
        
        // Invertir Lat/Lng a Lng/Lat
        const ring = coords.map(p => [p[1], p[0]]);
        
        // Cerrar anillo
        const first = ring[0];
        const last = ring[ring.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          ring.push([first[0], first[1]]);
        }

        // Estructura manual GeoJSON
        return {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [ring] // Array de anillos (el primero es el exterior)
          }
        };
      }
    }
    return null;
  } catch (e) {
    console.error("Error normalizando polígono:", e);
    return null;
  }
}

export function verificarSolapamiento(nuevoPoligono, lotesExistentes, excluyendoId = null) {
  try {
    const poly1 = toGeoJSONFeature(nuevoPoligono);
    if (!poly1) return null;

    for (const lote of lotesExistentes) {
      if (lote.id === excluyendoId) continue;
      if (!lote.polygon_data) continue;

      const poly2 = toGeoJSONFeature(lote.polygon_data);
      if (!poly2) continue;

      try {
        const seTocan = booleanIntersects(poly1, poly2);
        
        if (seTocan) {
            const fc = featureCollection([poly1, poly2]);
            const interseccion = intersect(fc);
            
            if (interseccion) {
                const tipo = interseccion.geometry.type;
                if (tipo === 'Polygon' || tipo === 'MultiPolygon') {
                    const areaInt = area(interseccion);
                    if (areaInt > 1) { 
                        return lote;
                    }
                }
            }
            
            if (booleanContains(poly1, poly2) || booleanContains(poly2, poly1)) {
                return lote;
            }
        }
      } catch (err) {
        // Fallback or ignore specific geometry errors
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

export function calcularSuperficie(poligono) {
  try {
    const poly = toGeoJSONFeature(poligono);
    if (!poly) return 0;
    const a = area(poly);
    return Math.round((a / 10000) * 100) / 100;
  } catch (e) { return 0; }
}

export function calcularCentroide(poligono) {
  try {
    const poly = toGeoJSONFeature(poligono);
    if (!poly) return null;
    const c = centroid(poly);
    return { lat: c.geometry.coordinates[1], lng: c.geometry.coordinates[0] };
  } catch (e) { return null; }
}

export function obtenerBoundingBox(poligono) { return null; }