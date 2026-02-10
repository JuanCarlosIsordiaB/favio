import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { crearRegistro } from '../services/registros';
import { obtenerNombresCategorias } from '../services/inputCategories';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from './ui/table';
import {
  Plus,
  Search,
  FileText,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Package,
  AlertCircle,
  Download
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { generatePurchaseOrderPDF } from '../services/purchaseOrderExports';
import { createInvoiceFromPurchaseOrder } from '../services/invoiceFromPurchaseOrder';

export default function PurchaseOrders({ firmId, premiseId }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [premises, setPremises] = useState([]);
  const [categories, setCategories] = useState([]);

  // FormData simplificado según requerimientos: solo campos necesarios
  const [formData, setFormData] = useState({
    order_date: new Date().toISOString().split('T')[0],
    premise_id: premiseId || '',
    supplier_name: '',
    supplier_phone: '',
    supplier_email: '',
    status: 'pendiente',
    notes: '',
    items: []
  });

  const [generatedOrderNumber, setGeneratedOrderNumber] = useState(null);

  const [currentItem, setCurrentItem] = useState({
    item_description: '',
    category: '',
    quantity: '',
    unit: 'kg'
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (firmId) {
      fetchOrders();
      fetchPremises();
      fetchCategories();
    }
  }, [firmId, filterStatus]);

  useEffect(() => {
    if (premiseId) {
      setFormData(prev => ({ ...prev, premise_id: premiseId }));
    }
  }, [premiseId]);

  async function fetchPremises() {
    try {
      const { data, error } = await supabase
        .from('premises')
        .select('id, name')
        .eq('firm_id', firmId)
        .order('name');
      if (error) throw error;
      setPremises(data || []);
    } catch (error) {
      console.error('Error fetching premises:', error);
    }
  }

  async function fetchCategories() {
    try {
      const cats = await obtenerNombresCategorias(firmId);
      setCategories(cats || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback a categorías por defecto
      setCategories([
        'Fertilizantes',
        'Fitosanitarios',
        'Semillas',
        'Medicamentos veterinarios',
        'Combustibles',
        'Repuestos',
        'Otros'
      ]);
    }
  }

  async function fetchOrders() {
    try {
      setLoading(true);
      let query = supabase
        .from('purchase_orders')
        .select(`
          *,
          purchase_order_items (*)
        `)
        .eq('firm_id', firmId)
        .order('order_date', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      toast.error('Error al cargar órdenes de compra');
    } finally {
      setLoading(false);
    }
  }

  const validateItem = () => {
    if (!currentItem.item_description?.trim()) {
      toast.error('Ingresa descripción del ítem');
      return false;
    }
    if (!currentItem.category?.trim()) {
      toast.error('Selecciona una categoría');
      return false;
    }
    if (!currentItem.quantity || parseFloat(currentItem.quantity) <= 0) {
      toast.error('Cantidad debe ser mayor a 0');
      return false;
    }
    return true;
  };

  const addItemToOrder = () => {
    if (!validateItem()) return;

    const qty = parseFloat(currentItem.quantity);

    const newItem = {
      item_description: currentItem.item_description.trim(),
      category: currentItem.category.trim(),
      quantity: qty,
      unit: currentItem.unit
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    setCurrentItem({
      item_description: '',
      category: '',
      quantity: '',
      unit: 'kg'
    });

    toast.success('Ítem agregado');
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
    toast.success('Ítem removido');
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.supplier_name?.trim()) newErrors.supplier_name = 'Requerido';
    if (!formData.premise_id) newErrors.premise_id = 'Selecciona un predio';
    if (formData.items.length === 0) newErrors.items = 'Agrega al menos un ítem';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Completa los datos requeridos');
      return;
    }

    try {
      setLoading(true);

      let orderNumber = editingOrder?.order_number;

      // Generar número de orden automáticamente si es nueva
      if (!editingOrder) {
        const { data: result, error: fnError } = await supabase.rpc(
          'get_next_purchase_order_number',
          { p_firm_id: firmId }
        );
        if (fnError) throw fnError;
        orderNumber = result;
        setGeneratedOrderNumber(result);
      }

      // Remover 'items' del formData ya que se guardan por separado
      const { items, ...orderDataWithoutItems } = formData;

      const orderData = {
        ...orderDataWithoutItems,
        order_number: orderNumber,
        firm_id: firmId
      };

      // Remover propiedades relacionales que no pertenecen a la tabla purchase_orders
      delete orderData.purchase_order_items;

      let orderId;

      if (editingOrder) {
        // Validar que la orden siga en pendiente (solo pendiente puede editarse)
        const { data: freshOrder, error: freshError } = await supabase
          .from('purchase_orders')
          .select('status')
          .eq('id', editingOrder.id)
          .single();

        if (freshError) throw freshError;

        if (freshOrder.status !== 'pendiente') {
          toast.error(
            `Esta orden ha sido modificada. Estado actual: ${freshOrder.status}. ` +
            `Solo las órdenes en estado PENDIENTE pueden editarse.`
          );
          setLoading(false);
          return;
        }

        // Proceder con actualización
        const { error } = await supabase
          .from('purchase_orders')
          .update(orderData)
          .eq('id', editingOrder.id);
        if (error) throw error;
        orderId = editingOrder.id;

        await supabase
          .from('purchase_order_items')
          .delete()
          .eq('purchase_order_id', orderId);
      } else {
        const { data, error } = await supabase
          .from('purchase_orders')
          .insert([orderData])
          .select()
          .single();
        if (error) throw error;
        orderId = data.id;
      }

      // Preparar items para guardar con category
      const itemsData = formData.items.map(item => ({
        purchase_order_id: orderId,
        item_description: item.item_description,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        // Campos opcionales para compatibilidad con BD existente
        unit_price: 0,
        subtotal: 0,
        tax_amount: 0,
        total: 0
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(itemsData);
      if (itemsError) throw itemsError;

      toast.success(editingOrder ? 'Orden actualizada' : 'Orden creada');

      // Preparar metadata para auditoría
      const metadata = {
        order_number: orderNumber,
        order_date: formData.order_date,
        premise_id: formData.premise_id,
        supplier_name: formData.supplier_name,
        supplier_phone: formData.supplier_phone || null,
        supplier_email: formData.supplier_email || null,
        status: formData.status,
        notes: formData.notes || null,
        items_count: formData.items.length,
        items: formData.items.map(item => ({
          description: item.item_description,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit
        }))
      };

      await crearRegistro({
        firmId: firmId,
        premiseId: formData.premise_id || null,
        lotId: null,
        tipo: 'orden_compra',
        descripcion: `${editingOrder ? 'Actualización' : 'Creación'} de orden: ${orderNumber}`,
        moduloOrigen: 'purchase_orders',
        usuario: user?.full_name || 'sistema',
        referencia: orderId,
        metadata: metadata
      }).catch(err => console.warn('Error en auditoría:', err));

      setShowModal(false);
      resetForm();
      fetchOrders();
    } catch (error) {
      console.error('Error saving purchase order:', error);
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (order) => {
    // Validar que la orden esté en pendiente (única editable)
    if (order.status !== 'pendiente') {
      toast.error(
        `No se pueden editar órdenes en estado "${order.status}". ` +
        `Solo las órdenes en estado PENDIENTE pueden ser modificadas.`
      );
      return;
    }

    // Remover propiedades relacionales que no pertenecen a formData
    const { purchase_order_items, ...orderWithoutRelations } = order;

    setEditingOrder(order);
    
    // Mapear items para incluir category
    const mappedItems = (order.purchase_order_items || []).map(item => ({
      item_description: item.item_description,
      category: item.category || '',
      quantity: item.quantity,
      unit: item.unit
    }));
    
    setFormData({
      order_date: order.order_date,
      premise_id: order.premise_id || '',
      supplier_name: order.supplier_name,
      supplier_phone: order.supplier_phone || '',
      supplier_email: order.supplier_email || '',
      status: order.status,
      notes: order.notes || '',
      items: mappedItems
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);

      // 1. Obtener datos de la orden para validación
      const { data: order, error: fetchError } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // 2. Validar que PO esté en pendiente (solo pendiente puede eliminarse)
      if (order.status !== 'pendiente') {
        toast.error(`No se puede eliminar. La orden está en estado "${order.status}". Solo órdenes en estado PENDIENTE pueden eliminarse.`);
        setLoading(false);
        return;
      }

      // 3. Contar expenses que serán eliminadas en cascade
      // Las facturas ya no pueden estar en DRAFT, pero mantenemos el filtro por compatibilidad
      const { count: expenseCount, error: countError } = await supabase
        .from('expenses')
        .select('id', { count: 'exact', head: true })
        .eq('purchase_order_id', id)
        .eq('is_auto_generated', true)
        .in('status', ['DRAFT', 'APPROVED']); // Incluir ambos por compatibilidad

      if (countError) throw countError;

      // 4. Confirmar eliminación con información de consequences
      const confirmMsg = expenseCount && expenseCount > 0
        ? `Esta orden tiene ${expenseCount} gasto(s) programado(s) en DRAFT que serán eliminados. ¿Continuar?`
        : '¿Eliminar esta orden de compra?';

      if (!window.confirm(confirmMsg)) {
        setLoading(false);
        return;
      }

      // 5. Eliminar orden (el trigger cascade_delete_po_expenses() eliminará expenses automáticamente)
      const { error } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // 6. Feedback
      toast.success(
        expenseCount && expenseCount > 0
          ? `Orden eliminada junto con ${expenseCount} gasto(s) programado(s)`
          : 'Orden eliminada'
      );

      // 7. Registrar auditoría
      try {
        await crearRegistro({
          firmId: firmId,
          premiseId: null,
          lotId: null,
          tipo: 'purchase_order_deleted',
          descripcion: `Orden de compra eliminada: ${order.order_number} (${expenseCount || 0} expenses en cascade)`,
          moduloOrigen: 'purchase_orders',
          usuario: user?.email || 'sistema',
          metadata: {
            purchase_order_id: id,
            order_number: order.order_number,
            status: order.status,
            expenses_deleted: expenseCount || 0
          }
        });
      } catch (auditError) {
        console.warn('Advertencia: Error en auditoría de eliminación', auditError);
      }

      fetchOrders();
    } catch (error) {
      console.error('Error deleting:', error);

      // Detectar si es error de bloqueo por trigger
      if (error.message && error.message.includes('No se puede eliminar')) {
        toast.error(error.message);
      } else {
        toast.error('Error al eliminar: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      setLoading(true);

      // ===== PHASE 1: FETCH ORDER DATA =====
      // 1. Obtener datos de la orden
      const { data: order, error: fetchError } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const oldStatus = order.status;

      // ===== PHASE 2: VALIDATE STATE TRANSITION =====
      // 2. Validar que la transición de estado sea permitida
      const validTransitions = {
        pendiente: ['aprobada', 'rechazada'],
        aprobada: ['rechazada'],
        rechazada: []
      };

      if (!validTransitions[oldStatus]?.includes(newStatus)) {
        toast.error(
          `Transición inválida: ${oldStatus} → ${newStatus}. ` +
          `Estados permitidos desde ${oldStatus}: ${validTransitions[oldStatus]?.join(', ') || 'ninguno'}`
        );
        setLoading(false);
        return;
      }

      // ===== PHASE 3: CONFIRMATION DIALOG =====
      // 3. Confirmación preventiva para acciones críticas
      let confirmMsg = null;
      if (newStatus === 'aprobada' && oldStatus === 'pendiente') {
        confirmMsg =
          'Al aprobar esta orden:\n\n' +
          '✓ La orden quedará aprobada y lista para procesar\n\n' +
          '¿Continuar?';
      } else if (newStatus === 'rechazada') {
        confirmMsg =
          'Al rechazar esta orden:\n\n' +
          '✓ La orden será marcada como rechazada\n\n' +
          '¿Continuar?';
      }

      if (confirmMsg && !window.confirm(confirmMsg)) {
        setLoading(false);
        return;
      }

      // ===== PHASE 4: EXPENSE GENERATION (FIX #2) =====
      // 4. Si transitioning to 'aprobada', generar expenses si no existen
      if (newStatus === 'aprobada' && oldStatus === 'pendiente') {
        try {
          // Verificar si ya existen expenses auto-generadas
          const { data: existingExpenses, error: checkError } = await supabase
            .from('expenses')
            .select('id')
            .eq('purchase_order_id', id)
            .eq('is_auto_generated', true);

          if (checkError) throw checkError;

          // Si no hay expenses Y hay payment_terms, generar ahora
          if (
            (!existingExpenses || existingExpenses.length === 0) &&
            order.payment_terms &&
            order.payment_terms !== 'contado' &&
            order.payment_terms !== ''
          ) {
            console.log('🔄 Generando expenses para PO:', order.order_number);

            // Generate expenses using existing service
            const generatedExpenses = await generateExpensesFromPurchaseOrder(
              order,
              firmId,
              user?.id
            );

            console.log(
              `✅ ${generatedExpenses.length} expenses generadas:`,
              generatedExpenses.map(e => ({
                amount: e.amount,
                due_date: e.due_date,
                installment: e.installment_number
              }))
            );

            // Log expense generation
            await crearRegistro({
              firmId: firmId,
              premiseId: null,
              lotId: null,
              tipo: 'purchase_order_expenses_generated',
              descripcion:
                `${generatedExpenses.length} gastos programados generados para OC: ${order.order_number}`,
              moduloOrigen: 'purchase_orders',
              usuario: user?.email || 'sistema',
              metadata: {
                purchase_order_id: id,
                order_number: order.order_number,
                expenses_generated: generatedExpenses.length,
                payment_terms: order.payment_terms
              }
            }).catch(err => console.warn('Advertencia en auditoría de generación:', err));

          } else if (existingExpenses && existingExpenses.length > 0) {
            console.log(
              `ℹ️ PO ${order.order_number} ya tiene ${existingExpenses.length} expenses.`
            );
          }
        } catch (expenseError) {
          // Log pero no bloquea la aprobación
          console.error('❌ Error generando expenses:', expenseError);
          toast.warning(
            'Orden será aprobada, pero hubo error generando cronograma de pagos. ' +
            'Contacte al administrador.'
          );
          // Continue with status update
        }
      }

      // ===== PHASE 5: STATUS UPDATE =====
      // 5. Actualizar estado de PO (el trigger sync_purchase_order_expenses_status() sincronizará expenses automáticamente)
      const { data: updatedPO, error: updateError } = await supabase
        .from('purchase_orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // ===== PHASE 6: COUNT SYNCHRONIZED EXPENSES =====
      // 6. Contar expenses que fueron sincronizadas (el trigger ya las actualizó)
      const { count: expenseCount, error: countError } = await supabase
        .from('expenses')
        .select('id', { count: 'exact', head: true })
        .eq('purchase_order_id', id)
        .eq('is_auto_generated', true);

      if (countError) console.warn('Advertencia al contar expenses:', countError);

      // ===== PHASE 7: FEEDBACK =====
      // 7. Feedback informativo
      const statusLabels = {
        pendiente: 'pendiente',
        aprobada: 'aprobada',
        rechazada: 'rechazada'
      };

      let successMsg = `Orden ${statusLabels[newStatus] || newStatus}`;
      toast.success(successMsg);

      // ===== PHASE 8: AUDIT LOGGING =====
      // 8. Registrar auditoría
      try {
        await crearRegistro({
          firmId: firmId,
          premiseId: null,
          lotId: null,
          tipo: 'purchase_order_status_changed',
          descripcion:
            `OC ${order.order_number}: ${oldStatus} → ${newStatus}` +
            (expenseCount > 0 ? ` (${expenseCount} gastos afectados)` : ''),
          moduloOrigen: 'purchase_orders',
          usuario: user?.email || 'sistema',
          metadata: {
            purchase_order_id: id,
            order_number: order.order_number,
            old_status: oldStatus,
            new_status: newStatus,
            expenses_synced: expenseCount || 0
          }
        });
      } catch (auditError) {
        console.warn('Advertencia: Error en auditoría de cambio de estado', auditError);
      }

      fetchOrders();
    } catch (error) {
      console.error('Error updating status:', error);

      // Detectar si es error de bloqueo por trigger
      if (error.message && error.message.includes('No se puede')) {
        toast.error(error.message);
      } else if (error.message && error.message.includes('Transición inválida')) {
        toast.error(error.message);
      } else {
        toast.error('Error al actualizar estado: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      order_date: new Date().toISOString().split('T')[0],
      premise_id: premiseId || '',
      supplier_name: '',
      supplier_phone: '',
      supplier_email: '',
      status: 'pendiente',
      notes: '',
      items: []
    });
    setEditingOrder(null);
    setGeneratedOrderNumber(null);
    setCurrentItem({
      item_description: '',
      category: '',
      quantity: '',
      unit: 'kg'
    });
    setErrors({});
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pendiente: { label: 'Pendiente', color: 'bg-slate-100 text-slate-700', icon: FileText },
      aprobada: { label: 'Aprobada', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
      rechazada: { label: 'Rechazada', color: 'bg-red-100 text-red-700', icon: XCircle }
    };
    const config = statusConfig[status] || statusConfig.pendiente;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon size={12} />
        {config.label}
      </span>
    );
  };

  /**
   * Generar PDF y descargarlo
   */
  const handleGeneratePDF = async (order) => {
    try {
      setLoading(true);
      toast.loading('Generando PDF...', { id: 'pdf-generate' });

      // Obtener datos completos de la orden con items
      const { data: fullOrder, error: orderError } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          purchase_order_items (*)
        `)
        .eq('id', order.id)
        .single();

      if (orderError) throw orderError;

      // Obtener datos de la firma
      const { data: firm, error: firmError } = await supabase
        .from('firms')
        .select('name, location, rut')
        .eq('id', firmId)
        .single();

      if (firmError) {
        console.warn('No se pudo cargar datos de la firma:', firmError);
      }

      // Generar PDF
      const pdfBlob = generatePurchaseOrderPDF(fullOrder, firm || {});

      // Crear URL del blob y descargar
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Orden_Compra_${order.order_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('PDF generado y descargado', { id: 'pdf-generate' });

      // Registrar en auditoría
      await crearRegistro({
        firmId: firmId,
        premiseId: null,
        lotId: null,
        tipo: 'purchase_order_pdf_generated',
        descripcion: `PDF de orden ${order.order_number} generado y descargado`,
        moduloOrigen: 'purchase_orders',
        usuario: user?.full_name || 'sistema',
        metadata: {
          purchase_order_id: order.id,
          order_number: order.order_number
        }
      }).catch(err => console.warn('Error en auditoría:', err));
    } catch (error) {
      console.error('Error generando PDF:', error);
      toast.error(`Error: ${error.message || 'No se pudo generar el PDF'}`, { id: 'pdf-generate' });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Crear factura automáticamente desde una OC aprobada
   */
  const handleCreateInvoice = async (order) => {
    try {
      setLoading(true);
      toast.loading('Creando factura desde orden de compra...', { id: 'create-invoice' });

      const { data, items, error } = await createInvoiceFromPurchaseOrder(
        order.id,
        {
          invoice_date: new Date().toISOString().split('T')[0],
          payment_condition: 'credito' // Por defecto crédito
        },
        user?.id
      );

      if (error) throw error;

      toast.success(
        `Factura creada exitosamente. ${items.length} item(s) pre-cargados.`,
        { id: 'create-invoice' }
      );

      // Registrar auditoría
      await crearRegistro({
        firmId: firmId,
        premiseId: order.premise_id || null,
        lotId: null,
        tipo: 'factura_creada_desde_oc',
        descripcion: `Factura creada desde OC: ${order.order_number}`,
        moduloOrigen: 'purchase_orders',
        usuario: user?.full_name || 'sistema',
        referencia: data.id,
        metadata: {
          purchase_order_id: order.id,
          purchase_order_number: order.order_number,
          invoice_id: data.id,
          items_count: items.length
        }
      }).catch(err => console.warn('Error en auditoría:', err));

      // Opcional: redirigir a la factura o mostrar mensaje
      // Podrías navegar a la vista de facturas aquí
    } catch (error) {
      console.error('Error creando factura desde OC:', error);
      toast.error(
        error.message || 'Error al crear factura desde orden de compra',
        { id: 'create-invoice' }
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Retorna botones de acción dinámicos según el estado actual
   */
  const getActionButtons = (order) => {
    const actions = [];

    // Botón de transición de estado (inteligente según estado actual)
    if (order.status === 'pendiente') {
      actions.push({
        type: 'approve',
        label: 'Aprobar',
        color: 'bg-blue-600 hover:bg-blue-700',
        icon: CheckCircle,
        onClick: () => updateStatus(order.id, 'aprobada')
      });
      actions.push({
        type: 'reject',
        label: 'Rechazar',
        color: 'bg-red-600 hover:bg-red-700',
        icon: XCircle,
        onClick: () => updateStatus(order.id, 'rechazada')
      });
    }

    // Botón Crear Factura (solo disponible si está aprobada)
    if (order.status === 'aprobada') {
      actions.push({
        type: 'create-invoice',
        label: 'Crear Factura',
        color: 'bg-green-600 hover:bg-green-700',
        icon: FileText,
        onClick: () => handleCreateInvoice(order)
      });
    }

    // Botón Generar PDF (disponible si no está rechazada)
    if (order.status !== 'rechazada') {
      actions.push({
        type: 'generate-pdf',
        label: 'Generar PDF',
        color: 'bg-indigo-600 hover:bg-indigo-700',
        icon: Download,
        onClick: () => handleGeneratePDF(order)
      });
    }

    // Botón Editar (solo disponible en pendiente)
    if (order.status === 'pendiente') {
      actions.push({
        type: 'edit',
        label: '',
        color: 'bg-slate-100 hover:bg-slate-200 text-slate-600',
        icon: Edit2,
        onClick: () => handleEdit(order)
      });
    }

    // Botón Eliminar (solo disponible en pendiente)
    if (order.status === 'pendiente') {
      actions.push({
        type: 'delete',
        label: '',
        color: 'bg-red-50 hover:bg-red-100 text-red-600',
        icon: Trash2,
        onClick: () => handleDelete(order.id)
      });
    }

    return actions;
  };

  const filteredOrders = orders.filter(order =>
    order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Órdenes de Compra</h1>
            <p className="text-sm text-slate-600 mt-1">Gestión de órdenes</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm w-full sm:w-auto"
          >
            <Plus size={18} />
            Nueva Orden
          </button>
        </div>

        {/* Filtros */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-100 space-y-3 sm:space-y-0 sm:flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar orden o proveedor..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm min-w-[140px]"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="aprobada">Aprobada</option>
            <option value="rechazada">Rechazada</option>
          </select>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4 sm:p-6">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-8 sm:p-12 text-center">
            <Package size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600 font-medium">No hay órdenes registradas</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-left">Nº Orden</TableHead>
                  <TableHead className="text-left">Proveedor</TableHead>
                  <TableHead className="text-left">Fecha</TableHead>
                  <TableHead className="text-right">Ítems</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-center">Ítems</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map(order => (
                  <TableRow key={order.id} className="hover:bg-slate-50">
                    <TableCell className="font-semibold text-slate-900">{order.order_number}</TableCell>
                    <TableCell className="text-slate-600">{order.supplier_name}</TableCell>
                    <TableCell className="text-slate-600">{new Date(order.order_date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right font-semibold text-slate-600">{order.purchase_order_items?.length || 0} ítem(s)</TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(order.status)}
                    </TableCell>
                    <TableCell className="text-center text-sm text-slate-600">
                      {order.purchase_order_items?.length || 0}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-1.5 justify-center flex-wrap">
                        {getActionButtons(order).map(action => {
                          const Icon = action.icon;
                          return action.label ? (
                            // Botón con texto (acciones de transición de estado)
                            <button
                              key={action.type}
                              onClick={action.onClick}
                              className={`text-xs px-2.5 py-1.5 rounded font-medium text-white transition-colors flex items-center gap-1 ${action.color}`}
                              title={action.label}
                            >
                              <Icon size={14} />
                              {action.label}
                            </button>
                          ) : (
                            // Solo icono (editar, eliminar)
                            <button
                              key={action.type}
                              onClick={action.onClick}
                              className={`p-1.5 rounded transition-colors ${action.color}`}
                              title={action.type === 'edit' ? 'Editar' : 'Eliminar'}
                            >
                              <Icon size={16} />
                            </button>
                          );
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Modal - Completamente rediseñado */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-screen flex items-start justify-center p-4 pt-6 sm:pt-12">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-6">
              {/* Header del Modal */}
              <div className="sticky top-0 bg-white border-b border-slate-200 p-4 sm:p-6 flex items-center justify-between rounded-t-xl">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {editingOrder ? 'Editar Orden' : 'Nueva Orden de Compra'}
                  </h2>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <XCircle size={24} className="text-slate-600" />
                </button>
              </div>

              {/* Formulario */}
              <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                {/* SECCIÓN 1: Info Básica */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <div className="w-1 h-5 bg-blue-600 rounded"></div>
                    Información Básica
                  </h3>
                  <div className={`grid gap-4 ${editingOrder ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
                    {editingOrder && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nº Orden</label>
                        <div className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-sm font-semibold text-blue-600 flex items-center">
                          {editingOrder.order_number}
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Fecha *</label>
                      <input
                        type="date"
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        value={formData.order_date}
                        onChange={e => setFormData({...formData, order_date: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Predio / Firma *</label>
                      <select
                        required
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm ${
                          errors.premise_id ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-300'
                        }`}
                        value={formData.premise_id}
                        onChange={e => setFormData({...formData, premise_id: e.target.value})}
                      >
                        <option value="">Selecciona un predio...</option>
                        {premises.map(premise => (
                          <option key={premise.id} value={premise.id}>{premise.name}</option>
                        ))}
                      </select>
                      {errors.premise_id && (
                        <p className="text-red-600 text-xs mt-1">{errors.premise_id}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                      <select
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
                        value={formData.status}
                        onChange={e => setFormData({...formData, status: e.target.value})}
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="aprobada">Aprobada</option>
                        <option value="rechazada">Rechazada</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* SECCIÓN 2: Proveedor */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <div className="w-1 h-5 bg-blue-600 rounded"></div>
                    Proveedor
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Proveedor *</label>
                      <input
                        type="text"
                        required
                        className={`w-full px-3 py-2 border rounded-lg outline-none text-sm transition-colors ${
                          errors.supplier_name ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-300 focus:ring-2 focus:ring-blue-500'
                        }`}
                        value={formData.supplier_name}
                        onChange={e => setFormData({...formData, supplier_name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        value={formData.supplier_phone}
                        onChange={e => setFormData({...formData, supplier_phone: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        value={formData.supplier_email}
                        onChange={e => setFormData({...formData, supplier_email: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* SECCIÓN 3: Items */}
                <div className="border-2 border-blue-100 bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Package size={18} className="text-blue-600" />
                    Ítems ({formData.items.length})
                  </h3>

                  {/* Agregar Ítem */}
                  <div className="bg-white p-4 rounded-lg border border-blue-200 mb-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">Producto / Ítem *</label>
                        <input
                          type="text"
                          className="w-full px-2 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          value={currentItem.item_description}
                          onChange={e => setCurrentItem({...currentItem, item_description: e.target.value})}
                          placeholder="Ej: Semilla de soja"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Categoría *</label>
                        <select
                          className="w-full px-2 py-2 border border-slate-300 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                          value={currentItem.category}
                          onChange={e => setCurrentItem({...currentItem, category: e.target.value})}
                        >
                          <option value="">Seleccionar...</option>
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Cantidad *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          className="w-full px-2 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          value={currentItem.quantity}
                          onChange={e => setCurrentItem({...currentItem, quantity: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Unidad de Medida *</label>
                        <select
                          className="w-full px-2 py-2 border border-slate-300 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                          value={currentItem.unit}
                          onChange={e => setCurrentItem({...currentItem, unit: e.target.value})}
                        >
                          <option value="kg">kg</option>
                          <option value="litros">L</option>
                          <option value="unid">Unid</option>
                          <option value="bolsas">Bolsas</option>
                          <option value="ton">Ton</option>
                          <option value="m2">m²</option>
                          <option value="ha">ha</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={addItemToOrder}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm transition-colors"
                    >
                      <Plus size={16} />
                      Agregar Ítem
                    </button>
                  </div>

                  {/* Lista de Items */}
                  {formData.items.length > 0 && (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {formData.items.map((item, idx) => (
                        <div key={idx} className="bg-white p-3 rounded border border-slate-200 text-sm">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-slate-900">{item.item_description}</p>
                              <div className="flex gap-3 mt-1 text-xs text-slate-600">
                                <span><strong>Categoría:</strong> {item.category}</span>
                                <span><strong>Cantidad:</strong> {item.quantity} {item.unit}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors ml-2"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {errors.items && (
                    <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                      <AlertCircle size={16} />
                      {errors.items}
                    </div>
                  )}
                </div>

                {/* SECCIÓN 4: Comentarios */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <div className="w-1 h-5 bg-blue-600 rounded"></div>
                    Comentarios / Observaciones (Opcional)
                  </h3>
                  <div>
                    <textarea
                      rows="3"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      value={formData.notes}
                      onChange={e => setFormData({...formData, notes: e.target.value})}
                      placeholder="Observaciones adicionales sobre la orden..."
                    />
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="sticky bottom-0 bg-white border-t border-slate-200 pt-4 flex flex-col sm:flex-row gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors font-medium text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
                  >
                    {loading ? 'Guardando...' : editingOrder ? 'Actualizar Orden' : 'Guardar Orden'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
