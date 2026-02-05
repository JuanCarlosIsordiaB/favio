import React, { useState, useEffect } from 'react';
import {
    DollarSign,
    FileText,
    Calendar,
    TrendingUp,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from './ui/dialog';
import { toast } from 'sonner';
import { getEventCosts, convertCostToExpense, getEventCostStats } from '../services/eventCosts';

export default function EventCostsViewer({ firmId }) {
    const [costs, setCosts] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [convertModalOpen, setConvertModalOpen] = useState(false);
    const [selectedCost, setSelectedCost] = useState(null);
    const [converting, setConverting] = useState(false);
    const [expenseData, setExpenseData] = useState({
        provider_name: '',
        invoice_number: '',
        invoice_date: '',
        category: 'Operaciones Ganaderas'
    });

    useEffect(() => {
        if (firmId) {
            loadData();
        }
    }, [firmId]);

    async function loadData() {
        setLoading(true);
        try {
            const [costsData, statsData] = await Promise.all([
                getEventCosts({ firmId }),
                getEventCostStats(firmId)
            ]);
            setCosts(costsData || []);
            setStats(statsData);
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Error al cargar costos');
        } finally {
            setLoading(false);
        }
    }

    const handleOpenConvertModal = (cost) => {
        setSelectedCost(cost);
        setExpenseData({
            provider_name: '',
            invoice_number: '',
            invoice_date: cost.event?.event_date ? new Date(cost.event.event_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            category: 'Operaciones Ganaderas'
        });
        setConvertModalOpen(true);
    };

    const handleConvert = async () => {
        if (!expenseData.provider_name?.trim()) {
            toast.error('Completa el nombre del proveedor');
            return;
        }
        if (!expenseData.invoice_number?.trim()) {
            toast.error('Completa el número de factura');
            return;
        }

        setConverting(true);
        try {
            await convertCostToExpense(selectedCost.id, expenseData);
            toast.success('✅ Factura creada exitosamente');
            setConvertModalOpen(false);
            await loadData();
        } catch (error) {
            console.error('Error converting:', error);
            toast.error('Error: ' + error.message);
        } finally {
            setConverting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
            </div>
        );
    }

    const pendingCosts = costs.filter(c => c.status === 'POSTED');
    const convertedCosts = costs.filter(c => c.status === 'CONVERTED_TO_EXPENSE');

    return (
        <div className="space-y-6">
            {/* KPIs */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-emerald-200 shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="text-emerald-600" size={18} />
                                <p className="text-xs text-slate-500 font-bold uppercase">Costos Pendientes</p>
                            </div>
                            <p className="text-2xl font-black text-emerald-600">
                                ${stats.total_posted?.toFixed(2) || '0.00'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">{pendingCosts.length} costos</p>
                        </CardContent>
                    </Card>

                    <Card className="border-blue-200 shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <FileText className="text-blue-600" size={18} />
                                <p className="text-xs text-slate-500 font-bold uppercase">Convertidos a Facturas</p>
                            </div>
                            <p className="text-2xl font-black text-blue-600">
                                ${stats.total_converted?.toFixed(2) || '0.00'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">{convertedCosts.length} facturas</p>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="text-slate-600" size={18} />
                                <p className="text-xs text-slate-500 font-bold uppercase">Total General</p>
                            </div>
                            <p className="text-2xl font-black text-slate-700">
                                ${stats.total_amount?.toFixed(2) || '0.00'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">Todos los costos</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Costos Pendientes */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign size={20} />
                        Costos Automáticos Pendientes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {pendingCosts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <AlertCircle className="text-slate-300 w-12 h-12 mb-3" />
                            <p className="text-slate-500 font-medium">No hay costos pendientes de facturar</p>
                            <p className="text-sm text-slate-400 mt-1">Los costos aparecerán aquí cuando apruebes eventos con reglas de costo configuradas</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pendingCosts.map(cost => (
                                <Card key={cost.id} className="border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                                    <CardContent className="p-4">
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge className="bg-blue-100 text-blue-700 border-none">
                                                        {cost.event?.event_type || 'EVENTO'}
                                                    </Badge>
                                                    <span className="text-sm text-slate-600 font-medium">
                                                        {cost.event?.herd?.name || cost.event?.animal?.visual_tag || 'Sin nombre'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar size={12} />
                                                        {cost.event?.event_date ? new Date(cost.event.event_date).toLocaleDateString('es-UY') : '-'}
                                                    </span>
                                                    <span>Cantidad: {cost.qty_heads || '-'} cabezas</span>
                                                    {cost.qty_kg && <span>Peso: {cost.qty_kg} kg</span>}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-black text-emerald-600">
                                                    ${cost.cost_amount?.toFixed(2) || '0.00'}
                                                </p>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleOpenConvertModal(cost)}
                                                    className="mt-2 bg-blue-600 hover:bg-blue-700 text-white gap-1"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                    Convertir a Factura
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Costos Convertidos */}
            {convertedCosts.length > 0 && (
                <Card className="border-slate-200 bg-slate-50/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText size={20} />
                            Facturas Generadas ({convertedCosts.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {convertedCosts.map(cost => (
                                <div key={cost.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-slate-700">{cost.event?.event_type}</p>
                                        <p className="text-xs text-slate-500">{cost.event?.event_date ? new Date(cost.event.event_date).toLocaleDateString('es-UY') : '-'}</p>
                                    </div>
                                    <p className="font-bold text-slate-700">${cost.cost_amount?.toFixed(2) || '0.00'}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Modal de Conversión */}
            <Dialog open={convertModalOpen} onOpenChange={setConvertModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Convertir Costo en Factura</DialogTitle>
                        <DialogDescription>
                            Ingresa los datos de la factura para registrar este costo automático como gasto.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Monto */}
                        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                            <p className="text-sm text-emerald-900">
                                <strong>Monto a facturar:</strong>{' '}
                                <span className="text-lg font-black text-emerald-600">
                                    ${selectedCost?.cost_amount?.toFixed(2) || '0.00'}
                                </span>
                            </p>
                        </div>

                        {/* Proveedor */}
                        <div>
                            <Label>Nombre del Proveedor *</Label>
                            <Input
                                value={expenseData.provider_name}
                                onChange={(e) => setExpenseData(prev => ({ ...prev, provider_name: e.target.value }))}
                                placeholder="Ej: FRIGORÍFICO XYZ S.A."
                                className="mt-1"
                            />
                        </div>

                        {/* Número de Factura */}
                        <div>
                            <Label>Número de Factura *</Label>
                            <Input
                                value={expenseData.invoice_number}
                                onChange={(e) => setExpenseData(prev => ({ ...prev, invoice_number: e.target.value }))}
                                placeholder="Ej: A-001-00001234"
                                className="mt-1"
                            />
                        </div>

                        {/* Fecha */}
                        <div>
                            <Label>Fecha de Factura</Label>
                            <Input
                                type="date"
                                value={expenseData.invoice_date}
                                onChange={(e) => setExpenseData(prev => ({ ...prev, invoice_date: e.target.value }))}
                                className="mt-1"
                            />
                        </div>

                        {/* Categoría */}
                        <div>
                            <Label>Categoría de Gasto</Label>
                            <Input
                                value={expenseData.category}
                                onChange={(e) => setExpenseData(prev => ({ ...prev, category: e.target.value }))}
                                className="mt-1"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setConvertModalOpen(false)}
                            disabled={converting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleConvert}
                            disabled={converting}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {converting ? 'Creando...' : 'Crear Factura'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
