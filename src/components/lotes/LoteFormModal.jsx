import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { USOS_SUELO, CATEGORIAS_GANADERAS } from '@/types/lotes.types';
import { calcularSuperficie, validarPoligono, calcularCentroide } from '@/services/geospatial';
import { PolygonDrawer } from '@/components/mapas/PolygonDrawer';
import { usePredioCoverage } from '@/hooks/usePredioCoverage';

/**
 * Modal para crear/editar un lote con Tabs
 * FASE 2: Integración con mapa para dibujar polígonos
 * FASE 3: Validación de ocupación y hectáreas calculadas
 */
export function LoteFormModal({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
  error = null,
  initialData = null,
  predioUbicacion = null,
  predioSeleccionado = null,
  lotesExistentes = [],
}) {
  const [formData, setFormData] = useState(
    initialData || {
      nombre: '',
      uso_suelo: '',
      hectareas_agricolas: 0,
      cultivo_actual: '',
      categoria_ganadera: '',
      nombre_rodeo: '',
      cantidad_animales: 0,
      altura_pastura_cm: '',
      remanente_objetivo_cm: '',
      funciona_como_deposito: false,
      fecha_siembra: '',
      fecha_medicion_pastura: null,
      notas: '',
      poligono: null,
      superficie_total: 0,
      centro_lat: null,
      centro_lng: null,
    }
  );
  const [activeTab, setActiveTab] = useState('datos');
  const [validationError, setValidationError] = useState(null);

  // Calcular ocupación del predio
  const coverage = usePredioCoverage(lotesExistentes, parseFloat(predioSeleccionado?.superficie_total) || 0);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setValidationError(null);
  };

  const handlePolygonChange = (nuevoPoligono) => {
    if (nuevoPoligono) {
      const superficie = calcularSuperficie(nuevoPoligono);
      const centroide = calcularCentroide(nuevoPoligono);

      setFormData((prev) => ({
        ...prev,
        poligono: nuevoPoligono,
        superficie_total: superficie,
        centro_lat: centroide?.lat || null,
        centro_lng: centroide?.lng || null,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        poligono: null,
        superficie_total: 0,
        centro_lat: null,
        centro_lng: null,
      }));
    }
    setValidationError(null);
  };

  const handleSubmit = async () => {
    // Validar nombre
    if (!formData.nombre || formData.nombre.trim().length === 0) {
      setValidationError('El nombre del lote es requerido');
      setActiveTab('datos');
      return;
    }

    // Validar polígono
    if (!formData.poligono) {
      setValidationError('Debes dibujar un polígono en el mapa');
      setActiveTab('ubicacion');
      return;
    }

    // Validar estructura del polígono
    const validation = validarPoligono(formData.poligono);
    if (!validation.isValid) {
      setValidationError(validation.error);
      setActiveTab('ubicacion');
      return;
    }

    // Validar ocupación del predio
    if (predioSeleccionado) {
      const superficiePredio = parseFloat(predioSeleccionado.superficie_total) || 0;
      const ocupacionTotal = coverage.ocupado + formData.superficie_total;

      if (ocupacionTotal > superficiePredio) {
        setValidationError(
          `El lote excede la superficie disponible del predio. Exceso: ${(ocupacionTotal - superficiePredio).toFixed(2)} ha`
        );
        setActiveTab('datos');
        return;
      }
    }

    const dataToSubmit = {
      nombre: formData.nombre.trim(),
      uso_suelo: formData.uso_suelo || null,
      hectareas_agricolas: parseFloat(formData.hectareas_agricolas) || 0,
      cultivo_actual: formData.cultivo_actual.trim() || null,
      categoria_ganadera: formData.categoria_ganadera || null,
      nombre_rodeo: formData.nombre_rodeo.trim() || null,
      cantidad_animales: parseInt(formData.cantidad_animales) || 0,
      altura_pastura_cm: formData.altura_pastura_cm
        ? parseFloat(formData.altura_pastura_cm)
        : null,
      remanente_objetivo_cm: formData.remanente_objetivo_cm
        ? parseFloat(formData.remanente_objetivo_cm)
        : null,
      funciona_como_deposito: formData.funciona_como_deposito || false,
      fecha_siembra: formData.fecha_siembra || null,
      fecha_medicion_pastura: formData.fecha_medicion_pastura || null,
      notas: formData.notas.trim() || null,
      poligono: formData.poligono,
      superficie_total: formData.superficie_total,
      centro_lat: formData.centro_lat,
      centro_lng: formData.centro_lng,
    };

    await onSubmit(dataToSubmit);
  };

  // Validar formulario completo
  const isFormValid = () => {
    if (formData.nombre.trim().length === 0) return false;
    if (formData.poligono === null) return false;
    if (!validarPoligono(formData.poligono).isValid) return false;

    // Validar ocupación
    if (predioSeleccionado) {
      const superficiePredio = parseFloat(predioSeleccionado.superficie_total) || 0;
      const ocupacionTotal = coverage.ocupado + formData.superficie_total;
      if (ocupacionTotal > superficiePredio) return false;
    }

    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Lote' : 'Crear Lote'}</DialogTitle>
          <DialogDescription>
            Completa los datos del lote y dibuja su ubicación en el mapa.
          </DialogDescription>
        </DialogHeader>

        {(error || validationError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || validationError}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="datos">Datos Básicos</TabsTrigger>
            <TabsTrigger value="ubicacion">
              Ubicación
              {formData.superficie_total > 0 &&
                ` (${formData.superficie_total.toFixed(2)} ha)`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="datos">
            <div className="space-y-4">
          {/* Nombre (requerido) */}
          <div className="space-y-2">
            <Label htmlFor="nombre">
              Nombre del Lote <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              placeholder="Ej: Lote A, Pastura 1"
              disabled={loading}
            />
          </div>

          {/* Uso de Suelo */}
          <div className="space-y-2">
            <Label htmlFor="uso_suelo">Uso de Suelo</Label>
            <Select
              value={formData.uso_suelo || ''}
              onValueChange={(value) => handleChange('uso_suelo', value)}
              disabled={loading}
            >
              <SelectTrigger id="uso_suelo">
                <SelectValue placeholder="Selecciona tipo" />
              </SelectTrigger>
              <SelectContent>
                {USOS_SUELO.map((uso) => (
                  <SelectItem key={uso.value} value={uso.value}>
                    {uso.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Hectáreas Agrícolas - Calculadas automáticamente */}
          {formData.poligono && (
            <div className="space-y-2">
              <Label>Hectáreas Agrícolas</Label>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold">{formData.superficie_total.toFixed(2)}</p>
                <p className="text-lg text-muted-foreground">ha</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Calculadas automáticamente del polígono dibujado
              </p>
            </div>
          )}

          {/* Validación de Ocupación del Predio */}
          {formData.poligono && predioSeleccionado && (
            <Alert
              variant={
                coverage.ocupado + formData.superficie_total > parseFloat(predioSeleccionado.superficie_total)
                  ? 'destructive'
                  : 'default'
              }
            >
              {coverage.ocupado + formData.superficie_total <= parseFloat(predioSeleccionado.superficie_total) ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {coverage.ocupado + formData.superficie_total <= parseFloat(predioSeleccionado.superficie_total) ? (
                  <>
                    <strong>OK:</strong> Espacio disponible{' '}
                    {(parseFloat(predioSeleccionado.superficie_total) - coverage.ocupado - formData.superficie_total).toFixed(2)} ha
                  </>
                ) : (
                  <>
                    <strong>ERROR:</strong> Excede por{' '}
                    {Math.abs(
                      parseFloat(predioSeleccionado.superficie_total) - coverage.ocupado - formData.superficie_total
                    ).toFixed(2)}{' '}
                    ha
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Cultivo Actual */}
          <div className="space-y-2">
            <Label htmlFor="cultivo_actual">Cultivo Actual</Label>
            <Input
              id="cultivo_actual"
              value={formData.cultivo_actual}
              onChange={(e) => handleChange('cultivo_actual', e.target.value)}
              placeholder="Ej: Maíz, Soja"
              disabled={loading}
            />
          </div>

          {/* Categoría Ganadera */}
          <div className="space-y-2">
            <Label htmlFor="categoria_ganadera">Categoría Ganadera</Label>
            <Select
              value={formData.categoria_ganadera || ''}
              onValueChange={(value) =>
                handleChange('categoria_ganadera', value)
              }
              disabled={loading}
            >
              <SelectTrigger id="categoria_ganadera">
                <SelectValue placeholder="Selecciona categoría" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS_GANADERAS.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nombre del Rodeo */}
          <div className="space-y-2">
            <Label htmlFor="nombre_rodeo">Nombre del Rodeo</Label>
            <Input
              id="nombre_rodeo"
              value={formData.nombre_rodeo}
              onChange={(e) => handleChange('nombre_rodeo', e.target.value)}
              placeholder="Ej: Rodeo A"
              disabled={loading}
            />
          </div>

          {/* Cantidad de Animales */}
          <div className="space-y-2">
            <Label htmlFor="cantidad_animales">Cantidad de Animales</Label>
            <Input
              id="cantidad_animales"
              type="number"
              value={formData.cantidad_animales}
              onChange={(e) =>
                handleChange('cantidad_animales', e.target.value)
              }
              placeholder="0"
              disabled={loading}
            />
          </div>

          {/* Funciona como depósito */}
          <div className="flex items-center space-x-3">
            <Checkbox
              id="funciona_como_deposito"
              checked={formData.funciona_como_deposito}
              onCheckedChange={(checked) =>
                handleChange('funciona_como_deposito', checked)
              }
              disabled={loading}
            />
            <Label
              htmlFor="funciona_como_deposito"
              className="text-sm font-normal cursor-pointer"
            >
              Este lote funciona como depósito de insumos
            </Label>
          </div>

          {/* Fecha de Siembra */}
          <div className="space-y-2">
            <Label htmlFor="fecha_siembra">Fecha de Siembra</Label>
            <Input
              id="fecha_siembra"
              type="date"
              value={formData.fecha_siembra}
              onChange={(e) =>
                handleChange('fecha_siembra', e.target.value)
              }
              disabled={loading}
            />
          </div>

          {/* Días de Descanso (calculado, solo lectura) */}
          {formData.fecha_medicion_pastura && (
            <div className="space-y-2">
              <Label>Días de Descanso</Label>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold">
                  {Math.floor(
                    (new Date() - new Date(formData.fecha_medicion_pastura)) /
                      (1000 * 60 * 60 * 24)
                  )}
                </p>
                <p className="text-lg text-muted-foreground">días</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Calculados desde la última medición de pastura
              </p>
            </div>
          )}

          {/* Altura Pastura */}
          <div className="space-y-2">
            <Label htmlFor="altura_pastura_cm">Altura de Pastura (cm)</Label>
            <Input
              id="altura_pastura_cm"
              type="number"
              step="0.1"
              value={formData.altura_pastura_cm}
              onChange={(e) =>
                handleChange('altura_pastura_cm', e.target.value)
              }
              placeholder="0.0"
              disabled={loading}
            />
          </div>

          {/* Remanente Objetivo */}
          <div className="space-y-2">
            <Label htmlFor="remanente_objetivo_cm">Remanente Objetivo (cm)</Label>
            <Input
              id="remanente_objetivo_cm"
              type="number"
              step="0.1"
              value={formData.remanente_objetivo_cm}
              onChange={(e) =>
                handleChange('remanente_objetivo_cm', e.target.value)
              }
              placeholder="0.0"
              disabled={loading}
            />
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              value={formData.notas}
              onChange={(e) => handleChange('notas', e.target.value)}
              placeholder="Información adicional"
              disabled={loading}
              rows={3}
            />
          </div>

            </div>
          </TabsContent>

          <TabsContent value="ubicacion">
            <PolygonDrawer
              initialPolygon={formData.poligono}
              onPolygonChange={handlePolygonChange}
              mode={initialData ? 'edit' : 'create'}
              predioUbicacion={predioUbicacion}
              lotesExistentes={lotesExistentes}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !isFormValid()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? 'Actualizar' : 'Crear'} Lote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
