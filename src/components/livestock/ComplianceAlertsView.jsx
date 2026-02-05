import React, { useState, useEffect } from 'react';
import {
    AlertTriangle,
    Check,
    Clock,
    RefreshCw,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import {
    checkDeadlineExceededEvents,
    getPendingComplianceViolations,
    resolveComplianceViolation
} from '../../services/livestock';

export default function ComplianceAlertsView({
    selectedPremiseId,
    selectedFirmId
}) {
    const [alerts, setAlerts] = useState([]);
    const [violations, setViolations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(null);

    // Cargar alertas al montar
    useEffect(() => {
        if (selectedPremiseId) {
            loadAlerts();
        }
    }, [selectedPremiseId]);

    const loadAlerts = async () => {
        setLoading(true);
        try {
            // 1. Obtener alertas de eventos fuera de plazo
            const deadlineAlerts = await checkDeadlineExceededEvents(selectedPremiseId);
            setAlerts(deadlineAlerts);

            // 2. Obtener violaciones registradas
            const pendingViolations = await getPendingComplianceViolations(selectedPremiseId);
            setViolations(pendingViolations);
        } catch (error) {
            console.error('Error loading compliance alerts:', error);
            toast.error('Error al cargar alertas de cumplimiento');
        } finally {
            setLoading(false);
        }
    };

    const handleResolveViolation = async (violationId, animalId) => {
        try {
            await resolveComplianceViolation(violationId);
            toast.success('Violación marcada como resuelta');

            // Recargar violaciones
            const pendingViolations = await getPendingComplianceViolations(selectedPremiseId);
            setViolations(pendingViolations);
        } catch (error) {
            console.error('Error resolving violation:', error);
            toast.error('Error al resolver violación');
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'CRITICAL':
                return 'bg-red-50 border-red-200 text-red-900';
            case 'HIGH':
                return 'bg-orange-50 border-orange-200 text-orange-900';
            case 'MEDIUM':
                return 'bg-yellow-50 border-yellow-200 text-yellow-900';
            default:
                return 'bg-blue-50 border-blue-200 text-blue-900';
        }
    };

    const getSeverityIcon = (severity) => {
        switch (severity) {
            case 'CRITICAL':
                return <AlertTriangle className="text-red-600 w-5 h-5" />;
            case 'HIGH':
                return <AlertTriangle className="text-orange-600 w-5 h-5" />;
            default:
                return <Clock className="text-yellow-600 w-5 h-5" />;
        }
    };

    return (
        <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen rounded-xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <AlertTriangle className="text-orange-600" size={24} />
                        Alertas de Cumplimiento DICOSE
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Monitoreo de plazos regulatorios y violaciones de compliance
                    </p>
                </div>
                <Button
                    onClick={loadAlerts}
                    disabled={loading}
                    className="gap-2"
                    variant="outline"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Actualizar
                </Button>
            </div>

            {/* Alertas de Eventos Fuera de Plazo */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                    <Clock size={18} className="text-orange-600" />
                    <h3 className="font-bold text-slate-900">Eventos Sin Registrar en Plazo</h3>
                    <span className="ml-auto bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-bold">
                        {alerts.length} evento{alerts.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {alerts.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <Check className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                        <p className="text-slate-600 font-medium">
                            ✅ Todos los eventos están dentro del plazo regulatorio
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {alerts.map((alert, idx) => (
                            <div
                                key={idx}
                                className={`px-6 py-4 ${getSeverityColor(alert.severity)} border-l-4 border-red-400`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3 flex-1">
                                        {getSeverityIcon(alert.severity)}
                                        <div className="flex-1">
                                            <h4 className="font-bold">
                                                {alert.animal_identifier}
                                            </h4>
                                            <p className="text-sm mt-1">
                                                {alert.message}
                                            </p>
                                            <div className="flex gap-4 mt-2 text-xs font-semibold">
                                                <span>📅 {new Date(alert.created_date).toLocaleDateString('es-UY')}</span>
                                                <span>⏱️ {alert.days_exceeded} días excedidos</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => {
                                            // Crear evento de mortandad para este animal
                                            toast.info('Crear evento de mortandad para: ' + alert.animal_identifier);
                                        }}
                                        className="whitespace-nowrap ml-4"
                                        size="sm"
                                    >
                                        Registrar Mortandad
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Violaciones Registradas */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-red-600" />
                    <h3 className="font-bold text-slate-900">Violaciones de Cumplimiento Registradas</h3>
                    <span className="ml-auto bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">
                        {violations.length} violación{violations.length !== 1 ? 'es' : ''}
                    </span>
                </div>

                {violations.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <Check className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                        <p className="text-slate-600 font-medium">
                            ✅ No hay violaciones pendientes
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {violations.map((violation) => (
                            <div
                                key={violation.id}
                                className={`${getSeverityColor(violation.severity)} border-l-4 ${
                                    violation.severity === 'CRITICAL' ? 'border-red-400' : 'border-orange-400'
                                }`}
                            >
                                <button
                                    onClick={() => setExpanded(expanded === violation.id ? null : violation.id)}
                                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-opacity-75 transition"
                                >
                                    <div className="flex items-center gap-3 flex-1 text-left">
                                        {getSeverityIcon(violation.severity)}
                                        <div>
                                            <h4 className="font-bold">
                                                {violation.violation_type === 'MORTANDAD_PLAZO'
                                                    ? 'Mortandad sin registrar en plazo'
                                                    : violation.violation_type}
                                            </h4>
                                            <p className="text-sm opacity-75">
                                                {violation.days_exceeded} días excedidos
                                            </p>
                                        </div>
                                    </div>
                                    {expanded === violation.id ? (
                                        <ChevronUp size={18} />
                                    ) : (
                                        <ChevronDown size={18} />
                                    )}
                                </button>

                                {expanded === violation.id && (
                                    <div className="px-6 pb-4 space-y-3 border-t border-opacity-20">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="opacity-75">Reportado:</span>
                                                <p className="font-bold">{new Date(violation.reported_at).toLocaleDateString('es-UY')}</p>
                                            </div>
                                            <div>
                                                <span className="opacity-75">Severidad:</span>
                                                <p className="font-bold">{violation.severity}</p>
                                            </div>
                                            {violation.notes && (
                                                <div className="col-span-2">
                                                    <span className="opacity-75">Notas:</span>
                                                    <p className="font-bold">{violation.notes}</p>
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            onClick={() => handleResolveViolation(violation.id, violation.animal_id)}
                                            className="w-full gap-2"
                                            variant="outline"
                                        >
                                            <Check size={16} />
                                            Marcar como Resuelta
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Resumen de Compliance */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Check className="text-emerald-600" size={20} />
                    Estado de Cumplimiento
                </h3>
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 text-center border border-emerald-200">
                        <p className="text-2xl font-bold text-emerald-600">
                            {alerts.length === 0 ? '✅' : '⚠️'}
                        </p>
                        <p className="text-xs text-slate-600 mt-2">Eventos en Plazo</p>
                        <p className="text-lg font-bold text-slate-900">{alerts.length === 0 ? 'OK' : alerts.length}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center border border-emerald-200">
                        <p className="text-2xl font-bold text-emerald-600">
                            {violations.length === 0 ? '✅' : '⚠️'}
                        </p>
                        <p className="text-xs text-slate-600 mt-2">Violaciones Pendientes</p>
                        <p className="text-lg font-bold text-slate-900">{violations.length}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center border border-emerald-200">
                        <p className="text-2xl font-bold text-emerald-600">
                            {alerts.length === 0 && violations.length === 0 ? '✅' : '⚠️'}
                        </p>
                        <p className="text-xs text-slate-600 mt-2">Status General</p>
                        <p className="text-lg font-bold text-slate-900">
                            {alerts.length === 0 && violations.length === 0 ? 'OK' : 'REVISAR'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
