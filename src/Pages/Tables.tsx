import { useState, useEffect, useCallback, useMemo } from 'react'
import { tableService, type Table, type TableStatus, type TableStats } from '../services/tableService'
import { reservationService } from '../services/reservationService'
import { useAuth } from '../contexts/useAuth'
import { isOwner } from '../guards/getDefaultRoute'
import LoadingScreen from '../components/LoadingScreen'
import { useToast } from '../hooks/useToast'
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
    case 'INACTIVE':
      return 'bg-gray-100 text-gray-600 border-gray-300'
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
    case 'INACTIVE':
      return 'Inactiva'
    default:
      return status
  }
}

// Componente de tarjeta de mesa
interface TableCardProps {
  table: Table
  onEdit: (table: Table) => void
  onDelete: (table: Table) => void
  onReactivate: (table: Table) => void
  onChangeStatus: (table: Table) => void
  onChangeCapacity: (table: Table) => void
  isOwner: boolean
}

function TableCard({ table, onEdit, onDelete, onReactivate, onChangeStatus, onChangeCapacity, isOwner }: TableCardProps) {
  const statusColor = getStatusColor(table.status)
  const isInactive = table.status === 'INACTIVE'

  return (
    <div className={`overflow-hidden transition-all duration-200 bg-white border border-gray-200 shadow-sm rounded-xl hover:shadow-md ${isInactive ? 'opacity-75' : ''}`}>
      {/* Header con código y estado */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isInactive ? 'bg-gray-200' : 'bg-[#f74116]/10'}`}>
              <TableIcon className={`w-6 h-6 ${isInactive ? 'text-gray-500' : 'text-[#f74116]'}`} />
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
        {isInactive && (
          <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-xs font-semibold text-gray-800">Mesa Inactiva</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  No se puede usar ni editar. Reactive para habilitarla.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="p-4 border-t border-gray-100 bg-gray-50">
        {isInactive ? (
          /* Acciones para mesa INACTIVE */
          <div className="space-y-2">
            {isOwner && (
              <button
                onClick={() => onReactivate(table)}
                className="w-full px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors duration-200"
              >
                ✓ Reactivar Mesa
              </button>
            )}
            <p className="text-xs text-center text-gray-500">
              Las mesas inactivas no se pueden editar ni usar en reservas
            </p>
          </div>
        ) : (
          /* Acciones para mesas activas */
          <>
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
                    Inactivar
                  </button>
                </>
              )}
            </div>
            {table.status !== 'FREE' && (
              <p className="mt-2 text-xs text-center text-gray-500">
                * Solo se puede {isOwner ? 'editar, inactivar o cambiar capacidad' : 'cambiar capacidad'} de mesas en estado libre
              </p>
            )}
          </>
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
      <div className="w-full max-w-md overflow-hidden bg-white shadow-2xl rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#f74116]/5 to-white">
          <h3 className="text-xl font-bold text-gray-900">
            {editingTable ? 'Editar Mesa' : 'Nueva Mesa'}
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
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
            <label className="block mb-2 text-sm font-semibold text-gray-700">
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
            <label className="block mb-2 text-sm font-semibold text-gray-700">
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
              className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div className="w-full max-w-md overflow-hidden bg-white shadow-2xl rounded-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#f74116]/5 to-white">
          <h3 className="text-xl font-bold text-gray-900">Cambiar Estado</h3>
          <button
            className="text-2xl text-gray-500 hover:text-gray-700"
            onClick={onClose}
            disabled={isProcessing}
            type="button"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block mb-3 text-sm font-semibold text-gray-700">
              Seleccionar nuevo estado
            </label>
            <div className="space-y-2">
              <label className="flex items-center p-3 transition-colors border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
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

              {newStatus === 'FREE' && currentStatus !== 'FREE' && (
                <div className="p-3 mt-2 border border-blue-200 rounded-lg bg-blue-50">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-900">Cierre automático de orden</p>
                      <p className="text-xs text-blue-700 mt-1">
                        Si esta mesa tiene una orden abierta asociada, se cerrará automáticamente al confirmar el cambio a estado Libre.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <label className="flex items-center p-3 transition-colors border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
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
            <div className="p-3 mt-3 border border-yellow-200 rounded-lg bg-yellow-50">
              <p className="text-xs text-yellow-800">
                ⚠️ <strong>Nota:</strong> El estado RESERVADO se asigna automáticamente 30 minutos antes de una reserva y se libera 5 minutos después de su finalización.
              </p>
            </div>
          </div>

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
      <div className="w-full max-w-md overflow-hidden bg-white shadow-2xl rounded-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#f74116]/5 to-white">
          <h3 className="text-xl font-bold text-gray-900">Cambiar Capacidad</h3>
          <button
            className="text-2xl text-gray-500 hover:text-gray-700"
            onClick={onClose}
            disabled={isProcessing}
            type="button"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
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
            <div className="p-3 mt-3 border border-yellow-200 rounded-lg bg-yellow-50">
              <p className="text-xs text-yellow-800">
                ⚠️ Solo se puede cambiar la capacidad de mesas en estado LIBRE.
              </p>
            </div>
          </div>

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

// Modal de confirmación de inactivación
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
      <div className="w-full max-w-md overflow-hidden bg-white shadow-2xl rounded-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800">Inactivar Mesa</h3>
          <button
            className="text-2xl text-gray-500 hover:text-gray-700"
            onClick={onClose}
            disabled={isDeleting}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-6 space-y-3">
          <div className="flex justify-center text-4xl">
            <svg className="w-16 h-16 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-base text-center text-gray-700">
            ¿Desea inactivar la mesa <strong className="font-semibold text-gray-900">"{tableCode}"</strong>?
          </p>
          <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
            <p className="text-sm text-blue-800">
              🛈 <strong>La mesa no se eliminará permanentemente.</strong> Podrá reactivarla después si lo necesita.
            </p>
          </div>
          <p className="text-sm text-center text-gray-600">
            La mesa quedará marcada como <strong>Inactiva</strong> y no estará disponible para reservas.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 px-6 py-4 border-t border-gray-200">
          <button
            type="button"
            className="px-4 py-2 text-sm font-semibold text-gray-700 transition-colors bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="px-5 py-2 text-sm font-semibold text-white transition-colors bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Inactivando...' : 'Inactivar Mesa'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Modal de confirmación de reactivación
interface ConfirmReactivateModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  tableCode: string
  isReactivating: boolean
}

function ConfirmReactivateModal({ isOpen, onClose, onConfirm, tableCode, isReactivating }: ConfirmReactivateModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md overflow-hidden bg-white shadow-2xl rounded-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-white">
          <h3 className="text-lg font-semibold text-gray-800">Reactivar Mesa</h3>
          <button
            className="text-2xl text-gray-500 hover:text-gray-700"
            onClick={onClose}
            disabled={isReactivating}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-6 space-y-3">
          <div className="flex justify-center text-4xl">
            <svg className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-base text-center text-gray-700">
            ¿Desea reactivar la mesa <strong className="font-semibold text-gray-900">"{tableCode}"</strong>?
          </p>
          <div className="p-4 border border-green-200 rounded-lg bg-green-50">
            <p className="text-sm text-green-800">
              ✅ <strong>La mesa volverá a estar disponible</strong> en estado Libre y podrá usarse en reservas.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 px-6 py-4 border-t border-gray-200">
          <button
            type="button"
            className="px-4 py-2 text-sm font-semibold text-gray-700 transition-colors bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onClose}
            disabled={isReactivating}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="px-5 py-2 text-sm font-semibold text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onConfirm}
            disabled={isReactivating}
          >
            {isReactivating ? 'Reactivando...' : 'Reactivar Mesa'}
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
      <div className="p-6 mb-6 bg-white border border-gray-200 rounded-xl animate-pulse">
        <div className="w-1/4 h-4 mb-4 bg-gray-200 rounded"></div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 mb-6 border border-gray-200 shadow-sm bg-gradient-to-r from-white to-gray-50 rounded-xl">
      <h2 className="flex items-center gap-2 mb-4 text-lg font-bold text-gray-900">
        <svg className="w-5 h-5 text-[#f74116]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Estadísticas de Ocupación
      </h2>
      <p className="mb-4 text-sm text-gray-600">
        * Las mesas inactivas no se incluyen en estas estadísticas
      </p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <p className="mb-1 text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalTables}</p>
        </div>
        <div className="p-4 border border-green-200 rounded-lg bg-green-50">
          <p className="mb-1 text-sm text-green-700">Libres</p>
          <p className="text-2xl font-bold text-green-700">{stats.freeTables}</p>
        </div>
        <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
          <p className="mb-1 text-sm text-yellow-700">Reservadas</p>
          <p className="text-2xl font-bold text-yellow-700">{stats.reservedTables}</p>
        </div>
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <p className="mb-1 text-sm text-red-700">Ocupadas</p>
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
  const { showSuccess, showErrorFromResponse } = useToast()
  const [tables, setTables] = useState<Table[]>([])
  const [stats, setStats] = useState<TableStats | null>(null)
  const [loading, setLoading] = useState(true)
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
  const [showReactivateModal, setShowReactivateModal] = useState(false)
  const [tableToReactivate, setTableToReactivate] = useState<Table | null>(null)
  const [isReactivating, setIsReactivating] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const businessId = user?.businessId
  const userIsOwner = isOwner(user ?? null)

  // Cargar mesas y estadísticas
  const loadTables = useCallback(async () => {
    if (!businessId) return

    try {
      setLoading(true)
      const [tablesData, statsData] = await Promise.all([
        tableService.getTables(businessId),
        tableService.getTableStats(businessId),
      ])
      setTables(tablesData)
      setStats(statsData)
    } catch (err) {
      showErrorFromResponse(err, 'Error al cargar las mesas')
    } finally {
      setLoading(false)
    }
  }, [businessId, showErrorFromResponse])

  useEffect(() => {
    loadTables()
  }, [loadTables])

  // Sincronizar estados de mesas y recargar
  const handleSyncAndReload = useCallback(async () => {
    if (!businessId) return

    try {
      setIsSyncing(true)
      // Primero sincronizar estados de mesas con el scheduler
      await reservationService.syncTableStates(businessId)
      showSuccess('Estados de mesas sincronizados')
      // Luego recargar los datos
      await loadTables()
    } catch (err) {
      showErrorFromResponse(err, 'Error al sincronizar estados')
      // Intentar recargar de todos modos
      await loadTables()
    } finally {
      setIsSyncing(false)
    }
  }, [businessId, loadTables, showSuccess, showErrorFromResponse])

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

      if (editingTable) {
        // Editar mesa existente
        await tableService.updateTable(businessId, editingTable.id, data)
        showSuccess('Mesa actualizada correctamente')
      } else {
        // Crear nueva mesa
        await tableService.createTable(businessId, data)
        showSuccess('Mesa creada correctamente')
      }

      await loadTables()
      setShowTableModal(false)
      setEditingTable(null)
    } catch (err) {
      showErrorFromResponse(err, 'Error al guardar la mesa')
    } finally {
      setProcessing(false)
    }
  }

  // Cambiar estado
  const handleChangeStatus = async (status: TableStatus) => {
    if (!businessId || !changingStatusTable) return

    try {
      setProcessing(true)

      await tableService.updateTableStatus(businessId, changingStatusTable.id, { status })
      showSuccess('Estado actualizado correctamente')

      await loadTables()
      setShowStatusModal(false)
      setChangingStatusTable(null)
    } catch (err) {
      showErrorFromResponse(err, 'Error al cambiar el estado')
    } finally {
      setProcessing(false)
    }
  }

  // Cambiar capacidad
  const handleChangeCapacity = async (capacity: number) => {
    if (!businessId || !changingCapacityTable) return

    try {
      setProcessing(true)

      await tableService.updateTableCapacity(businessId, changingCapacityTable.id, { capacity })
      showSuccess('Capacidad actualizada correctamente')

      await loadTables()
      setShowCapacityModal(false)
      setChangingCapacityTable(null)
    } catch (err) {
      showErrorFromResponse(err, 'Error al cambiar la capacidad')
    } finally {
      setProcessing(false)
    }
  }

  // Inactivar mesa (soft delete)
  const handleDeleteConfirm = async () => {
    if (!businessId || !tableToDelete) return

    try {
      setIsDeleting(true)

      await tableService.deleteTable(businessId, tableToDelete.id)
      showSuccess('Mesa inactivada exitosamente')

      await loadTables()
      setShowDeleteModal(false)
      setTableToDelete(null)
    } catch (err) {
      showErrorFromResponse(err, 'Error al inactivar la mesa')
    } finally {
      setIsDeleting(false)
    }
  }

  // Reactivar mesa
  const handleReactivateConfirm = async () => {
    if (!businessId || !tableToReactivate) return

    try {
      setIsReactivating(true)

      await tableService.reactivateTable(businessId, tableToReactivate.id)
      showSuccess('Mesa reactivada exitosamente')

      await loadTables()
      setShowReactivateModal(false)
      setTableToReactivate(null)
    } catch (err) {
      showErrorFromResponse(err, 'Error al reactivar la mesa')
    } finally {
      setIsReactivating(false)
    }
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
                <TableIcon className="w-8 h-8 text-[#f74116]" />
                Gestión de Mesas
              </h1>
              <p className="mt-2 text-gray-600">
                Administra las mesas de tu negocio y su estado de ocupación
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSyncAndReload}
                disabled={isSyncing}
                className="p-3 transition-colors bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Sincronizar estados y recargar"
              >
                <IoRefresh className={`w-5 h-5 text-gray-600 ${isSyncing ? 'animate-spin' : ''}`} />
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
          <div className="p-4 mb-6 bg-white border border-gray-200 rounded-xl">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Búsqueda */}
              <div className="relative">
                <IoSearchOutline className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
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
                  <option value="INACTIVE">Inactivas</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Grid de mesas */}
        {filteredTables.length === 0 ? (
          <div className="py-16 text-center">
            <TableIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="mb-2 text-xl font-semibold text-gray-900">
              {searchQuery || filterStatus !== 'ALL' ? 'No se encontraron mesas' : 'No hay mesas registradas'}
            </h3>
            <p className="mb-6 text-gray-600">
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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                onReactivate={(t) => {
                  setTableToReactivate(t)
                  setShowReactivateModal(true)
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

        <ConfirmReactivateModal
          isOpen={showReactivateModal}
          onClose={() => {
            setShowReactivateModal(false)
            setTableToReactivate(null)
          }}
          onConfirm={handleReactivateConfirm}
          tableCode={tableToReactivate?.tableCode || ''}
          isReactivating={isReactivating}
        />
      </div>
    </div>
  )
}

export default Tables
