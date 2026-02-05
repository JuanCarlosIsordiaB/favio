import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Download, TrendingUp, DollarSign, Package } from 'lucide-react';
import { toast } from 'sonner';
import {
  obtenerValuacionIngresosPorPeriodo,
  obtenerValuacionPorProveedor,
  obtenerValuacionPorInsumo,
  generarReporteValuaciones
} from '../../services/remittanceValuation';

export default function RemittanceValuationReportView({ selectedFirm }) {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [activeTab, setActiveTab] = useState('general'); // general, proveedor, insumo

  // Inicializar fechas (mes actual)
  useEffect(() => {
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

    setFechaInicio(primerDia.toISOString().split('T')[0]);
    setFechaFin(ultimoDia.toISOString().split('T')[0]);
  }, []);

  const cargarReporte = async () => {
    if (!fechaInicio || !fechaFin) {
      toast.error('Ingresa rango de fechas');
      return;
    }

    if (new Date(fechaInicio) > new Date(fechaFin)) {
      toast.error('Fecha inicio debe ser anterior a fecha fin');
      return;
    }

    setLoading(true);
    try {
      const [general, proveedor, insumo] = await Promise.all([
        obtenerValuacionIngresosPorPeriodo(selectedFirm.id, fechaInicio, fechaFin),
        obtenerValuacionPorProveedor(selectedFirm.id, fechaInicio, fechaFin),
        obtenerValuacionPorInsumo(selectedFirm.id)
      ]);

      setReportData({
        general,
        proveedor,
        insumo
      });
    } catch (error) {
      toast.error('Error cargando reporte: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportarExcel = async () => {
    try {
      const reporte = await generarReporteValuaciones(
        selectedFirm.id,
        fechaInicio,
        fechaFin
      );

      // Crear CSV
      const csvContent = generarCSV(reporte);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_valuacion_${fechaInicio}_${fechaFin}.csv`;
      a.click();

      toast.success('Reporte exportado exitosamente');
    } catch (error) {
      toast.error('Error exportando reporte: ' + error.message);
    }
  };

  const generarCSV = (reporte) => {
    let csv = 'REPORTE DE VALUACIÓN DE STOCK\n';
    csv += `Período: ${fechaInicio} a ${fechaFin}\n\n`;

    // Resumen general
    csv += 'RESUMEN GENERAL\n';
    const stats = reporte.resumen_general;
    csv += `Total Items,${stats.total_items}\n`;
    csv += `Total Cantidad,${stats.total_quantity}\n`;
    csv += `Valor Total,"${stats.total_value.toLocaleString('es-ES', { minimumFractionDigits: 2 })};"\n`;
    csv += `Costo Promedio Unitario,"${stats.promedio_costo_unitario.toLocaleString('es-ES', { minimumFractionDigits: 2 })};"\n`;
    csv += `Remitos Totales,${stats.remittances_totales}\n\n`;

    // Por proveedor
    csv += 'VALUACIÓN POR PROVEEDOR\n';
    csv += 'Proveedor,Cantidad Total,Valor Total,Remitos\n';
    reporte.por_proveedor.forEach(p => {
      csv += `"${p.supplier_name}",${p.total_cantidad},"${p.total_valor.toLocaleString('es-ES', { minimumFractionDigits: 2 })};",${p.cantidad_remitos}\n`;
    });
    csv += '\n';

    // Por insumo
    csv += 'VALUACIÓN POR INSUMO\n';
    csv += 'Insumo,Categoría,Cantidad Recibida,Valor Total,Costo Promedio\n';
    reporte.por_insumo.forEach(i => {
      csv += `"${i.input.name}","${i.input.category}",${i.total_cantidad_recibida},"${i.total_valor_recibido.toLocaleString('es-ES', { minimumFractionDigits: 2 })};","${i.costo_promedio_unitario.toLocaleString('es-ES', { minimumFractionDigits: 2 })};"\n`;
    });

    return csv;
  };

  if (!reportData && !loading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Reporte de Valuación de Stock</h2>
          <p className="text-slate-600 mt-1">
            Análisis del valor de insumos ingresados por período
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Fecha Inicio</label>
                <Input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Fecha Fin</label>
                <Input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={cargarReporte}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Cargando...' : 'Generar Reporte'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header y Filtros */}
      <div>
        <h2 className="text-2xl font-bold">Reporte de Valuación de Stock</h2>
        <p className="text-slate-600 mt-1">
          Período: {fechaInicio} a {fechaFin}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base">Filtros</CardTitle>
            </div>
            <Button
              onClick={exportarExcel}
              variant="outline"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Fecha Inicio</label>
              <Input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Fecha Fin</label>
              <Input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={cargarReporte}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Cargando...' : 'Actualizar Reporte'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <>
          {/* Tarjetas Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  Valor Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  ${reportData.general.estadisticas.total_value.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  Items Ingresados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {reportData.general.estadisticas.total_items}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-orange-600" />
                  Cantidad Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  {reportData.general.estadisticas.total_quantity.toLocaleString('es-ES')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Costo Promedio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  ${reportData.general.estadisticas.promedio_costo_unitario.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs de Reportes */}
          <div className="flex gap-2 border-b">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'general'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Resumen General
            </button>
            <button
              onClick={() => setActiveTab('proveedor')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'proveedor'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Por Proveedor
            </button>
            <button
              onClick={() => setActiveTab('insumo')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'insumo'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Por Insumo
            </button>
          </div>

          {/* Contenido por Tab */}
          {activeTab === 'general' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Valuación General</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reportData.general.estadisticas.por_categoria &&
                    Object.entries(reportData.general.estadisticas.por_categoria).map(([cat, data]) => (
                      <div key={cat} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{cat}</p>
                            <p className="text-sm text-slate-500">
                              {data.items} items • {data.cantidad_total} unidades
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">
                              ${data.valor_total.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'proveedor' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Valuación por Proveedor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Proveedor</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Valor Total</TableHead>
                        <TableHead className="text-right">Remitos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.proveedor.por_proveedor.map((prov) => (
                        <TableRow key={prov.supplier_name}>
                          <TableCell className="font-medium">
                            {prov.supplier_name}
                          </TableCell>
                          <TableCell className="text-right">
                            {prov.total_cantidad.toLocaleString('es-ES')}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${prov.total_valor.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right">
                            {prov.cantidad_remitos}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'insumo' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Valuación por Insumo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Insumo</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Valor Total</TableHead>
                        <TableHead className="text-right">Costo Promedio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.insumo.por_insumo.map((ins) => (
                        <TableRow key={ins.input.id}>
                          <TableCell className="font-medium">
                            {ins.input.name}
                          </TableCell>
                          <TableCell>{ins.input.category || '-'}</TableCell>
                          <TableCell className="text-right">
                            {ins.total_cantidad_recibida.toLocaleString('es-ES')}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${ins.total_valor_recibido.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right">
                            ${ins.costo_promedio_unitario.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
