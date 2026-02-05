import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import PersonnelFormModal from '../modales/PersonnelFormModal';
import { Search, Plus, Trash2, Edit2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { eliminarPersonal } from '../../services/personnel';

export default function PersonnelListView({
  firmId,
  personnel = [],
  loading,
  onRefresh,
  currentUser
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (personId, personName) => {
    try {
      setDeletingId(personId);
      await eliminarPersonal(personId, currentUser);
      toast.success(`${personName} dado de baja correctamente`);
      onRefresh?.();
    } catch (error) {
      toast.error(`Error al dar de baja: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredPersonnel = personnel.filter(p => {
    const matchesSearch = p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.document_id.includes(searchTerm) ||
                         p.position_title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || p.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const roles = [
    { value: 'admin', label: 'Administrador' },
    { value: 'engineer', label: 'Ingeniero' },
    { value: 'director', label: 'Director' },
    { value: 'manager', label: 'Gerente' },
    { value: 'field_supervisor', label: 'Capataz' },
    { value: 'operator', label: 'Operario' }
  ];

  const getStatusColor = (status) => {
    const colors = {
      'ACTIVE': 'bg-green-100 text-green-800',
      'INACTIVE': 'bg-gray-100 text-gray-800',
      'ON_LEAVE': 'bg-yellow-100 text-yellow-800',
      'SUSPENDED': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getRoleLabel = (role) => {
    const role_obj = roles.find(r => r.value === role);
    return role_obj?.label || role;
  };

  if (!firmId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            Selecciona una empresa para ver el personal.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controles */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, cédula o cargo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-4 py-2 border rounded-lg bg-white"
              >
                <option value="all">Todos los roles</option>
                {roles.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar Personal
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              Mostrando {filteredPersonnel.length} de {personnel.length} registros
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">
              Cargando personal...
            </div>
          ) : filteredPersonnel.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {searchTerm || filterRole !== 'all' ? (
                <p>No se encontraron registros con los filtros aplicados</p>
              ) : (
                <p>No hay personal registrado. Agrega uno para comenzar.</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Nombre</th>
                    <th className="text-left py-3 px-4 font-semibold">Documento</th>
                    <th className="text-left py-3 px-4 font-semibold">Cargo</th>
                    <th className="text-left py-3 px-4 font-semibold">Rol</th>
                    <th className="text-left py-3 px-4 font-semibold">Estado</th>
                    <th className="text-left py-3 px-4 font-semibold">Salario</th>
                    <th className="text-center py-3 px-4 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPersonnel.map(person => (
                    <tr key={person.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{person.full_name}</p>
                          <p className="text-sm text-muted-foreground">{person.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-sm">
                        {person.document_id}
                      </td>
                      <td className="py-3 px-4">
                        {person.position_title}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                          {getRoleLabel(person.role)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-sm ${getStatusColor(person.status)}`}>
                          {person.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        ${parseFloat(person.salary_amount || 0).toLocaleString('es-UY', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => setEditingId(person.id)}
                            className="p-1 hover:bg-blue-100 rounded text-blue-600"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`¿Dar de baja a ${person.full_name}?`)) {
                                handleDelete(person.id, person.full_name);
                              }
                            }}
                            disabled={deletingId === person.id}
                            className="p-1 hover:bg-red-100 rounded text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Dar de baja"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {(showAddModal || editingId) && (
        <PersonnelFormModal
          firmId={firmId}
          personnelId={editingId}
          onClose={() => {
            setShowAddModal(false);
            setEditingId(null);
          }}
          onSave={() => {
            setShowAddModal(false);
            setEditingId(null);
            onRefresh?.();
          }}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
