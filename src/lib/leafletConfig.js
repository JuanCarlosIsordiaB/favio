import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';

/**
 * Configuración inicial de Leaflet
 * Arregla el problema de iconos de marcadores en Vite/React
 */

// Configurar icono por defecto
let DefaultIcon = L.icon({
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Aplicar como icono por defecto para todos los marcadores
L.Marker.prototype.options.icon = DefaultIcon;

export default DefaultIcon;
