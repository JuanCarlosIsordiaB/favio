import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { crearRegistro } from '../services/registros';
import { parsePaymentTerms, generateExpensesFromPurchaseOrder } from '../services/paymentScheduler';
import PaymentSchedulePreview from './modales/PaymentSchedulePreview';
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
  Eye,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Package,
  ChevronDown,
  AlertCircle,
  Download
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { generatePurchaseOrderPDF } from '../services/purchaseOrderExports';

export default function PurchaseOrders({ firmId }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [formData, setFormData] = useState({
    order_date: new Date().toISOString().split('T')[0],
    supplier_name: '',
    supplier_rut: '',
    supplier_phone: '',
    supplier_email: '',
    supplier_address: '',
    status: 'draft',
    currency: 'UYU',
    exchange_rate: '',
    delivery_date: '',
    delivery_address: '',
    payment_terms: '',
    notes: '',
    items: []
  });

  const [generatedOrderNumber, setGeneratedOrderNumber] = useState(null);
  const [schedulePreview, setSchedulePreview] = useState([]);

  const [currentItem, setCurrentItem] = useState({
    item_description: '',
    quantity: '',
    unit: 'kg',
    unit_price: '',
    tax_rate: 22
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (firmId) {
      fetchOrders();
    }
  }, [firmId, filterStatus]);

  // Calcular preview de cronograma de pagos cuando cambia payment_terms o items
  useEffect(() => {
    if (formData.payment_terms && formData.payment_terms !== '') {
      const { subtotal, taxAmount, total, subtotalUYU, taxAmountUYU, totalUYU } = calculateTotals();
      const preview = parsePaymentTerms(
        formData.payment_terms,
        total,
        formData.order_date
      );
      setSchedulePreview(preview);
    } else {
      setSchedulePreview([]);
    }
  }, [formData.payment_terms, formData.items, formData.order_date]);

  // Recalcular conversión de items cuando cambia el tipo de cambio o la moneda
  useEffect(() => {
    if (formData.items.length > 0 && formData.currency === 'USD' && formData.exchange_rate) {
      const exchangeRate = parseFloat(formData.exchange_rate);
      if (exchangeRate > 0) {
        const updatedItems = formData.items.map(item => {
          const subtotal = parseFloat(item.subtotal || 0);
          const taxAmount = parseFloat(item.tax_amount || 0);
          const total = parseFloat(item.total || 0);
          
          return {
            ...item,
            subtotal_uyu: (subtotal * exchangeRate).toFixed(2),
            tax_amount_uyu: (taxAmount * exchangeRate).toFixed(2),
            total_uyu: (total * exchangeRate).toFixed(2)
          };
        });
        
        // Solo actualizar si hay cambios para evitar loops infinitos
        const hasChanges = updatedItems.some((item, idx) => 
          item.subtotal_uyu !== formData.items[idx]?.subtotal_uyu ||
          item.tax_amount_uyu !== formData.items[idx]?.tax_amount_uyu ||
          item.total_uyu !== formData.items[idx]?.total_uyu
        );
        
        if (hasChanges) {
          setFormData(prev => ({ ...prev, items: updatedItems }));
        }
      }
    }
  }, [formData.exchange_rate, formData.currency]);

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
    if (!currentItem.quantity || parseFloat(currentItem.quantity) <= 0) {
      toast.error('Cantidad debe ser mayor a 0');
      return false;
    }
    if (!currentItem.unit_price || parseFloat(currentItem.unit_price) < 0) {
      toast.error('Precio unitario no válido');
      return false;
    }
    return true;
  };

  const addItemToOrder = () => {
    if (!validateItem()) return;

    // Validar tipo de cambio si la moneda es USD
    if (formData.currency === 'USD' && (!formData.exchange_rate || parseFloat(formData.exchange_rate) <= 0)) {
      toast.error('Ingresa el tipo de cambio del dólar');
      return;
    }

    const qty = parseFloat(currentItem.quantity);
    const price = parseFloat(currentItem.unit_price);
    const taxRate = parseFloat(currentItem.tax_rate) || 0;
    const exchangeRate = parseFloat(formData.exchange_rate) || 1;

    const subtotal = qty * price;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    // Calcular equivalente en pesos si la moneda es USD
    let subtotalUYU = subtotal;
    let taxAmountUYU = taxAmount;
    let totalUYU = total;
    
    if (formData.currency === 'USD' && exchangeRate > 0) {
      subtotalUYU = subtotal * exchangeRate;
      taxAmountUYU = taxAmount * exchangeRate;
      totalUYU = total * exchangeRate;
    }

    const newItem = {
      ...currentItem,
      quantity: qty,
      unit_price: price,
      subtotal: subtotal.toFixed(2),
      tax_amount: taxAmount.toFixed(2),
      total: total.toFixed(2),
      // Guardar también los valores en pesos para referencia
      subtotal_uyu: subtotalUYU.toFixed(2),
      tax_amount_uyu: taxAmountUYU.toFixed(2),
      total_uyu: totalUYU.toFixed(2)
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    setCurrentItem({
      item_description: '',
      quantity: '',
      unit: 'kg',
      unit_price: '',
      tax_rate: 22
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

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0);
    const taxAmount = formData.items.reduce((sum, item) => sum + parseFloat(item.tax_amount || 0), 0);
    const total = formData.items.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);
    
    // Calcular equivalentes en pesos si la moneda es USD
    let subtotalUYU = subtotal;
    let taxAmountUYU = taxAmount;
    let totalUYU = total;
    
    if (formData.currency === 'USD' && formData.exchange_rate) {
      const exchangeRate = parseFloat(formData.exchange_rate) || 1;
      subtotalUYU = subtotal * exchangeRate;
      taxAmountUYU = taxAmount * exchangeRate;
      totalUYU = total * exchangeRate;
    }
    
    return { subtotal, taxAmount, total, subtotalUYU, taxAmountUYU, totalUYU };
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.supplier_name?.trim()) newErrors.supplier_name = 'Requerido';
    if (!formData.delivery_date?.trim()) newErrors.delivery_date = 'Requerido';
    if (formData.items.length === 0) newErrors.items = 'Agrega al menos un ítem';
    if (formData.currency === 'USD' && (!formData.exchange_rate || parseFloat(formData.exchange_rate) <= 0)) {
      newErrors.exchange_rate = 'Tipo de cambio requerido para dólares';
    }

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
      const { subtotal, taxAmount, total, subtotalUYU, taxAmountUYU, totalUYU } = calculateTotals();

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

      // Remover 'items' y 'exchange_rate' del formData ya que se guardan por separado o no existen en BD
      const { items, exchange_rate, ...orderDataWithoutItems } = formData;

      const orderData = {
        ...orderDataWithoutItems,
        order_number: orderNumber,
        firm_id: firmId,
        subtotal,
        tax_amount: taxAmount,
        total_amount: total
      };

      // Remover propiedades relacionales que no pertenecen a la tabla purchase_orders
      delete orderData.purchase_order_items;

      let orderId;

      if (editingOrder) {
        // ===== FIX #1 PARTE 2: RE-VALIDAR ESTADO ANTES DE GUARDAR =====
        // Verificar estado actual desde BD (race condition protection)
        // Caso: Usuario abre modal para editar, alguien más aprueba la orden
        const { data: freshOrder, error: freshError } = await supabase
          .from('purchase_orders')
          .select('status')
          .eq('id', editingOrder.id)
          .single();

        if (freshError) throw freshError;

        // Validar que la orden siga en DRAFT
        if (freshOrder.status !== 'draft') {
          toast.error(
            `Esta orden ha sido modificada. Estado actual: ${freshOrder.status}. ` +
            `No se puede editar.`
          );
          setLoading(false);
          return;
        }

        // ===== SAFE: Proceder con actualización =====
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

      // Preparar items para guardar, excluyendo campos que no existen en la BD
      const itemsData = formData.items.map(item => {
        const itemData = {
        purchase_order_id: orderId,
          item_description: item.item_description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          subtotal: item.subtotal,
          tax_amount: item.tax_amount,
          total: item.total
        };
        
        // Los campos subtotal_uyu, tax_amount_uyu, total_uyu y exchange_rate
        // no existen en la BD, así que no los incluimos
        // Se pueden calcular después usando el tipo de cambio si es necesario
        
        return itemData;
      });

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(itemsData);
      if (itemsError) throw itemsError;

      // Generar expenses programadas si es una nueva orden y tiene condiciones de pago especiales
      if (!editingOrder && formData.payment_terms && formData.payment_terms !== 'contado' && formData.payment_terms !== '') {
        try {
          const purchaseOrderWithData = {
            id: orderId,
            order_number: orderNumber,
            supplier_name: formData.supplier_name,
            supplier_rut: formData.supplier_rut,
            supplier_phone: formData.supplier_phone,
            supplier_email: formData.supplier_email,
            order_date: formData.order_date,
            total_amount: total,
            payment_terms: formData.payment_terms,
            currency: formData.currency
          };

          await generateExpensesFromPurchaseOrder(
            purchaseOrderWithData,
            firmId,
            user?.id
          );

          toast.success(`Orden creada con ${schedulePreview.length} pagos programados`);
        } catch (scheduleError) {
          console.error('❌ Error generando cronograma de pagos:', {
            message: scheduleError?.message,
            details: scheduleError?.details,
            hint: scheduleError?.hint,
            code: scheduleError?.code,
            status: scheduleError?.status,
            fullError: scheduleError
          });
          toast.error(`Error en pagos programados: ${scheduleError?.message || 'Ver consola para más detalles'}`);
        }
      } else {
        toast.success(editingOrder ? 'Orden actualizada' : 'Orden creada');
      }

      // Preparar metadata completo con todos los detalles de la orden
      // Reutilizar las variables subtotal, taxAmount, total ya calculadas arriba
      const metadata = {
        order_number: orderNumber,
        order_date: formData.order_date,
        supplier_name: formData.supplier_name,
        supplier_rut: formData.supplier_rut || null,
        supplier_email: formData.supplier_email || null,
        supplier_phone: formData.supplier_phone || null,
        supplier_address: formData.supplier_address || null,
        status: formData.status,
        currency: formData.currency,
        exchange_rate: formData.exchange_rate || null,
        delivery_date: formData.delivery_date || null,
        delivery_address: formData.delivery_address || null,
        payment_terms: formData.payment_terms || null,
        notes: formData.notes || null,
        items_count: formData.items.length,
        items: formData.items.map(item => ({
          description: item.item_description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          subtotal: item.subtotal,
          tax_amount: item.tax_amount,
          total: item.total
        })),
        subtotal: subtotal,
        tax_amount: taxAmount,
        total_amount: total
      };

      await crearRegistro({
        firmId: firmId,
        premiseId: null,
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
    // ===== FIX #1: PROTEGER EDICIÓN POR ESTADO =====
    // Validar que la orden esté en DRAFT (única editable)
    if (order.status !== 'draft') {
      toast.error(
        `No se pueden editar órdenes en estado "${order.status}". ` +
        `Solo las órdenes en estado BORRADOR pueden ser modificadas.`
      );
      return; // ← Bloquea apertura del modal
    }

    // ===== SAFE: Proceder con edición =====
    // Remover propiedades relacionales que no pertenecen a formData
    const { purchase_order_items, ...orderWithoutRelations } = order;

    setEditingOrder(order);
    
    // El exchange_rate no se guarda en la BD, así que lo inicializamos vacío
    // El usuario deberá ingresarlo nuevamente si la moneda es USD
    setFormData({
      ...orderWithoutRelations,
      exchange_rate: '', // No se guarda en BD, se debe ingresar nuevamente
      items: order.purchase_order_items || []
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

      // 2. Validar que PO esté en draft (solo draft puede eliminarse)
      if (order.status !== 'draft') {
        toast.error(`No se puede eliminar. La orden está en estado "${order.status}". Solo órdenes en borrador pueden eliminarse.`);
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
        draft: ['approved', 'cancelled'],
        approved: ['sent', 'cancelled'],
        sent: ['received', 'cancelled'],
        received: ['cancelled'],
        cancelled: []
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
      if (newStatus === 'approved' && oldStatus === 'draft') {
        confirmMsg =
          'Al aprobar esta orden:\n\n' +
          '✓ Se generarán automáticamente los gastos programados\n' +
          '✓ Serán visibles en "Cuentas por Pagar"\n' +
          '✓ Podrá crear Órdenes de Pago\n\n' +
          '¿Continuar?';
      } else if (newStatus === 'cancelled') {
        confirmMsg =
          'Al cancelar esta orden:\n\n' +
          '✓ Todos los gastos NO PAGADOS serán cancelados\n' +
          '✓ Los gastos PAGADOS permanecerán (auditoría)\n\n' +
          '¿Continuar?';
      }

      if (confirmMsg && !window.confirm(confirmMsg)) {
        setLoading(false);
        return;
      }

      // ===== PHASE 4: EXPENSE GENERATION (FIX #2) =====
      // 4. Si transitioning to 'approved', generar expenses si no existen
      if (newStatus === 'approved' && oldStatus === 'draft') {
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
        draft: 'borrador',
        approved: 'aprobada',
        sent: 'enviada',
        received: 'recibida',
        cancelled: 'cancelada'
      };

      let successMsg = `Orden ${statusLabels[newStatus]}`;
      if (expenseCount && expenseCount > 0) {
        const actionLabel =
          newStatus === 'approved' ? 'generados/sincronizados' :
          newStatus === 'cancelled' ? 'cancelados' :
          'sincronizados';
        successMsg += ` • ${expenseCount} gasto(s) ${actionLabel}`;
      }

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
      supplier_name: '',
      supplier_rut: '',
      supplier_phone: '',
      supplier_email: '',
      supplier_address: '',
      status: 'draft',
      currency: 'UYU',
      exchange_rate: '',
      delivery_date: '',
      delivery_address: '',
      payment_terms: '',
      notes: '',
      items: []
    });
    setEditingOrder(null);
    setGeneratedOrderNumber(null);
    setCurrentItem({
      item_description: '',
      quantity: '',
      unit: 'kg',
      unit_price: '',
      tax_rate: 22
    });
    setErrors({});
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { label: 'Borrador', color: 'bg-slate-100 text-slate-700', icon: FileText },
      approved: { label: 'Aprobado', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
      sent: { label: 'Enviado', color: 'bg-purple-100 text-purple-700', icon: Send },
      received: { label: 'Recibido', color: 'bg-green-100 text-green-700', icon: Package },
      cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: XCircle }
    };
    const config = statusConfig[status] || statusConfig.draft;
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
   * Retorna botones de acción dinámicos según el estado actual
   */
  const getActionButtons = (order) => {
    const actions = [];

    // Botón de transición de estado (inteligente según estado actual)
    if (order.status === 'draft') {
      actions.push({
        type: 'approve',
        label: 'Aprobar',
        color: 'bg-blue-600 hover:bg-blue-700',
        icon: CheckCircle,
        onClick: () => updateStatus(order.id, 'approved')
      });
    } else if (order.status === 'approved') {
      actions.push({
        type: 'send',
        label: 'Enviar',
        color: 'bg-purple-600 hover:bg-purple-700',
        icon: Send,
        onClick: () => updateStatus(order.id, 'sent')
      });
    } else if (order.status === 'sent') {
      actions.push({
        type: 'receive',
        label: 'Recibir',
        color: 'bg-green-600 hover:bg-green-700',
        icon: Package,
        onClick: () => updateStatus(order.id, 'received')
      });
    }

    // Botón Generar PDF (disponible si no está cancelada)
    if (order.status !== 'cancelled') {
      actions.push({
        type: 'generate-pdf',
        label: 'Generar PDF',
        color: 'bg-indigo-600 hover:bg-indigo-700',
        icon: Download,
        onClick: () => handleGeneratePDF(order)
      });
    }

    // Botón Editar (siempre disponible excepto en cancelado)
    if (order.status !== 'cancelled') {
      actions.push({
        type: 'edit',
        label: '',
        color: 'bg-slate-100 hover:bg-slate-200 text-slate-600',
        icon: Edit2,
        onClick: () => handleEdit(order)
      });
    }

    // Botón Eliminar (siempre disponible)
    actions.push({
      type: 'delete',
      label: '',
      color: 'bg-red-50 hover:bg-red-100 text-red-600',
      icon: Trash2,
      onClick: () => handleDelete(order.id)
    });

    return actions;
  };

  const filteredOrders = orders.filter(order =>
    order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { subtotal, taxAmount, total, subtotalUYU, taxAmountUYU, totalUYU } = calculateTotals();

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
            <option value="draft">Borrador</option>
            <option value="approved">Aprobado</option>
            <option value="sent">Enviado</option>
            <option value="received">Recibido</option>
            <option value="cancelled">Cancelado</option>
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
                  <TableHead className="text-right">Total</TableHead>
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
                    <TableCell className="text-right font-semibold text-blue-600">${order.total_amount?.toFixed(2)}</TableCell>
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                      <select
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
                        value={formData.status}
                        onChange={e => setFormData({...formData, status: e.target.value})}
                      >
                        <option value="draft">Borrador</option>
                        <option value="approved">Aprobado</option>
                        <option value="sent">Enviado</option>
                        <option value="received">Recibido</option>
                        <option value="cancelled">Cancelado</option>
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">RUT</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        value={formData.supplier_rut}
                        onChange={e => setFormData({...formData, supplier_rut: e.target.value})}
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
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        value={formData.supplier_phone}
                        onChange={e => setFormData({...formData, supplier_phone: e.target.value})}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        value={formData.supplier_address}
                        onChange={e => setFormData({...formData, supplier_address: e.target.value})}
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
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">Descripción</label>
                        <input
                          type="text"
                          className="w-full px-2 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          value={currentItem.item_description}
                          onChange={e => setCurrentItem({...currentItem, item_description: e.target.value})}
                          placeholder="Ej: Semilla de soja"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Cantidad</label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full px-2 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          value={currentItem.quantity}
                          onChange={e => setCurrentItem({...currentItem, quantity: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Unidad</label>
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
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Precio {formData.currency === 'USD' ? '(USD)' : '(UYU)'}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full px-2 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          value={currentItem.unit_price}
                          onChange={e => setCurrentItem({...currentItem, unit_price: e.target.value})}
                          placeholder={formData.currency === 'USD' ? 'US$' : '$'}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">IVA %</label>
                        <select
                          className="w-full px-2 py-2 border border-slate-300 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                          value={currentItem.tax_rate}
                          onChange={e => setCurrentItem({...currentItem, tax_rate: e.target.value})}
                        >
                          <option value="0">0%</option>
                          <option value="10">10%</option>
                          <option value="22">22%</option>
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
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <p className="font-medium text-slate-900">{item.item_description}</p>
                              <p className="text-xs text-slate-600">{item.quantity} {item.unit} × ${item.unit_price}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors ml-2"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <div className="flex gap-4 justify-end text-xs pt-2 border-t border-slate-100">
                            <div>
                              Sub: {formData.currency === 'USD' ? `US$${item.subtotal}` : `$${item.subtotal}`}
                              {formData.currency === 'USD' && item.subtotal_uyu && (
                                <span className="text-slate-500 ml-1">(${item.subtotal_uyu})</span>
                              )}
                            </div>
                            <div>
                              IVA: {formData.currency === 'USD' ? `US$${item.tax_amount}` : `$${item.tax_amount}`}
                              {formData.currency === 'USD' && item.tax_amount_uyu && (
                                <span className="text-slate-500 ml-1">(${item.tax_amount_uyu})</span>
                              )}
                            </div>
                            <div className="font-bold text-blue-600">
                              Total: {formData.currency === 'USD' ? `US$${item.total}` : `$${item.total}`}
                              {formData.currency === 'USD' && item.total_uyu && (
                                <span className="text-slate-500 ml-1">(${item.total_uyu})</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="bg-blue-100 p-3 rounded font-semibold text-right text-sm">
                        <div>
                          Subtotal: {formData.currency === 'USD' ? `US$${subtotal.toFixed(2)}` : `$${subtotal.toFixed(2)}`}
                          {formData.currency === 'USD' && formData.exchange_rate && (
                            <span className="text-slate-600 ml-2 font-normal">
                              (${subtotalUYU.toFixed(2)} UYU)
                            </span>
                          )}
                      </div>
                        <div>
                          IVA: {formData.currency === 'USD' ? `US$${taxAmount.toFixed(2)}` : `$${taxAmount.toFixed(2)}`}
                          {formData.currency === 'USD' && formData.exchange_rate && (
                            <span className="text-slate-600 ml-2 font-normal">
                              (${taxAmountUYU.toFixed(2)} UYU)
                            </span>
                          )}
                        </div>
                        <div className="text-blue-700">
                          TOTAL: {formData.currency === 'USD' ? `US$${total.toFixed(2)}` : `$${total.toFixed(2)}`}
                          {formData.currency === 'USD' && formData.exchange_rate && (
                            <span className="text-slate-600 ml-2 font-normal">
                              (${totalUYU.toFixed(2)} UYU)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {errors.items && (
                    <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                      <AlertCircle size={16} />
                      {errors.items}
                    </div>
                  )}
                </div>

                {/* SECCIÓN 4: Entrega y Términos */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <div className="w-1 h-5 bg-blue-600 rounded"></div>
                    Entrega y Términos
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Entrega</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        value={formData.delivery_date}
                        onChange={e => setFormData({...formData, delivery_date: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Moneda</label>
                      <select
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
                        value={formData.currency}
                        onChange={e => {
                          const newCurrency = e.target.value;
                          setFormData({
                            ...formData, 
                            currency: newCurrency,
                            // Limpiar tipo de cambio si se cambia a pesos
                            exchange_rate: newCurrency === 'UYU' ? '' : formData.exchange_rate
                          });
                        }}
                      >
                        <option value="UYU">Pesos (UYU)</option>
                        <option value="USD">Dólares (USD)</option>
                      </select>
                    </div>
                    {formData.currency === 'USD' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Tipo de Cambio (USD → UYU) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required={formData.currency === 'USD'}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-colors ${
                            errors.exchange_rate ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-300'
                          }`}
                          value={formData.exchange_rate}
                          onChange={e => {
                            setFormData({...formData, exchange_rate: e.target.value});
                            // Limpiar error al escribir
                            if (errors.exchange_rate) {
                              setErrors({...errors, exchange_rate: null});
                            }
                          }}
                          placeholder="Ej: 40.50"
                        />
                        {errors.exchange_rate && (
                          <p className="text-red-600 text-xs mt-1">{errors.exchange_rate}</p>
                        )}
                        <p className="text-xs text-slate-500 mt-1">Ingresa a cuántos pesos equivale 1 dólar</p>
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Dirección de Entrega</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        value={formData.delivery_address}
                        onChange={e => setFormData({...formData, delivery_address: e.target.value})}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Condiciones de Pago</label>
                      <select
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
                        value={formData.payment_terms}
                        onChange={e => setFormData({...formData, payment_terms: e.target.value})}
                      >
                        <option value="">Selecciona una opción...</option>
                        <option value="contado">Contado (100%)</option>
                        <option value="30_dias">30 días</option>
                        <option value="60_dias">60 días</option>
                        <option value="90_dias">90 días</option>
                        <option value="50_50">50/50 (30 y 60 días)</option>
                        <option value="33_33_34">33/33/34 (30, 60 y 90 días)</option>
                        <option value="25_25_25_25">25/25/25/25 (30, 60, 90 y 120 días)</option>
                        <option value="40_60">40/60 (Anticipo y saldo)</option>
                      </select>
                      <p className="text-xs text-slate-500 mt-1">Estas condiciones generarán automáticamente los cobros en el módulo de pagos</p>
                    </div>

                    {/* Preview del cronograma de pagos */}
                    {/* Ocultado según solicitud del usuario */}
                    {false && schedulePreview.length > 0 && (
                      <PaymentSchedulePreview
                        schedule={schedulePreview}
                        currency={formData.currency}
                      />
                    )}

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
                      <textarea
                        rows="2"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        value={formData.notes}
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                        placeholder="Observaciones adicionales..."
                      />
                    </div>
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
