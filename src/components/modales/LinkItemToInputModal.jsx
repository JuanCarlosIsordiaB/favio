import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AlertCircle, Search, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';

export default function LinkItemToInputModal({
  isOpen,
  remittanceItem,
  firmId,
  onClose,
  onLinkToExisting,
  onCreateNew
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [inputs, setInputs] = useState([]);
  const [searching, setSearching] = useState(false);
  const [newInputData, setNewInputData] = useState({
    name: remittanceItem?.item_description || '',
    unit: remittanceItem?.unit || 'kg',
    category: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadInputs();
    }
  }, [isOpen]);

  const loadInputs = async () => {
    try {
      const { data } = await supabase
        .from('inputs')
        .select('*')
        .eq('firm_id', firmId)
        .order('name');
      setInputs(data || []);
    } catch (err) {
      console.error('Error cargando insumos:', err);
      toast.error('Error cargando insumos');
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const filteredInputs = inputs.filter(input =>
    input.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    input.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLinkToExisting = async (inputId) => {
    try {
      await onLinkToExisting(remittanceItem.id, inputId);
      onClose();
      toast.success('Ítem vinculado a insumo existente');
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleCreateNew = async () => {
    if (!newInputData.name.trim()) {
      toast.error('El nombre del insumo es requerido');
      return;
    }

    try {
      await onCreateNew(remittanceItem.id, newInputData);
      onClose();
      toast.success('Nuevo insumo creado y vinculado');
    } catch (err) {
      console.error('Error:', err);
    }
  };

  if (!isOpen || !remittanceItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Vincular Ítem a Insumo</DialogTitle>
          <DialogDescription>
            {remittanceItem.item_description}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="existing" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Insumo Existente</TabsTrigger>
            <TabsTrigger value="new">Crear Nuevo</TabsTrigger>
          </TabsList>

          {/* Tab: Insumo Existente */}
          <TabsContent value="existing" className="space-y-4 p-4">
            <div>
              <Label htmlFor="search">Buscar insumo</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="search"
                  placeholder="Busca por nombre o categoría..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-2">
              {filteredInputs.length > 0 ? (
                filteredInputs.map(input => (
                  <div
                    key={input.id}
                    className="p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition"
                    onClick={() => handleLinkToExisting(input.id)}
                  >
                    <div className="font-medium text-sm">{input.name}</div>
                    <div className="text-xs text-slate-600 mt-1">
                      {input.category || 'Sin categoría'} • Stock: {input.current_stock} {input.unit}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-8 text-slate-500">
                  {inputs.length === 0 ? 'No hay insumos registrados' : 'No coinciden los resultados'}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab: Crear Nuevo */}
          <TabsContent value="new" className="space-y-4 p-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                Este es el <strong>ÚNICO</strong> mecanismo para crear insumos en el sistema.
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="input_name">Nombre del Insumo *</Label>
                <Input
                  id="input_name"
                  value={newInputData.name}
                  onChange={(e) => setNewInputData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nombre del insumo"
                />
              </div>

              <div>
                <Label htmlFor="input_unit">Unidad de Medida *</Label>
                <Input
                  id="input_unit"
                  value={newInputData.unit}
                  onChange={(e) => setNewInputData(prev => ({ ...prev, unit: e.target.value }))}
                  placeholder="Ej: kg, litros, etc"
                />
              </div>

              <div>
                <Label htmlFor="input_category">Categoría (opcional)</Label>
                <Input
                  id="input_category"
                  value={newInputData.category}
                  onChange={(e) => setNewInputData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Ej: Semillas, Fertilizantes, etc"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {/* El botón de crear nuevo está en el tab correspondiente */}
          <Button
            onClick={handleCreateNew}
            className="hidden"
            id="create-new-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Crear e Ingresar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
