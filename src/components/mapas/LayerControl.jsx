import { Button } from '@/components/ui/button';

/**
 * Componente para cambiar entre capas OSM y Satélite en los mapas
 * @param {Object} props
 * @param {'osm'|'satellite'} props.activeLayer - Capa activa actual
 * @param {Function} props.onLayerChange - Callback cuando cambia la capa
 */
export function LayerControl({ activeLayer, onLayerChange }) {
  return (
    <div className="absolute top-2 right-2 z-[1000] bg-background border rounded-md shadow-md p-1">
      <div className="flex gap-1">
        <Button
          variant={activeLayer === 'osm' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onLayerChange('osm')}
        >
          Mapa
        </Button>
        <Button
          variant={activeLayer === 'satellite' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onLayerChange('satellite')}
        >
          Satélite
        </Button>
      </div>
    </div>
  );
}
