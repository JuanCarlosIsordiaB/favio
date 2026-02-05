/**
 * MÓDULO 15 - KPIs y Umbrales de Alerta
 * Componente: Panel de Filtros Avanzados
 */

import React, { useState } from 'react';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { X } from 'lucide-react';

export default function KPIFilterPanel({ filters = {}, onChange = () => {}, onClose = () => {} }) {
  const [filtros, setFiltros] = useState(filters);

  const handleChange = (field, value) => {
    const nuevosFiltros = { ...filtros, [field]: value };
    setFiltros(nuevosFiltros);
  };

  const handleAplicar = () => {
    onChange(filtros);
  };

  const handleLimpiar = () => {
    setFiltros({});
    onChange({});
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Filtros Avanzados</h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          className="h-6 w-6 p-0"
        >
          <X size={16} />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Filtro por Status */}
        <div className="space-y-2">
          <Label htmlFor="status" className="text-sm">Estado</Label>
          <Select value={filtros.status || ''} onValueChange={(val) => handleChange('status', val)}>
            <SelectTrigger id="status">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="VERDE">🟢 Óptimo</SelectItem>
              <SelectItem value="AMARILLO">⚠️ Advertencia</SelectItem>
              <SelectItem value="ROJO">❌ Crítico</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filtro por Días */}
        <div className="space-y-2">
          <Label htmlFor="dias" className="text-sm">Últimos días</Label>
          <Select value={filtros.diasAntes || ''} onValueChange={(val) => handleChange('diasAntes', val ? parseInt(val) : null)}>
            <SelectTrigger id="dias">
              <SelectValue placeholder="Cualquier período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Cualquier período</SelectItem>
              <SelectItem value="1">Hoy</SelectItem>
              <SelectItem value="7">Últimos 7 días</SelectItem>
              <SelectItem value="30">Últimos 30 días</SelectItem>
              <SelectItem value="90">Últimos 90 días</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Búsqueda por nombre */}
        <div className="space-y-2 col-span-2">
          <Label htmlFor="search" className="text-sm">Buscar por nombre</Label>
          <Input
            id="search"
            placeholder="Ej: GDP, Mortalidad..."
            value={filtros.search || ''}
            onChange={(e) => handleChange('search', e.target.value)}
          />
        </div>

        {/* Rango de valores */}
        <div className="space-y-2">
          <Label htmlFor="min" className="text-sm">Valor mínimo</Label>
          <Input
            id="min"
            type="number"
            placeholder="Mínimo"
            value={filtros.minValue || ''}
            onChange={(e) => handleChange('minValue', e.target.value ? parseFloat(e.target.value) : null)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="max" className="text-sm">Valor máximo</Label>
          <Input
            id="max"
            type="number"
            placeholder="Máximo"
            value={filtros.maxValue || ''}
            onChange={(e) => handleChange('maxValue', e.target.value ? parseFloat(e.target.value) : null)}
          />
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-2 justify-end pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleLimpiar}
        >
          Limpiar filtros
        </Button>
        <Button
          size="sm"
          onClick={handleAplicar}
        >
          Aplicar filtros
        </Button>
      </div>
    </div>
  );
}
