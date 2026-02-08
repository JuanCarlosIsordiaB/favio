import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Package, AlertCircle, Loader } from 'lucide-react';
import RemittanceReceiveModal from '../modales/RemittanceReceiveModal';
import InputFormModal from '../modales/InputFormModal';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function RemittanceReceptionView({
  remittances,
  loading,
  selectedFirm,
  selectedPremise,
  currentUser,
  onRefresh
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRemittance, setSelectedRemittance] = useState(null);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [itemsNeedingInputCreation, setItemsNeedingInputCreation] = useState([]);
  const [currentItemCreating, setCurrentItemCreating] = useState(null);
  const [isInputFormModalOpen, setIsInputFormModalOpen] = useState(false);
  const [depots, setDepots] = useState([]);

  // Cargar depósitos
  useEffect(() => {
    if (selectedFirm?.id) {
      loadDepots();
    }
  }, [selectedFirm?.id]);

  const loadDepots = async () => {
    try {
      const { supabase } = await import('../../lib/supabase');
      // Cargar todos los depósitos de la firma, no solo del predio seleccionado
      const { data } = await supabase
        .from('lots')
        .select('id, name')
        .eq('firm_id', selectedFirm.id)
        .eq('is_depot', true)
        .order('name');
      setDepots(data || []);
    } catch (err) {
      console.warn('Error cargando depósitos:', err);
    }
  };

  const filteredRemittances = remittances.filter(r =>
    r.remittance_number.includes(searchQuery) ||
    r.supplier_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleReceive = (remittance) => {
    setSelectedRemittance(remittance);
    setIsReceiveModalOpen(true);
  };

  const handleSubmitReceive = async (remittanceId, itemsData) => {
    try {
      const { recibirRemitoParciamente, vincularInputAlItem } = await import('../../services/remittances');
      const { crearInsumo } = await import('../../services/inputs');

      // Actualizar ítems y marcar remito como parcialmente recibido
      const result = await recibirRemitoParciamente(remittanceId, currentUser, itemsData);

      // CRÍTICO: Cerrar el modal de recepción primero
      setIsReceiveModalOpen(false);

      // Verificar si hay items que necesitan crear insumo
      if (result.itemsNeedingInputCreation && result.itemsNeedingInputCreation.length > 0) {
        console.log('📝 [handleSubmitReceive] Abriendo InputFormModal con', result.itemsNeedingInputCreation.length, 'items');
        setItemsNeedingInputCreation(result.itemsNeedingInputCreation);
        setCurrentItemCreating(result.itemsNeedingInputCreation[0]);
        toast.info(`Necesitas crear ${result.itemsNeedingInputCreation.length} insumo(s) para este remito`);
        // Abrir el modal después de un pequeño delay para asegurar que se renderice
        setTimeout(() => {
          setIsInputFormModalOpen(true);
        }, 100);
      } else {
        toast.success('✓ Remito recibido\n✓ Stock actualizado');
        onRefresh();
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error procesando recepción');
    }
  };

  const handleCreateInput = async (formData) => {
    try {
      const { crearInsumo } = await import('../../services/inputs');
      const { vincularInputAlItem } = await import('../../services/remittances');

      // Crear el insumo
      // Nota: initial_stock del formulario se mapea a current_stock en Supabase
      const nuevoInsumo = await crearInsumo({
        ...formData,
        firm_id: selectedFirm.id,
        premise_id: selectedPremise.id,
        // Si initial_stock no viene en formData, usar la cantidad recibida
        current_stock: formData.initial_stock || currentItemCreating.quantity_received
      });

      // Vincular el insumo al item del remito
      await vincularInputAlItem(currentItemCreating.id, nuevoInsumo.id);

      toast.success(`✓ Insumo "${currentItemCreating.item_description}" creado`);

      // Verificar si hay más items faltantes
      const remainingItems = itemsNeedingInputCreation.filter(
        item => item.id !== currentItemCreating.id
      );

      if (remainingItems.length > 0) {
        setItemsNeedingInputCreation(remainingItems);
        setCurrentItemCreating(remainingItems[0]);
        // CRÍTICO: Cerrar y reabrir modal para forzar reset del formulario
        setIsInputFormModalOpen(false);
        setTimeout(() => {
          setIsInputFormModalOpen(true);
        }, 300);
      } else {
        // Todos los insumos creados
        setIsInputFormModalOpen(false);
        setItemsNeedingInputCreation([]);
        setCurrentItemCreating(null);
        toast.success('✓ Todos los insumos creados correctamente');
        onRefresh();
        setIsReceiveModalOpen(false);
      }
    } catch (err) {
      console.error('Error creando insumo:', err);
      toast.error('Error creando insumo: ' + (err.message || 'Error desconocido'));
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Input
          placeholder="Buscar remito o proveedor..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {remittances.length === 0 ? (
        <Card className="p-12 text-center text-slate-500">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>No hay remitos pendientes de recepción</p>
        </Card>
      ) : filteredRemittances.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Nº Remito</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Ítems</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRemittances.map(remittance => (
                  <TableRow key={remittance.id}>
                    <TableCell className="font-medium">{remittance.remittance_number}</TableCell>
                    <TableCell>{remittance.remittance_date}</TableCell>
                    <TableCell>{remittance.supplier_name}</TableCell>
                    <TableCell className="text-right">{remittance.items?.length || 0}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleReceive(remittance)}
                      >
                        Procesar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        <Card className="p-8 text-center text-slate-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>No coinciden los resultados de búsqueda</p>
        </Card>
      )}

      <RemittanceReceiveModal
        isOpen={isReceiveModalOpen}
        remittance={selectedRemittance}
        onClose={() => setIsReceiveModalOpen(false)}
        onSubmit={handleSubmitReceive}
      />

      {/* Modal para crear insumos faltantes */}
      {currentItemCreating && (
        <InputFormModal
          isOpen={isInputFormModalOpen}
          isEditing={false}
          onSubmit={handleCreateInput}
          onCancel={() => {
            setIsInputFormModalOpen(false);
            setItemsNeedingInputCreation([]);
            setCurrentItemCreating(null);
          }}
          depots={depots}
          initialData={{
            name: currentItemCreating.item_description || '',
            initial_stock: currentItemCreating.quantity_received || 0,
            unit: currentItemCreating.unit || '',
            depot_id: depots.length > 0 ? depots[0].id : '', // Preseleccionar primer depósito si existe
            category: 'Otros' // Categoría por defecto
          }}
        />
      )}
    </div>
  );
}
