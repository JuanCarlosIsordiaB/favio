import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Download, TrendingUp, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { exportarRemitosExcel } from '../../services/remittanceExports';

export default function RemittanceReportsView({
  remittances,
  selectedFirm
}) {
  // Estadísticas por estado
  const stats = {
    total: remittances.length,
    recibidos: remittances.filter(r => r.status === 'received').length,
    enTransito: remittances.filter(r => r.status === 'in_transit').length,
    parciales: remittances.filter(r => r.status === 'partially_received').length,
    cancelados: remittances.filter(r => r.status === 'cancelled').length
  };

  // Agrupar por proveedor
  const porProveedor = {};
  remittances.forEach(r => {
    if (!porProveedor[r.supplier_name]) {
      porProveedor[r.supplier_name] = 0;
    }
    porProveedor[r.supplier_name]++;
  });

  // Agrupar por mes
  const porMes = {};
  remittances.forEach(r => {
    const mes = r.remittance_date?.substring(0, 7) || 'N/A';
    if (!porMes[mes]) {
      porMes[mes] = 0;
    }
    porMes[mes]++;
  });

  const handleExportCSV = () => {
    try {
      const headers = ['Nº Remito', 'Fecha', 'Proveedor', 'Estado', 'Ítems'];
      const rows = remittances.map(r => [
        r.remittance_number,
        r.remittance_date,
        r.supplier_name,
        r.status,
        r.items?.length || 0
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `remitos-${selectedFirm.name}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      toast.success('CSV descargado');
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error descargando CSV');
    }
  };

  const handleExportExcel = () => {
    try {
      exportarRemitosExcel(remittances, selectedFirm);
      toast.success('Excel descargado');
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error descargando Excel: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumen General */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-slate-600">Total</div>
            <div className="text-3xl font-bold mt-2">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50">
          <CardContent className="pt-6">
            <div className="text-sm text-blue-700">En Tránsito</div>
            <div className="text-3xl font-bold mt-2 text-blue-600">{stats.enTransito}</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardContent className="pt-6">
            <div className="text-sm text-green-700">Recibidos</div>
            <div className="text-3xl font-bold mt-2 text-green-600">{stats.recibidos}</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50">
          <CardContent className="pt-6">
            <div className="text-sm text-orange-700">Parciales</div>
            <div className="text-3xl font-bold mt-2 text-orange-600">{stats.parciales}</div>
          </CardContent>
        </Card>
        <Card className="bg-red-50">
          <CardContent className="pt-6">
            <div className="text-sm text-red-700">Cancelados</div>
            <div className="text-3xl font-bold mt-2 text-red-600">{stats.cancelados}</div>
          </CardContent>
        </Card>
      </div>

      {/* Botones Exportar */}
      <div className="flex gap-3">
        <Button onClick={handleExportExcel} className="bg-green-600 hover:bg-green-700">
          <FileText className="w-4 h-4 mr-2" />
          Exportar a Excel
        </Button>
        <Button onClick={handleExportCSV} className="bg-blue-600 hover:bg-blue-700">
          <Download className="w-4 h-4 mr-2" />
          Exportar a CSV
        </Button>
      </div>

      {/* Por Proveedor */}
      {Object.keys(porProveedor).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Remitos por Proveedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(porProveedor)
                .sort((a, b) => b[1] - a[1])
                .map(([proveedor, count]) => (
                  <div key={proveedor} className="flex justify-between items-center pb-3 border-b last:border-0">
                    <span className="font-medium">{proveedor}</span>
                    <span className="text-lg font-bold text-blue-600">{count}</span>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>
      )}

      {/* Por Mes */}
      {Object.keys(porMes).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Remitos por Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(porMes)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .map(([mes, count]) => (
                  <div key={mes} className="flex justify-between items-center pb-3 border-b last:border-0">
                    <span className="font-medium">{mes}</span>
                    <span className="text-lg font-bold text-green-600">{count}</span>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla Completa */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Listado Completo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Nº Remito</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Ítems</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {remittances.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.remittance_number}</TableCell>
                    <TableCell>{r.remittance_date}</TableCell>
                    <TableCell>{r.supplier_name}</TableCell>
                    <TableCell>{r.status}</TableCell>
                    <TableCell className="text-right">{r.items?.length || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
