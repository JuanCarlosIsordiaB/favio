import React, { useState, useEffect } from 'react';
import {
    DollarSign,
    Save,
    Info,
    Loader2,
    ToggleRight
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { getEventCostRules, upsertEventCostRule } from '../services/eventCosts';

const EVENT_TYPES_COSTABLE = [
    { type: 'PURCHASE', label: 'Compra', description: 'Costo de adquisición de animales' },
    { type: 'SALE', label: 'Venta', description: 'Costo de operación de venta' },
    { type: 'HEALTH_TREATMENT', label: 'Tratamiento Sanitario', description: 'Costo de medicamentos y aplicación' },
    { type: 'WEIGHING', label: 'Pesaje', description: 'Costo de operación de pesaje' },
    { type: 'MOVE_EXTERNAL_IN', label: 'Ingreso Externo', description: 'Costo de traslado desde otro predio' },
    { type: 'MOVE_EXTERNAL_OUT', label: 'Egreso Externo', description: 'Costo de traslado a otro predio' },
    { type: 'FAENA', label: 'Faena', description: 'Costo de faena' },
    { type: 'CONSUMPTION', label: 'Consumo', description: 'Costo de procesamiento' }
];

export default function EventCostConfigManager({ firmId }) {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        if (firmId) loadRules();
    }, [firmId]);

    async function loadRules() {
        setLoading(true);
        try {
            const data = await getEventCostRules(firmId);

            // Crear mapa de reglas existentes
            const rulesMap = new Map(data.map(r => [r.event_type, r]));

            // Inicializar con todas las opciones
            const allRules = EVENT_TYPES_COSTABLE.map(et => {
                const existing = rulesMap.get(et.type);
                return existing || {
                    event_type: et.type,
                    firm_id: firmId,
                    base_cost: 0,
                    cost_per_head: 0,
                    cost_per_kg: 0,
                    is_active: false,
                    notes: ''
                };
            });

            setRules(allRules);
        } catch (error) {
            console.error('Error loading rules:', error);
            toast.error('Error al cargar configuración de costos');
        } finally {
            setLoading(false);
        }
    }

    async function handleSave(rule) {
        setSaving(true);
        try {
            await upsertEventCostRule(firmId, rule);
            toast.success('✅ Regla de costo guardada');
            await loadRules();
        } catch (error) {
            console.error('Error saving rule:', error);
            toast.error('Error al guardar: ' + error.message);
        } finally {
            setSaving(false);
        }
    }

    const updateRule = (index, field, value) => {
        const updated = [...rules];
        updated[index] = { ...updated[index], [field]: value };
        setRules(updated);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="border-emerald-200 bg-emerald-50/30">
                <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="text-emerald-600" size={24} />
                        <CardTitle>Configuración de Costos Automáticos</CardTitle>
                    </div>
                    <p className="text-sm text-slate-600 mt-2">
                        Define cuánto cuesta cada tipo de evento ganadero. Los costos se calcularán automáticamente al aprobar eventos.
                    </p>
                </CardHeader>
                <CardContent className="space-y-6">
                    {rules.map((rule, index) => {
                        const eventConfig = EVENT_TYPES_COSTABLE.find(et => et.type === rule.event_type);

                        return (
                            <Card key={rule.event_type} className="border-slate-200">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-bold text-slate-900">{eventConfig?.label}</h4>
                                                <Badge variant={rule.is_active ? "default" : "outline"}>
                                                    {rule.is_active ? 'Activo' : 'Inactivo'}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-slate-500">{eventConfig?.description}</p>
                                        </div>
                                        <button
                                            onClick={() => updateRule(index, 'is_active', !rule.is_active)}
                                            className={`p-2 rounded-lg transition-colors ${
                                                rule.is_active
                                                    ? 'bg-emerald-100 text-emerald-600'
                                                    : 'bg-slate-100 text-slate-400'
                                            }`}
                                            title={rule.is_active ? 'Desactivar' : 'Activar'}
                                        >
                                            <ToggleRight size={20} />
                                        </button>
                                    </div>

                                    {rule.is_active && (
                                        <div className="space-y-4 mt-4 pt-4 border-t border-slate-200">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {/* Costo Base */}
                                                <div>
                                                    <Label htmlFor={`base-${index}`} className="text-xs font-semibold">
                                                        Costo Base ($)
                                                    </Label>
                                                    <Input
                                                        id={`base-${index}`}
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={rule.base_cost}
                                                        onChange={(e) => updateRule(index, 'base_cost', parseFloat(e.target.value) || 0)}
                                                        className="mt-1"
                                                        placeholder="0.00"
                                                    />
                                                    <p className="text-xs text-slate-400 mt-1">Costo fijo por evento</p>
                                                </div>

                                                {/* Costo por Cabeza */}
                                                <div>
                                                    <Label htmlFor={`per-head-${index}`} className="text-xs font-semibold">
                                                        Costo por Cabeza ($)
                                                    </Label>
                                                    <Input
                                                        id={`per-head-${index}`}
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={rule.cost_per_head}
                                                        onChange={(e) => updateRule(index, 'cost_per_head', parseFloat(e.target.value) || 0)}
                                                        className="mt-1"
                                                        placeholder="0.00"
                                                    />
                                                    <p className="text-xs text-slate-400 mt-1">Multiplicado por qty_heads</p>
                                                </div>

                                                {/* Costo por Kg */}
                                                <div>
                                                    <Label htmlFor={`per-kg-${index}`} className="text-xs font-semibold">
                                                        Costo por Kg ($)
                                                    </Label>
                                                    <Input
                                                        id={`per-kg-${index}`}
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={rule.cost_per_kg}
                                                        onChange={(e) => updateRule(index, 'cost_per_kg', parseFloat(e.target.value) || 0)}
                                                        className="mt-1"
                                                        placeholder="0.00"
                                                    />
                                                    <p className="text-xs text-slate-400 mt-1">Multiplicado por qty_kg</p>
                                                </div>
                                            </div>

                                            {/* Notas */}
                                            <div>
                                                <Label htmlFor={`notes-${index}`} className="text-xs font-semibold">
                                                    Notas (opcional)
                                                </Label>
                                                <textarea
                                                    id={`notes-${index}`}
                                                    value={rule.notes || ''}
                                                    onChange={(e) => updateRule(index, 'notes', e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                                                    placeholder="Ej: Aplica solo en caso de traslados internos"
                                                    rows={2}
                                                />
                                            </div>

                                            {/* Botón guardar */}
                                            <div className="flex justify-end">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleSave(rule)}
                                                    disabled={saving}
                                                    className="bg-emerald-600 hover:bg-emerald-700"
                                                >
                                                    <Save className="w-4 h-4 mr-1" />
                                                    {saving ? 'Guardando...' : 'Guardar'}
                                                </Button>
                                            </div>

                                            {/* Ejemplo de cálculo */}
                                            {(rule.base_cost > 0 || rule.cost_per_head > 0 || rule.cost_per_kg > 0) && (
                                                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-start gap-2">
                                                    <Info className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
                                                    <div className="text-xs text-blue-900">
                                                        <p className="font-semibold mb-1">Ejemplo de cálculo:</p>
                                                        <p>
                                                            Si base=${rule.base_cost}, por cabeza=${rule.cost_per_head},
                                                            y el evento tiene 10 animales:
                                                        </p>
                                                        <p className="font-bold mt-1">
                                                            Costo Total = ${(rule.base_cost + (rule.cost_per_head * 10)).toFixed(2)}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </CardContent>
            </Card>

            {/* Info Footer */}
            <Card className="border-slate-200 bg-slate-50/50">
                <CardContent className="p-4 flex items-start gap-3">
                    <Info className="text-slate-400 w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-600 space-y-1">
                        <p><strong>Fórmula de cálculo:</strong> Costo = Base + (CostoPorCabeza × Cantidad) + (CostoPorKg × Peso)</p>
                        <p><strong>Cuándo se aplica:</strong> Al aprobar eventos que coincidan con tipos configurados y activos</p>
                        <p><strong>Resultado:</strong> Se genera automáticamente en la tabla work_costs y puede convertirse a factura</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
