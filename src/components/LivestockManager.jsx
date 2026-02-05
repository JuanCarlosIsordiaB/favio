import React, { useState, useEffect } from 'react';
import {
    Beef,
    Plus,
    Search,
    Filter,
    ArrowRightLeft,
    Activity,
    UserCheck,
    Tags,
    ChevronRight,
    ArrowUpRight,
    MapPin,
    Calendar,
    DollarSign,
    TrendingUp,
    BarChart3,
    AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useLivestock } from '../hooks/useLivestock';
import { useLotes } from '../hooks/useLotes';
import { getPendingEvents, getFinancialKPIs } from '../services/livestock';
import AnimalForm from './livestock/AnimalForm';
import HerdForm from './livestock/HerdForm';
import LivestockEventForm from './livestock/LivestockEventForm';
import HerdDetailView from './livestock/HerdDetailView';
import EventApprovals from './livestock/EventApprovals';
import AnimalDetailModal from './livestock/AnimalDetailModal';
import DicoseManager from './livestock/DicoseManager';
import AddAnimalsToHerdModal from './livestock/AddAnimalsToHerdModal';
import ComplianceAlertsView from './livestock/ComplianceAlertsView';

// Función helper para mapear tipos de evento
const formatEventType = (type) => {
    const labels = {
        'MOVE_INTERNAL': 'Traslado',
        'CATEGORY_CHANGE': 'Categoría',
        'HEALTH_TREATMENT': 'Sanidad',
        'PURCHASE': 'Compra',
        'BIRTH': 'Nacimiento',
        'WEIGHING': 'Pesaje',
        'SALE': 'Venta',
        'DEATH': 'Muerte',
        'CONSUMPTION': 'Consumo',
        'LOST_WITH_HIDE': 'Perdido',
        'FAENA': 'Faena'
    };
    return labels[type] || type;
};

export default function LivestockManager({ selectedFirmId, selectedPremiseId }) {
    const { animals, herds, categories, summary, loading, error, refresh } = useLivestock(selectedPremiseId);
    const { lotes: lots, loadLotes } = useLotes();
    const [searchTerm, setSearchRawTerm] = useState('');
    const [activeView, setActiveView] = useState('rodeos');
    const [showAnimalForm, setShowAnimalForm] = useState(false);
    const [animalFormMode, setAnimalFormMode] = useState('create');
    const [editingAnimal, setEditingAnimal] = useState(null);
    const [showHerdForm, setShowHerdForm] = useState(false);
    const [showEventForm, setShowEventForm] = useState(false);
    const [defaultEventType, setDefaultEventType] = useState('MOVE_INTERNAL');
    const [selectedHerd, setSelectedHerd] = useState(null);
    const [viewingAnimal, setViewingAnimal] = useState(null);
    const [addingToHerd, setAddingToHerd] = useState(null);
    const [expiringEvents, setExpiringEvents] = useState([]);
    const [financialKPIs, setFinancialKPIs] = useState(null);
    const [loadingKPIs, setLoadingKPIs] = useState(false);

    // Filtros para Inventario Consolidado
    const [filterCategory, setFilterCategory] = useState('');
    const [filterHerd, setFilterHerd] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // Cargar lotes cuando cambia el predio
    useEffect(() => {
        if (selectedPremiseId) {
            loadLotes(selectedPremiseId);
        }
    }, [selectedPremiseId, loadLotes]);

    // Cargar eventos próximos a vencer (DICOSE 30 días)
    useEffect(() => {
        async function loadExpiringEvents() {
            try {
                const pending = await getPendingEvents(selectedPremiseId);

                const criticalEventTypes = ['DEATH', 'CONSUMPTION', 'LOST_WITH_HIDE', 'FAENA'];
                const expiring = pending.filter(event => {
                    if (!criticalEventTypes.includes(event.event_type)) return false;

                    const eventDate = new Date(event.event_date);
                    const today = new Date();
                    const daysSince = Math.floor((today - eventDate) / (1000 * 60 * 60 * 24));
                    const daysRemaining = 30 - daysSince;

                    return daysRemaining >= 0 && daysRemaining <= 7; // Alertar en últimos 7 días
                }).map(event => {
                    const eventDate = new Date(event.event_date);
                    const today = new Date();
                    const daysSince = Math.floor((today - eventDate) / (1000 * 60 * 60 * 24));

                    return {
                        ...event,
                        daysSince,
                        daysRemaining: 30 - daysSince,
                        urgency: daysSince > 28 ? 'CRITICAL' : daysSince > 25 ? 'HIGH' : 'MEDIUM'
                    };
                });

                setExpiringEvents(expiring);
            } catch (error) {
                console.error('Error loading expiring events:', error);
            }
        }

        if (selectedPremiseId) {
            loadExpiringEvents();
        }
    }, [selectedPremiseId]);

    // Cargar KPIs financieros del rodeo
    useEffect(() => {
        async function loadFinancialKPIs() {
            if (!selectedPremiseId) return;

            setLoadingKPIs(true);
            try {
                const kpis = await getFinancialKPIs(selectedPremiseId);
                setFinancialKPIs(kpis);
            } catch (error) {
                console.error('Error loading financial KPIs:', error);
                // No mostrar error al usuario, solo dejar KPIs sin datos
                setFinancialKPIs(null);
            } finally {
                setLoadingKPIs(false);
            }
        }

        loadFinancialKPIs();
    }, [selectedPremiseId]);

    if (loading && !animals.length) {
// ... (omitiendo loading)
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 px-16 py-6">
            {/* Header y Acciones */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        Ganadería y Trazabilidad
                    </h2>
                    <p className="text-slate-500">Gestión de existencias, movimientos y cumplimiento DICOSE</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => {
                            setDefaultEventType('WEIGHING');
                            setShowEventForm(true);
                        }}
                    >
                        <Plus size={16} /> Nuevo Evento
                    </Button>
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => {
                            setDefaultEventType('MOVE_INTERNAL');
                            setShowEventForm(true);
                        }}
                    >
                        <ArrowRightLeft size={16} /> Movimiento
                    </Button>
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => {
                            setDefaultEventType('HEALTH_TREATMENT');
                            setShowEventForm(true);
                        }}
                    >
                        <Activity size={16} /> Sanidad
                    </Button>
                    <Button
                        onClick={() => {
                            setAnimalFormMode('create');
                            setEditingAnimal(null);
                            setShowAnimalForm(true);
                        }}
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                    >
                        <Plus size={16} /> Nuevo Animal
                    </Button>
                </div>
            </div>


            {/* Dashboard Ganadero */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Existencias</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-3xl font-black text-slate-900">{summary?.totalCabezas || 0}</p>
                                <p className="text-xs text-slate-400 font-medium">Cabezas registradas</p>
                            </div>
                            <div className="bg-emerald-50 p-2 rounded-lg">
                                <Beef className="text-emerald-600 w-6 h-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kilos Totales (Est.)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-3xl font-black text-slate-900">{summary?.kgTotalesCarne || 0}</p>
                                <p className="text-xs text-slate-400 font-medium">Kg de carne en pie</p>
                            </div>
                            <div className="bg-blue-50 p-2 rounded-lg">
                                <Activity className="text-blue-600 w-6 h-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Carga Animal</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-3xl font-black text-slate-900">{summary?.cargaAnimal || '0.0'}</p>
                                <p className="text-xs text-slate-400 font-medium">Cabezas / Ha</p>
                            </div>
                            <div className="bg-amber-50 p-2 rounded-lg">
                                <MapPin className="text-amber-600 w-6 h-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pendiente DICOSE</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-3xl font-black text-slate-900">0</p>
                                <p className="text-xs text-slate-400 font-medium">Eventos por aprobar</p>
                            </div>
                            <div className="bg-red-50 p-2 rounded-lg">
                                <UserCheck className="text-red-600 w-6 h-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* KPIs Financieros - TAREA 9 */}
            {financialKPIs && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Costo por Kg */}
                    <Card className="bg-white border-slate-200 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Costo / Kg</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-3xl font-black text-slate-900">
                                        ${financialKPIs.costoPorKg?.toFixed(2) || '0.00'}
                                    </p>
                                    <p className="text-xs text-slate-400 font-medium">Costo promedio por kg</p>
                                </div>
                                <div className="bg-orange-50 p-2 rounded-lg">
                                    <DollarSign className="text-orange-600 w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Margen por Hectárea */}
                    <Card className="bg-white border-slate-200 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Margen / Ha</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-3xl font-black text-slate-900">
                                        ${financialKPIs.margenPorHa?.toFixed(2) || '0.00'}
                                    </p>
                                    <p className="text-xs text-slate-400 font-medium">Margen neto por hectárea</p>
                                </div>
                                <div className="bg-green-50 p-2 rounded-lg">
                                    <TrendingUp className="text-green-600 w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ROI (Return on Investment) */}
                    <Card className="bg-white border-slate-200 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">ROI</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-3xl font-black text-slate-900">
                                        {financialKPIs.roi?.toFixed(1) || '0.0'}%
                                    </p>
                                    <p className="text-xs text-slate-400 font-medium">Retorno sobre inversión</p>
                                </div>
                                <div className="bg-purple-50 p-2 rounded-lg">
                                    <BarChart3 className="text-purple-600 w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ALERTAS DICOSE: Eventos próximos a vencer (30 días) */}
            {expiringEvents.length > 0 && (
                <Card className="border-red-300 bg-red-50 shadow-lg">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-bold text-red-900 flex items-center gap-2">
                                ⚠️ {expiringEvents.length} Evento(s) Próximo(s) a Vencer - DICOSE
                            </CardTitle>
                            <Badge variant="destructive" className="text-white bg-red-600">
                                Plazo: 30 días (Decreto 289/74)
                            </Badge>
                        </div>
                        <p className="text-sm text-red-800 mt-2">
                            Los siguientes eventos deben ser aprobados ANTES de cumplir 30 días desde su fecha de ocurrencia.
                            Después serán rechazados automáticamente.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {expiringEvents.map(event => (
                                <div
                                    key={event.id}
                                    className={`p-4 rounded-lg border-2 flex items-center justify-between ${
                                        event.urgency === 'CRITICAL' ? 'bg-red-100 border-red-400' :
                                        event.urgency === 'HIGH' ? 'bg-orange-100 border-orange-400' :
                                        'bg-yellow-100 border-yellow-400'
                                    }`}
                                >
                                    <div>
                                        <p className="font-bold text-slate-900">
                                            {formatEventType(event.event_type)}
                                        </p>
                                        <p className="text-sm text-slate-700">
                                            Animal/Rodeo: {event.scope === 'HERD' ? event.herd?.name : event.animal?.visual_tag || 'S/N'}
                                        </p>
                                        <p className="text-xs text-slate-600">
                                            Fecha evento: {new Date(event.event_date).toLocaleDateString()} ({event.daysSince} días atrás)
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <Badge
                                            variant="destructive"
                                            className={`text-lg font-black ${
                                                event.urgency === 'CRITICAL' ? 'bg-red-600' :
                                                event.urgency === 'HIGH' ? 'bg-orange-600' :
                                                'bg-yellow-600'
                                            }`}
                                        >
                                            {event.daysRemaining} días
                                        </Badge>
                                        <p className="text-xs text-slate-600 mt-1">
                                            {event.urgency === 'CRITICAL' ? '🔴 URGENTE' :
                                             event.urgency === 'HIGH' ? '🟠 ALTA' : '🟡 MEDIA'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button
                            className="w-full mt-4 bg-red-600 hover:bg-red-700"
                            onClick={() => setActiveView('approvals')}
                        >
                            Ir a Aprobaciones
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Explorador de Inventario */}
            <Tabs defaultValue="herds" onValueChange={setActiveView} className="w-full">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <TabsList className="bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <TabsTrigger value="herds" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm px-6">
                            Vista Rodeos
                        </TabsTrigger>
                        <TabsTrigger value="inventory" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm px-6">
                            📊 Inventario
                        </TabsTrigger>
                        <TabsTrigger value="individual" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm px-6">
                            Vista Individual
                        </TabsTrigger>
                        <TabsTrigger value="approvals" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm px-6">
                            Aprobaciones
                        </TabsTrigger>
                        <TabsTrigger value="alerts" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-orange-700 data-[state=active]:shadow-sm px-6">
                            🚨 Alertas
                        </TabsTrigger>
                        <TabsTrigger value="dicose" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm px-6">
                            DICOSE
                        </TabsTrigger>
                    </TabsList>

                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input 
                            type="text" 
                            placeholder="Buscar por caravana o nombre..." 
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchRawTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* CONTENIDO: INVENTARIO CONSOLIDADO */}
                <TabsContent value="inventory" className="animate-in fade-in duration-300">
                    <div className="space-y-4">
                        {/* Filtros */}
                        <Card className="border-slate-200 shadow-sm bg-gradient-to-r from-slate-50 to-white">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                    <Filter size={18} /> Filtrar Inventario
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <div>
                                        <label className="text-xs font-bold uppercase text-slate-500 mb-2 block">
                                            Por Categoría
                                        </label>
                                        <select
                                            value={filterCategory}
                                            onChange={(e) => setFilterCategory(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                        >
                                            <option value="">Todas las categorías</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase text-slate-500 mb-2 block">
                                            Por Rodeo
                                        </label>
                                        <select
                                            value={filterHerd}
                                            onChange={(e) => setFilterHerd(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                        >
                                            <option value="">Todos los rodeos</option>
                                            {herds.map(herd => (
                                                <option key={herd.id} value={herd.id}>{herd.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase text-slate-500 mb-2 block">
                                            Por Estado
                                        </label>
                                        <select
                                            value={filterStatus}
                                            onChange={(e) => setFilterStatus(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                        >
                                            <option value="">Todos los estados</option>
                                            <option value="ACTIVE">Activo</option>
                                            <option value="SOLD">Vendido</option>
                                            <option value="DEAD">Muerto</option>
                                            <option value="SLAUGHTERED">Faenado</option>
                                            <option value="LOST">Perdido</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase text-slate-500 mb-2 block">
                                            Búsqueda
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Caravana, RFID..."
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                            value={searchTerm}
                                            onChange={(e) => setSearchRawTerm(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-3 text-slate-600 hover:text-slate-900"
                                    onClick={() => {
                                        setFilterCategory('');
                                        setFilterHerd('');
                                        setFilterStatus('');
                                        setSearchRawTerm('');
                                    }}
                                >
                                    Limpiar filtros
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Tabla de Inventario */}
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="pb-3 border-b border-slate-200">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base font-bold text-slate-800">
                                        Listado de Animales
                                    </CardTitle>
                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                        {animals
                                            .filter(a => {
                                                if (filterCategory && a.current_category_id !== filterCategory) return false;
                                                if (filterHerd && !a.herds?.some(h => h.id === filterHerd)) return false;
                                                if (filterStatus && a.status !== filterStatus) return false;
                                                if (searchTerm && !a.visual_tag?.toLowerCase().includes(searchTerm.toLowerCase()) &&
                                                    !a.rfid_tag?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
                                                return true;
                                            })
                                            .length
                                        } animal(es)
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                                            <tr>
                                                <th className="px-6 py-3 font-bold text-slate-700">Identificación</th>
                                                <th className="px-6 py-3 font-bold text-slate-700">Especie / Sexo</th>
                                                <th className="px-6 py-3 font-bold text-slate-700">Categoría</th>
                                                <th className="px-6 py-3 font-bold text-slate-700">Rodeo</th>
                                                <th className="px-6 py-3 font-bold text-slate-700">Nacimiento</th>
                                                <th className="px-6 py-3 font-bold text-slate-700">Peso</th>
                                                <th className="px-6 py-3 font-bold text-slate-700">Ubicación</th>
                                                <th className="px-6 py-3 font-bold text-slate-700">Estado</th>
                                                <th className="px-6 py-3 font-bold text-slate-700 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {animals
                                                .filter(a => {
                                                    if (filterCategory && a.current_category_id !== filterCategory) return false;
                                                    if (filterHerd && !a.herds?.some(h => h.id === filterHerd)) return false;
                                                    if (filterStatus && a.status !== filterStatus) return false;
                                                    if (searchTerm && !a.visual_tag?.toLowerCase().includes(searchTerm.toLowerCase()) &&
                                                        !a.rfid_tag?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
                                                    return true;
                                                })
                                                .map((animal) => (
                                                    <tr
                                                        key={animal.id}
                                                        className="hover:bg-emerald-50/30 transition-colors group"
                                                    >
                                                        <td className="px-6 py-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                                                                    <Tags size={16} />
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-slate-900">{animal.visual_tag || 'S/N'}</p>
                                                                    <p className="text-[10px] text-slate-400 font-mono">{animal.rfid_tag || '-'}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <div>
                                                                <p className="font-semibold text-slate-700">{animal.species || '-'}</p>
                                                                <p className="text-xs text-slate-500">{animal.sex === 'M' ? '♂ Macho' : animal.sex === 'F' ? '♀ Hembra' : '-'}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <Badge variant="outline" className="font-medium">
                                                                {animal.current_category?.name || 'No asig.'}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <p className="text-sm text-slate-700">
                                                                {animal.herds && animal.herds.length > 0
                                                                    ? animal.herds.map(h => h.name).join(', ')
                                                                    : <span className="text-slate-400 italic">Sin rodeo</span>
                                                                }
                                                            </p>
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <p className="text-sm text-slate-700">
                                                                {animal.birth_date
                                                                    ? new Date(animal.birth_date).toLocaleDateString()
                                                                    : <span className="text-slate-400">-</span>
                                                                }
                                                            </p>
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <p className="font-semibold text-slate-700">
                                                                {animal.initial_weight ? `${animal.initial_weight} kg` : <span className="text-slate-400 text-xs">S/R</span>}
                                                            </p>
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <div className="flex items-center gap-2 text-slate-600">
                                                                <MapPin size={14} className="text-slate-400" />
                                                                <span className="text-sm">{animal.lot?.name || 'S/U'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <Badge
                                                                className={
                                                                    animal.status === 'SOLD' ? 'bg-blue-100 text-blue-700' :
                                                                    animal.status === 'DEAD' ? 'bg-red-100 text-red-700' :
                                                                    animal.status === 'SLAUGHTERED' ? 'bg-orange-100 text-orange-700' :
                                                                    animal.status === 'LOST' ? 'bg-gray-100 text-gray-700' :
                                                                    'bg-green-100 text-green-700'
                                                                }
                                                            >
                                                                {animal.status === 'ACTIVE' ? 'Activo' :
                                                                 animal.status === 'SOLD' ? 'Vendido' :
                                                                 animal.status === 'DEAD' ? 'Muerto' :
                                                                 animal.status === 'SLAUGHTERED' ? 'Faenado' :
                                                                 animal.status === 'LOST' ? 'Perdido' :
                                                                 animal.status}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-6 py-3 text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600"
                                                                onClick={() => setViewingAnimal(animal)}
                                                            >
                                                                Ver ficha <ArrowUpRight size={14} className="ml-1" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            {animals.filter(a => {
                                                if (filterCategory && a.current_category_id !== filterCategory) return false;
                                                if (filterHerd && !a.herds?.some(h => h.id === filterHerd)) return false;
                                                if (filterStatus && a.status !== filterStatus) return false;
                                                if (searchTerm && !a.visual_tag?.toLowerCase().includes(searchTerm.toLowerCase()) &&
                                                    !a.rfid_tag?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
                                                return true;
                                            }).length === 0 && (
                                                <tr>
                                                    <td colSpan="9" className="px-6 py-12 text-center text-slate-400">
                                                        No hay animales que coincidan con los filtros seleccionados.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* CONTENIDO: RODEOS */}
                <TabsContent value="herds" className="animate-in fade-in duration-300">
                    {selectedHerd ? (
                        <HerdDetailView
                            herd={selectedHerd}
                            onBack={() => setSelectedHerd(null)}
                            onViewAnimal={(animal) => setViewingAnimal(animal)}
                            onAddAnimal={() => setAddingToHerd(selectedHerd)}
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {herds.map((herd) => (
                                <Card 
                                    key={herd.id} 
                                    onClick={() => setSelectedHerd(herd)}
                                    className="group hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer overflow-hidden border-slate-200"
                                >
                                    <div className="h-2 bg-emerald-500" />
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-lg font-bold text-slate-800">{herd.name}</CardTitle>
                                                <CardDescription>{herd.species}</CardDescription>
                                            </div>
                                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100">
                                                {herd.animal_count} cabezas
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center gap-3 text-sm text-slate-600">
                                            <div className="p-2 bg-slate-50 rounded-lg">
                                                <MapPin size={14} className="text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1">Ubicación Actual</p>
                                                <p className="font-semibold text-slate-700">{herd.lot?.name || 'Sin lote'}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                                            <div className="text-center p-2 bg-slate-50/50 rounded-lg">
                                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Peso Prom.</p>
                                                <p className="font-bold text-slate-700 text-sm">{herd.weight_summary?.pesoPromedio || '0.0'} kg</p>
                                            </div>
                                            <div className="text-center p-2 bg-slate-50/50 rounded-lg">
                                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Últ. Evento</p>
                                                <p className="font-bold text-slate-700 text-sm">{herd.last_event ? formatEventType(herd.last_event.tipo) : 'Sin eventos'}</p>
                                            </div>
                                        </div>

                                        <div className="pt-2 flex justify-between items-center group-hover:translate-x-1 transition-transform">
                                            <span className="text-xs font-bold text-emerald-600">Ver integrantes</span>
                                            <ChevronRight size={16} className="text-emerald-600" />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                            {/* Card: Crear Rodeo */}
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowHerdForm(true);
                                }}
                                className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50/30 transition-all gap-3 group"
                            >
                                <div className="p-4 bg-slate-50 rounded-full group-hover:bg-emerald-100 transition-colors">
                                    <Plus size={32} />
                                </div>
                                <span className="font-bold text-sm">Crear Nuevo Rodeo</span>
                            </button>
                        </div>
                    )}
                </TabsContent>

                {/* CONTENIDO: INDIVIDUAL */}
                <TabsContent value="individual" className="animate-in fade-in duration-300">
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 font-bold text-slate-700">Identificación</th>
                                        <th className="px-6 py-4 font-bold text-slate-700">Categoría</th>
                                        <th className="px-6 py-4 font-bold text-slate-700">Peso</th>
                                        <th className="px-6 py-4 font-bold text-slate-700">Ubicación</th>
                                        <th className="px-6 py-4 font-bold text-slate-700">Estado</th>
                                        <th className="px-6 py-4 font-bold text-slate-700">Sanidad</th>
                                        <th className="px-6 py-4 font-bold text-slate-700 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {animals.map((animal) => (
                                        <tr 
                                            key={animal.id} 
                                            onClick={() => setViewingAnimal(animal)}
                                            className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                                                        <Tags size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">{animal.visual_tag || 'S/N'}</p>
                                                        <p className="text-[10px] text-slate-400 font-mono">{animal.rfid_tag}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className="font-medium">
                                                    {animal.current_category?.name || 'No asig.'}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                {animal.initial_weight ? (
                                                    <span className="text-sm font-semibold text-slate-700">
                                                        {animal.initial_weight} kg
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">Sin registrar</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <MapPin size={14} className="text-slate-400" />
                                                    <span>{animal.lot?.name || 'S/U'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge className="bg-green-100 text-green-700 border-none">Activo</Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                {animal.withdraw_until ? (
                                                    new Date(animal.withdraw_until) > new Date() ? (
                                                        <Badge variant="destructive" className="text-xs">
                                                            Retiro activo
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-xs text-green-600">
                                                            Sin retiro
                                                        </Badge>
                                                    )
                                                ) : (
                                                    <span className="text-xs text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Ver ficha <ArrowUpRight size={14} className="ml-1" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {animals.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                                                No hay animales registrados en este predio.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </TabsContent>

                {/* CONTENIDO: APROBACIONES */}
                <TabsContent value="approvals" className="animate-in fade-in duration-300">
                    <EventApprovals premiseId={selectedPremiseId} onAction={refresh} />
                </TabsContent>

                {/* CONTENIDO: ALERTAS DE CUMPLIMIENTO */}
                <TabsContent value="alerts" className="animate-in fade-in duration-300">
                    <ComplianceAlertsView
                        selectedPremiseId={selectedPremiseId}
                        selectedFirmId={selectedFirmId}
                    />
                </TabsContent>

                {/* CONTENIDO: DICOSE */}
                <TabsContent value="dicose" className="animate-in fade-in duration-300">
                    <DicoseManager premiseId={selectedPremiseId} categories={categories} />
                </TabsContent>
            </Tabs>

            {/* Modal: Registro de Nuevo Animal */}
            <AnimalForm
                open={showAnimalForm}
                onOpenChange={(open) => {
                    setShowAnimalForm(open);
                    if (!open) {
                        setAnimalFormMode('create');
                        setEditingAnimal(null);
                    }
                }}
                selectedFirmId={selectedFirmId}
                selectedPremiseId={selectedPremiseId}
                categories={categories}
                herds={herds}
                lots={lots}
                onSuccess={refresh}
                mode={animalFormMode}
                animal={editingAnimal}
            />

            {/* Modal: Crear Nuevo Rodeo */}
            <HerdForm 
                open={showHerdForm}
                onOpenChange={setShowHerdForm}
                selectedFirmId={selectedFirmId}
                selectedPremiseId={selectedPremiseId}
                lots={lots}
                onSuccess={refresh}
            />
            {/* Modal: Registro de Eventos (Traslado, Sanidad, Pesaje, etc.) */}
            <LivestockEventForm 
                open={showEventForm}
                onOpenChange={setShowEventForm}
                selectedFirmId={selectedFirmId}
                selectedPremiseId={selectedPremiseId}
                animals={animals}
                herds={herds}
                lots={lots}
                categories={categories}
                defaultType={defaultEventType}
                onSuccess={refresh}
            />
            {/* Modal: Ficha del Animal */}
            <AnimalDetailModal
                animal={viewingAnimal}
                open={!!viewingAnimal}
                onOpenChange={(open) => !open && setViewingAnimal(null)}
                onEditClick={() => {
                    setAnimalFormMode('edit');
                    setEditingAnimal(viewingAnimal);
                    setShowAnimalForm(true);
                }}
            />

            {/* Modal: Agregar Animales a Rodeo */}
            {addingToHerd && (
                <AddAnimalsToHerdModal
                    herd={addingToHerd}
                    onClose={() => setAddingToHerd(null)}
                    onSuccess={() => {
                        refresh();
                        if (selectedHerd?.id === addingToHerd.id) {
                            // Si estamos viendo el detalle del rodeo, recargar
                            setSelectedHerd(null);
                            setTimeout(() => setSelectedHerd(addingToHerd), 100);
                        }
                    }}
                />
            )}
        </div>
    );
}
