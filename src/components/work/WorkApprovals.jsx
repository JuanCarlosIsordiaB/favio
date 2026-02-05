/**
 * MÓDULO 06: TRABAJOS Y PROYECCIONES
 * Componente para aprobar/rechazar trabajos agrícolas pendientes
 *
 * Funcionalidad:
 * - Listar trabajos con estado PENDING_APPROVAL
 * - Aprobar trabajos (descuenta stock automáticamente)
 * - Rechazar trabajos (devuelve a DRAFT)
 * - Ver detalle completo de trabajo
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAgriculturalWorks } from '../../hooks/useWorks';
import { useAuth } from '../../contexts/AuthContext';
import {
  CheckCircle2, XCircle, AlertCircle, Eye, Loader,
  DollarSign, Calendar, MapPin, Wrench, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export default function WorkApprovals({ selectedPremiseId, onAction }) {
  const { user } = useAuth();
  const { approve, reject } = useAgriculturalWorks();

  const [pendingWorks, setPendingWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWork, setSelectedWork] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingWorkId, setRejectingWorkId] = useState(null);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  // Cargar trabajos pendientes
  useEffect(() => {
    loadPendingWorks();
  }, [selectedPremiseId]);

  async function loadPendingWorks() {
    setLoading(true);
    try {
      const query = supabase
        .from('agricultural_works')
        .select(`
          *,
          firms(id, name),
          premises(id, name),
          lots(id, name, area_hectares),
          cost_centers(id, code, name)
        `)
        .eq('status', 'PENDING_APPROVAL')
        .order('date', { ascending: false });

      if (selectedPremiseId) {
        query.eq('premise_id', selectedPremiseId);
      }

      const { data, error } = await query;
      if (error) throw error;

      setPendingWorks(data || []);
    } catch (err) {
      console.error('Error loading pending works:', err);
      toast.error('Error al cargar trabajos pendientes');
    } finally {
      setLoading(false);
    }
  }

  const handleApprove = async (workId) => {
    if (!user?.id) {
      toast.error('Debes estar registrado para aprobar');
      return;
    }

    setApproving(true);
    try {
      await approve(workId, user?.id);
      toast.success('✅ Trabajo aprobado. Stock descontado automáticamente.');
      loadPendingWorks();
      if (onAction) onAction();
    } catch (err) {
      // Error ya muestra toast desde el hook
    } finally {
      setApproving(false);
    }
  };

  const handleRejectClick = (work) => {
    setSelectedWork(work);
    setRejectingWorkId(work.id);
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      toast.error('Debes ingresar un motivo de rechazo');
      return;
    }

    if (!user?.id) {
      toast.error('Debes estar registrado para rechazar');
      return;
    }

    setRejecting(true);
    try {
      await reject(rejectingWorkId, user?.id, rejectReason);
      toast.success('✓ Trabajo rechazado y devuelto a BORRADOR');
      setRejectReason('');
      setShowRejectModal(false);
      loadPendingWorks();
      if (onAction) onAction();
    } catch (err) {
      // Error ya muestra toast desde el hook
    } finally {
      setRejecting(false);
    }
  };

  const handleViewDetail = async (work) => {
    setSelectedWork(work);
    setShowDetailModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Aprobación de Trabajos</h2>
          <p className="text-sm text-slate-600 mt-1">
            {pendingWorks.length} trabajo{pendingWorks.length !== 1 ? 's' : ''} pendiente{pendingWorks.length !== 1 ? 's' : ''} de aprobación
          </p>
        </div>
      </div>

      {pendingWorks.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <p className="text-slate-600 font-medium">No hay trabajos pendientes de aprobación</p>
          <p className="text-sm text-slate-500 mt-2">Todos los trabajos han sido aprobados o están en borrador</p>
        </div>
      ) : (
        <div className="space-y-4" data-id="approvals-list">
          {pendingWorks.map((work) => (
            <Card key={work.id} data-id={`approval-row-${work.id}`} className="border-l-4 border-l-yellow-500 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-4">
                  {/* Información del trabajo */}
                  <div className="flex-1 min-w-0">
                    {/* Fila 1: Tipo de trabajo y fecha */}
                    <div className="flex items-center gap-3 mb-3">
                      <Wrench className="w-5 h-5 text-slate-500 flex-shrink-0" />
                      <h3 className="font-semibold text-lg text-slate-900">
                        {work.work_type}
                      </h3>
                      <Badge variant="outline" className="ml-auto">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(work.date).toLocaleDateString('es-ES')}
                      </Badge>
                    </div>

                    {/* Fila 2: Ubicación (Firma, Predio, Lote) */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3 bg-slate-50 p-3 rounded">
                      <div>
                        <p className="text-xs text-slate-600">Firma</p>
                        <p className="font-medium text-slate-900">{work.firms?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600">Predio</p>
                        <p className="font-medium text-slate-900">{work.premises?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600">Lote</p>
                        <p className="font-medium text-slate-900">{work.lots?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600">Hectáreas</p>
                        <p className="font-medium text-slate-900">{work.hectares} ha</p>
                      </div>
                    </div>

                    {/* Fila 3: Centro de costo y costos */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-slate-600">Centro de Costo</p>
                        <p className="font-medium text-slate-900">
                          {work.cost_centers?.code} - {work.cost_centers?.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600">Costo Insumos</p>
                        <p className="font-medium text-green-600">
                          ${(work.inputs_cost || 0).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600">Costo Maquinaria</p>
                        <p className="font-medium text-blue-600">
                          ${(work.machinery_cost || 0).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600">Costo Mano de Obra</p>
                        <p className="font-medium text-purple-600">
                          ${(work.labor_cost || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Fila 4: Costo total */}
                    <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">COSTO TOTAL</span>
                        <span className="text-2xl font-bold text-yellow-700">
                          ${(
                            (work.inputs_cost || 0) +
                            (work.machinery_cost || 0) +
                            (work.labor_cost || 0) +
                            (work.other_costs || 0)
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex flex-col gap-2 ml-4 flex-shrink-0">
                    <Button
                      data-id={`approval-row-${work.id}-btn-view`}
                      onClick={() => handleViewDetail(work)}
                      variant="outline"
                      size="sm"
                      className="w-full md:w-auto"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Detalle
                    </Button>

                    <Button
                      data-id={`approval-row-${work.id}-btn-approve`}
                      onClick={() => handleApprove(work.id)}
                      disabled={approving}
                      variant="success"
                      size="sm"
                      className="w-full md:w-auto"
                    >
                      {approving ? (
                        <Loader className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                      )}
                      Aprobar
                    </Button>

                    <Button
                      data-id={`approval-row-${work.id}-btn-reject`}
                      onClick={() => handleRejectClick(work)}
                      variant="destructive"
                      size="sm"
                      className="w-full md:w-auto"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Rechazar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal: Detalle del trabajo */}
      {showDetailModal && selectedWork && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div data-id="approval-detail-modal" className="bg-white rounded-lg shadow-xl max-w-3xl w-full my-8">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">
                Detalle del Trabajo: {selectedWork.work_type}
              </h3>
            </div>

            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Información general */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Información General</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600">Fecha</p>
                    <p className="font-medium">{new Date(selectedWork.date).toLocaleDateString('es-ES')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Responsable</p>
                    <p className="font-medium">{selectedWork.responsible_person || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Hectáreas</p>
                    <p className="font-medium">{selectedWork.hectares}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Combustible (L)</p>
                    <p className="font-medium">{selectedWork.fuel_used || 0}</p>
                  </div>
                </div>
              </div>

              {/* Ubicación */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Ubicación</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-slate-600">Firma</p>
                    <p className="font-medium">{selectedWork.firms?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Predio</p>
                    <p className="font-medium">{selectedWork.premises?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Lote</p>
                    <p className="font-medium">{selectedWork.lots?.name}</p>
                  </div>
                </div>
              </div>

              {/* Resumen de costos */}
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-3">Resumen de Costos</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-600">Insumos</p>
                    <p className="text-lg font-bold text-green-600">
                      ${(selectedWork.inputs_cost || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Maquinaria</p>
                    <p className="text-lg font-bold text-blue-600">
                      ${(selectedWork.machinery_cost || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Mano de Obra</p>
                    <p className="text-lg font-bold text-purple-600">
                      ${(selectedWork.labor_cost || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">TOTAL</p>
                    <p className="text-lg font-bold text-slate-900">
                      ${(
                        (selectedWork.inputs_cost || 0) +
                        (selectedWork.machinery_cost || 0) +
                        (selectedWork.labor_cost || 0) +
                        (selectedWork.other_costs || 0)
                      ).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Detalle */}
              {selectedWork.detail && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Observaciones</h4>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded text-sm whitespace-pre-wrap">
                    {selectedWork.detail}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
              <Button onClick={() => setShowDetailModal(false)} variant="ghost">
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Rechazar trabajo */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div data-id="approval-reject-modal" className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-orange-500" />
                <h3 className="text-lg font-bold text-slate-900">Rechazar Trabajo</h3>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-slate-700">
                ¿Estás seguro que deseas rechazar este trabajo? Será devuelto a estado BORRADOR
                y podrá ser editado nuevamente.
              </p>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Motivo del rechazo *
                </label>
                <textarea
                  data-id="approval-reject-modal-textarea-reason"
                  rows="3"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ej: Falta documentación, cantidad insuficiente de insumos, etc."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
              <Button
                data-id="approval-reject-modal-btn-cancel"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                variant="ghost"
                disabled={rejecting}
              >
                Cancelar
              </Button>
              <Button
                data-id="approval-reject-modal-btn-confirm"
                onClick={handleRejectSubmit}
                disabled={rejecting || !rejectReason.trim()}
                variant="destructive"
              >
                {rejecting ? <Loader className="w-4 h-4 mr-1 animate-spin" /> : null}
                Rechazar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
