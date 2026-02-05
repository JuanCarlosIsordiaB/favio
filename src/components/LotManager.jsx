import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { crearRegistro } from '../services/registros';
import { Plus, Edit2, Map as MapIcon, Save, X, Trash2, AlertCircle, AlertTriangle, Warehouse, ChevronDown, SplitSquareHorizontal, FileUp, CheckCircle2, Mic, Square, Loader, Play, Pause } from 'lucide-react';
import LotMapEditor from './LotMapEditor';
import { CompareMap } from './mapas/CompareMap';
import { LoteDetailModal } from './lotes/LoteDetailModal';
import { useAuth } from '../contexts/AuthContext';
import { useLotes } from '../hooks/useLotes';
import { verificarSolapamiento } from '../services/geospatial';
import { getAnimalCountByLot } from '../services/livestock';
import { uploadLotDocument, uploadAudioNote } from '../services/lotes';

import { MiniAudioPlayer } from './ui/MiniAudioPlayer';

export default function LotManager({ selectedFirmId, selectedPremiseId, onSelectPremise }) {
  const { user } = useAuth();
  const { lotes: lots, loading: isLoading, loadLotes, addLote, updateLote, deleteLote } = useLotes();
  const [premises, setPremises] = useState([]);
  const [premiseDetails, setPremiseDetails] = useState(null);
  const [animalCounts, setAnimalCounts] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // Nuevo estado
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);

  const startRecording = async () => {
    console.log("Intentando iniciar grabación...");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error("Tu navegador no soporta grabación de audio.");
      return;
    }

    try {
      // Paso 1: Verificar si ya tenemos acceso a dispositivos (labels visibles = permiso concedido)
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = devices.filter(d => d.kind === 'audioinput');
      const hasLabels = audioDevices.some(d => d.label.length > 0);

      console.log("Dispositivos encontrados:", audioDevices.length, "Labels visibles:", hasLabels);

      let stream;

      if (hasLabels) {
        console.log("Permiso ya concedido (labels visibles). Solicitando stream directo...");
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } else {
        console.log("Labels no visibles. Se requiere Prompt de permisos...");

        const streamPromise = navigator.mediaDevices.getUserMedia({ audio: true });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT_PERMISSION')), 8000)
        );

        stream = await Promise.race([streamPromise, timeoutPromise]);
      }

      console.log("Stream obtenido, iniciando MediaRecorder...");

      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.onerror = (e) => {
        console.error("Error en MediaRecorder:", e);
        toast.error("Error interrupción de grabación.");
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);

    } catch (err) {
      console.error("Error grabación:", err);
      if (err.message === 'TIMEOUT_PERMISSION') {
        toast.warning(
          "El navegador no muestra el prompt. Posible solución: Haz clic en el candado 🔒 -> 'Permisos' -> 'Restablecer permisos' y recarga la página.",
          { duration: 12000 }
        );
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error("Permiso denegado. Desbloquea el micrófono en el candado 🔒 de la URL.");
      } else if (err.name === 'NotFoundError') {
        toast.error("No se detectó ningún micrófono.");
      } else {
        toast.error("Error: " + err.message);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      console.log("Deteniendo grabación...");
      mediaRecorder.stop();
      setIsRecording(false);
      // Nota: getTracks().forEach(track => track.stop()) se movió al onstop para asegurar limpieza
    }
  };
  // ... (omitiendo otros estados)

  // ... (omitiendo otros estados)

  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isMapMode, setIsMapMode] = useState(false);
  const [isGeneralMapMode, setIsGeneralMapMode] = useState(false);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareMode, setCompareMode] = useState('layer'); // 'layer' o 'temporal'
  const [currentLot, setCurrentLot] = useState(null);
  const [viewingLot, setViewingLot] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // ... (resto del componente hasta el render)

  const [formData, setFormData] = useState({
    name: '',
    area_hectares: '', // Este actuará como Superficie Total (Auto)
    hectareas_agricolas: '', // Manual
    land_use: '',
    crops: '',
    pasture_height: '',
    pasture_height_date: '',
    remnant_height: '',
    planting_date: '',
    polygon_data: null,
    pumrs_url: '',
    pumrs_file: null,
    is_depot: false
  });

  useEffect(() => {
    if (selectedFirmId) {
      fetchPremises();
    } else {
      setPremises([]);
    }
  }, [selectedFirmId]);

  useEffect(() => {
    if (selectedPremiseId) {
      loadLotes(selectedPremiseId);
      fetchPremiseDetails();
      fetchAnimalCounts();
    }
  }, [selectedPremiseId, loadLotes]);

  async function fetchAnimalCounts() {
    try {
      const counts = await getAnimalCountByLot(selectedPremiseId);
      setAnimalCounts(counts);
    } catch (error) {
      console.error('Error fetching animal counts:', error);
    }
  }

  async function fetchPremises() {
    try {
      const { data, error } = await supabase
        .from('premises')
        .select('*')
        .eq('firm_id', selectedFirmId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPremises(data || []);
    } catch (error) {
      console.error('Error fetching premises:', error);
    }
  }

  async function fetchPremiseDetails() {
    try {
      const { data, error } = await supabase
        .from('premises')
        .select('*')
        .eq('id', selectedPremiseId)
        .single();

      if (!error) {
        setPremiseDetails(data);
      }
    } catch (error) {
      console.error('Error fetching premise details:', error);
    }
  }

  async function handleSubmit(e) {

    e.preventDefault();

    try {

      setIsSaving(true);

      const totalHa = parseFloat(formData.area_hectares);
      const hectareasAgricolas = parseFloat(formData.hectareas_agricolas);

      // Permitir si hay área auto calculada O hectáreas agrícolas manuales
      if ((!totalHa || totalHa <= 0) && (!hectareasAgricolas || hectareasAgricolas <= 0)) {
        toast.error('Debe dibujar el lote en el mapa o ingresar hectáreas agrícolas manuales');
        return;
      }

      // Si no hay área calculada pero hay hectáreas manuales, usar esas
      const finalHa = totalHa > 0 ? totalHa : hectareasAgricolas;

      // Validación: Altura de pastura si está ingresada, debe ser positiva
      if (formData.pasture_height) {
        const pastureHeight = parseFloat(formData.pasture_height);
        if (pastureHeight < 0) {
          toast.error('La altura de pastura no puede ser negativa');
          return;
        }
      }

      // Validación: Altura de remanente si está ingresada, debe ser positiva
      if (formData.remnant_height) {
        const remnantHeight = parseFloat(formData.remnant_height);
        if (remnantHeight < 0) {
          toast.error('La altura de remanente no puede ser negativa');
          return;
        }
      }

      // Validación Geoespacial: Solapamiento
      if (formData.polygon_data) {
        const loteSolapado = verificarSolapamiento(
          formData.polygon_data,
          lots,
          isEditing ? currentLot?.id : null
        );

        if (loteSolapado) {
          toast.error(`Error: El polígono se solapa con el lote "${loteSolapado.name}". Ajusta los límites en el mapa.`);
          return;
        }
      }

      let finalPumrsUrl = formData.pumrs_url;
      if (formData.pumrs_file) {
        setIsUploading(true);
        try {
          finalPumrsUrl = await uploadLotDocument(formData.pumrs_file, formData.name);
        } catch (err) {
          toast.error('Error al subir documento');
          setIsUploading(false);
          return;
        }
        setIsUploading(false);
      }

      let finalAudioUrl = currentLot?.audio_note_url || '';
      if (audioBlob) {
        setIsUploading(true);
        try {
          finalAudioUrl = await uploadAudioNote(audioBlob, formData.name);
        } catch (err) {
          toast.error('Error al subir nota de voz');
        }
        setIsUploading(false);
      }

      const lotData = {
        firm_id: selectedFirmId,
        premise_id: selectedPremiseId,
        name: formData.name,
        area_hectares: finalHa,
        hectareas_agricolas: formData.hectareas_agricolas ? parseFloat(formData.hectareas_agricolas) : null,
        land_use: formData.land_use,
        crops: formData.crops,
        pasture_height: formData.pasture_height ? parseFloat(formData.pasture_height) : null,
        pasture_height_date: formData.pasture_height_date || null,
        remnant_height: formData.remnant_height ? parseFloat(formData.remnant_height) : null,
        planting_date: formData.planting_date || null,
        polygon_data: formData.polygon_data,
        pumrs_url: finalPumrsUrl,
        audio_note_url: finalAudioUrl,
        is_depot: formData.is_depot
      };

      let resultLote;
      if (isEditing && currentLot) {
        resultLote = await updateLote(currentLot.id, lotData);
      } else {
        resultLote = await addLote(lotData);
      }

      // Auditoría
      try {
        await crearRegistro({
          firmId: selectedFirmId,
          premiseId: selectedPremiseId,
          lotId: resultLote?.id || (isEditing ? currentLot?.id : null),
          tipo: isEditing ? 'lote_actualizado' : 'lote_creado',
          descripcion: `Lote "${formData.name}" ${isEditing ? 'actualizado' : 'creado'}`,
          moduloOrigen: 'lotes',
          usuario: user?.full_name || 'sistema',
          referencia: resultLote?.id || (isEditing ? currentLot?.id : null),
          metadata: {
            nombre: formData.name,
            area: finalHa,
            usoSuelo: formData.land_use,
            cultivos: formData.crops,
            esDeposito: formData.is_depot
          }
        });
      } catch (auditError) {
        console.error('Error registering audit log:', auditError);
      }

      toast.success(
        isEditing
          ? `Lote "${formData.name}" actualizado exitosamente`
          : `Lote "${formData.name}" creado exitosamente`
      );

      resetForm();
    } catch (error) {
      console.error('Error saving lot:', error);
      toast.error(error.message || 'Error al guardar el lote');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!currentLot) return;

    try {
      setIsDeleting(true);
      const lotNameToDelete = currentLot.name;
      const lotIdToDelete = currentLot.id;

      await deleteLote(currentLot.id);

      // Auditoría
      try {
        await crearRegistro({
          firmId: selectedFirmId,
          premiseId: selectedPremiseId,
          lotId: lotIdToDelete,
          tipo: 'lote_eliminado',
          descripcion: `Lote "${lotNameToDelete}" eliminado`,
          moduloOrigen: 'lotes',
          usuario: user?.full_name || 'sistema',
          referencia: lotIdToDelete,
          metadata: {
            nombre: lotNameToDelete,
            area: currentLot.area_hectares,
            usoSuelo: currentLot.land_use,
            cultivos: currentLot.crops,
            esDeposito: currentLot.is_depot
          }
        });
      } catch (auditError) {
        console.error('Error registering audit log:', auditError);
      }

      toast.success(`Lote eliminado exitosamente`);
      resetForm();
    } catch (error) {
      console.error('Error deleting lot:', error);
      toast.error('Error al eliminar el lote.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  function resetForm() {
    setIsCreating(false);
    setIsEditing(false);
    setIsMapMode(false);
    setCurrentLot(null);
    setShowDeleteConfirm(false);
    setAudioBlob(null);
    setMediaRecorder(null);
    setIsRecording(false);
    setFormData({
      name: '',
      area_hectares: '',
      hectareas_agricolas: '',
      land_use: '',
      crops: '',
      pasture_height: '',
      pasture_height_date: '',
      remnant_height: '',
      planting_date: '',
      polygon_data: null,
      pumrs_url: '',
      pumrs_file: null,
      audio_note_url: '',
      is_depot: false
    });
  }

  function handleEdit(lot) {
    setCurrentLot(lot);
    setAudioBlob(null);
    setMediaRecorder(null);
    setIsRecording(false);
    setFormData({
      name: lot.name,
      area_hectares: lot.area_hectares,
      hectareas_agricolas: lot.hectareas_agricolas || '',
      land_use: lot.land_use || '',
      crops: lot.crops || '',
      pasture_height: lot.pasture_height || '',
      pasture_height_date: lot.pasture_height_date || '',
      remnant_height: lot.remnant_height || '',
      planting_date: lot.planting_date || '',
      polygon_data: lot.polygon_data,
      pumrs_url: lot.pumrs_url || '',
      pumrs_file: null,
      audio_note_url: lot.audio_note_url || '',
      is_depot: lot.is_depot || false
    });
    setIsEditing(true);
    setIsCreating(false);
  }

  function handleMapSave(polygonData, areaHa) {
    // Validar solapamiento inmediatamente al intentar guardar el mapa
    const loteSolapado = verificarSolapamiento(
      polygonData,
      lots,
      isEditing ? currentLot?.id : null
    );

    if (loteSolapado) {
      toast.error(`Error Crítico: El polígono se solapa con el lote "${loteSolapado.name}". Por favor corrige los límites antes de continuar.`);
      return;
    }

    setFormData(prev => ({
      ...prev,
      polygon_data: polygonData,
      area_hectares: areaHa ? areaHa.toFixed(2) : prev.area_hectares
    }));
    setIsMapMode(false);
  }

  function handleViewMap(lot) {
    if (!lot.polygon_data) {
      alert('Este lote no tiene un polígono definido.');
      return;
    }
    setViewingLot(lot);
  }

  if (!selectedPremiseId) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-12 h-12 text-amber-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-900 mb-3">Selecciona un Predio</h3>
              {premises.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-amber-800 text-sm">Elige un predio de la siguiente lista para gestionar sus lotes:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {premises.map((premise) => (
                      <button
                        key={premise.id}
                        onClick={() => onSelectPremise && onSelectPremise(premise)}
                        className="text-left p-3 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 hover:border-amber-500 transition-colors font-medium text-slate-700"
                      >
                        {premise.name}
                        {premise.total_area && <span className="text-slate-500 text-sm ml-2">({premise.total_area} ha)</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-amber-800 text-sm">No hay predios disponibles. Debes crear un predio primero.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isMapMode) {
    return (
      <LotMapEditor
        initialPolygon={formData.polygon_data}
        onSave={handleMapSave}
        onCancel={() => setIsMapMode(false)}
        lotName={formData.name}
        siblingLots={lots}
      />
    );
  }

  if (isGeneralMapMode) {
    const totalAllocated = lots.reduce((sum, lot) => sum + (parseFloat(lot.area_hectares) || 0), 0);
    const totalPremise = premiseDetails?.total_area || 0;

    return (
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-800">Mapa General del Predio</h3>
            <div className="flex gap-4 text-sm mt-1">
              <span className="text-slate-600">Total Predio: <span className="font-semibold">{totalPremise} ha</span></span>
              <span className="text-emerald-600">Asignado: <span className="font-semibold">{totalAllocated.toFixed(2)} ha</span></span>
              <span className="text-slate-500">Disponible: <span className="font-semibold">{(totalPremise - totalAllocated).toFixed(2)} ha</span></span>
            </div>
          </div>
          <button
            onClick={() => setIsGeneralMapMode(false)}
            className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Volver a la Lista
          </button>
        </div>

        <LotMapEditor
          initialPolygon={[]}
          onSave={() => { }}
          onCancel={() => setIsGeneralMapMode(false)}
          lotName="Mapa General"
          isViewMode={true}
          siblingLots={lots}
          onLotClick={(lot) => {
            setViewingLot(lot);
          }}
        />

        {/* Modal de Detalle accesible desde el mapa general */}
        <LoteDetailModal
          lote={viewingLot}
          predio={premiseDetails}
          open={!!viewingLot}
          onOpenChange={(open) => !open && setViewingLot(null)}
          onEdit={(lot) => {
            setViewingLot(null);
            handleEdit(lot);
          }}
          onDelete={(lot) => {
            setViewingLot(null);
            setCurrentLot(lot);
            setShowDeleteConfirm(true);
          }}
        />
      </div>
    );
  }

  if (isCompareMode) {
    // ... (rest of isCompareMode remains same)

    return (
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div>
              <h3 className="font-bold text-slate-800">Comparación de Capas</h3>
              <p className="text-sm text-slate-500">Desliza la barra para analizar cambios</p>
            </div>

            {/* Selector de Modo de Comparación */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setCompareMode('layer')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${compareMode === 'layer' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Mapa vs NDVI
              </button>
              <button
                onClick={() => setCompareMode('temporal')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${compareMode === 'temporal' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Fecha vs Fecha (NDVI)
              </button>
            </div>
          </div>
          <button
            onClick={() => setIsCompareMode(false)}
            className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Volver
          </button>
        </div>

        <CompareMap
          mode={compareMode}
          lots={lots}
          center={(() => {
            // 1. Si hay lotes, centrar en el primero (Leaflet espera [lat, lng])
            if (lots && lots.length > 0 && lots[0].polygon_data) {
              const poly = lots[0].polygon_data;
              // Caso: Array simple [[lat, lng], ...]
              if (Array.isArray(poly) && poly.length > 0) return [poly[0][0], poly[0][1]];
              // Caso: GeoJSON
              if (poly.coordinates?.[0]?.[0]) return [poly.coordinates[0][0][1], poly.coordinates[0][0][0]];
            }
            // 2. Fallback por defecto (Uruguay)
            return [-32.522779, -55.765835];
          })()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-16 py-6">
      {/* FIX #9: Selector de predio en página Lotes */}
      {premises.length > 1 && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Cambiar Predio:</label>
          <div className="relative flex-1 max-w-xs">
            <select
              value={selectedPremiseId || ''}
              onChange={(e) => {
                const selectedPremise = premises.find(p => p.id === e.target.value);
                if (selectedPremise && onSelectPremise) {
                  onSelectPremise(selectedPremise);
                }
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg appearance-none bg-white text-slate-700 font-medium hover:border-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent cursor-pointer"
            >
              <option value="">-- Selecciona un predio --</option>
              {premises.map((premise) => (
                <option key={premise.id} value={premise.id}>
                  {premise.name} {premise.total_area && `(${premise.total_area} ha)`}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">

        <div>

          <h2 className="text-2xl font-bold text-slate-800">Gestión de Lotes</h2>

          <p className="text-slate-500">Administra los lotes y mapas del predio seleccionado</p>

        </div>

        {!isCreating && !isEditing && (

          <div className="flex gap-3">

            <button onClick={() => setIsCompareMode(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"><SplitSquareHorizontal className="w-4 h-4" /> Comparar Capas</button>

            <button onClick={() => setIsGeneralMapMode(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"><MapIcon className="w-4 h-4" /> Ver Mapa General</button>

            <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"><Plus className="w-4 h-4" /> Nuevo Lote</button>

          </div>

        )}

      </div>



      {/* Dashboard de Superficies del Predio */}

      {!isCreating && !isEditing && !isMapMode && !isCompareMode && !isGeneralMapMode && (

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">

            <p className="text-xs font-bold text-slate-500 uppercase">Total Predio</p>

            <p className="text-2xl font-black text-slate-700">{premiseDetails?.total_area || 0} <span className="text-sm font-normal">ha</span></p>

          </div>

          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">

            <p className="text-xs font-bold text-emerald-600 uppercase">Asignado</p>

            <p className="text-2xl font-black text-emerald-700">

              {lots.reduce((sum, lot) => sum + (parseFloat(lot.area_hectares) || 0), 0).toFixed(2)}

              <span className="text-sm font-normal text-emerald-600"> ha</span>

            </p>

          </div>

          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">

            <p className="text-xs font-bold text-blue-600 uppercase">Disponible</p>

            <p className="text-2xl font-black text-blue-700">

              {((parseFloat(premiseDetails?.total_area) || 0) - lots.reduce((sum, lot) => sum + (parseFloat(lot.area_hectares) || 0), 0)).toFixed(2)}

              <span className="text-sm font-normal text-blue-600"> ha</span>

            </p>

          </div>

        </div>

      )}

      {(isCreating || isEditing) && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative">
          {showDeleteConfirm && (
            <div className="absolute inset-0 bg-white/90 z-10 flex items-center justify-center rounded-xl p-6">
              <div className="bg-white border border-red-200 shadow-lg rounded-xl p-6 max-w-md w-full text-center">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">¿Desactivar este lote?</h3>
                <p className="text-slate-600 mb-6">El lote desaparecerá de la lista activa, pero su <span className="font-bold">historial productivo y financiero</span> se conservará por seguridad.</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                  <button onClick={handleDelete} disabled={isDeleting} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">{isDeleting ? 'Desactivando...' : 'Sí, Desactivar'}</button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-slate-800">
                {isEditing ? 'Editar Lote' : 'Nuevo Lote'}
              </h3>
              {isEditing && (
                <button onClick={() => setShowDeleteConfirm(true)} className="text-red-500 hover:text-red-700 p-2 rounded-lg flex items-center gap-2 text-sm font-medium"><Trash2 size={16} /> Desactivar</button>
              )}
            </div>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de Lote o depósito</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Ej: Lote Norte"
                />
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_depot"
                    checked={formData.is_depot}
                    onChange={(e) => setFormData({ ...formData, is_depot: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                  />
                  <label htmlFor="is_depot" className="text-sm text-slate-700 font-medium cursor-pointer flex items-center gap-1">
                    <Warehouse size={14} className="text-slate-500" />
                    Funciona como Depósito de Insumos
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hectáreas Totales (Auto)</label>
                <input type="number" readOnly value={formData.area_hectares} className="w-full px-3 py-2 border rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed" placeholder="Auto" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hectáreas Agrícolas (Manual)</label>
                <input type="number" step="0.01" value={formData.hectareas_agricolas} onChange={(e) => setFormData({ ...formData, hectareas_agricolas: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Uso de Suelo</label>
                <select
                  value={formData.land_use}
                  onChange={(e) => setFormData({ ...formData, land_use: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                >
                  <option value="">Seleccione uso...</option>
                  <option value="Pradera">Pradera</option>
                  <option value="Cultivo">Cultivo</option>
                  <option value="Campo natural">Campo natural</option>
                  <option value="Barbecho">Barbecho</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Plan de Uso (PUMRS)</label>
                {formData.pumrs_url && !formData.pumrs_file ? (
                  <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <a href={formData.pumrs_url} target="_blank" rel="noreferrer" className="text-xs text-emerald-700 font-medium hover:underline flex items-center gap-1 truncate">
                      <FileUp size={14} /> Documento Actual
                    </a>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, pumrs_url: '' })}
                      className="text-emerald-500 hover:text-red-500 p-1"
                      title="Quitar documento"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input type="file" onChange={(e) => setFormData({ ...formData, pumrs_file: e.target.files[0] })} className="text-xs text-slate-500 w-full" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Siembra</label>
                <input
                  type="date"
                  value={formData.planting_date}
                  onChange={(e) => setFormData({ ...formData, planting_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Altura de Pastura (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.pasture_height}
                  onChange={(e) => setFormData({ ...formData, pasture_height: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Ej: 15.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Altura de Remanente (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.remnant_height}
                  onChange={(e) => setFormData({ ...formData, remnant_height: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Ej: 5.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Altura Pastura</label>
                <input
                  type="date"
                  value={formData.pasture_height_date}
                  onChange={(e) => setFormData({ ...formData, pasture_height_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div className="md:col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-slate-700">Cultivos en el Lote</label>
                  <div className="flex items-center gap-2">
                    {formData.audio_note_url && !audioBlob && (
                      <div className="mr-2">
                        <MiniAudioPlayer
                          url={formData.audio_note_url}
                          onDelete={() => setFormData({ ...formData, audio_note_url: '' })}
                        />
                      </div>
                    )}
                    {audioBlob && (
                      <div className="mr-2">
                        <MiniAudioPlayer
                          blob={audioBlob}
                          onDelete={() => setAudioBlob(null)}
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold transition-all ${isRecording ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                    >
                      {isRecording ? <><Square size={10} fill="currentColor" /> Detener</> : <><Mic size={10} /> {formData.audio_note_url || audioBlob ? 'Grabar Otra' : 'Nota de Voz'}</>}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={formData.crops}
                    onChange={(e) => setFormData({ ...formData, crops: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Ej: Festuca, Lotus, Trébol, otros"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Si ingresas más de un cultivo (ej: "Soja, Maíz"), el mapa mostrará una cuadrícula combinada.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsMapMode(true)}
                className="flex items-center gap-2 px-4 py-2 text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
              >
                <MapIcon className="w-4 h-4" />
                {formData.polygon_data ? 'Editar Polígono en Mapa' : 'Dibujar Polígono en Mapa'}
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isUploading}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm"
                >
                  {isSaving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSaving ? 'Guardando...' : 'Guardar Lote'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {!isCreating && !isEditing && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lots.map((lot) => (
            <div key={lot.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{lot.name}</h3>
                    {lot.is_depot && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        <Warehouse size={10} />
                        Depósito
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{lot.area_hectares} ha</p>
                </div>
                <div className="flex gap-2">
                  {lot.polygon_data && (
                    <button
                      onClick={() => handleViewMap(lot)}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Ver en Mapa"
                    >
                      <MapIcon className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(lot)}
                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Editar Lote"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Uso de Suelo:</span>
                  <span className="font-medium text-slate-700">{lot.land_use || 'Sin asignar'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Cultivos:</span>
                  <span className="font-medium text-slate-700">{lot.crops || '-'}</span>
                </div>
                {lot.planting_date && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Siembra:</span>
                    <span className="font-medium text-slate-700">{new Date(lot.planting_date).toLocaleDateString()}</span>
                  </div>
                )}
                {lot.pasture_height && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Altura Pastura:</span>
                    <div className="text-right">
                      <span className="font-medium text-slate-700 block">{lot.pasture_height} cm</span>
                      {lot.pasture_height_date && (
                        <span className="text-xs text-slate-400 block">
                          {new Date(lot.pasture_height_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {lot.remnant_height && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Altura Remanente:</span>
                    <span className="font-medium text-slate-700">{lot.remnant_height} cm</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Mapa:</span>
                  <span className={`font-medium ${lot.polygon_data ? 'text-emerald-600' : 'text-amber-500'}`}>
                    {lot.polygon_data ? 'Definido' : 'Sin definir'}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {lots.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <p>No hay lotes registrados en este predio.</p>
              <button
                onClick={() => setIsCreating(true)}
                className="mt-2 text-emerald-600 font-medium hover:underline"
              >
                Crear el primer lote
              </button>
            </div>
          )}
        </div>
      )}


    </div>
  );
}