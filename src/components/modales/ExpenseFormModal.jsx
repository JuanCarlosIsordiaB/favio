import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import { Textarea } from '../ui/textarea';
import { AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useChartOfAccounts } from '../../hooks/useChartOfAccounts';
import { toast } from 'sonner';
import { parsePaymentTerms } from '../../services/paymentScheduler';
import PaymentSchedulePreview from './PaymentSchedulePreview';

/**
 * Modal para crear/editar facturas de compra
 * @component
 */
export function ExpenseFormModal({
  isOpen = false,
  isEditing = false,
  expense = null,
  firmId = null,
  onSubmit = () => {},
  onCancel = () => {},
  isLoading = false
}) {
  const { accounts, loadAccounts } = useChartOfAccounts();

  const [formData, setFormData] = useState({
    firm_id: firmId,
    invoice_series: '',
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    provider_name: '',
    provider_rut: '',
    provider_email: '',
    provider_phone: '',
    provider_address: '',
    category: 'Insumos',
    concept: '',
    currency: 'UYU',
    // Múltiples items
    items: [],
    // Totales calculados
    subtotal: 0,
    iva_amount: 0,
    total_amount: 0,
    payment_terms: '',
    due_date: null,
    alert_days: 5,
    notes: '',
    account_id: null,
    cost_center_id: null,
    agricultural_work_id: null,
    livestock_work_id: null,
    event_id: null
  });

  // Estado para el formulario del item actual (antes de agregarlo a la lista)
  const [currentItem, setCurrentItem] = useState({
    concept: '',
    quantity: 0,
    unit: 'Unidades',
    unit_price: 0,
    tax_rate: 22
  });

  const [errors, setErrors] = useState({});
  const [costCenters, setCostCenters] = useState([]);
  const [agriculturalWorks, setAgriculturalWorks] = useState([]);
  const [livestockWorks, setLivestockWorks] = useState([]);
  const [schedulePreview, setSchedulePreview] = useState([]);

  const categories = ['Insumos', 'Servicios', 'Mantenimiento', 'Impuestos', 'Otros gastos', 'Otra'];
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const paymentTerms = [
    { value: 'contado', label: 'Contado (100%)' },
    { value: '30_dias', label: '30 días' },
    { value: '60_dias', label: '60 días' },
    { value: '90_dias', label: '90 días' },
    { value: '50_50', label: '50/50 (30 y 60 días)' },
    { value: '33_33_34', label: '33/33/34 (30, 60 y 90 días)' },
    { value: '25_25_25_25', label: '25/25/25/25 (30, 60, 90 y 120 días)' },
    { value: '40_60', label: '40/60 (Anticipo y saldo)' }
  ];
  const currencies = ['UYU', 'USD'];
  const units = ['Unidades', 'Kilos', 'Litros', 'Hectáreas', 'Horas', 'Servicios'];

  /**
   * Recalcular totales cuando cambian los items
   */
  useEffect(() => {
    // Calcular subtotal y IVA por item
    let totalSubtotal = 0;
    let totalIva = 0;

    formData.items.forEach(item => {
      const itemSubtotal = (item.quantity || 0) * (item.unit_price || 0);
      const itemIva = itemSubtotal * ((item.tax_rate || 22) / 100);
      totalSubtotal += itemSubtotal;
      totalIva += itemIva;
    });

    const totalAmount = totalSubtotal + totalIva;

    setFormData(prev => ({
      ...prev,
      subtotal: parseFloat(totalSubtotal.toFixed(2)),
      iva_amount: parseFloat(totalIva.toFixed(2)),
      total_amount: parseFloat(totalAmount.toFixed(2))
    }));
  }, [formData.items]);

  /**
   * Calcular preview de cronograma de pagos cuando cambia payment_terms o total_amount
   */
  useEffect(() => {
    if (formData.payment_terms && formData.payment_terms !== '' && formData.total_amount > 0 && formData.invoice_date) {
      try {
        const preview = parsePaymentTerms(
          formData.payment_terms,
          formData.total_amount,
          formData.invoice_date
        );
        setSchedulePreview(preview);
      } catch (error) {
        console.error('Error calculando preview de cronograma:', error);
        setSchedulePreview([]);
      }
    } else {
      setSchedulePreview([]);
    }
  }, [formData.payment_terms, formData.total_amount, formData.invoice_date]);

  /**
   * Cargar datos de factura si está editando
   */
  useEffect(() => {
    if (isEditing && expense) {
      // Verificar si la categoría es una de las predefinidas
      const predefinedCategories = ['Insumos', 'Servicios', 'Mantenimiento', 'Impuestos', 'Otros gastos'];
      const isCustom = expense.category && !predefinedCategories.includes(expense.category);
      setIsCustomCategory(isCustom);
      
      // Asegurar que items sea siempre un array (puede no existir en datos existentes)
      // Fusionar con valores por defecto para asegurar que todos los campos estén presentes
      setFormData({
        firm_id: firmId,
        invoice_series: '',
        invoice_number: '',
        invoice_date: new Date().toISOString().split('T')[0],
        provider_name: '',
        provider_rut: '',
        provider_email: '',
        provider_phone: '',
        provider_address: '',
        category: 'Insumos',
        concept: '',
        currency: 'UYU',
        items: [],
        subtotal: 0,
        iva_amount: 0,
        total_amount: 0,
        payment_terms: '',
        due_date: null,
        alert_days: 5,
        notes: '',
        account_id: null,
        cost_center_id: null,
        agricultural_work_id: null,
        livestock_work_id: null,
        event_id: null,
        ...expense,
        items: expense.items || [],
        // Asegurar que payment_terms tenga un valor por defecto si no existe
        payment_terms: expense.payment_terms || ''
      });
    } else if (!isEditing) {
      // Resetear formulario cuando no está editando
      setIsCustomCategory(false);
      setFormData({
        firm_id: firmId,
        invoice_series: '',
        invoice_number: '',
        invoice_date: new Date().toISOString().split('T')[0],
        provider_name: '',
        provider_rut: '',
        provider_email: '',
        provider_phone: '',
        provider_address: '',
        category: 'Insumos',
        concept: '',
        currency: 'UYU',
        items: [],
        subtotal: 0,
        iva_amount: 0,
        total_amount: 0,
        payment_terms: '',
        due_date: null,
        alert_days: 5,
        notes: '',
        account_id: null,
        cost_center_id: null,
        agricultural_work_id: null,
        livestock_work_id: null,
        event_id: null
      });
    }
  }, [isEditing, expense, firmId]);

  /**
   * Cargar centros de costo y trabajos cuando se abre el modal
   */
  useEffect(() => {
    if (isOpen && firmId) {
      loadAssociatedData();
    }
  }, [isOpen, firmId]);

  const loadAssociatedData = async () => {
    try {
      // Cargar plan de cuentas
      if (firmId) {
        await loadAccounts(firmId);
      }

      // Cargar centros de costo
      const { data: ccData } = await supabase
        .from('cost_centers')
        .select('id, name, code')
        .eq('firm_id', firmId)
        .eq('is_active', true)
        .order('name');

      if (ccData) setCostCenters(ccData);

      // Cargar trabajos agrícolas
      const { data: agData } = await supabase
        .from('agricultural_works')
        .select('id, work_type, date')
        .eq('firm_id', firmId)
        .order('date', { ascending: false })
        .limit(50);

      if (agData) setAgriculturalWorks(agData);

      // Cargar trabajos ganaderos
      const { data: lvData } = await supabase
        .from('livestock_works')
        .select('id, work_type, date')
        .eq('firm_id', firmId)
        .order('date', { ascending: false })
        .limit(50);

      if (lvData) setLivestockWorks(lvData);
    } catch (err) {
      console.error('Error cargando datos asociados:', err);
    }
  };

  /**
   * Validar formulario
   */
  const validateForm = () => {
    const newErrors = {};

    if (!formData.invoice_series?.trim()) {
      newErrors.invoice_series = 'Serie de factura requerida';
    }

    if (!formData.invoice_number?.trim()) {
      newErrors.invoice_number = 'Número de factura requerido';
    } else if (!/^\d+$/.test(formData.invoice_number.trim())) {
      newErrors.invoice_number = 'El número debe contener solo dígitos';
    }

    if (!formData.provider_name?.trim()) {
      newErrors.provider_name = 'Nombre del proveedor requerido';
    } else if (formData.provider_name.trim().length < 3) {
      newErrors.provider_name = 'El nombre debe tener al menos 3 caracteres';
    }

    if (formData.provider_rut?.trim()) {
      if (!validarRUT(formData.provider_rut)) {
        newErrors.provider_rut = 'RUT inválido. Formato: 11 dígitos + verificador (0-9 o K). Ej: 12345678901-2';
      }
    }

    if (!formData.category) {
      newErrors.category = 'Categoría requerida';
    }

    if (formData.items.length === 0) {
      newErrors.items = 'Debes agregar al menos un item';
    }

    if (formData.total_amount <= 0) {
      newErrors.total_amount = 'El monto total debe ser mayor a cero';
    }

    if (!formData.currency) {
      newErrors.currency = 'Moneda requerida';
    }

    if (!formData.payment_terms || formData.payment_terms === '') {
      newErrors.payment_terms = 'Condiciones de pago requeridas';
    }

    if (formData.due_date) {
      const fechaEmision = new Date(formData.invoice_date);
      const fechaVencimiento = new Date(formData.due_date);
      if (fechaVencimiento < fechaEmision) {
        newErrors.due_date = 'La fecha de vencimiento debe ser posterior a la emisión';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Validar RUT uruguayo - Validación simple de formato
   * El campo RUT es opcional. Si se proporciona, debe tener formato válido.
   * Aceptamos: 12345678901-2, 1.234.567.890-1, 12.345.678-9K, etc.
   */
  const validarRUT = (rut) => {
    if (!rut || typeof rut !== 'string') return true; // Opcional

    // Limpiar: remover espacios, puntos y guiones
    const rutLimpio = rut.trim().replace(/[\.\-\s]/g, '');

    // Validar que tenga al menos 11 caracteres (11 dígitos + 1 verificador)
    // y que sea formato: 11 dígitos + 1 carácter (dígito o K)
    if (!/^\d{11}[0-9K]$/i.test(rutLimpio)) return false;

    // Validación básica: no validar el dígito verificador calculado,
    // solo validar el formato del RUT
    return true;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'unit_price' || name === 'tax_rate' || name === 'alert_days'
        ? parseFloat(value) || 0
        : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  /**
   * Manejar cambios en el formulario del item actual
   */
  const handleCurrentItemChange = (e) => {
    const { name, value } = e.target;
    setCurrentItem(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'unit_price' || name === 'tax_rate'
        ? parseFloat(value) || 0
        : value
    }));
  };

  const handleCurrentItemSelectChange = (name, value) => {
    setCurrentItem(prev => ({
      ...prev,
      [name]: value
    }));
  };

  /**
   * Agregar item a la lista
   */
  const agregarItem = () => {
    if (!currentItem.concept?.trim()) {
      toast.error('Describe el concepto/producto del item');
      return;
    }
    if (currentItem.quantity <= 0) {
      toast.error('La cantidad debe ser mayor a cero');
      return;
    }
    if (currentItem.unit_price <= 0) {
      toast.error('El precio unitario debe ser mayor a cero');
      return;
    }

    // Crear nuevo item con ID único
    const newItem = {
      id: `item_${Date.now()}_${Math.random()}`,
      ...currentItem
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    // Limpiar formulario del item
    setCurrentItem({
      concept: '',
      quantity: 0,
      unit: 'Unidades',
      unit_price: 0,
      tax_rate: 22
    });

    toast.success('Item agregado');
  };

  /**
   * Quitar item de la lista
   */
  const quitarItem = (itemId) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
    toast.success('Item eliminado');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Limpiar campos UUID vacíos (convertir a null) - estos campos son opcionales
    const cleanedData = {
      ...formData,
      account_id: formData.account_id?.trim() ? formData.account_id : null,
      cost_center_id: formData.cost_center_id?.trim() ? formData.cost_center_id : null,
      agricultural_work_id: formData.agricultural_work_id?.trim() ? formData.agricultural_work_id : null,
      livestock_work_id: formData.livestock_work_id?.trim() ? formData.livestock_work_id : null,
      event_id: formData.event_id?.trim() ? formData.event_id : null
    };

    await onSubmit(cleanedData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Factura de Compra' : 'Nueva Factura de Compra'}
          </DialogTitle>
          <DialogDescription>
            Completa los datos de la factura de compra
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos de Factura */}
          <div>
            <h3 className="font-semibold mb-3">Datos de la Factura</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="invoice_series">Serie *</Label>
                <Input
                  id="invoice_series"
                  name="invoice_series"
                  value={formData.invoice_series}
                  onChange={handleChange}
                  placeholder="001"
                  disabled={isLoading}
                  aria-invalid={!!errors.invoice_series}
                  data-testid="input-invoice-series"
                />
                {errors.invoice_series && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-500">
                    <AlertCircle size={14} />
                    {errors.invoice_series}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="invoice_number">Número *</Label>
                <Input
                  id="invoice_number"
                  name="invoice_number"
                  value={formData.invoice_number}
                  onChange={handleChange}
                  placeholder="123456"
                  disabled={isLoading}
                  aria-invalid={!!errors.invoice_number}
                  data-testid="input-invoice-number"
                />
                {errors.invoice_number && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-500">
                    <AlertCircle size={14} />
                    {errors.invoice_number}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="invoice_date">Fecha de Emisión *</Label>
                <Input
                  id="invoice_date"
                  name="invoice_date"
                  type="date"
                  value={formData.invoice_date}
                  onChange={handleChange}
                  disabled={isLoading}
                  data-testid="input-date"
                />
              </div>
            </div>
          </div>

          {/* Datos del Proveedor */}
          <div>
            <h3 className="font-semibold mb-3">Datos del Proveedor</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="provider_name">Nombre Comercial *</Label>
                <Input
                  id="provider_name"
                  name="provider_name"
                  value={formData.provider_name}
                  onChange={handleChange}
                  placeholder="Empresa S.A."
                  disabled={isLoading}
                  aria-invalid={!!errors.provider_name}
                  data-testid="input-provider"
                />
                {errors.provider_name && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-500">
                    <AlertCircle size={14} />
                    {errors.provider_name}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="provider_rut">RUT</Label>
                <Input
                  id="provider_rut"
                  name="provider_rut"
                  value={formData.provider_rut}
                  onChange={handleChange}
                  placeholder="12345678901-2"
                  disabled={isLoading}
                  aria-invalid={!!errors.provider_rut}
                  data-testid="input-rut"
                />
                {errors.provider_rut && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-500">
                    <AlertCircle size={14} />
                    {errors.provider_rut}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="provider_phone">Teléfono</Label>
                <Input
                  id="provider_phone"
                  name="provider_phone"
                  value={formData.provider_phone}
                  onChange={handleChange}
                  placeholder="(598) 2xxx xxxx"
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="provider_email">Email</Label>
                <Input
                  id="provider_email"
                  name="provider_email"
                  type="email"
                  value={formData.provider_email}
                  onChange={handleChange}
                  placeholder="contacto@empresa.com"
                  disabled={isLoading}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="provider_address">Dirección</Label>
                <Input
                  id="provider_address"
                  name="provider_address"
                  value={formData.provider_address}
                  onChange={handleChange}
                  placeholder="Calle 123, Localidad"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Categoría y Concepto */}
          <div>
            <h3 className="font-semibold mb-3">Categoría y Concepto</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Categoría *</Label>
                <Select
                  value={isCustomCategory ? 'Otra' : formData.category}
                  onValueChange={(value) => {
                    if (value === 'Otra') {
                      setIsCustomCategory(true);
                      setFormData(prev => ({ ...prev, category: '' }));
                    } else {
                      setIsCustomCategory(false);
                      handleSelectChange('category', value);
                    }
                  }}
                  disabled={isLoading}
                >
                  <SelectTrigger aria-invalid={!!errors.category} data-testid="select-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isCustomCategory && (
                  <Input
                    id="custom_category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="Escribe tu categoría personalizada"
                    disabled={isLoading}
                    className="mt-2"
                    aria-invalid={!!errors.category}
                  />
                )}
                {errors.category && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-500">
                    <AlertCircle size={14} />
                    {errors.category}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="concept">Concepto/Producto</Label>
                <Input
                  id="concept"
                  name="concept"
                  value={formData.concept}
                  onChange={handleChange}
                  placeholder="Descripción del producto/servicio"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Ítems */}
          <div>
            <h3 className="font-semibold mb-3">Items de la Factura</h3>

            {/* Tabla de items agregados */}
            {formData.items.length > 0 && (
              <div className="mb-4 overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Concepto</th>
                      <th className="px-3 py-2 text-right">Cantidad</th>
                      <th className="px-3 py-2 text-left">Unidad</th>
                      <th className="px-3 py-2 text-right">P.U.</th>
                      <th className="px-3 py-2 text-right">IVA %</th>
                      <th className="px-3 py-2 text-right">Subtotal</th>
                      <th className="px-3 py-2 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item) => {
                      const itemSubtotal = item.quantity * item.unit_price;
                      return (
                        <tr key={item.id} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-2">{item.concept}</td>
                          <td className="px-3 py-2 text-right">{item.quantity.toFixed(2)}</td>
                          <td className="px-3 py-2">{item.unit}</td>
                          <td className="px-3 py-2 text-right">${item.unit_price.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right">{item.tax_rate}%</td>
                          <td className="px-3 py-2 text-right font-semibold">${itemSubtotal.toFixed(2)}</td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => quitarItem(item.id)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {errors.items && (
              <div className="flex items-center gap-1 mb-3 p-2 bg-red-50 rounded border border-red-200 text-sm text-red-600">
                <AlertCircle size={14} />
                {errors.items}
              </div>
            )}

            {/* Formulario para agregar nuevos items */}
            <div className="bg-gray-50 p-4 rounded border mb-4">
              <h4 className="font-medium text-sm mb-3">Agregar Nuevo Item</h4>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <Label htmlFor="new_concept" className="text-xs">Concepto/Producto *</Label>
                  <Input
                    id="new_concept"
                    name="concept"
                    value={currentItem.concept}
                    onChange={handleCurrentItemChange}
                    placeholder="Descripción..."
                    disabled={isLoading}
                    className="text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="new_quantity" className="text-xs">Cantidad *</Label>
                  <Input
                    id="new_quantity"
                    name="quantity"
                    type="number"
                    value={currentItem.quantity}
                    onChange={handleCurrentItemChange}
                    step="0.01"
                    disabled={isLoading}
                    className="text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="new_unit" className="text-xs">Unidad</Label>
                  <Select
                    value={currentItem.unit}
                    onValueChange={(value) => handleCurrentItemSelectChange('unit', value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map(u => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="new_unit_price" className="text-xs">Precio Unitario *</Label>
                  <Input
                    id="new_unit_price"
                    name="unit_price"
                    type="number"
                    value={currentItem.unit_price}
                    onChange={handleCurrentItemChange}
                    step="0.01"
                    disabled={isLoading}
                    className="text-sm"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="new_tax_rate" className="text-xs">IVA %</Label>
                  <Select
                    value={String(currentItem.tax_rate)}
                    onValueChange={(value) => handleCurrentItemSelectChange('tax_rate', value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0% (Exento)</SelectItem>
                      <SelectItem value="10">10%</SelectItem>
                      <SelectItem value="22">22% (Estándar)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <button
                type="button"
                onClick={agregarItem}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium py-2 rounded transition"
              >
                + Agregar Item
              </button>
            </div>

            {/* Totales */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Subtotal</Label>
                <Input
                  type="number"
                  value={formData.subtotal.toFixed(2)}
                  disabled
                  className="bg-gray-100 font-semibold"
                />
              </div>

              <div>
                <Label>IVA Total</Label>
                <Input
                  type="number"
                  value={formData.iva_amount.toFixed(2)}
                  disabled
                  className="bg-gray-100 font-semibold"
                />
              </div>

              <div>
                <Label>Total *</Label>
                <div className="flex gap-2 items-center">
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => handleSelectChange('currency', value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-16">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map(curr => (
                        <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={formData.total_amount.toFixed(2)}
                    disabled
                    className="bg-gray-100 font-semibold flex-1"
                  />
                </div>
                {errors.total_amount && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-500">
                    <AlertCircle size={14} />
                    {errors.total_amount}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pago */}
          <div>
            <h3 className="font-semibold mb-3">Condiciones de Pago</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="payment_terms">Condiciones de Pago *</Label>
                <Select
                  value={formData.payment_terms || undefined}
                  onValueChange={(value) => handleSelectChange('payment_terms', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger aria-invalid={!!errors.payment_terms}>
                    <SelectValue placeholder="Selecciona una opción..." />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentTerms.map(pt => (
                      <SelectItem key={pt.value} value={pt.value}>
                        {pt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.payment_terms && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-500">
                    <AlertCircle size={14} />
                    {errors.payment_terms}
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-1">Estas condiciones generarán automáticamente los pagos en el módulo de pagos</p>
              </div>

              {formData.payment_terms && formData.payment_terms !== '' && (
                <div className="col-span-2">
                  <Label htmlFor="due_date">Fecha de Vencimiento (Opcional)</Label>
                  <Input
                    id="due_date"
                    name="due_date"
                    type="date"
                    value={formData.due_date || ''}
                    onChange={handleChange}
                    disabled={isLoading}
                    aria-invalid={!!errors.due_date}
                  />
                  {errors.due_date && (
                    <div className="flex items-center gap-1 mt-1 text-sm text-red-500">
                      <AlertCircle size={14} />
                      {errors.due_date}
                    </div>
                  )}
                </div>
              )}

              {formData.payment_terms && formData.payment_terms !== '' && (
                <div className="col-span-2">
                  <Label htmlFor="alert_days">Alerta (días antes)</Label>
                  <Input
                    id="alert_days"
                    name="alert_days"
                    type="number"
                    value={formData.alert_days}
                    onChange={handleChange}
                    min="1"
                    disabled={isLoading}
                  />
                </div>
              )}
            </div>

            {/* Preview del cronograma de pagos */}
            {schedulePreview.length > 0 && (
              <div className="mt-4">
                <PaymentSchedulePreview
                  schedule={schedulePreview}
                  currency={formData.currency}
                />
              </div>
            )}
          </div>

          {/* Notas */}
          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Observaciones adicionales..."
              disabled={isLoading}
              rows={2}
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              data-testid="btn-save-expense"
            >
              {isLoading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
