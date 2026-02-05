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
import { parsePaymentTerms } from '../../services/paymentScheduler';
import PaymentSchedulePreview from './PaymentSchedulePreview';

/**
 * Modal para crear/editar ingresos financieros
 * @component
 */
export function IncomeFormModal({
  isOpen = false,
  isEditing = false,
  income = null,
  firmId = null,
  onSubmit = () => {},
  onCancel = () => {},
  isLoading = false
}) {
  const { accounts, loadAccounts } = useChartOfAccounts();

  const [formData, setFormData] = useState({
    firm_id: firmId,
    invoice_date: new Date().toISOString().split('T')[0],
    invoice_series: '',
    invoice_number: '',
    category: 'Venta de granos',
    client_name: '',
    client_rut: '',
    client_address: '',
    client_email: '',
    client_phone: '',
    product: '',
    quantity: 0,
    unit: 'Kilos',
    unit_price: 0,
    subtotal: 0,
    tax_rate: 0,
    iva_amount: 0,
    total_amount: 0,
    currency: 'UYU',
    payment_terms: '',
    due_date: null,
    alert_days: 5,
    transport_method: '',
    transport_cost: 0,
    guide_number: '',
    auth_number: '',
    notes: '',
    account_id: null,
    cost_center_id: null,
    agricultural_work_id: null,
    livestock_work_id: null,
    event_id: null
  });

  const [errors, setErrors] = useState({});
  const [costCenters, setCostCenters] = useState([]);
  const [agriculturalWorks, setAgriculturalWorks] = useState([]);
  const [livestockWorks, setLivestockWorks] = useState([]);
  const [schedulePreview, setSchedulePreview] = useState([]);

  const categories = ['Venta de ganado', 'Venta de granos', 'Servicios', 'Otros ingresos'];
  const currencies = ['UYU', 'USD'];
  const units = ['Kilos', 'Toneladas', 'Litros', 'Cabezas', 'Horas', 'Unidades'];
  const transportMethods = ['Transporte propio', 'Transporte tercero', 'Retirado por cliente', 'Entrega a domicilio'];
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

  /**
   * Recalcular totales cuando cambian cantidad, precio o IVA
   */
  useEffect(() => {
    const subtotal = formData.quantity * formData.unit_price;
    const ivaAmount = subtotal * (formData.tax_rate / 100);
    const totalAmount = subtotal + ivaAmount + (formData.transport_cost || 0);

    setFormData(prev => ({
      ...prev,
      subtotal: parseFloat(subtotal.toFixed(2)),
      iva_amount: parseFloat(ivaAmount.toFixed(2)),
      total_amount: parseFloat(totalAmount.toFixed(2))
    }));
  }, [formData.quantity, formData.unit_price, formData.tax_rate, formData.transport_cost]);

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
   * Cargar datos de ingreso si está editando
   */
  useEffect(() => {
    if (isEditing && income) {
      // Fusionar datos del ingreso con valores por defecto para asegurar que todos los campos estén presentes
      setFormData({
        firm_id: firmId,
        invoice_date: new Date().toISOString().split('T')[0],
        invoice_series: '',
        invoice_number: '',
        category: 'Venta de granos',
        client_name: '',
        client_rut: '',
        client_address: '',
        client_email: '',
        client_phone: '',
        product: '',
        quantity: 0,
        unit: 'Kilos',
        unit_price: 0,
        subtotal: 0,
        tax_rate: 0,
        iva_amount: 0,
        total_amount: 0,
        currency: 'UYU',
        payment_terms: '',
        due_date: null,
        alert_days: 5,
        transport_method: '',
        transport_cost: 0,
        guide_number: '',
        auth_number: '',
        notes: '',
        account_id: null,
        cost_center_id: null,
        agricultural_work_id: null,
        livestock_work_id: null,
        event_id: null,
        ...income,
        // Asegurar que payment_terms tenga un valor por defecto si no existe
        payment_terms: income.payment_terms || ''
      });
    } else if (!isEditing) {
      // Resetear formulario cuando no está editando
      setFormData({
        firm_id: firmId,
        invoice_date: new Date().toISOString().split('T')[0],
        invoice_series: '',
        invoice_number: '',
        category: 'Venta de granos',
        client_name: '',
        client_rut: '',
        client_address: '',
        client_email: '',
        client_phone: '',
        product: '',
        quantity: 0,
        unit: 'Kilos',
        unit_price: 0,
        subtotal: 0,
        tax_rate: 0,
        iva_amount: 0,
        total_amount: 0,
        currency: 'UYU',
        payment_terms: '',
        due_date: null,
        alert_days: 5,
        transport_method: '',
        transport_cost: 0,
        guide_number: '',
        auth_number: '',
        notes: '',
        account_id: null,
        cost_center_id: null,
        agricultural_work_id: null,
        livestock_work_id: null,
        event_id: null
      });
    }
  }, [isEditing, income, firmId]);

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
   * Calcular totales en base a datos actuales
   * Se usa para asegurar valores frescos sin depender de setState timing
   */
  const calculateTotals = (data) => {
    const subtotal = data.quantity * data.unit_price;
    const ivaAmount = subtotal * (data.tax_rate / 100);
    const totalAmount = subtotal + ivaAmount + (data.transport_cost || 0);

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      iva_amount: parseFloat(ivaAmount.toFixed(2)),
      total_amount: parseFloat(totalAmount.toFixed(2))
    };
  };

  /**
   * Validar formulario
   * @param {Object} calculatedTotals - Totales precalculados (opcional)
   */
  const validateForm = (calculatedTotals = null) => {
    const newErrors = {};

    if (!formData.client_name?.trim()) {
      newErrors.client_name = 'Nombre del cliente requerido';
    } else if (formData.client_name.trim().length < 3) {
      newErrors.client_name = 'El nombre debe tener al menos 3 caracteres';
    }

    if (formData.client_rut?.trim()) {
      if (!validarRUT(formData.client_rut)) {
        newErrors.client_rut = 'RUT inválido. Formato: 12 dígitos';
      }
    }

    if (!formData.category) {
      newErrors.category = 'Categoría requerida';
    }

    // Usar totales precalculados si se proporcionan, sino usar estado actual
    const totalAmount = calculatedTotals?.total_amount ?? formData.total_amount;
    if (totalAmount <= 0) {
      newErrors.total_amount = 'El monto total debe ser mayor a cero';
    }

    if (!formData.currency) {
      newErrors.currency = 'Moneda requerida';
    }

    if (formData.product && !formData.product.trim()) {
      newErrors.product = 'El producto no puede estar vacío';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Validar RUT uruguayo
   */
  const validarRUT = (rut) => {
    const rutLimpio = rut.replace(/[.\-\s]/g, '');
    if (!/^\d{12}$/.test(rutLimpio)) return false;

    const rutNumeros = rutLimpio.slice(0, 11);
    const digitoVerificador = parseInt(rutLimpio[11]);
    const factores = [2, 9, 8, 7, 6, 3, 4, 2, 9, 8, 7];
    let suma = 0;

    for (let i = 0; i < 11; i++) {
      suma += parseInt(rutNumeros[i]) * factores[i];
    }

    const resto = suma % 11;
    const digitoCalculado = resto === 0 ? 0 : 11 - resto;

    return digitoCalculado === digitoVerificador;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['quantity', 'unit_price', 'tax_rate', 'transport_cost'].includes(name)
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Calcular totales actualizados para asegurar valores frescos
    const updatedTotals = calculateTotals(formData);

    // Combinar datos con totales calculados
    const completeFormData = {
      ...formData,
      ...updatedTotals
    };

    // Validar con los totales precalculados (evita timing issues de setState)
    if (!validateForm(updatedTotals)) return;

    // Enviar datos con totales actualizados
    await onSubmit(completeFormData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Ingreso' : 'Nuevo Ingreso'}
          </DialogTitle>
          <DialogDescription>
            Completa los datos del ingreso financiero
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos del Ingreso */}
          <div>
            <h3 className="font-semibold mb-3">Datos del Ingreso</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="invoice_date">Fecha *</Label>
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

              <div>
                <Label htmlFor="category">Categoría *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleSelectChange('category', value)}
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
                {errors.category && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-500">
                    <AlertCircle size={14} />
                    {errors.category}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="currency">Moneda *</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => handleSelectChange('currency', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger aria-invalid={!!errors.currency}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map(curr => (
                      <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.currency && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-500">
                    <AlertCircle size={14} />
                    {errors.currency}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Datos del Cliente */}
          <div>
            <h3 className="font-semibold mb-3">Datos del Cliente</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client_name">Razón Social *</Label>
                <Input
                  id="client_name"
                  name="client_name"
                  value={formData.client_name}
                  onChange={handleChange}
                  placeholder="Empresa Cliente"
                  disabled={isLoading}
                  aria-invalid={!!errors.client_name}
                  data-testid="input-client"
                />
                {errors.client_name && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-500">
                    <AlertCircle size={14} />
                    {errors.client_name}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="client_rut">RUT</Label>
                <Input
                  id="client_rut"
                  name="client_rut"
                  value={formData.client_rut}
                  onChange={handleChange}
                  placeholder="12345678901-2"
                  disabled={isLoading}
                  aria-invalid={!!errors.client_rut}
                  data-testid="input-client-rut"
                />
                {errors.client_rut && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-500">
                    <AlertCircle size={14} />
                    {errors.client_rut}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="client_phone">Teléfono</Label>
                <Input
                  id="client_phone"
                  name="client_phone"
                  value={formData.client_phone}
                  onChange={handleChange}
                  placeholder="(598) 2xxx xxxx"
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="client_email">Email</Label>
                <Input
                  id="client_email"
                  name="client_email"
                  type="email"
                  value={formData.client_email}
                  onChange={handleChange}
                  placeholder="cliente@empresa.com"
                  disabled={isLoading}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="client_address">Dirección</Label>
                <Input
                  id="client_address"
                  name="client_address"
                  value={formData.client_address}
                  onChange={handleChange}
                  placeholder="Calle 123, Localidad"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Producto/Servicio */}
          <div>
            <h3 className="font-semibold mb-3">Producto/Servicio</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-2">
                <Label htmlFor="product">Producto</Label>
                <Input
                  id="product"
                  name="product"
                  value={formData.product}
                  onChange={handleChange}
                  placeholder="Descripción del producto"
                  disabled={isLoading}
                  aria-invalid={!!errors.product}
                />
                {errors.product && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-500">
                    <AlertCircle size={14} />
                    {errors.product}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="quantity">Cantidad</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={handleChange}
                  step="0.01"
                  disabled={isLoading}
                  data-testid="input-quantity"
                />
              </div>

              <div>
                <Label htmlFor="unit">Unidad</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => handleSelectChange('unit', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Montos */}
          <div>
            <h3 className="font-semibold mb-3">Montos</h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="unit_price">Precio Unitario</Label>
                <Input
                  id="unit_price"
                  name="unit_price"
                  type="number"
                  value={formData.unit_price}
                  onChange={handleChange}
                  step="0.01"
                  disabled={isLoading}
                  data-testid="input-unit-price"
                />
              </div>

              <div>
                <Label>Subtotal</Label>
                <Input
                  type="number"
                  value={formData.subtotal}
                  disabled
                  className="bg-gray-100"
                />
              </div>

              <div>
                <Label htmlFor="tax_rate">IVA %</Label>
                <Input
                  id="tax_rate"
                  name="tax_rate"
                  type="number"
                  value={formData.tax_rate}
                  onChange={handleChange}
                  step="1"
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label>IVA $</Label>
                <Input
                  type="number"
                  value={formData.iva_amount}
                  disabled
                  className="bg-gray-100"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="transport_method">Forma de Transporte</Label>
                <Select
                  value={formData.transport_method}
                  onValueChange={(value) => handleSelectChange('transport_method', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {transportMethods.map(tm => (
                      <SelectItem key={tm} value={tm}>{tm}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label htmlFor="transport_cost">Costo de Transporte</Label>
                <Input
                  id="transport_cost"
                  name="transport_cost"
                  type="number"
                  value={formData.transport_cost}
                  onChange={handleChange}
                  step="0.01"
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label>Total</Label>
                <Input
                  type="number"
                  value={formData.total_amount}
                  disabled
                  className="bg-gray-100 font-semibold"
                />
                {errors.total_amount && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-500">
                    <AlertCircle size={14} />
                    {errors.total_amount}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Documentación de Transporte */}
          <div>
            <h3 className="font-semibold mb-3">Documentación de Transporte</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="guide_number">Nº Guía/Remito</Label>
                <Input
                  id="guide_number"
                  name="guide_number"
                  value={formData.guide_number}
                  onChange={handleChange}
                  placeholder="Número de guía"
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="auth_number">Nº Habilitación</Label>
                <Input
                  id="auth_number"
                  name="auth_number"
                  value={formData.auth_number}
                  onChange={handleChange}
                  placeholder="Número de habilitación"
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="due_date">Fecha de Vencimiento (Opcional)</Label>
                <Input
                  id="due_date"
                  name="due_date"
                  type="date"
                  value={formData.due_date || ''}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Condiciones de Pago */}
          <div>
            <h3 className="font-semibold mb-3">Condiciones de Pago</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="payment_terms">Condiciones de Pago</Label>
                <Select
                  value={formData.payment_terms || undefined}
                  onValueChange={(value) => handleSelectChange('payment_terms', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
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
                <p className="text-xs text-slate-500 mt-1">Estas condiciones generarán automáticamente los cobros en el módulo de pagos</p>
              </div>

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

          {/* Imputación Contable */}
          <div>
            <h3 className="font-semibold mb-3">Imputación Contable</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="account_id">Cuenta Contable</Label>
                <Select
                  value={formData.account_id || ''}
                  onValueChange={(value) => setFormData({...formData, account_id: value})}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="cost_center_id">Centro de Costo</Label>
                <Select
                  value={formData.cost_center_id || ''}
                  onValueChange={(value) => setFormData({...formData, cost_center_id: value})}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar centro de costo" />
                  </SelectTrigger>
                  <SelectContent>
                    {costCenters.map(cc => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.code} - {cc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Asociaciones con Trabajos */}
          <div>
            <h3 className="font-semibold mb-3">Asociaciones con Trabajos</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="agricultural_work_id">Trabajo Agrícola</Label>
                <Select
                  value={formData.agricultural_work_id || ''}
                  onValueChange={(value) => setFormData({...formData, agricultural_work_id: value})}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar trabajo agrícola" />
                  </SelectTrigger>
                  <SelectContent>
                    {agriculturalWorks.map(aw => (
                      <SelectItem key={aw.id} value={aw.id}>
                        {aw.work_type} - {new Date(aw.date).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="livestock_work_id">Trabajo Ganadero</Label>
                <Select
                  value={formData.livestock_work_id || ''}
                  onValueChange={(value) => setFormData({...formData, livestock_work_id: value})}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar trabajo ganadero" />
                  </SelectTrigger>
                  <SelectContent>
                    {livestockWorks.map(lw => (
                      <SelectItem key={lw.id} value={lw.id}>
                        {lw.work_type} - {new Date(lw.date).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="event_id">Evento Productivo (UUID)</Label>
                <Input
                  id="event_id"
                  name="event_id"
                  value={formData.event_id}
                  onChange={handleChange}
                  placeholder="ID del evento productivo"
                  disabled={isLoading}
                />
              </div>
            </div>
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
              data-testid="btn-save-income"
            >
              {isLoading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
