/**
 * SalesManager.jsx
 * Componente principal para gestión de ventas
 * Módulo 17: Ventas de productos/insumos
 *
 * Funcionalidad:
 * - Lista de ventas con filtros
 * - Crear nueva venta
 * - Confirmar venta (descarga stock + ingreso financiero)
 * - Generar remito de salida
 * - Ver rentabilidad
 * - Cancelar venta
 */

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  TrendingUp,
  Package,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  DollarSign
} from 'lucide-react';
import { useSales } from '../hooks/useSales';
import { useSaleRemittances } from '../hooks/useSaleRemittances';
import { useInputs } from '../hooks/useInputs';
import { useAuth } from '../contexts/AuthContext';
import SaleFormModal from './modales/SaleFormModal';
import SaleRemittanceModal from './modales/SaleRemittanceModal';

export default function SalesManager({ selectedFirmId, selectedPremiseId }) {
  const { user } = useAuth();
  const { ventas, loading, loadSales, addSale, confirmSale, cancelSale, calculateProfitability } = useSales();
  const { remitos, loadRemittances, addRemittance } = useSaleRemittances();
  const { insumos, loadInputs } = useInputs();

  // Estado de vistas
  const [currentTab, setCurrentTab] = useState('ventas');

  // Estado de modales
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showRemittanceModal, setShowRemittanceModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);

  // Filtros
  const [filtros, setFiltros] = useState({
    status: '',
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0]
  });

  // Rentabilidad
  const [rentabilidad, setRentabilidad] = useState(null);

  // Cargar datos iniciales
  useEffect(() => {
    if (selectedFirmId) {
      loadSales(selectedFirmId, filtros);
      loadRemittances(selectedFirmId);
      loadInputs(selectedFirmId);
    }
  }, [selectedFirmId, filtros]);

  // Manejar crear venta
  const handleCreateSale = async (ventaData, items) => {
    try {
      const nuevaVenta = await addSale(ventaData, items);
      setShowSaleModal(false);
      return nuevaVenta;
    } catch (error) {
      console.error('Error creando venta:', error);
    }
  };

  // Manejar confirmar venta
  const handleConfirmSale = async (saleId) => {
    if (!confirm('¿Confirmar venta? Se descargará el stock y se registrará el ingreso automáticamente.')) {
      return;
    }

    try {
      await confirmSale(saleId, user.id);
      loadSales(selectedFirmId, filtros);
    } catch (error) {
      console.error('Error confirmando venta:', error);
    }
  };

  // Manejar cancelar venta
  const handleCancelSale = async (saleId) => {
    const reason = prompt('Motivo de cancelación:');
    if (!reason) return;

    try {
      await cancelSale(saleId, user.id, reason);
      loadSales(selectedFirmId, filtros);
    } catch (error) {
      console.error('Error cancelando venta:', error);
    }
  };

  // Manejar generar remito
  const handleGenerateRemittance = (sale) => {
    setSelectedSale(sale);
    setShowRemittanceModal(true);
  };

  // Cargar rentabilidad
  const handleViewRentability = async (saleId) => {
    try {
      const data = await calculateProfitability(saleId);
      setRentabilidad(data);
      setCurrentTab('rentabilidad');
    } catch (error) {
      console.error('Error calculando rentabilidad:', error);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      DRAFT: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-green-100 text-green-800',
      INVOICED: 'bg-blue-100 text-blue-800',
      COLLECTED: 'bg-purple-100 text-purple-800',
      CANCELLED: 'bg-red-100 text-red-800'
    };

    const labels = {
      DRAFT: 'Borrador',
      CONFIRMED: 'Confirmada',
      INVOICED: 'Facturada',
      COLLECTED: 'Cobrada',
      CANCELLED: 'Cancelada'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Ventas</h1>
          <p className="text-slate-600">Gestión de ventas de productos e insumos</p>
        </div>
        <Button onClick={() => setShowSaleModal(true)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
          <Plus size={20} />
          Nueva Venta
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ventas">Ventas</TabsTrigger>
          <TabsTrigger value="remitos">Remitos de Salida</TabsTrigger>
          <TabsTrigger value="rentabilidad">Rentabilidad</TabsTrigger>
          <TabsTrigger value="estadisticas">Estadísticas</TabsTrigger>
        </TabsList>

        {/* Tab: Lista de Ventas */}
        <TabsContent value="ventas">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Ventas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filtros */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">Estado</label>
                  <select
                    value={filtros.status}
                    onChange={(e) => setFiltros({...filtros, status: e.target.value})}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    <option value="">Todos los estados</option>
                    <option value="DRAFT">Borrador</option>
                    <option value="CONFIRMED">Confirmada</option>
                    <option value="INVOICED">Facturada</option>
                    <option value="COLLECTED">Cobrada</option>
                    <option value="CANCELLED">Cancelada</option>
                  </select>
                </div>

                <div className="flex-1">
                  <label className="text-sm font-medium">Desde</label>
                  <Input
                    type="date"
                    value={filtros.dateFrom}
                    onChange={(e) => setFiltros({...filtros, dateFrom: e.target.value})}
                    className="text-sm"
                  />
                </div>

                <div className="flex-1">
                  <label className="text-sm font-medium">Hasta</label>
                  <Input
                    type="date"
                    value={filtros.dateTo}
                    onChange={(e) => setFiltros({...filtros, dateTo: e.target.value})}
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Tabla de ventas */}
              {loading ? (
                <div className="text-center py-8 text-slate-500">Cargando ventas...</div>
              ) : ventas.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No hay ventas registradas</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="text-left p-3">Fecha</th>
                        <th className="text-left p-3">Cliente</th>
                        <th className="text-right p-3">Total</th>
                        <th className="text-center p-3">Estado</th>
                        <th className="text-right p-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventas.map(venta => (
                        <tr key={venta.id} className="border-b hover:bg-slate-50">
                          <td className="p-3">{venta.sale_date}</td>
                          <td className="p-3">
                            <div className="font-medium">{venta.client_name}</div>
                            <div className="text-xs text-slate-500">{venta.client_rut}</div>
                          </td>
                          <td className="p-3 text-right font-semibold">
                            {venta.total_amount} {venta.currency}
                          </td>
                          <td className="p-3 text-center">
                            {getStatusBadge(venta.status)}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex gap-2 justify-end">
                              {venta.status === 'DRAFT' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleConfirmSale(venta.id)}
                                  className="bg-green-600 hover:bg-green-700 text-xs"
                                >
                                  <CheckCircle size={14} className="mr-1" />
                                  Confirmar
                                </Button>
                              )}
                              {venta.status === 'CONFIRMED' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleGenerateRemittance(venta)}
                                  className="text-xs"
                                >
                                  <FileText size={14} className="mr-1" />
                                  Remito
                                </Button>
                              )}
                              {venta.status !== 'CANCELLED' && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleCancelSale(venta.id)}
                                  className="text-xs"
                                >
                                  <XCircle size={14} />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewRentability(venta.id)}
                                className="text-xs"
                              >
                                <TrendingUp size={14} className="mr-1" />
                                Margen
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Remitos de Salida */}
        <TabsContent value="remitos">
          <Card>
            <CardHeader>
              <CardTitle>Remitos de Salida</CardTitle>
            </CardHeader>
            <CardContent>
              {remitos.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No hay remitos registrados</div>
              ) : (
                <div className="space-y-4">
                  {remitos.map(remito => (
                    <div key={remito.id} className="border rounded p-4 hover:bg-slate-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-semibold">Remito {remito.remittance_number}</div>
                          <div className="text-sm text-slate-600">{remito.remittance_date}</div>
                          <div className="text-sm">
                            <strong>Cliente:</strong> {remito.sale?.client_name}
                          </div>
                          {remito.transport_company && (
                            <div className="text-sm text-slate-600">
                              Transporte: {remito.transport_company} - {remito.vehicle_plate}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          {getStatusBadge(remito.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Rentabilidad */}
        <TabsContent value="rentabilidad">
          {rentabilidad ? (
            <Card>
              <CardHeader>
                <CardTitle>Análisis de Rentabilidad</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Resumen */}
                <div className="grid grid-cols-4 gap-4">
                  <Card className="bg-blue-50">
                    <CardContent className="pt-6">
                      <div className="text-sm text-slate-600">Total Vendido</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {rentabilidad.resumen.total_venta.toFixed(2)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-orange-50">
                    <CardContent className="pt-6">
                      <div className="text-sm text-slate-600">Total Costo</div>
                      <div className="text-2xl font-bold text-orange-600">
                        {rentabilidad.resumen.total_costo.toFixed(2)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-green-50">
                    <CardContent className="pt-6">
                      <div className="text-sm text-slate-600">Ganancia</div>
                      <div className="text-2xl font-bold text-green-600">
                        {rentabilidad.resumen.total_ganancia.toFixed(2)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-purple-50">
                    <CardContent className="pt-6">
                      <div className="text-sm text-slate-600">Margen Global</div>
                      <div className="text-2xl font-bold text-purple-600">
                        {rentabilidad.resumen.margen_global_porcentaje.toFixed(2)}%
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Por producto */}
                <div>
                  <h3 className="font-semibold mb-3">Rentabilidad por Producto</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50">
                          <th className="text-left p-2">Producto</th>
                          <th className="text-right p-2">Cantidad</th>
                          <th className="text-right p-2">Precio Unit.</th>
                          <th className="text-right p-2">Costo Unit.</th>
                          <th className="text-right p-2">Ganancia</th>
                          <th className="text-right p-2">Margen %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rentabilidad.por_producto.map((item, idx) => (
                          <tr key={idx} className="border-b hover:bg-slate-50">
                            <td className="p-2">{item.input_name}</td>
                            <td className="p-2 text-right">{item.quantity}</td>
                            <td className="p-2 text-right">{item.unit_price.toFixed(2)}</td>
                            <td className="p-2 text-right">{item.unit_cost.toFixed(2)}</td>
                            <td className="p-2 text-right font-semibold text-green-600">
                              {item.ganancia.toFixed(2)}
                            </td>
                            <td className="p-2 text-right">{item.margen_porcentaje.toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8 text-slate-500">
                Selecciona una venta para ver su rentabilidad
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Estadísticas */}
        <TabsContent value="estadisticas">
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas de Ventas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                <Card className="bg-slate-50">
                  <CardContent className="pt-6">
                    <div className="text-sm text-slate-600">Total Ventas</div>
                    <div className="text-3xl font-bold">{ventas.length}</div>
                  </CardContent>
                </Card>

                <Card className="bg-yellow-50">
                  <CardContent className="pt-6">
                    <div className="text-sm text-slate-600">Borradores</div>
                    <div className="text-3xl font-bold text-yellow-600">
                      {ventas.filter(v => v.status === 'DRAFT').length}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-green-50">
                  <CardContent className="pt-6">
                    <div className="text-sm text-slate-600">Confirmadas</div>
                    <div className="text-3xl font-bold text-green-600">
                      {ventas.filter(v => v.status === 'CONFIRMED').length}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-blue-50">
                  <CardContent className="pt-6">
                    <div className="text-sm text-slate-600">Facturadas</div>
                    <div className="text-3xl font-bold text-blue-600">
                      {ventas.filter(v => v.status === 'INVOICED').length}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-red-50">
                  <CardContent className="pt-6">
                    <div className="text-sm text-slate-600">Canceladas</div>
                    <div className="text-3xl font-bold text-red-600">
                      {ventas.filter(v => v.status === 'CANCELLED').length}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <Card className="bg-green-50">
                  <CardContent className="pt-6">
                    <div className="text-sm text-slate-600">Total Vendido</div>
                    <div className="text-2xl font-bold text-green-600">
                      {ventas
                        .filter(v => v.status !== 'CANCELLED')
                        .reduce((sum, v) => sum + (v.total_amount || 0), 0)
                        .toFixed(2)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-purple-50">
                  <CardContent className="pt-6">
                    <div className="text-sm text-slate-600">Total Confirmado</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {ventas
                        .filter(v => v.status === 'CONFIRMED')
                        .reduce((sum, v) => sum + (v.total_amount || 0), 0)
                        .toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modales */}
      {showSaleModal && (
        <SaleFormModal
          firmId={selectedFirmId}
          premiseId={selectedPremiseId}
          insumos={insumos}
          onClose={() => setShowSaleModal(false)}
          onSave={handleCreateSale}
        />
      )}

      {showRemittanceModal && selectedSale && (
        <SaleRemittanceModal
          sale={selectedSale}
          onClose={() => {
            setShowRemittanceModal(false);
            setSelectedSale(null);
          }}
          onSave={async (remittanceData) => {
            try {
              await addRemittance(selectedSale.id, remittanceData);
              setShowRemittanceModal(false);
              setSelectedSale(null);
              loadRemittances(selectedFirmId);
            } catch (error) {
              console.error('Error:', error);
            }
          }}
        />
      )}
    </div>
  );
}
