import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Card } from '../ui/card';
import { Eye, Trash2, Search, Calendar } from 'lucide-react';
import RemittanceDetailModal from '../modales/RemittanceDetailModal';
import RemittanceReceiveModal from '../modales/RemittanceReceiveModal';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

export default function RemittanceListView({
  remittances,
  loading,
  selectedFirm,
  selectedPremise,
  currentUser,
  onRefresh
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRemittance, setSelectedRemittance] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);

  const getStatusBadge = (status) => {
    const styles = {
      'in_transit': 'bg-blue-100 text-blue-800',
      'received': 'bg-green-100 text-green-800',
      'partially_received': 'bg-orange-100 text-orange-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    const labels = {
      'in_transit': 'En Tránsito',
      'received': 'Recibido',
      'partially_received': 'Parcialmente',
      'cancelled': 'Cancelado'
    };
    return <Badge className={styles[status]}>{labels[status]}</Badge>;
  };

  const filteredRemittances = remittances.filter(r => {
    const matchesSearch = r.remittance_number.includes(searchQuery) ||
                          r.supplier_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleReceive = async (remittanceId) => {
    const remittance = remittances.find(r => r.id === remittanceId);
    setSelectedRemittance(remittance);
    setIsReceiveModalOpen(true);
  };

  const handleSubmitReceive = async (remittanceId, itemsData) => {
    try {
      // Usar servicio directamente para recibir remito con cantidades parciales
      const { recibirRemitoParciamente } = await import('../../services/remittances');
      await recibirRemitoParciamente(remittanceId, currentUser, itemsData);

      toast.success('Remito recibido correctamente');
      setIsReceiveModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error procesando recepción');
    }
  };

  const handleDelete = async (remittanceId) => {
    if (!confirm('¿Cancelar este remito?')) return;

    try {
      const { cancelarRemito } = await import('../../services/remittances');
      await cancelarRemito(remittanceId, 'Cancelado por usuario');
      toast.success('Remito cancelado');
      onRefresh();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error cancelando remito');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por número o proveedor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        >
          <option value="all">Todos</option>
          <option value="in_transit">En Tránsito</option>
          <option value="received">Recibidos</option>
          <option value="partially_received">Parciales</option>
          <option value="cancelled">Cancelados</option>
        </select>
      </div>

      {/* Tabla */}
      {filteredRemittances.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Nº Remito</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Ítems</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRemittances.map(remittance => (
                  <TableRow key={remittance.id}>
                    <TableCell className="font-medium">{remittance.remittance_number}</TableCell>
                    <TableCell className="text-slate-600">{remittance.remittance_date}</TableCell>
                    <TableCell>{remittance.supplier_name}</TableCell>
                    <TableCell className="text-center text-slate-600">
                      {remittance.items?.length || 0}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(remittance.status)}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedRemittance(remittance);
                          setIsDetailModalOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      {remittance.status === 'in_transit' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-green-600 hover:text-green-700"
                          onClick={() => handleReceive(remittance.id)}
                        >
                          Recibir
                        </Button>
                      )}

                      {remittance.status !== 'received' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(remittance.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        <Card className="p-12 text-center text-slate-500">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>No hay remitos que mostrar</p>
        </Card>
      )}

      {/* Modales */}
      <RemittanceDetailModal
        isOpen={isDetailModalOpen}
        remittance={selectedRemittance}
        onClose={() => setIsDetailModalOpen(false)}
        onReceive={handleReceive}
        firm={selectedFirm}
      />

      <RemittanceReceiveModal
        isOpen={isReceiveModalOpen}
        remittance={selectedRemittance}
        onClose={() => setIsReceiveModalOpen(false)}
        onSubmit={handleSubmitReceive}
      />
    </div>
  );
}
