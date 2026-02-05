import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Layers } from 'lucide-react';
import { BASE_LAYERS, OVERLAY_LAYERS } from '@/lib/mapLayers.config';

/**
 * Control avanzado de capas para mapas
 * Permite seleccionar capa base (mutuamente exclusiva) e overlays (combinables)
 *
 * @param {Object} props
 * @param {'osm'|'satellite'|'terrain'|'ndvi'} props.baseLayer - Capa base activa
 * @param {Function} props.onBaseLayerChange - Callback cuando cambia capa base
 * @param {Object} props.overlays - {cultivo: boolean, pastura: boolean}
 * @param {Function} props.onOverlayToggle - Callback (overlayId, enabled)
 * @param {string} props.ndviDate - Fecha seleccionada para NDVI (si aplica)
 * @param {Function} props.onNDVIDateChange - Callback para cambio de fecha NDVI
 */
export function AdvancedLayerControl({
  baseLayer = 'osm',
  onBaseLayerChange = () => {},
  overlays = { cultivo: false, pastura: false },
  onOverlayToggle = () => {},
  ndviDate = null,
  onNDVIDateChange = () => {},
}) {
  const [isOpen, setIsOpen] = useState(false);

  const baseLayerConfig = BASE_LAYERS[baseLayer];
  const displayLabel = baseLayerConfig?.label || 'Capa no válida';

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="absolute top-2 right-2 z-[1000] gap-2"
        >
          <Layers className="h-4 w-4" />
          {displayLabel}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {/* CAPAS BASE */}
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
          CAPA BASE
        </DropdownMenuLabel>

        {Object.values(BASE_LAYERS).map((layer) => (
          <DropdownMenuItem
            key={layer.id}
            onClick={() => onBaseLayerChange(layer.id)}
            className="cursor-pointer flex items-center"
          >
            <div className="flex items-center w-full">
              <div
                className="w-4 h-4 rounded-full border-2 mr-2 flex-shrink-0"
                style={{
                  borderColor: baseLayer === layer.id ? '#3b82f6' : '#d1d5db',
                  backgroundColor: baseLayer === layer.id ? '#3b82f6' : 'transparent',
                }}
              />
              <span className="flex-1">{layer.label}</span>
            </div>
          </DropdownMenuItem>
        ))}

        {/* SELECTOR DE FECHA PARA NDVI */}
        {baseLayer === 'ndvi' && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-2">
              <Label htmlFor="ndvi-date" className="text-xs">
                Fecha NDVI
              </Label>
              <input
                id="ndvi-date"
                type="date"
                value={ndviDate || ''}
                onChange={(e) => onNDVIDateChange(e.target.value)}
                className="w-full mt-1 px-2 py-1 text-sm border rounded"
              />
            </div>
          </>
        )}

        {/* OVERLAYS */}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
          OVERLAYS
        </DropdownMenuLabel>

        {Object.values(OVERLAY_LAYERS).map((overlay) => (
          <DropdownMenuCheckboxItem
            key={overlay.id}
            checked={overlays[overlay.id] || false}
            onCheckedChange={(checked) => onOverlayToggle(overlay.id, checked)}
            className="cursor-pointer"
          >
            <span className="flex-1">{overlay.label}</span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
