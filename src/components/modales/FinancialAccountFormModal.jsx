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

/**
 * Modal para crear/editar cuentas financieras
 * @component
 */
export function FinancialAccountFormModal({
  isOpen = false,
  isEditing = false,
  account = null,
  firmId = null,
  onSubmit = () => {},
  onCancel = () => {},
  isLoading = false
}) {
  const [formData, setFormData] = useState({
    firm_id: firmId,
    name: '',
    code: '',
    account_type: 'CASH',
    currency: 'UYU',
    current_balance: 0,
    initial_balance: 0,
    bank_name: '',
    account_number: '',
    bank_branch: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});

  const accountTypes = [
    { id: 'CASH', label: 'Caja' },
    { id: 'BANK_BROU', label: 'Banco BROU' },
    { id: 'BANK_SANTANDER', label: 'Banco Santander' },
    { id: 'BANK_USD', label: 'Banco (USD)' }
  ];

  const currencies = ['UYU', 'USD'];

  /**
   * Cargar datos de cuenta si está editando, o limpiar si está creando
   */
  useEffect(() => {
    if (isEditing && account) {
      // Cargar datos de la cuenta a editar
      setFormData(account);
    } else if (isOpen && !isEditing) {
      // Limpiar formulario cuando se abre en modo creación
      setFormData({
        firm_id: firmId,
        name: '',
        code: '',
        account_type: 'CASH',
        currency: 'UYU',
        current_balance: 0,
        initial_balance: 0,
        bank_name: '',
        account_number: '',
        bank_branch: '',
        notes: ''
      });
      setErrors({});
    }
  }, [isOpen, isEditing, account, firmId]);

  /**
   * Validar formulario
   */
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Nombre de la cuenta requerido';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'El nombre debe tener al menos 3 caracteres';
    }

    if (!formData.account_type) {
      newErrors.account_type = 'Tipo de cuenta requerido';
    }

    if (!formData.currency) {
      newErrors.currency = 'Moneda requerida';
    }

    if (formData.initial_balance !== undefined && typeof formData.initial_balance !== 'number') {
      newErrors.initial_balance = 'El balance inicial debe ser un número';
    }

    if (['BANK_BROU', 'BANK_SANTANDER', 'BANK_USD'].includes(formData.account_type)) {
      if (!formData.account_number?.trim()) {
        newErrors.account_number = 'Número de cuenta requerido para cuentas bancarias';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['current_balance', 'initial_balance'].includes(name)
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
    if (!validateForm()) return;
    await onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Cuenta Financiera' : 'Nueva Cuenta Financiera'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Actualiza los datos de la cuenta' : 'Crea una nueva cuenta: caja o cuenta bancaria (BROU, Santander, USD)'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto flex-1 px-1">
          {/* Identificación */}
          <div>
            <h3 className="font-semibold mb-3">Identificación</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre de la Cuenta *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ej: Caja UYU, Banco BROU, Tarjeta Visa"
                  disabled={isLoading}
                  aria-invalid={!!errors.name}
                  data-testid="input-account-name"
                />
                {errors.name && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-500">
                    <AlertCircle size={14} />
                    {errors.name}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="code">Código (Opcional)</Label>
                <Input
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="Ej: CAJA-01, BCO-BROU"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Tipo y Moneda */}
          <div>
            <h3 className="font-semibold mb-3">Configuración</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="account_type">Tipo de Cuenta *</Label>
                <Select
                  value={formData.account_type}
                  onValueChange={(value) => handleSelectChange('account_type', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger aria-invalid={!!errors.account_type} data-testid="select-account-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accountTypes.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.account_type && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-500">
                    <AlertCircle size={14} />
                    {errors.account_type}
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
                  <SelectTrigger aria-invalid={!!errors.currency} data-testid="select-currency">
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

          {/* Balance */}
          <div>
            <h3 className="font-semibold mb-3">Balance</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="initial_balance">Balance Inicial</Label>
                <Input
                  id="initial_balance"
                  name="initial_balance"
                  type="number"
                  value={formData.initial_balance}
                  onChange={handleChange}
                  step="0.01"
                  disabled={isLoading || isEditing}
                  placeholder="0.00"
                  aria-invalid={!!errors.initial_balance}
                  data-testid="input-initial-balance"
                />
                {errors.initial_balance && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-500">
                    <AlertCircle size={14} />
                    {errors.initial_balance}
                  </div>
                )}
              </div>

              {isEditing && (
                <div>
                  <Label htmlFor="current_balance">Balance Actual *</Label>
                  <Input
                    id="current_balance"
                    name="current_balance"
                    type="number"
                    value={formData.current_balance}
                    onChange={handleChange}
                    step="0.01"
                    disabled={isLoading}
                    placeholder="0.00"
                    aria-invalid={!!errors.current_balance}
                    data-testid="input-current-balance"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Modifica el balance actual de la cuenta según los movimientos reales
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Datos Bancarios (solo para cuentas de banco) */}
          {['BANK_BROU', 'BANK_SANTANDER', 'BANK_USD'].includes(formData.account_type) && (
            <div>
              <h3 className="font-semibold mb-3">Datos Bancarios</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="account_number">Número de Cuenta *</Label>
                  <Input
                    id="account_number"
                    name="account_number"
                    value={formData.account_number}
                    onChange={handleChange}
                    placeholder="Ej: 12345678"
                    disabled={isLoading}
                    aria-invalid={!!errors.account_number}
                  />
                  {errors.account_number && (
                    <div className="flex items-center gap-1 mt-1 text-sm text-red-500">
                      <AlertCircle size={14} />
                      {errors.account_number}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="bank_branch">Sucursal (Opcional)</Label>
                  <Input
                    id="bank_branch"
                    name="bank_branch"
                    value={formData.bank_branch}
                    onChange={handleChange}
                    placeholder="Ej: Montevideo, Punta del Este, etc."
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          )}

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

          {/* Info de lectura */}
          <div className="bg-blue-50 p-3 rounded border border-blue-200 text-sm text-blue-700">
            <p>
              {isEditing
                ? 'Los cambios en esta cuenta afectarán todos los movimientos futuros.'
                : 'Una vez creada, la cuenta estará disponible para registrar movimientos financieros.'}
            </p>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              data-testid="btn-cancel"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              data-testid="btn-save"
            >
              {isLoading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear Cuenta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
