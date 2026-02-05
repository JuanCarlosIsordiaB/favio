import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useFinancialAccounts } from '../../hooks/useFinancialAccounts';
import { FinancialAccountFormModal } from '../modales/FinancialAccountFormModal';
import { FinancialAccountMovementsModal } from '../modales/FinancialAccountMovementsModal';
import {
  AlertCircle,
  Edit,
  Trash2,
  Eye,
  Plus,
  Landmark
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Vista completa de Cuentas Financieras (Caja/Bancos)
 * @component
 */
export function FinancialAccountsListView({ firmId, onAccountUpdated }) {
  const { accounts, loading, error, loadAccounts, addAccount, updateAccount, deleteAccount, loadSummary } = useFinancialAccounts();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMovementsModalOpen, setIsMovementsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [selectedAccountForMovements, setSelectedAccountForMovements] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterCurrency, setFilterCurrency] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [summary, setSummary] = useState(null);

  /**
   * Cargar cuentas al montar o cambiar firma
   */
  useEffect(() => {
    if (firmId) {
      loadAccountsData();
    }
  }, [firmId]);

  /**
   * Cargar resumen cuando cambian las cuentas
   */
  useEffect(() => {
    if (firmId && accounts.length > 0) {
      loadSummaryData();
    }
  }, [accounts, firmId]);

  const loadAccountsData = async () => {
    try {
      await loadAccounts(firmId, {});
    } catch (err) {
      // Error ya fue manejado por el hook
    }
  };

  const loadSummaryData = async () => {
    try {
      const data = await loadSummary(firmId);
      setSummary(data);
    } catch (err) {
      // Error ya fue manejado por el hook
    }
  };

  /**
   * Filtrar datos
   */
  const filteredAccounts = accounts.filter(account => {
    const matchesType = filterType === 'all' || account.account_type === filterType;
    const matchesCurrency = filterCurrency === 'all' || account.currency === filterCurrency;
    const matchesSearch = searchTerm === '' ||
      account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (account.code && account.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (account.bank_name && account.bank_name.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesType && matchesCurrency && matchesSearch;
  });

  /**
   * Obtener etiqueta de tipo de cuenta
   */
  const getAccountTypeLabel = (type) => {
    const labels = {
      'CASH': 'Caja',
      'BANK_BROU': 'Banco BROU',
      'BANK_SANTANDER': 'Banco Santander',
      'BANK_USD': 'Banco (USD)'
    };
    return labels[type] || type;
  };

  /**
   * Obtener color de tipo de cuenta
   */
  const getAccountTypeColor = (type) => {
    switch (type) {
      case 'CASH':
        return 'bg-green-100 text-green-800';
      case 'BANK_BROU':
        return 'bg-blue-100 text-blue-800';
      case 'BANK_SANTANDER':
        return 'bg-cyan-100 text-cyan-800';
      case 'BANK_USD':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * Manejar guardar cuenta (crear o actualizar)
   */
  const handleSaveAccount = async (accountData) => {
    try {
      if (editingAccount) {
        await updateAccount(editingAccount.id, accountData);
        toast.success('Cuenta actualizada exitosamente');
        // Notificar al padre (FinanceManager) que se actualizó una cuenta
        if (onAccountUpdated) {
          onAccountUpdated();
        }
      } else {
        // En creación, no enviar current_balance al servidor
        // Será establecido automáticamente a initial_balance
        const { current_balance, ...dataWithoutCurrentBalance } = accountData;
        await addAccount({ ...dataWithoutCurrentBalance, firm_id: firmId });
        toast.success('Cuenta financiera creada exitosamente');
      }
      setIsModalOpen(false);
      setEditingAccount(null);
      await loadAccountsData();
    } catch (err) {
      // Error ya fue manejado por el hook
    }
  };

  /**
   * Manejar eliminación
   */
  const handleDeleteAccount = async (id) => {
    if (confirm('¿Eliminar esta cuenta? Si tiene movimientos, será desactivada.')) {
      try {
        await deleteAccount(id, 'usuario');
        toast.success('Cuenta eliminada o desactivada');
        await loadAccountsData();
      } catch (err) {
        // Error ya fue manejado por el hook
      }
    }
  };

  /**
   * Manejar edición
   */
  const handleEditAccount = (account) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  /**
   * Manejar ver movimientos
   */
  const handleViewMovements = (account) => {
    setSelectedAccountForMovements(account);
    setIsMovementsModalOpen(true);
  };

  /**
   * Manejar nueva cuenta
   */
  const handleNewAccount = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header con resumen */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Cuentas Financieras</h2>
          <p className="text-gray-600 mt-1">Gestión de cajas y cuentas bancarias</p>
        </div>
        <Button
          onClick={handleNewAccount}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
          data-testid="btn-new-account"
        >
          <Plus size={16} className="mr-2" />
          Nueva Cuenta
        </Button>
      </div>

      {/* Resumen de balances */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total UYU</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                UYU {summary.total_uyu.toLocaleString('es-UY', { maximumFractionDigits: 0 })}
              </div>
              <p className="text-xs text-slate-500 mt-1">En cuentas y cajas</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total USD</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                USD {summary.total_usd.toLocaleString('es-UY', { maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-500 mt-1">En cuentas y cajas</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Cuentas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {summary.cuentas_count}
              </div>
              <p className="text-xs text-slate-500 mt-1">Cuentas activas</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg border grid grid-cols-4 gap-3">
        <Input
          placeholder="Buscar por nombre o código..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          data-testid="input-search-accounts"
        />

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger>
            <SelectValue placeholder="Tipo de Cuenta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="CASH">Caja</SelectItem>
            <SelectItem value="BANK_BROU">Banco BROU</SelectItem>
            <SelectItem value="BANK_SANTANDER">Banco Santander</SelectItem>
            <SelectItem value="BANK_USD">Banco (USD)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterCurrency} onValueChange={setFilterCurrency}>
          <SelectTrigger>
            <SelectValue placeholder="Moneda" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las monedas</SelectItem>
            <SelectItem value="UYU">Pesos Uruguayos</SelectItem>
            <SelectItem value="USD">Dólares USA</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setFilterType('all');
              setFilterCurrency('all');
            }}
            className="flex-1"
          >
            Limpiar
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded">
          <AlertCircle size={20} className="text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <Table data-testid="accounts-table">
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Moneda</TableHead>
              <TableHead>Código/Banco</TableHead>
              <TableHead className="text-right">Balance Actual</TableHead>
              <TableHead className="text-right">Balance Inicial</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan="8" className="text-center py-8 text-gray-500">
                  Cargando cuentas financieras...
                </TableCell>
              </TableRow>
            ) : filteredAccounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan="8" className="text-center py-8 text-gray-500">
                  No hay cuentas financieras
                </TableCell>
              </TableRow>
            ) : (
              filteredAccounts.map(account => (
                <TableRow key={account.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Landmark size={16} className="text-gray-400" />
                      {account.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getAccountTypeColor(account.account_type)}>
                      {getAccountTypeLabel(account.account_type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{account.currency}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {account.account_type === 'BANK' ? (
                      <div className="space-y-0">
                        <div>{account.code || '-'}</div>
                        <div className="text-gray-500 text-xs">{account.bank_name || '-'}</div>
                      </div>
                    ) : (
                      account.code || '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right font-bold text-green-600">
                    {account.currency} {account.current_balance?.toLocaleString('es-UY', { maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right text-sm text-gray-600">
                    {account.currency} {account.initial_balance?.toLocaleString('es-UY', { maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={account.is_active ? 'default' : 'secondary'}>
                      {account.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewMovements(account)}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                        title="Ver movimientos"
                        data-testid={`btn-view-movements-${account.id}`}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleEditAccount(account)}
                        className="text-amber-600 hover:text-amber-800 p-1 rounded hover:bg-amber-50"
                        title="Editar"
                        data-testid={`btn-edit-account-${account.id}`}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(account.id)}
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                        title="Eliminar"
                        data-testid={`btn-delete-account-${account.id}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Form Modal */}
      <FinancialAccountFormModal
        isOpen={isModalOpen}
        isEditing={!!editingAccount}
        account={editingAccount}
        firmId={firmId}
        onSubmit={handleSaveAccount}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingAccount(null);
        }}
      />

      {/* Movements Modal */}
      {selectedAccountForMovements && (
        <FinancialAccountMovementsModal
          isOpen={isMovementsModalOpen}
          account={selectedAccountForMovements}
          onClose={() => {
            setIsMovementsModalOpen(false);
            setSelectedAccountForMovements(null);
          }}
        />
      )}
    </div>
  );
}
