import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, MapPin, Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COLORES_USO_SUELO, USOS_SUELO, CATEGORIAS_GANADERAS } from '@/types/lotes.types';

/**
 * Componente que renderiza una lista de lotes en forma de cards
 * @param {Object} props
 * @param {Array} props.lotes - Array de lotes a mostrar
 * @param {Function} props.onNuevoLote - Callback para crear nuevo lote
 * @param {Function} props.onSelectLote - Callback cuando se selecciona un lote
 * @param {Function} props.onViewDetail - Callback para ver detalle de lote
 * @param {boolean} props.loading - Estado de carga
 */
export function LotesList({
  lotes = [],
  onNuevoLote = () => {},
  onSelectLote = () => {},
  onViewDetail = () => {},
  loading = false,
}) {
  const [selectedLoteId, setSelectedLoteId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUsoSuelo, setFilterUsoSuelo] = useState('todos');
  const [filterCategoria, setFilterCategoria] = useState('todos');

  const handleSelectLote = (lote) => {
    setSelectedLoteId(lote.id);
    onSelectLote(lote);
  };

  const getUsoSueloLabel = (valor) => {
    return USOS_SUELO.find((uso) => uso.value === valor)?.label || valor;
  };

  const getColorUsoSuelo = (valor) => {
    return COLORES_USO_SUELO[valor] || '#6b7280';
  };

  // Aplicar todos los filtros
  const filteredLotes = lotes
    .filter(lote =>
      searchTerm === '' || lote.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(lote =>
      filterUsoSuelo === 'todos' || lote.uso_suelo === filterUsoSuelo
    )
    .filter(lote =>
      filterCategoria === 'todos' || lote.categoria_ganadera === filterCategoria
    );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando lotes...</p>
        </div>
      </div>
    );
  }

  if (!lotes || lotes.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Lotes</h2>
          <Button onClick={onNuevoLote} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Lote
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar lote por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
            disabled
          />
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center mb-6">
              No hay lotes registrados en este predio
            </p>
            <Button onClick={onNuevoLote} variant="outline">
              Crear primer lote
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Lotes ({filteredLotes.length})
        </h2>
        <Button onClick={onNuevoLote} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Lote
        </Button>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar lote por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 gap-2">
        <Select value={filterUsoSuelo} onValueChange={setFilterUsoSuelo}>
          <SelectTrigger>
            <SelectValue placeholder="Uso de suelo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {USOS_SUELO.map((uso) => (
              <SelectItem key={uso.value} value={uso.value}>
                {uso.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterCategoria} onValueChange={setFilterCategoria}>
          <SelectTrigger>
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            {CATEGORIAS_GANADERAS.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 max-h-96 overflow-y-auto pr-2">
        {filteredLotes.map((lote) => {
          const isSelected = selectedLoteId === lote.id;
          const colorUso = getColorUsoSuelo(lote.uso_suelo);

          return (
            <Card
              key={lote.id}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? 'ring-2 ring-primary bg-accent'
                  : 'hover:shadow-md'
              }`}
              onClick={() => handleSelectLote(lote)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-base">{lote.nombre}</CardTitle>
                    {lote.uso_suelo && (
                      <Badge
                        variant="secondary"
                        className="mt-1"
                        style={{
                          backgroundColor: colorUso,
                          color: 'white',
                        }}
                      >
                        {getUsoSueloLabel(lote.uso_suelo)}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Superficie</p>
                    <p className="font-semibold">
                      {lote.superficie_total} ha
                    </p>
                  </div>
                  {lote.hectareas_agricolas > 0 && (
                    <div>
                      <p className="text-muted-foreground">Agrícolas</p>
                      <p className="font-semibold">
                        {lote.hectareas_agricolas} ha
                      </p>
                    </div>
                  )}
                </div>

                {lote.cultivo_actual && (
                  <div className="text-sm">
                    <p className="text-muted-foreground">Cultivo actual</p>
                    <p className="font-medium">{lote.cultivo_actual}</p>
                  </div>
                )}

                {lote.cantidad_animales > 0 && (
                  <div className="text-sm">
                    <p className="text-muted-foreground">Categoría</p>
                    <p className="font-medium">
                      {lote.categoria_ganadera} ({lote.cantidad_animales})
                    </p>
                  </div>
                )}

                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetail(lote);
                    }}
                  >
                    Ver Detalle
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 gap-1 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectLote(lote);
                    }}
                  >
                    <MapPin className="h-3 w-3" />
                    Ver en mapa
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
