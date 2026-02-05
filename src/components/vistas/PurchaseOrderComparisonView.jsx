import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { obtenerComparativaPOVsRemitos, obtenerEstadoCompletitudPO } from '../../services/remittanceComparison';

export default function PurchaseOrderComparisonView({ purchaseOrder }) {
  const [comparativa, setComparativa] = useState(null);
  const [estadoGeneral, setEstadoGeneral] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (purchaseOrder?.id) {
      cargarComparativa();
    }
  }, [purchaseOrder?.id]);

  const cargarComparativa = async () => {
    setLoading(true);
    try {
      const { data, summary } = await obtenerComparativaPOVsRemitos(purchaseOrder.id);
      const estado = await obtenerEstadoCompletitudPO(purchaseOrder.id);

      setComparativa(data);
      setEstadoGeneral(estado);
    } catch (error) {
      toast.error('Error cargando comparativa: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completo':
        return 'bg-green-100 text-green-800';
      case 'Parcial':
        return 'bg-orange-100 text-orange-800';
      case 'Sin Recibir':
        return 'bg-red-100 text-red-800';
      case 'En Exceso':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completo':
        return <CheckCircle className="w-4 h-4" />;
      case 'Parcial':
        return <Clock className="w-4 h-4" />;
      case 'Sin Recibir':
        return <AlertCircle className="w-4 h-4" />;
      case 'En Exceso':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (!purchaseOrder) {
    return (
      <div className="p-6 text-center text-slate-500">
        Selecciona una orden de compra para ver el detalle de comparativa
      </div>
    );
  }

  if (loading) {
    return <div className="p-6 text-center">Cargando comparativa...</div>;
  }

  if (!comparativa) {
    return (
      <div className="p-6 text-center text-slate-500">
        No hay datos de comparativa disponibles
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Comparativa: Orden vs Recepción</h2>
        <p className="text-slate-600 mt-1">
          Orden #{purchaseOrder.order_number} • {new Date(purchaseOrder.order_date).toLocaleDateString('es-ES')}
        </p>
      </div>

      {/* Resumen General */}
      {estadoGeneral && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completitud General</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {estadoGeneral.overall_completion_percentage.toFixed(1)}%
              </div>
              <p className="text-xs text-slate-500 mt-1">{estadoGeneral.status}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Completos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {estadoGeneral.items_completed}/{estadoGeneral.total_items}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-600" />
                Parciales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {estadoGeneral.items_partial}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                Pendientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {estadoGeneral.items_pending}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabla de Comparativa */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Detalle de Ítems</CardTitle>
          <CardDescription>
            Comparación de cantidades ordenadas vs cantidades recibidas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table className="text-sm">
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Ordenado</TableHead>
                  <TableHead className="text-right">Recibido</TableHead>
                  <TableHead className="text-right">Pendiente</TableHead>
                  <TableHead className="text-right">% Completitud</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparativa.map((item) => (
                  <TableRow key={item.purchase_order_item_id}>
                    <TableCell className="font-medium">
                      <div>
                        <p>{item.item_description}</p>
                        <p className="text-xs text-slate-500">{item.unit}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.quantity_ordered}
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {item.quantity_received}
                    </TableCell>
                    <TableCell className="text-right text-red-600 font-medium">
                      {item.quantity_pending}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 bg-slate-100 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${item.completion_percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium w-10">
                          {item.completion_percentage.toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(item.completion_status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(item.completion_status)}
                          {item.completion_status}
                        </span>
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Resumen Detallado */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Análisis Detallado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Items sin recibir */}
            <div className="p-4 border rounded-lg border-red-200 bg-red-50">
              <p className="text-sm font-medium text-red-900">Items Sin Recibir</p>
              <p className="text-2xl font-bold text-red-600 mt-2">
                {comparativa.filter(i => i.completion_status === 'Sin Recibir').length}
              </p>
              <p className="text-xs text-red-700 mt-2">
                Requieren seguimiento inmediato
              </p>
            </div>

            {/* Items parciales */}
            <div className="p-4 border rounded-lg border-orange-200 bg-orange-50">
              <p className="text-sm font-medium text-orange-900">Items Parciales</p>
              <p className="text-2xl font-bold text-orange-600 mt-2">
                {comparativa.filter(i => i.completion_status === 'Parcial').length}
              </p>
              <p className="text-xs text-orange-700 mt-2">
                En proceso de recepción
              </p>
            </div>

            {/* Items en exceso */}
            <div className="p-4 border rounded-lg border-purple-200 bg-purple-50">
              <p className="text-sm font-medium text-purple-900">Items en Exceso</p>
              <p className="text-2xl font-bold text-purple-600 mt-2">
                {comparativa.filter(i => i.completion_status === 'En Exceso').length}
              </p>
              <p className="text-xs text-purple-700 mt-2">
                Recibidos más de lo ordenado
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
