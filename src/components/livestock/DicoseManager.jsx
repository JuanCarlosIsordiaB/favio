import React, { useState, useEffect, useMemo } from 'react';
import {
    FileText,
    Download,
    Printer,
    RefreshCcw,
    AlertCircle,
    ChevronDown,
    Loader2,
    Calendar,
    ArrowUpRight,
    ArrowDownLeft,
    XCircle,
    Search,
    Filter,
    Lock
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '../ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getDicoseSheets, getDicoseEntries, closeContralSheet, createCorrectiveEntry } from '../../services/livestock';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const SHEET_TYPES = [
    { id: 'A', label: 'Tipo A', description: 'Vacunos propios en el establecimiento' },
    { id: 'B', label: 'Tipo B', description: 'Ovinos propios en el establecimiento' },
    { id: 'C', label: 'Tipo C', description: 'Propios fuera del establecimiento' },
    { id: 'D', label: 'Tipo D', description: 'Ajenos en el establecimiento' },
    { id: 'E', label: 'Tipo E', description: 'Sanitaria' },
];

export default function DicoseManager({ premiseId, categories = [] }) {
    // Obtener firm_id del localStorage
    let firmId = null;
    try {
        const firmData = localStorage.getItem('selectedFirmData');
        if (firmData) {
            firmId = JSON.parse(firmData)?.id || null;
        }
    } catch (parseError) {
        console.error('Failed to parse selectedFirmData from localStorage:', parseError);
    }

    // Obtener usuario actual
    const { user } = useAuth();

    // Estado para predio seleccionado (permite cambiar entre predios)
    const [selectedPremiseId, setSelectedPremiseId] = useState(premiseId);
    const [premises, setPremises] = useState([]);
    const [premisesLoading, setPremisesLoading] = useState(true);

    const [sheets, setSheets] = useState([]);
    const [activeSheet, setActiveSheet] = useState(null);
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingEntries, setLoadingEntries] = useState(false);

    // Estados para filtros
    const [filters, setFilters] = useState({
        guideSearch: '',
        dateFrom: '',
        dateTo: '',
        operationType: '',
        categoryId: ''
    });

    // ============================================
    // EFECTO: Cargar predios de la firma
    // ============================================
    useEffect(() => {
        if (firmId) {
            loadPremises();
        }
    }, [firmId]);

    async function loadPremises() {
        try {
            setPremisesLoading(true);
            const { data } = await supabase
                .from('premises')
                .select('id, name, dicose_number')
                .eq('firm_id', firmId)
                .order('name', { ascending: true });

            setPremises(data || []);
        } catch (error) {
            console.error('Error loading premises:', error);
        } finally {
            setPremisesLoading(false);
        }
    }

    // Actualizar sheets cuando cambia el predio seleccionado
    useEffect(() => {
        if (selectedPremiseId) {
            loadSheets();
        }
    }, [selectedPremiseId]);

    // Estados para anulación de renglones
    const [voidReason, setVoidReason] = useState('');
    const [voidingEntryId, setVoidingEntryId] = useState(null);

    // Estados para correcciones de renglones
    const [correctingEntryId, setCorrectingEntryId] = useState(null);
    const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
    const [correctionReason, setCorrectionReason] = useState('');
    const [correctionData, setCorrectionData] = useState({
        qty_heads: '',
        operation_type: ''
    });

    // Estado para cerrar planilla
    const [closingSheet, setClosingSheet] = useState(false);

    // Estado para balances de planilla anterior (existencia inicial)
    const [previousBalances, setPreviousBalances] = useState([]);

    // Estados para crear nueva planilla
    const [showCreateSheet, setShowCreateSheet] = useState(false);
    const [newSheetData, setNewSheetData] = useState({
        sheet_type: 'A',
        period_start: new Date().toISOString().split('T')[0],
        period_end: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0],
        dicose_number: ''
    });

    // Asegurar que existan todas las planillas DICOSE (A-E) para el predio
    async function ensureAllSheetTypes() {
        try {
            const existingSheets = await getDicoseSheets(selectedPremiseId);
            const existingTypes = new Set(existingSheets.map(s => s.sheet_type));

            // Obtener datos del predio para DICOSE number
            const { data: premiseData } = await supabase
                .from('premises')
                .select('dicose_number')
                .eq('id', selectedPremiseId)
                .single();

            const dicoseNumber = premiseData?.dicose_number || 'N/A';
            const currentYear = new Date().getFullYear();

            // Crear planillas faltantes
            const sheetsToCreate = [];
            for (const type of SHEET_TYPES) {
                if (!existingTypes.has(type.id)) {
                    sheetsToCreate.push({
                        firm_id: firmId,
                        premise_id: selectedPremiseId,
                        sheet_type: type.id,
                        period_start: `${currentYear}-01-19`,
                        period_end: `${currentYear}-12-30`,
                        dicose_number: dicoseNumber,
                        status: 'OPEN'
                    });
                }
            }

            // Insertar todas las que falten de una sola vez
            if (sheetsToCreate.length > 0) {
                const { error } = await supabase
                    .from('contralor_sheets')
                    .insert(sheetsToCreate);

                if (error) {
                    console.warn('Error creating missing sheet types:', error);
                    // No lanzar error, continuar con lo que exista
                }
            }
        } catch (error) {
            console.error('Error in ensureAllSheetTypes:', error);
            // No lanzar error, continuar gracefully
        }
    }

    async function loadSheets() {
        setLoading(true);
        try {
            // Primero asegurar que existan todas las planillas (A-E)
            await ensureAllSheetTypes();

            // Luego cargar las planillas
            const data = await getDicoseSheets(selectedPremiseId);
            setSheets(data || []);
            if (data && data.length > 0) {
                const defaultSheet = data.find(s => s.sheet_type === 'A') || data[0];
                handleSelectSheet(defaultSheet);
            }
        } catch (error) {
            console.error('Error loading DICOSE sheets:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleSelectSheet = async (sheet) => {
        setActiveSheet(sheet);
        setLoadingEntries(true);
        try {
            const data = await getDicoseEntries(sheet.id);
            setEntries(data || []);
        } catch (error) {
            toast.error('Error al cargar renglones de planilla');
        } finally {
            setLoadingEntries(false);
        }
    };

    // Cargar balances de planilla anterior cuando se selecciona una planilla
    useEffect(() => {
        async function loadPreviousBalances() {
            if (!activeSheet) {
                setPreviousBalances([]);
                return;
            }

            try {
                // Buscar planilla anterior (mismo tipo, mismo predio, período anterior, cerrada)
                const { data: prevSheet } = await supabase
                    .from('contralor_sheets')
                    .select('id, period_end')
                    .eq('premise_id', activeSheet.premise_id)
                    .eq('sheet_type', activeSheet.sheet_type)
                    .eq('status', 'CLOSED')
                    .lt('period_end', activeSheet.period_start)
                    .order('period_end', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (!prevSheet) {
                    setPreviousBalances([]);
                    return;
                }

                // Cargar balances finales de planilla anterior
                const { data: balances } = await supabase
                    .from('contralor_balances')
                    .select('category_id, final_qty_heads')
                    .eq('contralor_sheet_id', prevSheet.id);

                setPreviousBalances(balances || []);
            } catch (error) {
                console.error('Error loading previous balances:', error);
                setPreviousBalances([]);
            }
        }

        loadPreviousBalances();
    }, [activeSheet]);

    const handleExportExcel = () => {
        if (!entries.length) {
            toast.error('No hay datos para exportar');
            return;
        }

        try {
            // ===== CREAR WORKBOOK XLSX OFICIAL DICOSE =====
            const workbook = XLSX.utils.book_new();

            // ===== HOJA 1: PLANILLA PRINCIPAL =====
            const mainSheetData = [];

            // Cabecera oficial
            mainSheetData.push(['PLANILLA DE CONTRALOR INTERNO DICOSE']);
            mainSheetData.push([]);
            mainSheetData.push(['Tipo de Planilla:', activeSheet?.sheet_type]);
            mainSheetData.push(['Inscripción DICOSE:', activeSheet?.dicose_number || 'N/A']);
            mainSheetData.push(['Período:', `${new Date(activeSheet?.period_start).toLocaleDateString('es-UY')} - ${new Date(activeSheet?.period_end).toLocaleDateString('es-UY')}`]);
            mainSheetData.push(['Generado:', new Date().toLocaleString('es-UY')]);
            mainSheetData.push(['Usuario Generador:', localStorage.getItem('user?.full_name') || 'Sistema']);
            mainSheetData.push(['Fecha/Hora Exact:', new Date().toISOString()]);
            mainSheetData.push(['Estado Cumplimiento:', 'COMPLETO']);
            mainSheetData.push([]);

            // Encabezados de tabla
            const categoryIds = new Set();
            entries.forEach(entry => {
                entry.lines?.forEach(line => {
                    if (line.category_id) categoryIds.add(line.category_id);
                });
            });

            const categories = Array.from(categoryIds).map((catId, idx) => {
                const cat = entries
                    .flatMap(e => e.lines)
                    .find(l => l.category_id === catId);
                return cat?.category?.name || `Categoría ${idx + 1}`;
            });

            const tableHeaders = ['Fecha', 'Operación', 'Guía', 'Inscripción'];
            categories.forEach(cat => tableHeaders.push(`${cat} (Entrada)`));
            categories.forEach(cat => tableHeaders.push(`${cat} (Salida)`));

            mainSheetData.push(tableHeaders);

            // NUEVA: Fila de Existencia Inicial (desde 30/06 del año anterior)
            const initialRow = [`30/06/${new Date(activeSheet?.period_start).getFullYear() - 1}`, 'Existencia Inicial', '-', '-'];
            // Entradas: usar existencia inicial de planilla anterior
            const categoryIds_arr = Array.from(categoryIds);
            categoryIds_arr.forEach((catId) => {
                const prevBalance = previousBalances.find(b => b.category_id === catId);
                initialRow.push(prevBalance?.final_qty_heads || 0);
            });
            // Salidas: siempre "-"
            categoryIds_arr.forEach(() => initialRow.push('-'));
            mainSheetData.push(initialRow);

            // Filas de datos (solo renglones activos, excluyendo anulados)
            entries.forEach(entry => {
                if (entry.is_voided) return;  // ✅ Excluir renglones anulados

                const row = [
                    new Date(entry.entry_date).toLocaleDateString(),
                    entry.operation_type,
                    entry.guide_full || '-',
                    entry.registration_number_dicose || '-'
                ];

                // Entradas por categoría
                categories.forEach((cat, idx) => {
                    const catId = Array.from(categoryIds)[idx];
                    const qty = entry.lines
                        ?.filter(l => l.direction === 'IN' && l.category_id === catId)
                        ?.reduce((sum, l) => sum + l.qty_heads, 0) || 0;
                    row.push(qty || '');
                });

                // Salidas por categoría
                categories.forEach((cat, idx) => {
                    const catId = Array.from(categoryIds)[idx];
                    const qty = entry.lines
                        ?.filter(l => l.direction === 'OUT' && l.category_id === catId)
                        ?.reduce((sum, l) => sum + l.qty_heads, 0) || 0;
                    row.push(qty || '');
                });

                mainSheetData.push(row);
            });

            // Fila de totales
            mainSheetData.push([]);
            const totalsRow = ['TOTALES'];
            categories.forEach(() => totalsRow.push(''));
            categories.forEach(() => totalsRow.push(''));

            categories.forEach((cat, idx) => {
                const catId = Array.from(categoryIds)[idx];
                const totalIn = entries.reduce((sum, entry) => {
                    return sum + (entry.lines?.filter(l => l.direction === 'IN' && l.category_id === catId)
                        ?.reduce((s, l) => s + l.qty_heads, 0) || 0);
                }, 0);
                // Encontrar columna de entrada
                const colIndex = 4 + idx;
                if (!totalsRow[colIndex]) totalsRow[colIndex] = totalIn;
            });

            mainSheetData.push(totalsRow);

            const mainSheet = XLSX.utils.aoa_to_sheet(mainSheetData);
            XLSX.utils.book_append_sheet(workbook, mainSheet, `Planilla ${activeSheet?.sheet_type}`);

            // ===== HOJA 2: RESUMEN DE SALDOS CON EXISTENCIA INICIAL =====
            const balanceSheetData = [];
            balanceSheetData.push(['RESUMEN DE EXISTENCIAS POR CATEGORÍA']);
            balanceSheetData.push([]);
            balanceSheetData.push(['Categoría', 'Existencia Inicial', 'Entradas', 'Salidas', 'Saldo Final']);

            const saldos = calcularSaldos();
            saldos.forEach(cat => {
                // Obtener existencia inicial desde planilla anterior
                const prevBalance = previousBalances.find(b => b.category_id === cat.id);
                const existenciaInicial = prevBalance?.final_qty_heads || 0;
                const saldoFinal = existenciaInicial + cat.in - cat.out;
                balanceSheetData.push([
                    cat.name,
                    existenciaInicial,
                    cat.in,
                    cat.out,
                    saldoFinal
                ]);
            });

            const balanceSheet = XLSX.utils.aoa_to_sheet(balanceSheetData);
            XLSX.utils.book_append_sheet(workbook, balanceSheet, 'Resumen');

            // ===== DESCARGAR WORKBOOK =====
            const fileName = `Planilla_DICOSE_${activeSheet?.sheet_type}_${new Date().getFullYear()}.xlsx`;
            XLSX.writeFile(workbook, fileName);

            toast.success('✅ Excel oficial DICOSE descargado exitosamente');
        } catch (error) {
            console.error('Error exportando Excel:', error);
            toast.error('Error al generar el archivo');
        }
    };

    // Función para exportar PDF oficial DICOSE
    const handleExportPDF = () => {
        if (!entries.length) {
            toast.error('No hay datos para exportar a PDF');
            return;
        }

        try {
            const doc = new jsPDF('landscape', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // 1. CABECERA OFICIAL DICOSE
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('PLANILLA DE CONTRALOR INTERNO DICOSE', pageWidth / 2, 15, { align: 'center' });

            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.text(`Tipo de Planilla: ${activeSheet?.sheet_type}`, 15, 25);
            doc.text(`Inscripción DICOSE: ${activeSheet?.dicose_number || 'N/A'}`, 15, 32);
            doc.text(`Período: ${new Date(activeSheet?.period_start).toLocaleDateString('es-UY')} - ${new Date(activeSheet?.period_end).toLocaleDateString('es-UY')}`, 15, 39);

            // Información en lado derecho
            doc.text(`Generado: ${new Date().toLocaleString('es-UY')}`, pageWidth - 15, 25, { align: 'right' });
            doc.text(`Usuario: ${localStorage.getItem('user?.full_name') || 'Sistema'}`, pageWidth - 15, 32, { align: 'right' });
            doc.text(`Estado: COMPLETO`, pageWidth - 15, 39, { align: 'right' });

            // 2. TABLA DE EXISTENCIA INICIAL
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(`Existencia Inicial (30/06/${new Date(activeSheet?.period_start).getFullYear() - 1})`, 15, 48);

            const initialBalanceData = resumenSaldos.map(cat => {
                const prevBalance = previousBalances.find(b => b.category_id === cat.id);
                const initialQty = prevBalance?.final_qty_heads || 0;
                return [cat.name, initialQty.toString()];
            });

            autoTable(doc, {
                startY: 52,
                head: [['Categoría', 'Cantidad']],
                body: initialBalanceData,
                theme: 'striped',
                styles: { fontSize: 9, cellPadding: 2 },
                headStyles: {
                    fillColor: [100, 116, 139],
                    fontStyle: 'bold',
                    textColor: [255, 255, 255]
                },
                margin: 15
            });

            // 3. TABLA DE RENGLONES
            const tableData = filteredEntries
                .filter(entry => !entry.is_voided) // No incluir anulados en PDF
                .map(entry => {
                    const entradas = entry.lines.filter(l => l.direction === 'IN').reduce((sum, l) => sum + l.qty_heads, 0);
                    const salidas = entry.lines.filter(l => l.direction === 'OUT').reduce((sum, l) => sum + l.qty_heads, 0);
                    const detalle = entry.lines.map(l => `${l.direction === 'IN' ? '+' : '-'}${l.qty_heads} ${l.category?.name}`).join(' | ');

                    return [
                        new Date(entry.entry_date).toLocaleDateString(),
                        entry.operation_type,
                        entry.guide_full || '-',
                        entry.registration_number_dicose || '-',
                        entradas || '-',
                        salidas || '-',
                        detalle
                    ];
                });

            // Calcular posición después de tabla de existencia inicial
            const initialTableY = doc.lastAutoTable?.finalY || 65;

            autoTable(doc, {
                startY: initialTableY + 5,
                head: [['Fecha', 'Operación', 'Guía', 'Inscripción', 'Entradas', 'Salidas', 'Detalle']],
                body: tableData,
                theme: 'grid',
                styles: { fontSize: 9, cellPadding: 3 },
                headStyles: {
                    fillColor: [51, 122, 183],
                    fontStyle: 'bold',
                    textColor: [255, 255, 255]
                },
                margin: 15
            });

            // 4. RESUMEN DE EXISTENCIAS CON SALDO FINAL
            const finalY = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('RESUMEN DE EXISTENCIAS POR CATEGORÍA', 15, finalY);

            const saldosData = resumenSaldos.map(cat => {
                const prevBalance = previousBalances.find(b => b.category_id === cat.id);
                const initialQty = prevBalance?.final_qty_heads || 0;
                const finalBalance = initialQty + cat.in - cat.out;
                return [
                    cat.name,
                    initialQty.toString(),
                    cat.in.toString(),
                    cat.out.toString(),
                    finalBalance.toString()
                ];
            });

            autoTable(doc, {
                startY: finalY + 5,
                head: [['Categoría', 'Existencia Inicial', 'Entradas', 'Salidas', 'Saldo Final']],
                body: saldosData,
                theme: 'striped',
                styles: { fontSize: 9, cellPadding: 3 },
                headStyles: {
                    fillColor: [76, 175, 80],
                    fontStyle: 'bold',
                    textColor: [255, 255, 255]
                }
            });

            // 4. PIE DE PÁGINA Y FIRMA
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');

                // Número de página
                doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

                // Nota legal en última página
                if (i === pageCount) {
                    doc.setFontSize(7);
                    doc.text('Nota Legal: Conforme a Decreto 289/74 - Esta planilla debe ser conservada por 5 años', 15, pageHeight - 20);

                    // Espacio para firma
                    doc.setFontSize(9);
                    doc.text('_____________________', 50, pageHeight - 40);
                    doc.text('Firma del Responsable', 50, pageHeight - 35, { align: 'center' });
                }
            }

            // 5. DESCARGAR PDF
            const fileName = `Planilla_DICOSE_${activeSheet?.sheet_type}_${new Date().getFullYear()}.pdf`;
            doc.save(fileName);

            toast.success('✅ PDF descargado exitosamente');
        } catch (error) {
            console.error('Error al generar PDF:', error);
            toast.error('Error al generar el archivo PDF');
        }
    };

    const calcularSaldos = () => {
        const saldos = {};
        entries.forEach(entry => {
            if (entry.is_voided) return;
            entry.lines.forEach(line => {
                const catId = line.category?.id || line.category_id;
                const catName = line.category?.name || 'Desconocida';
                if (!saldos[catId]) saldos[catId] = { name: catName, in: 0, out: 0 };

                if (line.direction === 'IN') saldos[catId].in += line.qty_heads;
                else saldos[catId].out += line.qty_heads;
            });
        });
        return Object.values(saldos);
    };

    // Filtrar renglones según criterios
    const filteredEntries = useMemo(() => {
        return entries.filter(entry => {
            if (filters.guideSearch && !entry.guide_full?.toLowerCase().includes(filters.guideSearch.toLowerCase())) {
                return false;
            }

            if (filters.dateFrom && new Date(entry.entry_date) < new Date(filters.dateFrom)) {
                return false;
            }

            if (filters.dateTo && new Date(entry.entry_date) > new Date(filters.dateTo)) {
                return false;
            }

            if (filters.operationType && entry.operation_type !== filters.operationType) {
                return false;
            }

            if (filters.categoryId) {
                const hasCat = entry.lines.some(l => l.category_id === filters.categoryId);
                if (!hasCat) return false;
            }

            return true;
        });
    }, [entries, filters]);

    const resumenSaldos = calcularSaldos();

    // Función para anular renglón
    const handleVoidEntry = async (entryId) => {
        if (!voidReason.trim()) {
            toast.error('Debe especificar el motivo de anulación');
            return;
        }

        try {
            const { error } = await supabase
                .from('contralor_entries')
                .update({
                    is_voided: true,
                    void_reason: voidReason,
                    voided_at: new Date().toISOString(),
                    voided_by: user?.id || null
                })
                .eq('id', entryId);

            if (error) throw error;

            toast.success('✅ Renglón anulado correctamente');
            handleSelectSheet(activeSheet);
            setVoidReason('');
            setVoidingEntryId(null);
        } catch (error) {
            console.error('Error al anular renglón:', error);
            toast.error('Error al anular renglón');
        }
    };

    // Función para crear nueva planilla DICOSE
    const handleCreateNewSheet = async () => {
        if (!newSheetData.dicose_number?.trim()) {
            toast.error('Debe ingresar el número de inscripción DICOSE');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('contralor_sheets')
                .insert([{
                    firm_id: firmId,
                    premise_id: premiseId,
                    sheet_type: newSheetData.sheet_type,
                    period_start: newSheetData.period_start,
                    period_end: newSheetData.period_end,
                    dicose_number: newSheetData.dicose_number,
                    status: 'OPEN'
                    // NOTA: created_at se genera automáticamente en Supabase con DEFAULT now()
                }])
                .select()
                .single();

            if (error) throw error;

            toast.success(`✅ Planilla Tipo ${newSheetData.sheet_type} creada exitosamente`);
            setShowCreateSheet(false);
            setNewSheetData({
                sheet_type: 'A',
                period_start: new Date().toISOString().split('T')[0],
                period_end: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0],
                dicose_number: ''
            });
            loadSheets();
        } catch (error) {
            console.error('Error creando planilla:', error);
            toast.error('Error al crear planilla DICOSE');
        }
    };

    // Función para abrir modal de corrección
    const handleOpenCorrectionModal = (entry) => {
        setCorrectingEntryId(entry.id);
        setCorrectionData({
            qty_heads: entry.lines.reduce((sum, l) => sum + l.qty_heads, 0),
            operation_type: entry.operation_type
        });
        setCorrectionReason('');
        setCorrectionModalOpen(true);
    };

    // Función para crear renglón correctivo
    const handleCreateCorrection = async () => {
        if (!correctionReason.trim()) {
            toast.error('Debe especificar el motivo de la corrección');
            return;
        }

        if (!correctionData.qty_heads) {
            toast.error('Debe especificar la cantidad correcta');
            return;
        }

        try {
            await createCorrectiveEntry(
                correctingEntryId,
                {
                    qty_heads: parseInt(correctionData.qty_heads),
                    operation_type: correctionData.operation_type
                },
                correctionReason,
                user?.full_name || 'Sistema'
            );

            toast.success('✅ Entrada correctiva creada exitosamente');
            setCorrectionModalOpen(false);
            handleSelectSheet(activeSheet);
            setCorrectingEntryId(null);
            setCorrectionReason('');
            setCorrectionData({ qty_heads: '', operation_type: '' });
        } catch (error) {
            console.error('Error al crear corrección:', error);
            toast.error('Error al crear entrada correctiva: ' + error.message);
        }
    };

    // Función para cerrar planilla y persistir saldos
    const handleCloseSheet = async () => {
        if (!activeSheet) {
            toast.error('No hay planilla seleccionada');
            return;
        }

        if (activeSheet.status === 'CLOSED') {
            toast.error('Esta planilla ya está cerrada');
            return;
        }

        setClosingSheet(true);
        try {
            const result = await closeContralSheet(activeSheet.id, user?.full_name || 'Sistema');

            if (result.success) {
                toast.success(
                    `✅ Planilla cerrada exitosamente. ${result.saldos.length} saldos persistidos.`
                );
                // Recargar planillas para actualizar estado
                await loadSheets();
            }
        } catch (error) {
            console.error('Error al cerrar planilla:', error);
            toast.error('Error al cerrar la planilla: ' + (error instanceof Error ? error.message : 'Error desconocido'));
        } finally {
            setClosingSheet(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-emerald-600 w-10 h-10" />
            </div>
        );
    }

    if (sheets.length === 0) {
        return (
            <>
                <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <AlertCircle size={48} className="text-slate-300 mb-4" />
                    <p className="text-slate-500 font-medium text-lg">No hay planillas de contralor generadas</p>
                    <p className="text-slate-400 text-sm mb-6">Inicie un nuevo período para comenzar el registro oficial.</p>
                    <Button
                        onClick={() => setShowCreateSheet(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                    >
                        <FileText size={16} /> Abrir Nueva Planilla
                    </Button>
                </div>

                {/* MODAL: Crear Nueva Planilla DICOSE */}
                <Dialog open={showCreateSheet} onOpenChange={setShowCreateSheet}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Crear Nueva Planilla DICOSE</DialogTitle>
                            <DialogDescription>
                                Inicie un nuevo período de registro. La planilla estará ABIERTA para recibir eventos aprobados.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            {/* Tipo de Planilla */}
                            <div>
                                <label className="text-sm font-bold text-slate-700 block mb-2">Tipo de Planilla</label>
                                <select
                                    value={newSheetData.sheet_type}
                                    onChange={(e) => setNewSheetData({...newSheetData, sheet_type: e.target.value})}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                >
                                    <option value="A">Tipo A - Vacunos propios en el establecimiento</option>
                                    <option value="B">Tipo B - Ovinos propios en el establecimiento</option>
                                    <option value="C">Tipo C - Propios fuera del establecimiento</option>
                                    <option value="D">Tipo D - Ajenos en el establecimiento</option>
                                    <option value="E">Tipo E - Sanitaria</option>
                                </select>
                            </div>

                            {/* Número de Inscripción DICOSE */}
                            <div>
                                <label className="text-sm font-bold text-slate-700 block mb-2">
                                    Número de Inscripción DICOSE *
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej: 12345-A"
                                    value={newSheetData.dicose_number}
                                    onChange={(e) => setNewSheetData({...newSheetData, dicose_number: e.target.value})}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                                <p className="text-xs text-slate-500 mt-1">Obligatorio para cumplimiento DICOSE</p>
                            </div>

                            {/* Fecha Inicio */}
                            <div>
                                <label className="text-sm font-bold text-slate-700 block mb-2">Fecha Inicio del Período</label>
                                <input
                                    type="date"
                                    value={newSheetData.period_start}
                                    onChange={(e) => setNewSheetData({...newSheetData, period_start: e.target.value})}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>

                            {/* Fecha Fin */}
                            <div>
                                <label className="text-sm font-bold text-slate-700 block mb-2">Fecha Fin del Período</label>
                                <input
                                    type="date"
                                    value={newSheetData.period_end}
                                    onChange={(e) => setNewSheetData({...newSheetData, period_end: e.target.value})}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowCreateSheet(false)}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleCreateNewSheet}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                Crear Planilla
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header DICOSE */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-2xl text-blue-700">
                        <FileText size={28} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Contralor Interno DICOSE</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-slate-500 border-slate-200 uppercase font-bold">
                                DICOSE: {activeSheet?.dicose_number || 'N/A'}
                            </Badge>
                            <Badge className="bg-blue-50 text-blue-700 border-none">Período: {new Date(activeSheet?.period_start).getFullYear()}</Badge>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto flex-wrap">
                    <Button variant="outline" className="gap-2" onClick={loadSheets}>
                        <RefreshCcw size={16} /> Sincronizar
                    </Button>
                    <Button
                        onClick={handleExportPDF}
                        className="bg-red-600 hover:bg-red-700 text-white gap-2"
                    >
                        <Download size={16} /> Exportar PDF Oficial
                    </Button>
                    <Button
                        onClick={handleExportExcel}
                        className="bg-slate-900 hover:bg-slate-800 text-white gap-2"
                    >
                        <Download size={16} /> Exportar Excel
                    </Button>
                </div>
            </div>

            {/* Selector de Predio (permite navegar entre predios de la firma) */}
            <Card className="border-slate-200 bg-gradient-to-r from-slate-50 to-white shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold text-slate-800">Predio</CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                    {premisesLoading ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className="animate-spin text-slate-400 w-4 h-4" />
                            <span className="text-sm text-slate-500">Cargando predios...</span>
                        </div>
                    ) : premises.length > 0 ? (
                        <select
                            value={selectedPremiseId}
                            onChange={(e) => setSelectedPremiseId(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                            {premises.map(premise => (
                                <option key={premise.id} value={premise.id}>
                                    {premise.name} (DICOSE: {premise.dicose_number})
                                </option>
                            ))}
                        </select>
                    ) : (
                        <p className="text-sm text-slate-500 italic">No hay predios disponibles</p>
                    )}
                </CardContent>
            </Card>

            {/* Selector de Planillas Tipo A-E */}
            <Tabs defaultValue="A" onValueChange={(type) => {
                const sheet = sheets.find(s => s.sheet_type === type);
                if (sheet) handleSelectSheet(sheet);
            }} className="w-full">
                <TabsList className="bg-slate-100 p-1 rounded-xl mb-4">
                    {SHEET_TYPES.map((type) => (
                        <TabsTrigger 
                            key={type.id} 
                            value={type.id}
                            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm px-6"
                        >
                            {type.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {SHEET_TYPES.map((type) => (
                    <TabsContent key={type.id} value={type.id} className="space-y-4">
                        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-2">
                            <p className="text-sm font-semibold text-blue-800">{type.description}</p>
                        </div>

                        {/* FILTROS */}
                        <Card className="border-slate-200 bg-slate-50/50 shadow-none">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Filter size={16} className="text-slate-500" />
                                    <h4 className="text-sm font-bold text-slate-700">Filtros de Búsqueda</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-600">Guía</label>
                                        <input
                                            type="text"
                                            placeholder="Buscar guía..."
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={filters.guideSearch}
                                            onChange={(e) => setFilters({...filters, guideSearch: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-600">Desde</label>
                                        <input
                                            type="date"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={filters.dateFrom}
                                            onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-600">Hasta</label>
                                        <input
                                            type="date"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={filters.dateTo}
                                            onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-600">Operación</label>
                                        <select
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={filters.operationType}
                                            onChange={(e) => setFilters({...filters, operationType: e.target.value})}
                                        >
                                            <option value="">Todas</option>
                                            <option value="Compra">Compra</option>
                                            <option value="Venta">Venta</option>
                                            <option value="Nacimiento">Nacimiento</option>
                                            <option value="Mortandad">Mortandad</option>
                                            <option value="Consumo">Consumo</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-600">Categoría</label>
                                        <select
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={filters.categoryId}
                                            onChange={(e) => setFilters({...filters, categoryId: e.target.value})}
                                        >
                                            <option value="">Todas</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-end">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => setFilters({ guideSearch: '', dateFrom: '', dateTo: '', operationType: '', categoryId: '' })}
                                        >
                                            Limpiar
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* TABLA CON RENGLONES */}
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                {loadingEntries ? (
                                    <div className="flex items-center justify-center py-20">
                                        <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
                                    </div>
                                ) : (
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-3 font-bold text-slate-700">Fecha</th>
                                                <th className="px-4 py-3 font-bold text-slate-700">Operación</th>
                                                <th className="px-4 py-3 font-bold text-slate-700">Guía / Documento</th>
                                                <th className="px-4 py-3 font-bold text-slate-700 text-center">Inscripción</th>
                                                <th className="px-4 py-3 font-bold text-slate-700 text-center">Entradas</th>
                                                <th className="px-4 py-3 font-bold text-slate-700 text-center">Salidas</th>
                                                <th className="px-4 py-3 font-bold text-slate-700">Detalle Categoría</th>
                                                <th className="px-4 py-3 font-bold text-slate-700 text-center">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredEntries.map((entry) => (
                                                <tr key={entry.id} className={`${entry.is_voided ? 'bg-red-50 opacity-60 line-through' : 'hover:bg-slate-50/50'} transition-colors`}>
                                                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-600">
                                                        {new Date(entry.entry_date).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-slate-900">
                                                        {entry.operation_type}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-500 font-mono">
                                                        {entry.guide_full || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-bold text-blue-600">
                                                        {entry.registration_number_dicose || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {entry.lines.filter(l => l.direction === 'IN').reduce((sum, l) => sum + l.qty_heads, 0) || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {entry.lines.filter(l => l.direction === 'OUT').reduce((sum, l) => sum + l.qty_heads, 0) || '-'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-wrap gap-1">
                                                            {entry.lines.map((line, idx) => (
                                                                <Badge key={idx} variant="outline" className={`text-[10px] py-0 ${line.direction === 'IN' ? 'border-emerald-200 text-emerald-700' : 'border-red-200 text-red-700'}`}>
                                                                    {line.direction === 'IN' ? '+' : '-'}{line.qty_heads} {line.category?.name}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center space-x-1">
                                                        {!entry.is_voided ? (
                                                            <div className="flex gap-1 justify-center">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                                    onClick={() => handleOpenCorrectionModal(entry)}
                                                                    title="Corregir renglón"
                                                                >
                                                                    ✏️ Corregir
                                                                </Button>
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                                                            <XCircle size={14} className="mr-1" /> Anular
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>¿Anular este renglón?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Esta acción es irreversible según normativa DICOSE. Especifique el motivo:
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>

                                                                    <textarea
                                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm h-20 focus:outline-none focus:ring-2 focus:ring-red-500"
                                                                        placeholder="Motivo de anulación..."
                                                                        value={voidReason}
                                                                        onChange={(e) => setVoidReason(e.target.value)}
                                                                    />

                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            onClick={() => handleVoidEntry(entry.id)}
                                                                            className="bg-red-600 hover:bg-red-700"
                                                                        >
                                                                            Confirmar Anulación
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                                </AlertDialog>
                                                            </div>
                                                        ) : (
                                                            <Badge variant="destructive" className="text-[10px]">ANULADO</Badge>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredEntries.length === 0 && (
                                                <tr>
                                                    <td colSpan="8" className="px-6 py-12 text-center text-slate-400 italic">
                                                        No hay registros en esta planilla para los criterios seleccionados.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </Card>

                        {/* Resumen de Existencias (Saldos) */}
                        {!loadingEntries && resumenSaldos.length > 0 && (
                            <Card className="border-blue-100 bg-blue-50/20 shadow-none">
                                <CardHeader className="py-3 border-b border-blue-100 bg-blue-50/50">
                                    <CardTitle className="text-sm font-bold text-blue-900 flex items-center gap-2">
                                        <RefreshCcw size={14} /> Resumen de Existencias por Categoría
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4">
                                        {resumenSaldos.map((cat, idx) => (
                                            <div key={idx} className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                                                <p className="text-[10px] font-black text-slate-400 uppercase truncate mb-1">{cat.name}</p>
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <p className="text-xl font-black text-blue-700">{cat.in - cat.out}</p>
                                                        <p className="text-[9px] text-slate-500">Cabezas actuales</p>
                                                    </div>
                                                    <div className="text-right text-[10px] font-bold text-slate-400">
                                                        <p className="text-emerald-600">+{cat.in}</p>
                                                        <p className="text-red-500">-{cat.out}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                ))}
            </Tabs>

            {/* SECCIÓN: CERRAR PLANILLA */}
            {activeSheet && activeSheet.status === 'OPEN' && (
                <Card className="border-emerald-200 bg-emerald-50/30 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                            <Lock className="text-emerald-600 w-5 h-5 flex-shrink-0 mt-1" />
                            <div>
                                <p className="font-bold text-slate-900 text-sm">Cierre de Planilla DICOSE</p>
                                <p className="text-xs text-slate-600 mt-1">
                                    Una vez cerrada, esta planilla será inmutable. Los saldos finales se persistirán en la base de datos
                                    para cumplimiento normativo Decreto 289/74.
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={handleCloseSheet}
                            disabled={closingSheet}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 whitespace-nowrap"
                        >
                            {closingSheet ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" /> Cerrando...
                                </>
                            ) : (
                                <>
                                    <Lock size={16} /> Cerrar Planilla
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* SECCIÓN: PLANILLA CERRADA */}
            {activeSheet && activeSheet.status === 'CLOSED' && (
                <Card className="border-slate-400 bg-slate-100/50 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                        <Lock className="text-slate-600 w-5 h-5 flex-shrink-0" />
                        <div>
                            <p className="font-bold text-slate-900 text-sm">Planilla Cerrada ✓</p>
                            <p className="text-xs text-slate-600 mt-1">
                                Esta planilla ha sido cerrada y los saldos finales están persistidos.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 flex items-start gap-3">
                <AlertCircle className="text-slate-400 w-5 h-5 flex-shrink-0" />
                <p className="text-xs text-slate-500 leading-relaxed">
                    <strong>Nota Legal:</strong> La Planilla de Contralor Interno es obligatoria por Decreto 289/74. Los registros aquí mostrados son generados automáticamente a partir de eventos aprobados. Las anulaciones deben realizarse mediante renglón correctivo según instructivo de DICOSE.
                </p>
            </div>

            {/* Dialog para Corrección de Renglones DICOSE */}
            <Dialog open={correctionModalOpen} onOpenChange={setCorrectionModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Corregir Renglón DICOSE</DialogTitle>
                        <DialogDescription>
                            Se anulará el renglón original y se creará uno nuevo con los datos corregidos.
                            Ambos quedarán vinculados en el sistema de auditoría.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Motivo de la corrección */}
                        <div>
                            <label className="text-sm font-bold text-slate-700 block mb-2">
                                Motivo de la Corrección *
                            </label>
                            <textarea
                                placeholder="Ej: Error en cantidad de terneros, debe ser 8 en lugar de 10"
                                value={correctionReason}
                                onChange={(e) => setCorrectionReason(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm h-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Tipo de operación */}
                        <div>
                            <label className="text-sm font-bold text-slate-700 block mb-2">
                                Tipo de Operación
                            </label>
                            <input
                                type="text"
                                value={correctionData.operation_type}
                                onChange={(e) => setCorrectionData(prev => ({...prev, operation_type: e.target.value}))}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        {/* Cantidad de cabezas */}
                        <div>
                            <label className="text-sm font-bold text-slate-700 block mb-2">
                                Cantidad de Cabezas *
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={correctionData.qty_heads}
                                onChange={(e) => setCorrectionData(prev => ({...prev, qty_heads: parseInt(e.target.value) || 0}))}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setCorrectionModalOpen(false);
                                setCorrectingEntryId(null);
                                setCorrectionReason('');
                                setCorrectionData({qty_heads: '', operation_type: ''});
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCreateCorrection}
                            disabled={!correctionReason.trim() || !correctionData.qty_heads}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            ✅ Aplicar Corrección
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
