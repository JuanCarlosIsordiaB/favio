import React, { useState, useEffect } from 'react';
import {
    ChevronLeft,
    UserPlus,
    UserMinus,
    Tags,
    Search,
    ArrowUpRight,
    Loader2,
    Scale,
    TrendingUp,
    Calendar,
    Fingerprint,
    Download,
    MapPin
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { getHerdAnimals, removeAnimalFromHerd, getHerdWeightSummary, getHerdLastEvent } from '../../services/livestock';

const EVENT_LABELS = {
    'MOVE_INTERNAL': 'Traslado Interno',
    'CATEGORY_CHANGE': 'Cambio de Categoría',
    'HEALTH_TREATMENT': 'Tratamiento Sanitario',
    'PURCHASE': 'Compra',
    'BIRTH': 'Nacimiento',
    'SALE': 'Venta',
    'DEATH': 'Mortandad',
    'CONSUMPTION': 'Consumo',
    'LOST_WITH_HIDE': 'Perdido c/ Cuero',
    'FAENA': 'Faena'
};

// Helper para calcular edad desde fecha de nacimiento
function calculateAge(birthDate) {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    const diffMonths = (today.getFullYear() - birth.getFullYear()) * 12 +
                       (today.getMonth() - birth.getMonth());

    if (diffMonths < 12) {
        return `${diffMonths}m`;
    } else {
        const years = Math.floor(diffMonths / 12);
        const months = diffMonths % 12;
        return months > 0 ? `${years}a${months}m` : `${years}a`;
    }
}

export default function HerdDetailView({ herd, onBack, onAddAnimal, onViewAnimal }) {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [weightSummary, setWeightSummary] = useState(null);
    const [lastEvent, setLastEvent] = useState(null);

    useEffect(() => {
        if (herd?.id) {
            loadMembers();
        }
    }, [herd?.id]);

    async function loadMembers() {
        setLoading(true);
        try {
            const data = await getHerdAnimals(herd.id);
            setMembers(data || []);

            // Cargar KPIs en paralelo
            const [summary, event] = await Promise.all([
                getHerdWeightSummary(herd.id),
                getHerdLastEvent(herd.id)
            ]);

            setWeightSummary(summary);
            setLastEvent(event);
        } catch (error) {
            console.error('Error loading herd data:', error);
            toast.error('Error al cargar datos del rodeo');
        } finally {
            setLoading(false);
        }
    }

    const handleRemove = async (animalId, tag) => {
        if (!window.confirm(`¿Quitar al animal ${tag} de este rodeo?`)) return;

        try {
            await removeAnimalFromHerd(herd.id, animalId);
            toast.success('Animal quitado del rodeo');
            loadMembers();
        } catch (error) {
            toast.error('Error al quitar animal');
        }
    };

    const filteredMembers = members.filter(m =>
        m.visual_tag?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.rfid_tag?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.current_lot?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Función para exportar a Excel con campos mejorados
    const handleExportExcel = () => {
        try {
            const workbook = XLSX.utils.book_new();

            // ===== HOJA 1: LISTADO COMPLETO DE ANIMALES =====
            const mainData = [
                ['LISTADO DE ANIMALES DEL RODEO'],
                [],
                ['Rodeo:', herd.name],
                ['Predio:', herd.premise?.name || 'N/A'],
                ['Firma:', herd.premise?.firm?.name || 'N/A'],
                ['Total animales:', filteredMembers.length],
                ['Fecha generación:', new Date().toLocaleString('es-UY')],
                ['Usuario:', localStorage.getItem('currentUser') || 'Sistema'],
                [],
                [
                    'Caravana Visual', 'RFID', 'Especie', 'Raza', 'Sexo',
                    'F. Nacimiento', 'Edad', 'Categoría', 'Peso (kg)',
                    'Predio Origen', 'Estado Sanitario', 'Lote Actual', 'Estado'
                ]
            ];

            filteredMembers.forEach(animal => {
                const edad = calculateAge(animal.birth_date);
                const sanitario = animal.withdraw_until && new Date(animal.withdraw_until) > new Date()
                    ? 'Retiro activo'
                    : 'Sin retiro';

                mainData.push([
                    animal.visual_tag || '-',
                    animal.rfid_tag || '-',
                    animal.species || '-',
                    animal.breed || '-',
                    animal.sex === 'M' ? 'Macho' : animal.sex === 'F' ? 'Hembra' : '-',
                    animal.birth_date ? new Date(animal.birth_date).toLocaleDateString('es-UY') : '-',
                    edad || '-',
                    animal.current_category?.name || '-',
                    animal.last_weight?.weight || '-',
                    animal.origin_premise?.name || animal.premise?.name || '-',
                    sanitario,
                    animal.current_lot?.name || '-',
                    animal.status || 'ACTIVE'
                ]);
            });

            const mainSheet = XLSX.utils.aoa_to_sheet(mainData);
            mainSheet['!cols'] = [
                {wch: 15}, {wch: 15}, {wch: 10}, {wch: 15}, {wch: 8},
                {wch: 12}, {wch: 8}, {wch: 15}, {wch: 10},
                {wch: 20}, {wch: 15}, {wch: 15}, {wch: 10}
            ];
            XLSX.utils.book_append_sheet(workbook, mainSheet, 'Animales');

            // ===== HOJA 2: KPIs DEL RODEO =====
            const kpiData = [
                ['KPIs DEL RODEO'],
                [],
                ['Métrica', 'Valor'],
                ['Total de animales', filteredMembers.length],
                ['Peso promedio (kg)', weightSummary?.pesoPromedio || 'N/A'],
                ['Kg totales estimados', weightSummary?.kgTotales || 'N/A'],
                ['Animales pesados', `${weightSummary?.animalesPesados || 0} de ${filteredMembers.length}`],
                ['Último evento', lastEvent ? `${EVENT_LABELS[lastEvent.tipo]} - ${new Date(lastEvent.fecha).toLocaleDateString('es-UY')}` : 'Sin eventos']
            ];

            const kpiSheet = XLSX.utils.aoa_to_sheet(kpiData);
            kpiSheet['!cols'] = [{wch: 25}, {wch: 20}];
            XLSX.utils.book_append_sheet(workbook, kpiSheet, 'KPIs');

            const filename = `Rodeo_${herd.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, filename);
            toast.success('✅ Excel exportado correctamente');
        } catch (error) {
            console.error('Error exportando Excel:', error);
            toast.error('Error al exportar Excel');
        }
    };

    // Función para exportar a PDF con campos mejorados
    const handleExportPDF = () => {
        try {
            const doc = new jsPDF({ orientation: 'landscape' });

            // Header con información del rodeo
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(`Rodeo: ${herd.name}`, 14, 15);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Predio: ${herd.premise?.name || 'N/A'}`, 14, 22);
            doc.text(`Firma: ${herd.premise?.firm?.name || 'N/A'}`, 14, 27);
            doc.text(`Total animales: ${filteredMembers.length}`, 14, 32);
            doc.text(`Fecha: ${new Date().toLocaleDateString('es-UY')}`, 200, 22, { align: 'right' });
            doc.text(`Usuario: ${localStorage.getItem('currentUser') || 'Sistema'}`, 200, 27, { align: 'right' });

            // Tabla principal con campos mejorados
            const tableData = filteredMembers.map(animal => {
                const edad = calculateAge(animal.birth_date);
                const sanitario = animal.withdraw_until && new Date(animal.withdraw_until) > new Date()
                    ? 'Retiro activo'
                    : 'Sin retiro';

                return [
                    animal.visual_tag || '-',
                    animal.rfid_tag?.substring(0, 10) || '-',
                    animal.species || '-',
                    animal.breed || '-',
                    animal.sex === 'M' ? 'M' : animal.sex === 'F' ? 'F' : '-',
                    animal.birth_date ? new Date(animal.birth_date).toLocaleDateString('es-UY') : '-',
                    edad || '-',
                    animal.current_category?.name || '-',
                    animal.last_weight?.weight || '-',
                    sanitario,
                    animal.current_lot?.name || '-'
                ];
            });

            autoTable(doc, {
                head: [[
                    'Caravana', 'RFID', 'Esp', 'Raza', 'Sexo',
                    'F. Nac', 'Edad', 'Categoría', 'Peso',
                    'Sanidad', 'Lote'
                ]],
                body: tableData,
                startY: 40,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: {
                    fillColor: [16, 185, 129],
                    textColor: 255,
                    fontStyle: 'bold'
                },
                alternateRowStyles: { fillColor: [245, 247, 250] }
            });

            // Página 2: KPIs del rodeo
            const finalY = doc.lastAutoTable?.finalY || 40;
            if (finalY > 200) {
                doc.addPage();
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('KPIs del Rodeo', 14, 15);
            } else {
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('KPIs del Rodeo', 14, finalY + 10);
            }

            const kpiData = [
                ['Peso promedio', `${weightSummary?.pesoPromedio || 'N/A'} kg`],
                ['Kg totales estimados', `${weightSummary?.kgTotales || 'N/A'} kg`],
                ['Animales pesados', `${weightSummary?.animalesPesados || 0} de ${filteredMembers.length}`],
                ['Último evento', lastEvent ? `${EVENT_LABELS[lastEvent.tipo]} - ${new Date(lastEvent.fecha).toLocaleDateString('es-UY')}` : 'Sin eventos']
            ];

            autoTable(doc, {
                body: kpiData,
                startY: finalY > 200 ? 25 : finalY + 15,
                theme: 'striped',
                styles: { fontSize: 10 },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 60 },
                    1: { cellWidth: 80 }
                }
            });

            const filename = `Rodeo_${herd.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(filename);
            toast.success('✅ PDF exportado correctamente');
        } catch (error) {
            console.error('Error exportando PDF:', error);
            toast.error('Error al exportar PDF');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
            {/* Header del Rodeo */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <ChevronLeft size={24} className="text-slate-600" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-bold text-slate-900">{herd.name}</h3>
                            <Badge className="bg-emerald-100 text-emerald-700 border-none">
                                {members.length} integrantes
                            </Badge>
                        </div>
                        <p className="text-slate-500 text-sm">Integrantes del rodeo y trazabilidad grupal</p>
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto flex-wrap">
                    <Button
                        onClick={handleExportExcel}
                        variant="outline"
                        className="gap-2"
                        title="Exportar a Excel"
                    >
                        <Download size={16} /> Excel
                    </Button>
                    <Button
                        onClick={handleExportPDF}
                        variant="outline"
                        className="gap-2"
                        title="Exportar a PDF"
                    >
                        <Download size={16} /> PDF
                    </Button>
                    <Button
                        onClick={onAddAnimal}
                        className="flex-1 md:flex-none gap-2 bg-emerald-600 hover:bg-emerald-700"
                    >
                        <UserPlus size={16} /> Agregar Animal
                    </Button>
                </div>
            </div>

            {/* KPIs del Rodeo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Peso Promedio */}
                <Card className="border-emerald-200 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-slate-500 font-bold uppercase">Peso Promedio</p>
                            <Scale size={16} className="text-emerald-600" />
                        </div>
                        <p className="text-2xl font-black text-emerald-600">
                            {weightSummary?.pesoPromedio || '0.0'} <span className="text-sm text-slate-400">kg</span>
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            {weightSummary?.animalesPesados || 0} de {members.length} pesados
                        </p>
                    </CardContent>
                </Card>

                {/* Kg Totales */}
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-slate-500 font-bold uppercase">Kg Totales Estimados</p>
                            <TrendingUp size={16} className="text-slate-600" />
                        </div>
                        <p className="text-2xl font-black text-slate-700">
                            {weightSummary?.kgTotales || '0.0'} <span className="text-sm text-slate-400">kg</span>
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            Peso acumulado del rodeo
                        </p>
                    </CardContent>
                </Card>

                {/* Último Evento */}
                <Card className="border-blue-200 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-slate-500 font-bold uppercase">Último Evento</p>
                            <Calendar size={16} className="text-blue-600" />
                        </div>
                        {lastEvent ? (
                            <>
                                <p className="text-sm font-bold text-slate-900">
                                    {EVENT_LABELS[lastEvent.tipo] || lastEvent.tipo}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {new Date(lastEvent.fecha).toLocaleDateString('es-UY')}
                                </p>
                            </>
                        ) : (
                            <p className="text-sm text-slate-400 italic">Sin eventos registrados</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Buscador */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="Buscar por caravana en este rodeo..." 
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Lista de Integrantes */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="animate-spin text-emerald-600 w-10 h-10" />
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 font-bold text-slate-700">Caravana</th>
                                    <th className="px-4 py-3 font-bold text-slate-700">Sexo</th>
                                    <th className="px-4 py-3 font-bold text-slate-700">Nac. / Edad</th>
                                    <th className="px-4 py-3 font-bold text-slate-700">Raza</th>
                                    <th className="px-4 py-3 font-bold text-slate-700">Categoría</th>
                                    <th className="px-4 py-3 font-bold text-slate-700 text-center">Peso Último (kg)</th>
                                    <th className="px-4 py-3 font-bold text-slate-700">Sanidad</th>
                                    <th className="px-4 py-3 font-bold text-slate-700">Estado</th>
                                    <th className="px-4 py-3 font-bold text-slate-700">Lote/Potrero</th>
                                    <th className="px-4 py-3 font-bold text-slate-700 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredMembers.map((animal) => (
                                    <tr key={animal.id} className="hover:bg-slate-50/50 transition-colors group">
                                        {/* Identificación */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                                                    <Tags size={14} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 text-sm">{animal.visual_tag || 'S/N'}</p>
                                                    <p className="text-[9px] text-slate-400 font-mono">{animal.rfid_tag}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Sexo */}
                                        <td className="px-4 py-3">
                                            <Badge variant="outline" className={`text-xs ${animal.sex === 'M' ? 'bg-blue-50' : animal.sex === 'F' ? 'bg-pink-50' : 'bg-slate-50'}`}>
                                                {animal.sex === 'M' ? '♂ Macho' : animal.sex === 'F' ? '♀ Hembra' : '-'}
                                            </Badge>
                                        </td>

                                        {/* Fecha Nacimiento + Edad */}
                                        <td className="px-4 py-3 text-xs">
                                            {animal.birth_date ? (
                                                <div className="space-y-0.5">
                                                    <p className="text-slate-700 font-medium">
                                                        {new Date(animal.birth_date).toLocaleDateString('es-UY')}
                                                    </p>
                                                    <p className="text-slate-400">
                                                        {calculateAge(animal.birth_date)}
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>

                                        {/* Raza */}
                                        <td className="px-4 py-3">
                                            <span className="text-slate-600 text-sm">
                                                {animal.breed || <span className="text-slate-400">-</span>}
                                            </span>
                                        </td>

                                        {/* Categoría */}
                                        <td className="px-4 py-3">
                                            <Badge variant="outline" className="font-medium text-slate-600 text-xs">
                                                {animal.current_category?.name || 'No asig.'}
                                            </Badge>
                                        </td>

                                        {/* Peso Último (kg) */}
                                        <td className="px-4 py-3 text-center">
                                            {animal.last_weight?.weight ? (
                                                <Badge className="bg-orange-100 text-orange-700 border-none">
                                                    {animal.last_weight.weight} kg
                                                </Badge>
                                            ) : (
                                                <span className="text-slate-400 text-xs">Sin pesaje</span>
                                            )}
                                        </td>

                                        {/* Sanidad - Estado de Retiro Sanitario */}
                                        <td className="px-4 py-3">
                                            {animal.withdraw_until ? (
                                                new Date(animal.withdraw_until) > new Date() ? (
                                                    <Badge variant="destructive" className="text-xs font-medium">
                                                        Retiro activo
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-xs text-green-600 font-medium">
                                                        Sin retiro
                                                    </Badge>
                                                )
                                            ) : (
                                                <span className="text-xs text-slate-400">-</span>
                                            )}
                                        </td>

                                        {/* Estado */}
                                        <td className="px-4 py-3">
                                            <Badge className="bg-green-100 text-green-700 border-none shadow-none uppercase text-[9px]">Activo</Badge>
                                        </td>

                                        {/* Lote/Potrero */}
                                        <td className="px-4 py-3">
                                            {animal.current_lot?.name ? (
                                                <div className="flex items-center gap-1">
                                                    <MapPin size={12} className="text-emerald-600" />
                                                    <span className="text-xs text-slate-700">{animal.current_lot.name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-xs">-</span>
                                            )}
                                        </td>

                                        {/* Acciones */}
                                        <td className="px-4 py-3 text-right space-x-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-slate-400 hover:text-emerald-600"
                                                onClick={() => onViewAnimal(animal)}
                                                title="Ver Ficha"
                                            >
                                                <ArrowUpRight size={14} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => handleRemove(animal.id, animal.visual_tag || animal.rfid_tag)}
                                                title="Quitar del rodeo"
                                            >
                                                <UserMinus size={14} />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredMembers.length === 0 && (
                                    <tr>
                                        <td colSpan="10" className="px-4 py-12 text-center text-slate-400 italic text-sm">
                                            No se encontraron integrantes que coincidan con la búsqueda.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>
        </div>
    );
}
