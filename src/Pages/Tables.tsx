import { useState, useEffect, useCallback, useMemo } from 'react'
import { tableService, type Table, type TableStatus, type TableStats } from '../services/tableService'
import { useAuth } from '../contexts/useAuth'
import { isOwner } from '../guards/getDefaultRoute'
import LoadingScreen from '../components/LoadingScreen'
import { IoAddCircleOutline, IoRefresh, IoSearchOutline } from 'react-icons/io5'

// Iconos SVG
const TableIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
)

// Obtener color según el estado
function getStatusColor(status: TableStatus): string {
  switch (status) {
    case 'FREE':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'RESERVED':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'OCCUPIED':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

// Obtener texto legible del estado
function getStatusText(status: TableStatus): string {
  switch (status) {
    case 'FREE':
      return 'Libre'
    case 'RESERVED':
      return 'Reservada'
    case 'OCCUPIED':
      return 'Ocupada'
    default:
      return status
  }
}

// Componente de tarjeta de mesa
interface TableCardProps {
  table: Table
  onEdit: (table: Table) => void
  onDelete: (table: Table) => void
  onChangeStatus: (table: Table) => void
  onChangeCapacity: (table: Table) => void
  isOwner: boolean
}

function TableCard({ table, onEdit, onDelete, onChangeStatus, onChangeCapacity, isOwner }: TableCardProps) {
  const statusColor = getStatusColor(table.status)

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Header con código y estado */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#f74116]/10 rounded-lg">
              <TableIcon className="w-6 h-6 text-[#f74116]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{table.tableCode}</h3>
              <p className="text-sm text-gray-500">{table.sector}</p>
            </div>
          </div>
          <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${statusColor}`}>
            {getStatusText(table.status)}
          </span>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-gray-700">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="text-sm">
            <span className="font-semibold">Capacidad:</span> {table.capacity} {table.capacity === 1 ? 'persona' : 'personas'}
          </span>
        </div>
      </div>

      {/* Acciones */}
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onChangeStatus(table)}
            className="flex-1 min-w-[120px] px-3 py-2 text-sm font-medium text-white bg-[#f74116] hover:bg-[#d63612] rounded-lg transition-colors duration-200"
          >
            Cambiar Estado
          </button>
          <button
            onClick={() => onChangeCapacity(table)}
            disabled={table.status !== 'FREE'}
            className="flex-1 min-w-[120px] px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
          >
            Capacidad
          </button>
          {isOwner && (
            <>
              <button
                onClick={() => onEdit(table)}
                disabled={table.status !== 'FREE'}
                className="flex-1 min-w-[120px] px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
              >
                Editar
              </button>
              <button
                onClick={() => onDelete(table)}
                disabled={table.status !== 'FREE'}
                className="flex-1 min-w-[120px] px-3 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
              >
                Eliminar
              </button>
            </>
          )}
        </div>
        {table.status !== 'FREE' && (
          <p className="mt-2 text-xs text-gray-500 text-center">
            * Solo se puede {isOwner ? 'editar, eliminar o cambiar capacidad' : 'cambiar capacidad'} de mesas en estado libre
          </p>
        )}
      </div>
    </div>
  )
}

// Modal para crear/editar mesa
interface TableModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { tableCode: string; capacity: number; sector: string }) => void
  editingTable: Table | null
  isProcessing: boolean
}

function TableModal({ isOpen, onClose, onSave, editingTable, isProcessing }: TableModalProps) {
  const [tableCode, setTableCode] = useState('')
  const [capacity, setCapacity] = useState('4')
  const [sector, setSector] = useState('')

  useEffect(() => {
    if (editingTable) {
      setTableCode(editingTable.tableCode)
      setCapacity(editingTable.capacity.toString())
      setSector(editingTable.sector)
    } else {
      setTableCode('')
      setCapacity('4')
      setSector('')
    }
  }, [editingTable, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      tableCode: tableCode.trim(),
      capacity: parseInt(capacity),
      sector: sector.trim(),
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#f74116]/5 to-white">
          <h3 className="text-xl font-bold text-gray-900">
            {editingTable ? 'Editar Mesa' : 'Nueva Mesa'}
          </h3>
          <button
            className="text-gray-500 hover:text-gray-700 text-2xl"
            onClick={onClose}
            disabled={isProcessing}
            type="button"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Código de Mesa *
            </label>
            <input
              type="text"
              value={tableCode}
              onChange={(e) => setTableCode(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f74116] focus:border-transparent"
              placeholder="Ej: M1, T1, VIP1"
              required
              disabled={isProcessing}
            />
            <p className="mt-1 text-xs text-gray-500">Debe ser único en el negocio</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Capacidad (1-100) *
            </label>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f74116] focus:border-transparent"
              min="1"
              max="100"
              required
              disabled={isProcessing}
            />
            <p className="mt-1 text-xs text-gray-500">Número de personas que puede acomodar</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Sector *
            </label>
            <input
              type="text"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f74116] focus:border-transparent"
              placeholder="Ej: Salón Principal, Terraza, Bar"
              required
              disabled={isProcessing}
            />
            <p className="mt-1 text-xs text-gray-500">Ubicación de la mesa</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-[#f74116] rounded-lg hover:bg-[#d63612] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Guardando...' : editingTable ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Modal para cambiar estado
interface ChangeStatusModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (status: TableStatus) => void
  currentStatus: TableStatus
  isProcessing: boolean
}

function ChangeStatusModal({ isOpen, onClose, onSave, currentStatus, isProcessing }: ChangeStatusModalProps) {
  const [newStatus, setNewStatus] = useState<TableStatus>(currentStatus)

  useEffect(() => {
    setNewStatus(currentStatus)
  }, [currentStatus, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(newStatus)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#f74116]/5 to-white">
          <h3 className="text-xl font-bold text-gray-900">Cambiar Estado</h3>
          <button
            className="text-gray-500 hover:text-gray-700 text-2xl"
            onClick={onClose}
            disabled={isProcessing}
            type="button"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Seleccionar nuevo estado
            </label>
            <div className="space-y-2">
              <label className="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="status"
                  value="FREE"
                  checked={newStatus === 'FREE'}
                  onChange={(e) => setNewStatus(e.target.value as TableStatus)}
                  disabled={isProcessing}
                  className="w-4 h-4 text-[#f74116] focus:ring-[#f74116]"
                />
                <span className="ml-3 text-sm font-medium text-gray-700">
                  Libre <span className="text-xs text-gray-500">(Mesa disponible)</span>
                </span>
              </label>

              <label className="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="status"
                  value="OCCUPIED"
                  checked={newStatus === 'OCCUPIED'}
                  onChange={(e) => setNewStatus(e.target.value as TableStatus)}
                  disabled={isProcessing}
                  className="w-4 h-4 text-[#f74116] focus:ring-[#f74116]"
                />
                <span className="ml-3 text-sm font-medium text-gray-700">
                  Ocupada <span className="text-xs text-gray-500">(Cliente sentado)</span>
                </span>
              </label>
            </div>
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                ⚠️ <strong>Nota:</strong> El estado RESERVED se asigna automáticamente 45 minutos antes de una reserva.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isProcessing || newStatus === currentStatus}
              className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-[#f74116] rounded-lg hover:bg-[#d63612] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Actualizando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Modal para cambiar capacidad
interface ChangeCapacityModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (capacity: number) => void
  currentCapacity: number
  isProcessing: boolean
}

function ChangeCapacityModal({ isOpen, onClose, onSave, currentCapacity, isProcessing }: ChangeCapacityModalProps) {
  const [capacity, setCapacity] = useState(currentCapacity.toString())

  useEffect(() => {
    setCapacity(currentCapacity.toString())
  }, [currentCapacity, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(parseInt(capacity))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#f74116]/5 to-white">
          <h3 className="text-xl font-bold text-gray-900">Cambiar Capacidad</h3>
          <button
            className="text-gray-500 hover:text-gray-700 text-2xl"
            onClick={onClose}
            disabled={isProcessing}
            type="button"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nueva capacidad (1-100) *
            </label>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f74116] focus:border-transparent"
              min="1"
              max="100"
              required
              disabled={isProcessing}
            />
            <p className="mt-2 text-sm text-gray-600">
              Capacidad actual: <strong>{currentCapacity}</strong> {currentCapacity === 1 ? 'persona' : 'personas'}
            </p>
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                ⚠️ Solo se puede cambiar la capacidad de mesas en estado libre (FREE).
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-[#f74116] rounded-lg hover:bg-[#d63612] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Actualizando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Modal de confirmación de eliminación
interface ConfirmDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  tableCode: string
  isDeleting: boolean
}

function ConfirmDeleteModal({ isOpen, onClose, onConfirm, tableCode, isDeleting }: ConfirmDeleteModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm overflow-hidden bg-white shadow-2xl rounded-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800">Confirmar eliminación</h3>
          <button
            className="text-gray-500 hover:text-gray-700 text-2xl"
            onClick={onClose}
            disabled={isDeleting}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-6 space-y-3 text-center">
          <div className="text-4xl">⚠️</div>
          <p className="text-base text-gray-700">
            ¿Estás seguro de que deseas eliminar la mesa <strong className="font-semibold text-gray-900">"{tableCode}"</strong>?
          </p>
          <p className="text-sm italic text-gray-500">Esta acción no se puede deshacer.</p>
        </div>

        <div className="flex items-center justify-center gap-3 px-6 py-4 border-t border-gray-200">
          <button
            type="button"
            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="px-5 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Componente de estadísticas
interface StatsCardProps {
  stats: TableStats | null
  loading: boolean
}

function StatsCard({ stats, loading }: StatsCardProps) {
  if (loading || !stats) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-[#f74116]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Estadísticas de Ocupación
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalTables}</p>
        </div>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700 mb-1">Libres</p>
          <p className="text-2xl font-bold text-green-700">{stats.freeTables}</p>
        </div>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700 mb-1">Reservadas</p>
          <p className="text-2xl font-bold text-yellow-700">{stats.reservedTables}</p>
        </div>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 mb-1">Ocupadas</p>
          <p className="text-2xl font-bold text-red-700">{stats.occupiedTables}</p>
        </div>
        <div className="p-4 bg-[#f74116]/10 border border-[#f74116]/20 rounded-lg">
          <p className="text-sm text-[#f74116] mb-1">Ocupación</p>
          <p className="text-2xl font-bold text-[#f74116]">{stats.occupancyRate.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  )
}

// Componente principal
function Tables() {
  const { user } = useAuth()
  const [tables, setTables] = useState<Table[]>([])
  const [stats, setStats] = useState<TableStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<TableStatus | 'ALL'>('ALL')
  const [showTableModal, setShowTableModal] = useState(false)
  const [editingTable, setEditingTable] = useState<Table | null>(null)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [changingStatusTable, setChangingStatusTable] = useState<Table | null>(null)
  const [showCapacityModal, setShowCapacityModal] = useState(false)
  const [changingCapacityTable, setChangingCapacityTable] = useState<Table | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [tableToDelete, setTableToDelete] = useState<Table | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const businessId = user?.businessId
  const userIsOwner = isOwner(user ?? null)

  // Cargar mesas y estadísticas
  const loadTables = useCallback(async () => {
    if (!businessId) return

    try {
      setLoading(true)
      setError(null)
      const [tablesData, statsData] = await Promise.all([
        tableService.getTables(businessId),
        tableService.getTableStats(businessId),
      ])
      setTables(tablesData)
      setStats(statsData)
    } catch (err) {
      console.error('Error al cargar mesas:', err)
      setError('Error al cargar las mesas')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    loadTables()
  }, [loadTables])

  // Filtrar y buscar mesas
  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      const matchesSearch =
        table.tableCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        table.sector.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = filterStatus === 'ALL' || table.status === filterStatus

      return matchesSearch && matchesStatus
    })
  }, [tables, searchQuery, filterStatus])

  // Crear/Editar mesa
  const handleSaveTable = async (data: { tableCode: string; capacity: number; sector: string }) => {
    if (!businessId) return

    try {
      setProcessing(true)
      setError(null)

      if (editingTable) {
        // Editar mesa existente
        await tableService.updateTable(businessId, editingTable.id, data)
      } else {
        // Crear nueva mesa
        await tableService.createTable(businessId, data)
      }

      await loadTables()
      setShowTableModal(false)
      setEditingTable(null)
    } catch (err) {
      console.error('Error al guardar mesa:', err)
      const errorMsg = 'Error al guardar la mesa. Por favor, intenta nuevamente.'
      setError(errorMsg)
      alert(errorMsg)
    } finally {
      setProcessing(false)
    }
  }

  // Cambiar estado
  const handleChangeStatus = async (status: TableStatus) => {
    if (!businessId || !changingStatusTable) return

    try {
      setProcessing(true)
      setError(null)

      await tableService.updateTableStatus(businessId, changingStatusTable.id, { status })

      await loadTables()
      setShowStatusModal(false)
      setChangingStatusTable(null)
    } catch (err) {
      console.error('Error al cambiar estado:', err)
      const errorMsg = 'Error al cambiar el estado. Por favor, intenta nuevamente.'
      setError(errorMsg)
      alert(errorMsg)
    } finally {
      setProcessing(false)
    }
  }

  // Cambiar capacidad
  const handleChangeCapacity = async (capacity: number) => {
    if (!businessId || !changingCapacityTable) return

    try {
      setProcessing(true)
      setError(null)

      await tableService.updateTableCapacity(businessId, changingCapacityTable.id, { capacity })

      await loadTables()
      setShowCapacityModal(false)
      setChangingCapacityTable(null)
    } catch (err) {
      console.error('Error al cambiar capacidad:', err)
      const errorMsg = 'Error al cambiar la capacidad. Por favor, intenta nuevamente.'
      setError(errorMsg)
      alert(errorMsg)
    } finally {
      setProcessing(false)
    }
  }

  // Eliminar mesa
  const handleDeleteConfirm = async () => {
    if (!businessId || !tableToDelete) return

    try {
      setIsDeleting(true)
      setError(null)

      await tableService.deleteTable(businessId, tableToDelete.id)

      await loadTables()
      setShowDeleteModal(false)
      setTableToDelete(null)
    } catch (err) {
      console.error('Error al eliminar mesa:', err)
      const errorMsg = 'Error al eliminar la mesa. Por favor, intenta nuevamente.'
      setError(errorMsg)
      alert(errorMsg)
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3">
                <TableIcon className="w-8 h-8 text-[#f74116]" />
                Gestión de Mesas
              </h1>
              <p className="text-gray-600 mt-2">
                Administra las mesas de tu negocio y su estado de ocupación
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadTables}
                className="p-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Recargar"
              >
                <IoRefresh className="w-5 h-5 text-gray-600" />
              </button>
              {userIsOwner && (
                <button
                  onClick={() => {
                    setEditingTable(null)
                    setShowTableModal(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#f74116] text-white rounded-lg hover:bg-[#d63612] transition-colors font-semibold"
                >
                  <IoAddCircleOutline className="w-5 h-5" />
                  <span className="hidden sm:inline">Nueva Mesa</span>
                </button>
              )}
            </div>
          </div>

          {/* Estadísticas */}
          <StatsCard stats={stats} loading={loading} />

          {/* Filtros */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Búsqueda */}
              <div className="relative">
                <IoSearchOutline className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar por código o sector..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f74116] focus:border-transparent"
                />
              </div>

              {/* Filtro de estado */}
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as TableStatus | 'ALL')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f74116] focus:border-transparent"
                >
                  <option value="ALL">Todos los estados</option>
                  <option value="FREE">Libres</option>
                  <option value="RESERVED">Reservadas</option>
                  <option value="OCCUPIED">Ocupadas</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Grid de mesas */}
        {filteredTables.length === 0 ? (
          <div className="text-center py-16">
            <TableIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery || filterStatus !== 'ALL' ? 'No se encontraron mesas' : 'No hay mesas registradas'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || filterStatus !== 'ALL'
                ? 'Intenta ajustar los filtros de búsqueda'
                : userIsOwner
                  ? 'Crea tu primera mesa para comenzar'
                  : 'El propietario aún no ha creado mesas'}
            </p>
            {userIsOwner && !searchQuery && filterStatus === 'ALL' && (
              <button
                onClick={() => {
                  setEditingTable(null)
                  setShowTableModal(true)
                }}
                className="px-6 py-3 bg-[#f74116] text-white rounded-lg hover:bg-[#d63612] transition-colors font-semibold inline-flex items-center gap-2"
              >
                <IoAddCircleOutline className="w-5 h-5" />
                Crear Primera Mesa
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTables.map((table) => (
              <TableCard
                key={table.id}
                table={table}
                onEdit={(t) => {
                  setEditingTable(t)
                  setShowTableModal(true)
                }}
                onDelete={(t) => {
                  setTableToDelete(t)
                  setShowDeleteModal(true)
                }}
                onChangeStatus={(t) => {
                  setChangingStatusTable(t)
                  setShowStatusModal(true)
                }}
                onChangeCapacity={(t) => {
                  setChangingCapacityTable(t)
                  setShowCapacityModal(true)
                }}
                isOwner={userIsOwner}
              />
            ))}
          </div>
        )}

        {/* Modales */}
        <TableModal
          isOpen={showTableModal}
          onClose={() => {
            setShowTableModal(false)
            setEditingTable(null)
          }}
          onSave={handleSaveTable}
          editingTable={editingTable}
          isProcessing={processing}
        />

        <ChangeStatusModal
          isOpen={showStatusModal}
          onClose={() => {
            setShowStatusModal(false)
            setChangingStatusTable(null)
          }}
          onSave={handleChangeStatus}
          currentStatus={changingStatusTable?.status || 'FREE'}
          isProcessing={processing}
        />

        <ChangeCapacityModal
          isOpen={showCapacityModal}
          onClose={() => {
            setShowCapacityModal(false)
            setChangingCapacityTable(null)
          }}
          onSave={handleChangeCapacity}
          currentCapacity={changingCapacityTable?.capacity || 4}
          isProcessing={processing}
        />

        <ConfirmDeleteModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false)
            setTableToDelete(null)
          }}
          onConfirm={handleDeleteConfirm}
          tableCode={tableToDelete?.tableCode || ''}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  )
}

export default Tables
