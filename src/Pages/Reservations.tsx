import { useState, useEffect, useCallback, useMemo } from 'react'
import { reservationService, type Reservation, type ReservationStatus } from '../services/reservationService'
import { tableService, type Table } from '../services/tableService'
import { useAuth } from '../contexts/useAuth'
import LoadingScreen from '../components/LoadingScreen'
import GanttModal from '../components/GanttModal'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'
import { Link } from 'react-router-dom'
import { IoAddCircleOutline, IoRefresh, IoSearchOutline, IoCalendarOutline } from 'react-icons/io5'

// Iconos SVG
const ReservationIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

// Obtener color según el estado
function getStatusColor(status: ReservationStatus): string {
  switch (status) {
    case 'PENDING':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'IN_PROGRESS':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'COMPLETED':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'NO_SHOW':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

// Obtener texto legible del estado
function getStatusText(status: ReservationStatus): string {
  switch (status) {
    case 'PENDING':
      return 'Pendiente'
    case 'IN_PROGRESS':
      return 'En Curso'
    case 'COMPLETED':
      return 'Completada'
    case 'CANCELLED':
      return 'Cancelada'
    case 'NO_SHOW':
      return 'Ausente'
    default:
      return status
  }
}

// Formatear fecha y hora
function formatDateTime(dateTimeStr: string): string {
  const date = new Date(dateTimeStr)
  return date.toLocaleString('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Calcular duración en horas y minutos
function calculateDuration(start: string, end: string): { hours: number; minutes: number; totalHours: number } {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const totalMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.round(totalMinutes % 60)
  const totalHours = totalMinutes / 60
  return { hours, minutes, totalHours }
}

// Formatear duración para mostrar
function formatDuration(start: string, end: string): string {
  const duration = calculateDuration(start, end)
  if (duration.totalHours < 1) {
    return `${Math.round(duration.totalHours * 60)} min`
  }
  return `${duration.totalHours.toFixed(1)}h`
}

// Componente de tarjeta de reserva
interface ReservationCardProps {
  reservation: Reservation
  onViewDetails: (reservation: Reservation) => void
  onEdit: (reservation: Reservation) => void
  onStart: (reservation: Reservation) => void
  onComplete: (reservation: Reservation) => void
  onCancel: (reservation: Reservation) => void
  onNoShow: (reservation: Reservation) => void
}

function ReservationCard({
  reservation,
  onViewDetails,
  onEdit,
  onStart,
  onComplete,
  onCancel,
  onNoShow,
}: ReservationCardProps) {
  const statusColor = getStatusColor(reservation.status)
  const durationText = formatDuration(reservation.startDateTime, reservation.endDateTime)
  
  // Calcular capacidad total de las mesas asignadas
  const totalTableCapacity = reservation.tables.reduce((sum, table) => sum + table.capacity, 0)
  const extraSeatsNeeded = reservation.partySize - totalTableCapacity

  return (
    <div className="overflow-hidden transition-all duration-200 bg-white border border-gray-200 shadow-sm rounded-xl hover:shadow-md">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#f74116]/10 rounded-lg">
              <ReservationIcon className="w-6 h-6 text-[#f74116]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{reservation.customerName}</h3>
              <p className="text-sm text-gray-500">{reservation.customerContact}</p>
            </div>
          </div>
          <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${statusColor}`}>
            {getStatusText(reservation.status)}
          </span>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4 space-y-3">
        {/* Fecha y hora */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="mb-1 text-xs text-gray-500">Inicio</p>
            <p className="text-sm font-semibold text-gray-900">{formatDateTime(reservation.startDateTime)}</p>
          </div>
          <div>
            <p className="mb-1 text-xs text-gray-500">Fin</p>
            <p className="text-sm font-semibold text-gray-900">{formatDateTime(reservation.endDateTime)}</p>
          </div>
        </div>

        {/* Información adicional */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-700">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span><strong>{reservation.partySize}</strong> {reservation.partySize === 1 ? 'persona' : 'personas'}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{durationText}</span>
          </div>
        </div>

        {/* Mesas */}
        <div>
          <p className="mb-2 text-xs text-gray-500">Mesas asignadas</p>
          <div className="flex flex-wrap gap-2">
            {reservation.tables.map((table) => (
              <span
                key={table.id}
                className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-md"
              >
                {table.tableCode} ({table.capacity}p)
              </span>
            ))}
          </div>
        </div>

        {/* Alerta de capacidad forzada */}
        {reservation.forced && extraSeatsNeeded > 0 && (
          <div className="p-3 border border-orange-200 rounded-lg bg-orange-50">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-xs font-semibold text-orange-800">Capacidad Forzada</p>
                <p className="text-xs text-orange-700 mt-0.5">
                  Se necesitan <strong>{extraSeatsNeeded}</strong> {extraSeatsNeeded === 1 ? 'lugar adicional' : 'lugares adicionales'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Notas */}
        {reservation.notes && (
          <div className="pt-2 border-t border-gray-100">
            <p className="mb-1 text-xs text-gray-500">Notas</p>
            <p className="text-sm italic text-gray-700">{reservation.notes}</p>
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="p-4 border-t border-gray-100 bg-gray-50">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onViewDetails(reservation)}
            className="flex-1 min-w-[100px] px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors duration-200"
          >
            Ver Detalles
          </button>

          {reservation.status === 'PENDING' && (
            <>
              <button
                onClick={() => onEdit(reservation)}
                className="flex-1 min-w-[100px] px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200"
              >
                Editar
              </button>
              <button
                onClick={() => onStart(reservation)}
                className="flex-1 min-w-[100px] px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors duration-200"
              >
                Iniciar
              </button>
              <button
                onClick={() => onNoShow(reservation)}
                className="flex-1 min-w-[100px] px-3 py-2 text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors duration-200"
              >
                Ausente
              </button>
              <button
                onClick={() => onCancel(reservation)}
                className="flex-1 min-w-[100px] px-3 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors duration-200"
              >
                Cancelar
              </button>
            </>
          )}

          {reservation.status === 'IN_PROGRESS' && (
            <>
              <button
                onClick={() => onComplete(reservation)}
                className="flex-1 min-w-[100px] px-3 py-2 text-sm font-medium text-white bg-[#f74116] hover:bg-[#d63612] rounded-lg transition-colors duration-200"
              >
                Completar
              </button>
              <button
                onClick={() => onCancel(reservation)}
                className="flex-1 min-w-[100px] px-3 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors duration-200"
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Modal para crear/editar reserva
interface ReservationModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: {
    customerName: string
    customerContact: string
    startDateTime: string
    endDateTime: string
    partySize: number
    tableIds: string[]
    forced: boolean
    notes: string
  }) => void
  editingReservation: Reservation | null
  availableTables: Table[]
  isProcessing: boolean
}

function ReservationModal({
  isOpen,
  onClose,
  onSave,
  editingReservation,
  availableTables,
  isProcessing,
}: ReservationModalProps) {
  const [customerName, setCustomerName] = useState('')
  const [customerContact, setCustomerContact] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [partySize, setPartySize] = useState('4')
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([])
  const [forced, setForced] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (editingReservation) {
      setCustomerName(editingReservation.customerName)
      setCustomerContact(editingReservation.customerContact)
      
      const start = new Date(editingReservation.startDateTime)
      setStartDate(start.toISOString().split('T')[0])
      setStartTime(start.toTimeString().slice(0, 5))
      
      const end = new Date(editingReservation.endDateTime)
      setEndDate(end.toISOString().split('T')[0])
      setEndTime(end.toTimeString().slice(0, 5))
      
      setPartySize(editingReservation.partySize.toString())
      setSelectedTableIds(editingReservation.tables.map((t) => t.id))
      setForced(editingReservation.forced)
      setNotes(editingReservation.notes || '')
    } else {
      // Valores por defecto para nueva reserva
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(20, 0, 0, 0)
      
      setCustomerName('')
      setCustomerContact('')
      setStartDate(tomorrow.toISOString().split('T')[0])
      setStartTime('20:00')
      
      const endTime = new Date(tomorrow)
      endTime.setHours(22, 0, 0, 0)
      setEndDate(endTime.toISOString().split('T')[0])
      setEndTime('22:00')
      
      setPartySize('4')
      setSelectedTableIds([])
      setForced(false)
      setNotes('')
    }
  }, [editingReservation, isOpen])

  const handleTableToggle = (tableId: string) => {
    setSelectedTableIds((prev) =>
      prev.includes(tableId)
        ? prev.filter((id) => id !== tableId)
        : [...prev, tableId]
    )
  }

  const totalCapacity = useMemo(() => {
    return selectedTableIds.reduce((sum, tableId) => {
      const table = availableTables.find((t) => t.id === tableId)
      return sum + (table?.capacity || 0)
    }, 0)
  }, [selectedTableIds, availableTables])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Construir ISO 8601 strings con zona horaria
    const startDateTime = `${startDate}T${startTime}:00-03:00`
    const endDateTime = `${endDate}T${endTime}:00-03:00`
    
    onSave({
      customerName: customerName.trim(),
      customerContact: customerContact.trim(),
      startDateTime,
      endDateTime,
      partySize: parseInt(partySize),
      tableIds: selectedTableIds,
      forced,
      notes: notes.trim(),
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl my-8 overflow-hidden bg-white shadow-2xl rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#f74116]/5 to-white">
          <h3 className="text-xl font-bold text-gray-900">
            {editingReservation ? 'Editar Reserva' : 'Nueva Reserva'}
          </h3>
          <button
            className="text-2xl text-gray-500 hover:text-gray-700"
            onClick={onClose}
            disabled={isProcessing}
            type="button"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Datos del cliente */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                Nombre del Cliente *
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f74116] focus:border-transparent"
                placeholder="Juan Pérez"
                required
                disabled={isProcessing}
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                Contacto *
              </label>
              <input
                type="text"
                value={customerContact}
                onChange={(e) => setCustomerContact(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f74116] focus:border-transparent"
                placeholder="Mail o Telefono"
                required
                disabled={isProcessing}
              />
            </div>
          </div>

          {/* Fecha y hora de inicio */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                Fecha de Inicio *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f74116] focus:border-transparent"
                required
                disabled={isProcessing}
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                Hora de Inicio *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f74116] focus:border-transparent"
                required
                disabled={isProcessing}
              />
            </div>
          </div>

          {/* Fecha y hora de fin */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                Fecha de Fin *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f74116] focus:border-transparent"
                required
                disabled={isProcessing}
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                Hora de Fin *
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f74116] focus:border-transparent"
                required
                disabled={isProcessing}
              />
            </div>
          </div>

          {/* Tamaño del grupo */}
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Tamaño del Grupo *
            </label>
            <input
              type="number"
              value={partySize}
              onChange={(e) => setPartySize(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f74116] focus:border-transparent"
              min="1"
              required
              disabled={isProcessing}
            />
          </div>

          {/* Selección de mesas */}
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Mesas * (Seleccione una o más)
            </label>
            <div className="grid grid-cols-2 gap-2 p-3 overflow-y-auto border border-gray-200 rounded-lg md:grid-cols-3 max-h-60">
              {availableTables.map((table) => (
                <label
                  key={table.id}
                  className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedTableIds.includes(table.id)
                      ? 'border-[#f74116] bg-[#f74116]/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTableIds.includes(table.id)}
                    onChange={() => handleTableToggle(table.id)}
                    disabled={isProcessing}
                    className="w-4 h-4 text-[#f74116] focus:ring-[#f74116] rounded"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    {table.tableCode}
                    <span className="ml-1 text-xs text-gray-500">({table.capacity}p)</span>
                  </span>
                </label>
              ))}
            </div>
            {selectedTableIds.length > 0 && (
              <p className="mt-2 text-sm text-gray-600">
                Capacidad total: <strong>{totalCapacity}</strong> personas
                {parseInt(partySize) > totalCapacity && (
                  <span className="ml-2 text-orange-600">
                    ⚠️ El grupo es más grande que la capacidad
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Forzar reserva */}
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="forced"
              checked={forced}
              onChange={(e) => setForced(e.target.checked)}
              disabled={isProcessing}
              className="w-4 h-4 text-[#f74116] focus:ring-[#f74116] rounded mt-0.5"
            />
            <label htmlFor="forced" className="text-sm text-gray-700">
              Forzar reserva (solo omite validación de capacidad)
              <span className="block mt-1 text-xs text-gray-500">
                ⚠️ El solapamiento de horarios y buffer de 45 min son obligatorios
              </span>
            </label>
          </div>

          {/* Notas */}
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f74116] focus:border-transparent"
              placeholder="Celebración especial, preferencias, alergias, etc."
              rows={3}
              disabled={isProcessing}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isProcessing || selectedTableIds.length === 0}
              className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-[#f74116] rounded-lg hover:bg-[#d63612] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Guardando...' : editingReservation ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Modal de detalles de reserva
interface ReservationDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  reservation: Reservation | null
}

function ReservationDetailsModal({ isOpen, onClose, reservation }: ReservationDetailsModalProps) {
  if (!isOpen || !reservation) return null

  const statusColor = getStatusColor(reservation.status)

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl overflow-hidden bg-white shadow-2xl rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#f74116]/5 to-white">
          <h3 className="text-xl font-bold text-gray-900">Detalles de Reserva</h3>
          <button
            className="text-2xl text-gray-500 hover:text-gray-700"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Estado */}
          <div className="flex items-center justify-center">
            <span className={`px-4 py-2 text-sm font-semibold rounded-full border ${statusColor}`}>
              {getStatusText(reservation.status)}
            </span>
          </div>

          {/* Información del cliente */}
          <div className="p-4 rounded-lg bg-gray-50">
            <h4 className="mb-3 text-sm font-bold text-gray-900">Información del Cliente</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Nombre:</span>
                <span className="text-sm font-semibold text-gray-900">{reservation.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Contacto:</span>
                <span className="text-sm font-semibold text-gray-900">{reservation.customerContact}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Tamaño del grupo:</span>
                <span className="text-sm font-semibold text-gray-900">
                  {reservation.partySize} {reservation.partySize === 1 ? 'persona' : 'personas'}
                </span>
              </div>
            </div>
          </div>

          {/* Horario */}
          <div className="p-4 rounded-lg bg-gray-50">
            <h4 className="mb-3 text-sm font-bold text-gray-900">Horario</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Inicio:</span>
                <span className="text-sm font-semibold text-gray-900">{formatDateTime(reservation.startDateTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Fin:</span>
                <span className="text-sm font-semibold text-gray-900">{formatDateTime(reservation.endDateTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Duración:</span>
                <span className="text-sm font-semibold text-gray-900">{formatDuration(reservation.startDateTime, reservation.endDateTime)}</span>
              </div>
            </div>
          </div>

          {/* Mesas */}
          <div className="p-4 rounded-lg bg-gray-50">
            <h4 className="mb-3 text-sm font-bold text-gray-900">Mesas Asignadas</h4>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {reservation.tables.map((table) => (
                <div
                  key={table.id}
                  className="p-3 text-center bg-white border border-gray-200 rounded-lg"
                >
                  <p className="font-semibold text-gray-900">{table.tableCode}</p>
                  <p className="text-xs text-gray-500">Capacidad: {table.capacity}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Capacidad total: <strong>{reservation.tables.reduce((sum, t) => sum + t.capacity, 0)}</strong> personas
            </p>
          </div>

          {/* Información adicional */}
          <div className="p-4 rounded-lg bg-gray-50">
            <h4 className="mb-3 text-sm font-bold text-gray-900">Información Adicional</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Creada por:</span>
                <span className="text-sm font-semibold text-gray-900">{reservation.createdBy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Fecha de creación:</span>
                <span className="text-sm font-semibold text-gray-900">{formatDateTime(reservation.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Reserva forzada:</span>
                <span className="text-sm font-semibold text-gray-900">{reservation.forced ? 'Sí' : 'No'}</span>
              </div>
            </div>
          </div>

          {/* Notas */}
          {reservation.notes && (
            <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
              <h4 className="mb-2 text-sm font-bold text-gray-900">Notas</h4>
              <p className="text-sm italic text-gray-700">{reservation.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-semibold text-gray-700 transition-colors bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// Modal de confirmación
interface ConfirmActionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText: string
  confirmColor: string
  isProcessing: boolean
}

function ConfirmActionModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  confirmColor,
  isProcessing,
}: ConfirmActionModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md overflow-hidden bg-white shadow-2xl rounded-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button
            className="text-2xl text-gray-500 hover:text-gray-700"
            onClick={onClose}
            disabled={isProcessing}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-6 text-center">
          <p className="text-base text-gray-700">{message}</p>
        </div>

        <div className="flex items-center justify-center gap-3 px-6 py-4 border-t border-gray-200">
          <button
            type="button"
            className="px-4 py-2 text-sm font-semibold text-gray-700 transition-colors bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={`px-5 py-2 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${confirmColor}`}
            onClick={onConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? 'Procesando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

// Componente principal
function Reservations() {
  const { user } = useAuth()
  const { toasts, showSuccess, showWarning, showErrorFromResponse, hideToast } = useToast()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [availableTables, setAvailableTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  // Filtros
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<ReservationStatus | 'ALL'>('ALL')
  const [sortOrder, setSortOrder] = useState<'proximos' | 'lejanos'>('proximos')

  // Modales
  const [showReservationModal, setShowReservationModal] = useState(false)
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showGanttModal, setShowGanttModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    title: string
    message: string
    confirmText: string
    confirmColor: string
    action: () => void
  } | null>(null)

  const businessId = user?.businessId

  // Cargar reservas (ahora solo próximas)
  const loadReservations = useCallback(async () => {
    if (!businessId) return

    try {
      setLoading(true)
      const data = await reservationService.getUpcomingReservations(businessId)
      setReservations(data)
    } catch (err) {
      showErrorFromResponse(err, 'Error al cargar las reservas')
    } finally {
      setLoading(false)
    }
  }, [businessId, showErrorFromResponse])

  // Cargar mesas disponibles
  const loadTables = useCallback(async () => {
    if (!businessId) return

    try {
      const data = await tableService.getTables(businessId)
      setAvailableTables(data)
    } catch (err) {
      console.error('Error al cargar mesas:', err)
    }
  }, [businessId])

  useEffect(() => {
    loadReservations()
    loadTables()
  }, [loadReservations, loadTables])

  // Filtrar y ordenar reservas
  const filteredReservations = useMemo(() => {
    const filtered = reservations.filter((reservation) => {
      const matchesSearch =
        reservation.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reservation.customerContact.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reservation.tables.some((t) => t.tableCode.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesStatus = filterStatus === 'ALL' || reservation.status === filterStatus

      return matchesSearch && matchesStatus
    })

    // Ordenar por fecha de inicio
    // Si es 'proximos', mantener el orden original del backend (más cercano primero)
    // Si es 'lejanos', invertir el orden
    if (sortOrder === 'lejanos') {
      filtered.sort((a, b) => {
        const dateA = new Date(a.startDateTime).getTime()
        const dateB = new Date(b.startDateTime).getTime()
        return dateB - dateA
      })
    }
    // Si es 'proximos', no hace falta ordenar, ya viene en orden del backend

    return filtered
  }, [reservations, searchQuery, filterStatus, sortOrder])

  // Estadísticas
  const stats = useMemo(() => {
    const total = reservations.length
    const pending = reservations.filter((r) => r.status === 'PENDING').length
    const inProgress = reservations.filter((r) => r.status === 'IN_PROGRESS').length
    const completed = reservations.filter((r) => r.status === 'COMPLETED').length
    const cancelled = reservations.filter((r) => r.status === 'CANCELLED').length
    const noShow = reservations.filter((r) => r.status === 'NO_SHOW').length

    return { total, pending, inProgress, completed, cancelled, noShow }
  }, [reservations])

  // Crear/Editar reserva
  const handleSaveReservation = async (data: {
    customerName: string
    customerContact: string
    startDateTime: string
    endDateTime: string
    partySize: number
    tableIds: string[]
    forced: boolean
    notes: string
  }) => {
    if (!businessId) return

    try {
      setProcessing(true)

      if (editingReservation) {
        // Editar reserva existente
        await reservationService.updateReservation(businessId, editingReservation.id, data)
        showSuccess('Reserva actualizada correctamente')
      } else {
        // Crear nueva reserva
        await reservationService.createReservation(businessId, data)
        showSuccess('Reserva creada correctamente')
      }

      await loadReservations()
      setShowReservationModal(false)
      setEditingReservation(null)
    } catch (err) {
      showErrorFromResponse(err, 'Error al guardar la reserva')
    } finally {
      setProcessing(false)
    }
  }

  // Iniciar reserva
  const handleStartReservation = (reservation: Reservation) => {
    const now = new Date()
    const startTime = new Date(reservation.startDateTime)
    const minutesUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60)

    // Verificar si faltan más de 15 minutos
    if (minutesUntilStart > 15) {
      showWarning('Debe aguardar 15 minutos antes del horario de inicio para iniciar la reserva')
      return
    }

    setConfirmAction({
      title: 'Iniciar Reserva',
      message: `¿Confirmas que el cliente ${reservation.customerName} ha llegado? Las mesas cambiarán a estado OCUPADO.`,
      confirmText: 'Iniciar',
      confirmColor: 'bg-green-600 hover:bg-green-700',
      action: async () => {
        if (!businessId) return
        try {
          setProcessing(true)
          await reservationService.startReservation(businessId, reservation.id)
          showSuccess('Reserva iniciada correctamente')
          await loadReservations()
          setShowConfirmModal(false)
        } catch (err) {
          showErrorFromResponse(err, 'Error al iniciar la reserva')
        } finally {
          setProcessing(false)
        }
      },
    })
    setShowConfirmModal(true)
  }

  // Completar reserva
  const handleCompleteReservation = (reservation: Reservation) => {
    setConfirmAction({
      title: 'Completar Reserva',
      message: `¿Confirmas que la reserva de ${reservation.customerName} ha finalizado? Las mesas se liberarán.`,
      confirmText: 'Completar',
      confirmColor: 'bg-[#f74116] hover:bg-[#d63612]',
      action: async () => {
        if (!businessId) return
        try {
          setProcessing(true)
          await reservationService.completeReservation(businessId, reservation.id)
          showSuccess('Reserva completada correctamente')
          await loadReservations()
          setShowConfirmModal(false)
        } catch (err) {
          showErrorFromResponse(err, 'Error al completar la reserva')
        } finally {
          setProcessing(false)
        }
      },
    })
    setShowConfirmModal(true)
  }

  // Cancelar reserva
  const handleCancelReservation = (reservation: Reservation) => {
    setConfirmAction({
      title: 'Cancelar Reserva',
      message: `¿Estás seguro de cancelar la reserva de ${reservation.customerName}? Esta acción liberará las mesas asignadas.`,
      confirmText: 'Cancelar Reserva',
      confirmColor: 'bg-red-600 hover:bg-red-700',
      action: async () => {
        if (!businessId) return
        try {
          setProcessing(true)
          await reservationService.cancelReservation(businessId, reservation.id)
          showSuccess('Reserva cancelada correctamente')
          await loadReservations()
          setShowConfirmModal(false)
        } catch (err) {
          showErrorFromResponse(err, 'Error al cancelar la reserva')
        } finally {
          setProcessing(false)
        }
      },
    })
    setShowConfirmModal(true)
  }

  // Marcar no-show
  const handleNoShow = (reservation: Reservation) => {
    const now = new Date()
    const startTime = new Date(reservation.startDateTime)

    // Verificar si aún no ha llegado la hora de inicio
    if (now < startTime) {
      showWarning('Solo se puede marcar como "Ausente" si la reserva ya inició en su horario correspondiente')
      return
    }

    setConfirmAction({
      title: 'Marcar como Ausente',
      message: `¿Confirmas que el cliente ${reservation.customerName} no se presentó? Las mesas se liberarán.`,
      confirmText: 'Marcar Ausente',
      confirmColor: 'bg-orange-600 hover:bg-orange-700',
      action: async () => {
        if (!businessId) return
        try {
          setProcessing(true)
          await reservationService.markNoShow(businessId, reservation.id)
          showSuccess('Marcado como Ausente correctamente')
          await loadReservations()
          setShowConfirmModal(false)
        } catch (err) {
          showErrorFromResponse(err, 'Error al marcar no-show')
        } finally {
          setProcessing(false)
        }
      },
    })
    setShowConfirmModal(true)
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-gray-50 via-white to-gray-100 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900 md:text-4xl">
                <ReservationIcon className="w-8 h-8 text-[#f74116]" />
                Gestión de Reservas
              </h1>
              <p className="mt-2 text-gray-600">
                Administra las reservas de tu negocio
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadReservations}
                className="p-3 transition-colors bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                title="Recargar"
              >
                <IoRefresh className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => setShowGanttModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-[#f74116] text-[#f74116] rounded-lg hover:bg-[#fff5f3] transition-colors font-semibold"
                title="Ver diagrama de Gantt"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="hidden sm:inline">Ocupación</span>
              </button>
              <Link
                to="/reservations/history"
                className="flex items-center gap-2 px-4 py-2 bg-white border border-[#f74116] text-[#f74116] rounded-lg hover:bg-[#fff5f3] transition-colors font-semibold"
                title="Ver historial y análisis"
              >
                <IoCalendarOutline className="w-5 h-5" />
                <span className="hidden sm:inline">Historial</span>
              </Link>
              <button
                onClick={() => {
                  setEditingReservation(null)
                  setShowReservationModal(true)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#f74116] text-white rounded-lg hover:bg-[#d63612] transition-colors font-semibold"
              >
                <IoAddCircleOutline className="w-5 h-5" />
                <span className="hidden sm:inline">Nueva Reserva</span>
              </button>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="p-6 mb-6 border border-gray-200 shadow-sm bg-gradient-to-r from-white to-gray-50 rounded-xl">
            <h2 className="flex items-center gap-2 mb-4 text-lg font-bold text-gray-900">
              <IoCalendarOutline className="w-5 h-5 text-[#f74116]" />
              Estadísticas - Reservas Próximas
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
              <div className="p-4 bg-white border border-gray-200 rounded-lg">
                <p className="mb-1 text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                <p className="mb-1 text-sm text-blue-700">Pendientes</p>
                <p className="text-2xl font-bold text-blue-700">{stats.pending}</p>
              </div>
              <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                <p className="mb-1 text-sm text-green-700">En Curso</p>
                <p className="text-2xl font-bold text-green-700">{stats.inProgress}</p>
              </div>
              <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
                <p className="mb-1 text-sm text-gray-700">Completadas</p>
                <p className="text-2xl font-bold text-gray-700">{stats.completed}</p>
              </div>
              <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                <p className="mb-1 text-sm text-red-700">Canceladas</p>
                <p className="text-2xl font-bold text-red-700">{stats.cancelled}</p>
              </div>
              <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                <p className="mb-1 text-sm text-orange-700">Ausentes</p>
                <p className="text-2xl font-bold text-orange-700">{stats.noShow}</p>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="p-4 mb-6 bg-white border border-gray-200 rounded-xl">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Búsqueda */}
              <div className="relative">
                <IoSearchOutline className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por cliente o mesa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f74116] focus:border-transparent"
                />
              </div>

              {/* Filtro de estado */}
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as ReservationStatus | 'ALL')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f74116] focus:border-transparent"
                >
                  <option value="ALL">Todos los estados</option>
                  <option value="PENDING">Pendientes</option>
                  <option value="IN_PROGRESS">En Curso</option>
                  <option value="COMPLETED">Completadas</option>
                  <option value="CANCELLED">Canceladas</option>
                  <option value="NO_SHOW">Ausentes</option>
                </select>
              </div>

              {/* Ordenar por fecha */}
              <div>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'proximos' | 'lejanos')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f74116] focus:border-transparent"
                >
                  <option value="proximos">Más próximos</option>
                  <option value="lejanos">Más lejanos</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Grid de reservas */}
        {filteredReservations.length === 0 ? (
          <div className="py-16 text-center">
            <ReservationIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="mb-2 text-xl font-semibold text-gray-900">
              {searchQuery || filterStatus !== 'ALL' ? 'No se encontraron reservas' : 'No hay reservas registradas'}
            </h3>
            <p className="mb-6 text-gray-600">
              {searchQuery || filterStatus !== 'ALL'
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Crea tu primera reserva para comenzar'}
            </p>
            {!searchQuery && filterStatus === 'ALL' && (
              <button
                onClick={() => {
                  setEditingReservation(null)
                  setShowReservationModal(true)
                }}
                className="px-6 py-3 bg-[#f74116] text-white rounded-lg hover:bg-[#d63612] transition-colors font-semibold inline-flex items-center gap-2"
              >
                <IoAddCircleOutline className="w-5 h-5" />
                Crear Primera Reserva
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredReservations.map((reservation) => (
              <ReservationCard
                key={reservation.id}
                reservation={reservation}
                onViewDetails={(r) => {
                  setSelectedReservation(r)
                  setShowDetailsModal(true)
                }}
                onEdit={(r) => {
                  setEditingReservation(r)
                  setShowReservationModal(true)
                }}
                onStart={handleStartReservation}
                onComplete={handleCompleteReservation}
                onCancel={handleCancelReservation}
                onNoShow={handleNoShow}
              />
            ))}
          </div>
        )}

        {/* Modales */}
        <ReservationModal
          isOpen={showReservationModal}
          onClose={() => {
            setShowReservationModal(false)
            setEditingReservation(null)
          }}
          onSave={handleSaveReservation}
          editingReservation={editingReservation}
          availableTables={availableTables}
          isProcessing={processing}
        />

        <ReservationDetailsModal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false)
            setSelectedReservation(null)
          }}
          reservation={selectedReservation}
        />

        {confirmAction && (
          <ConfirmActionModal
            isOpen={showConfirmModal}
            onClose={() => {
              setShowConfirmModal(false)
              setConfirmAction(null)
            }}
            onConfirm={confirmAction.action}
            title={confirmAction.title}
            message={confirmAction.message}
            confirmText={confirmAction.confirmText}
            confirmColor={confirmAction.confirmColor}
            isProcessing={processing}
          />
        )}

        <GanttModal
          isOpen={showGanttModal}
          onClose={() => setShowGanttModal(false)}
          businessId={businessId || ''}
        />
      </div>

      {/* Toast notifications */}
      <div className="fixed z-50 space-y-2 top-4 right-4">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={() => hideToast(toast.id)} />
        ))}
      </div>
    </div>
  )
}

export default Reservations
