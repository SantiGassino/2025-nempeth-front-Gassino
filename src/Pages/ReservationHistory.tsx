import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  reservationService,
  type Reservation,
  type ReservationAnalytics,
  type ReservationStatus,
} from '../services/reservationService'
import { useAuth } from '../contexts/useAuth'
import LoadingScreen from '../components/LoadingScreen'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'
import { Link } from 'react-router-dom'
import {
  IoArrowBack,
  IoRefresh,
  IoSearchOutline,
  IoTrendingUp,
  IoTrendingDown,
  IoPeople,
  IoCheckmarkCircle,
  IoCloseCircle,
  IoTimeOutline,
  IoWarning,
  IoCalendarOutline,
} from 'react-icons/io5'

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

// Componente de tarjeta de reserva (igual que en Reservations.tsx)
interface ReservationCardProps {
  reservation: Reservation
  onViewDetails: (reservation: Reservation) => void
}

function ReservationCard({ reservation, onViewDetails }: ReservationCardProps) {
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
              <p className="text-sm text-gray-600">DNI: {reservation.customerDocument}</p>
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span>
              <strong>{reservation.partySize}</strong> {reservation.partySize === 1 ? 'persona' : 'personas'}
            </span>
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
              <span key={table.id} className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-md">
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
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-xs font-semibold text-orange-800">Capacidad Forzada</p>
                <p className="text-xs text-orange-700 mt-0.5">
                  Se necesitaron <strong>{extraSeatsNeeded}</strong> {extraSeatsNeeded === 1 ? 'lugar adicional' : 'lugares adicionales'}
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
        <button
          onClick={() => onViewDetails(reservation)}
          className="w-full px-4 py-2 text-sm font-medium text-gray-700 transition-colors duration-200 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Ver Detalles
        </button>
      </div>
    </div>
  )
}

// Componente principal
function ReservationHistory() {
  const { user } = useAuth()
  const { toasts, showErrorFromResponse, hideToast } = useToast()
  const [analytics, setAnalytics] = useState<ReservationAnalytics | null>(null)
  const [pastReservations, setPastReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<ReservationStatus | 'ALL'>('ALL')
  const [sortOrder, setSortOrder] = useState<'reciente' | 'antiguo'>('reciente')

  const businessId = user?.businessId

  // Cargar datos
  const loadHistoryData = useCallback(async () => {
    if (!businessId) return

    try {
      setLoading(true)
      const [analyticsData, pastData] = await Promise.all([
        reservationService.getReservationAnalytics(businessId),
        reservationService.getPastReservations(businessId),
      ])
      setAnalytics(analyticsData)
      setPastReservations(pastData)
    } catch (err) {
      showErrorFromResponse(err, 'Error al cargar el historial')
    } finally {
      setLoading(false)
    }
  }, [businessId, showErrorFromResponse])

  useEffect(() => {
    loadHistoryData()
  }, [loadHistoryData])

  // Filtrar y ordenar reservas
  const filteredReservations = useMemo(() => {
    let filtered = pastReservations

    // Filtrar por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.customerName.toLowerCase().includes(query) ||
          r.customerContact.toLowerCase().includes(query) ||
          r.tables.some((t) => t.tableCode.toLowerCase().includes(query))
      )
    }

    // Filtrar por estado
    if (filterStatus !== 'ALL') {
      filtered = filtered.filter((r) => r.status === filterStatus)
    }

    // Ordenar por fecha
    const sorted = [...filtered].sort((a, b) => {
      const dateA = new Date(a.startDateTime).getTime()
      const dateB = new Date(b.startDateTime).getTime()
      return sortOrder === 'reciente' ? dateB - dateA : dateA - dateB
    })

    return sorted
  }, [pastReservations, searchQuery, filterStatus, sortOrder])

  // Estadísticas filtradas
  const stats = useMemo(() => {
    return {
      total: filteredReservations.length,
      completed: filteredReservations.filter((r) => r.status === 'COMPLETED').length,
      cancelled: filteredReservations.filter((r) => r.status === 'CANCELLED').length,
      noShow: filteredReservations.filter((r) => r.status === 'NO_SHOW').length,
      pending: filteredReservations.filter((r) => r.status === 'PENDING').length,
      inProgress: filteredReservations.filter((r) => r.status === 'IN_PROGRESS').length,
    }
  }, [filteredReservations])

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
              <div className="flex items-center gap-3 mb-2">
                <Link
                  to="/reservations"
                  className="p-2 transition-colors bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  title="Volver a Reservas"
                >
                  <IoArrowBack className="w-5 h-5 text-gray-600" />
                </Link>
                <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900 md:text-4xl">
                  <ReservationIcon className="w-8 h-8 text-[#f74116]" />
                  Historial y Análisis
                </h1>
              </div>
              <p className="text-gray-600 ml-14">Visualiza el historial completo y métricas de rendimiento</p>
            </div>
            <button
              onClick={loadHistoryData}
              className="p-3 transition-colors bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              title="Recargar"
            >
              <IoRefresh className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Analytics Section */}
        {analytics && (
          <div className="mb-8 space-y-6">
            {/* KPIs Principales */}
            <div className="bg-gradient-to-br from-[#f74116]/5 to-white rounded-xl p-6 border border-gray-200">
              <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-gray-900">
                <IoTrendingUp className="w-5 h-5 text-[#f74116]" />
                Resumen General
              </h3>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
                <div className="p-4 text-center bg-white border border-gray-200 rounded-lg">
                  <p className="mb-1 text-xs text-gray-500">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.summary.totalReservations}</p>
                </div>
                <div className="p-4 text-center border border-green-200 rounded-lg bg-green-50">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <IoCheckmarkCircle className="w-4 h-4 text-green-600" />
                    <p className="text-xs text-green-700">Completadas</p>
                  </div>
                  <p className="text-2xl font-bold text-green-700">{analytics.summary.completedReservations}</p>
                  <p className="mt-1 text-xs text-green-600">{analytics.summary.completionRate.toFixed(1)}%</p>
                </div>
                <div className="p-4 text-center border border-orange-200 rounded-lg bg-orange-50">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <IoWarning className="w-4 h-4 text-orange-600" />
                    <p className="text-xs text-orange-700">Ausentes</p>
                  </div>
                  <p className="text-2xl font-bold text-orange-700">{analytics.summary.noShowReservations}</p>
                  <p className="mt-1 text-xs text-orange-600">{analytics.summary.noShowRate.toFixed(1)}%</p>
                </div>
                <div className="p-4 text-center border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <IoCloseCircle className="w-4 h-4 text-red-600" />
                    <p className="text-xs text-red-700">Canceladas</p>
                  </div>
                  <p className="text-2xl font-bold text-red-700">{analytics.summary.cancelledReservations}</p>
                  <p className="mt-1 text-xs text-red-600">{analytics.summary.cancellationRate.toFixed(1)}%</p>
                </div>
                <div className="p-4 text-center border border-blue-200 rounded-lg bg-blue-50">
                  <p className="mb-1 text-xs text-blue-700">Pendientes</p>
                  <p className="text-2xl font-bold text-blue-700">{analytics.summary.pendingReservations}</p>
                </div>
                <div className="p-4 text-center border border-green-200 rounded-lg bg-green-50">
                  <p className="mb-1 text-xs text-green-700">En Curso</p>
                  <p className="text-2xl font-bold text-green-700">{analytics.summary.inProgressReservations}</p>
                </div>
              </div>
            </div>

            {/* Utilización de Mesas */}
            <div className="p-6 bg-white border border-gray-200 rounded-xl">
              <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-gray-900">
                <IoTimeOutline className="w-5 h-5 text-[#f74116]" />
                Top 10 Mesas Más Utilizadas
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {analytics.tableUtilization.slice(0, 10).map((table) => (
                  <div key={table.tableCode} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-gray-900">{table.tableCode}</span>
                      <span className="text-sm text-gray-600">{table.totalReservations} reservas</span>
                    </div>
                    <div className="relative h-2 mb-2 overflow-hidden bg-gray-200 rounded-full">
                      <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#f74116] to-[#ff6b47] rounded-full"
                        style={{ width: `${table.utilizationRate}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>{table.totalHoursReserved.toFixed(1)}h reservadas</span>
                      <span className="font-semibold">{table.utilizationRate.toFixed(1)}% utilización</span>
                    </div>
                    {table.noShows > 0 && <p className="mt-1 text-xs text-orange-600">⚠️ {table.noShows} ausencias</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Confiabilidad de Clientes */}
            <div className="p-6 bg-white border border-gray-200 rounded-xl">
              <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-gray-900">
                <IoPeople className="w-5 h-5 text-[#f74116]" />
                Clientes Frecuentes (Top 10)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-xs font-semibold text-left text-gray-700">DNI</th>
                      <th className="px-4 py-2 text-xs font-semibold text-left text-gray-700">Cliente</th>
                      <th className="px-4 py-2 text-xs font-semibold text-center text-gray-700">Total</th>
                      <th className="px-4 py-2 text-xs font-semibold text-center text-gray-700">Completadas</th>
                      <th className="px-4 py-2 text-xs font-semibold text-center text-gray-700">Ausencias</th>
                      <th className="px-4 py-2 text-xs font-semibold text-center text-gray-700">Cancelaciones</th>
                      <th className="px-4 py-2 text-xs font-semibold text-center text-gray-700">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {analytics.clientReliability.slice(0, 10).map((client, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono text-gray-700">{client.customerDocument}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{client.customerName}</div>
                          <div className="text-xs text-gray-500">{client.customerContact}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-900">{client.totalReservations}</td>
                        <td className="px-4 py-3 text-sm text-center text-green-600">{client.completedReservations}</td>
                        <td className="px-4 py-3 text-sm text-center text-orange-600">{client.noShows}</td>
                        <td className="px-4 py-3 text-sm text-center text-red-600">{client.cancellations}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                              client.reliabilityScore >= 80
                                ? 'bg-green-100 text-green-800'
                                : client.reliabilityScore >= 50
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {client.reliabilityScore.toFixed(0)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Análisis por Horario */}
            <div className="p-6 bg-white border border-gray-200 rounded-xl">
              <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-gray-900">
                <IoTimeOutline className="w-5 h-5 text-[#f74116]" />
                Análisis por Franja Horaria
              </h3>
              <div className="space-y-2">
                {analytics.timeSlotAnalysis
                  .filter((slot) => slot.totalReservations > 0)
                  .map((slot) => (
                    <div key={slot.hourOfDay} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50">
                      <div className="w-16 font-bold text-center text-gray-900">{String(slot.hourOfDay).padStart(2, '0')}:00</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700">{slot.totalReservations} reservas</span>
                          <span className="text-xs text-gray-500">Promedio: {slot.avgPartySize.toFixed(1)} personas</span>
                        </div>
                        <div className="relative h-6 overflow-hidden bg-gray-200 rounded-lg">
                          <div
                            className="absolute top-0 left-0 flex items-center justify-end h-full pr-2 rounded-lg bg-gradient-to-r from-blue-400 to-blue-600"
                            style={{
                              width: `${(slot.totalReservations / Math.max(...analytics.timeSlotAnalysis.map((s) => s.totalReservations))) * 100}%`,
                            }}
                          >
                            <span className="text-xs font-semibold text-white">{slot.totalReservations}</span>
                          </div>
                        </div>
                      </div>
                      {slot.noShows > 0 && (
                        <div className="text-right">
                          <p className="text-xs text-orange-600">{slot.noShows} ausencias</p>
                          <p className="text-xs text-orange-500">{slot.noShowRate.toFixed(1)}%</p>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* Desperdicio de Capacidad */}
            {analytics.capacityWaste.length > 0 && (
              <div className="p-6 border border-orange-200 bg-orange-50 rounded-xl">
                <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-gray-900">
                  <IoTrendingDown className="w-5 h-5 text-orange-600" />
                  Mesas con Desperdicio de Capacidad (&gt;20%)
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {analytics.capacityWaste.map((waste) => (
                    <div key={waste.tableCode} className="p-4 bg-white border border-orange-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-gray-900">{waste.tableCode}</span>
                        <span className="text-sm font-semibold text-orange-600">{waste.wastePercentage.toFixed(1)}% desperdicio</span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>Capacidad: {waste.tableCapacity} personas</p>
                        <p>Promedio usado: {waste.avgPartySize.toFixed(1)} personas</p>
                        <p>Reservas completadas: {waste.reservationCount}</p>
                      </div>
                      <p className="mt-2 text-xs text-orange-700">💡 Considera asignar grupos más grandes a esta mesa</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sección de Reservas Pasadas */}
        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <h2 className="flex items-center gap-2 mb-4 text-xl font-bold text-gray-900">
            <IoCalendarOutline className="w-6 h-6 text-[#f74116]" />
            Reservas Anteriores
          </h2>

          {/* Estadísticas */}
          <div className="p-6 mb-6 border border-gray-200 shadow-sm bg-gradient-to-r from-white to-gray-50 rounded-xl">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
              <div className="p-4 bg-white border border-gray-200 rounded-lg">
                <p className="mb-1 text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
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
              <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                <p className="mb-1 text-sm text-blue-700">Pendientes</p>
                <p className="text-2xl font-bold text-blue-700">{stats.pending}</p>
              </div>
              <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                <p className="mb-1 text-sm text-green-700">En Curso</p>
                <p className="text-2xl font-bold text-green-700">{stats.inProgress}</p>
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
                  onChange={(e) => setSortOrder(e.target.value as 'reciente' | 'antiguo')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f74116] focus:border-transparent"
                >
                  <option value="reciente">Más recientes</option>
                  <option value="antiguo">Más antiguos</option>
                </select>
              </div>
            </div>
          </div>

          {/* Grid de reservas */}
          {filteredReservations.length === 0 ? (
            <div className="py-16 text-center">
              <ReservationIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="mb-2 text-xl font-semibold text-gray-900">
                {searchQuery || filterStatus !== 'ALL' ? 'No se encontraron reservas' : 'No hay reservas en el historial'}
              </h3>
              <p className="text-gray-600">
                {searchQuery || filterStatus !== 'ALL' ? 'Intenta ajustar los filtros de búsqueda' : 'Las reservas pasadas aparecerán aquí'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredReservations.map((reservation) => (
                <ReservationCard key={reservation.id} reservation={reservation} onViewDetails={() => {}} />
              ))}
            </div>
          )}
        </div>
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

export default ReservationHistory
