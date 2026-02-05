import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

/**
 * Control de Geoman para dibujar/editar polígonos
 * Se integra con react-leaflet mediante useMap hook
 * Usa enfoque manual con useMap + useEffect (compatible con React 19)
 *
 * @param {Object} props
 * @param {Function} props.onPolygonCreated - Callback cuando se crea un polígono
 * @param {Function} props.onPolygonEdited - Callback cuando se edita un polígono
 * @param {Function} props.onPolygonDeleted - Callback cuando se elimina un polígono
 * @param {boolean} props.enableDraw - Habilitar dibujo (default: true)
 * @param {boolean} props.enableEdit - Habilitar edición (default: true)
 */
export function GeomanControl({
  onPolygonCreated = () => {},
  onPolygonEdited = () => {},
  onPolygonDeleted = () => {},
  enableDraw = true,
  enableEdit = true,
}) {
  const map = useMap();
  const currentLayerRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    // Configurar idioma español
    map.pm.setLang('es');

    // Agregar controles de Geoman
    // Solo habilitamos polígono, sin círculos, líneas, markers, etc.
    map.pm.addControls({
      position: 'topleft',
      drawCircle: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: false,
      drawMarker: false,
      drawPolygon: enableDraw,
      drawText: false,
      editMode: enableEdit,
      dragMode: false,
      cutPolygon: false,
      removalMode: true,
      rotateMode: false,
    });

    // Event: Crear polígono
    const handleCreate = (e) => {
      const layer = e.layer;

      // Remover capa anterior si existe (solo 1 polígono por lote)
      if (currentLayerRef.current && map.hasLayer(currentLayerRef.current)) {
        map.removeLayer(currentLayerRef.current);
      }

      currentLayerRef.current = layer;

      const geoJSON = layer.toGeoJSON();
      onPolygonCreated(geoJSON.geometry);
    };

    // Event: Editar polígono
    const handleEdit = (e) => {
      const layers = e.layers;
      layers.eachLayer((layer) => {
        const geoJSON = layer.toGeoJSON();
        onPolygonEdited(geoJSON.geometry);
      });
    };

    // Event: Eliminar polígono
    const handleRemove = (e) => {
      // Siempre reportar eliminación (Geoman solo emite pm:remove para capas nuestras)
      currentLayerRef.current = null;
      onPolygonDeleted();
    };

    // Registrar eventos
    map.on('pm:create', handleCreate);
    map.on('pm:edit', handleEdit);
    map.on('pm:remove', handleRemove);

    // Cleanup al desmontar
    return () => {
      map.pm.removeControls();
      map.off('pm:create', handleCreate);
      map.off('pm:edit', handleEdit);
      map.off('pm:remove', handleRemove);

      if (currentLayerRef.current && map.hasLayer(currentLayerRef.current)) {
        map.removeLayer(currentLayerRef.current);
      }
    };
  }, [map, onPolygonCreated, onPolygonEdited, onPolygonDeleted, enableDraw, enableEdit]);

  return null;
}
