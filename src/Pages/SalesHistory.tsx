import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { salesManagementService, type SaleResponse } from '../services/salesManagementService'
import { useAuth } from '../contexts/useAuth'
import { useToast } from '../hooks/useToast'
import { IoReceiptOutline, IoCalendarOutline, IoPersonOutline, IoCashOutline, IoEyeOutline, IoSwapVerticalOutline, IoFunnelOutline } from 'react-icons/io5'
import LoadingScreen from '../components/LoadingScreen'

type SortField = 'date' | 'amount'
type SortOrder = 'asc' | 'desc'

// Helper para identificar órdenes automáticas de mesa
const isTableOrder = (sale: SaleResponse): boolean => {
  return sale.table !== null
}

// Extraer código de mesa de órdenes automáticas
const getTableCode = (sale: SaleResponse): string | null => {
  return sale.table?.tableCode || null
}

function SalesHistory() {
  const { user } = useAuth()
  const { showError } = useToast()
  const navigate = useNavigate()
  const [sales, setSales] = useState<SaleResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [showDateFilter, setShowDateFilter] = useState(false)

  const businessId = user?.businessId

  const loadSales = useCallback(async () => {
    if (!businessId) return

    try {
      setLoading(true)
      const salesData = await salesManagementService.getAllSales(businessId)
      setSales(salesData)
    } catch (err) {
      console.error('Error cargando ventas:', err)
      showError('Error al cargar el historial de ventas')
    } finally {
      setLoading(false)
    }
  }, [businessId, showError])

  useEffect(() => {
    loadSales()
  }, [loadSales])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const handleViewDetails = (saleId: string) => {
    navigate(`/sales/${saleId}`)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  // Función para convertir fecha local a UTC-3 (Argentina)
  const toLocalDate = (date: Date) => {
    const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000))
    const argentinaOffset = -3 * 60 * 60000 // UTC-3 en milisegundos
    return new Date(utcDate.getTime() + argentinaOffset)
  }

  // Función para filtrar ventas por rango de fechas
  const getFilteredSales = () => {
    if (!startDate && !endDate) {
      return sales
    }

    return sales.filter(sale => {
      // Si la orden está abierta (occurredAt null), siempre incluirla
      if (!sale.occurredAt) return true

      const saleDate = new Date(sale.occurredAt)
      const saleDateLocal = toLocalDate(saleDate)

      // Obtener solo la fecha (sin hora) para comparación
      const saleDateOnly = new Date(saleDateLocal.getFullYear(), saleDateLocal.getMonth(), saleDateLocal.getDate())

      let isWithinRange = true

      if (startDate) {
        const startDateObj = new Date(startDate)
        isWithinRange = isWithinRange && saleDateOnly >= startDateObj
      }

      if (endDate) {
        const endDateObj = new Date(endDate)
        isWithinRange = isWithinRange && saleDateOnly <= endDateObj
      }

      return isWithinRange
    })
  }

  const getSortedSales = () => {
    const filteredSales = getFilteredSales()
    const sorted = [...filteredSales].sort((a, b) => {
      // Priorizar órdenes abiertas (occurredAt null) siempre al principio
      const aIsOpen = !a.occurredAt
      const bIsOpen = !b.occurredAt

      if (aIsOpen && !bIsOpen) return -1
      if (!aIsOpen && bIsOpen) return 1

      // Si ambas son abiertas, mantener orden original
      if (aIsOpen && bIsOpen) return 0

      // Si ambas son cerradas, aplicar orden normal
      if (sortField === 'date') {
        const dateA = new Date(a.occurredAt!).getTime()
        const dateB = new Date(b.occurredAt!).getTime()
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
      } else {
        return sortOrder === 'asc'
          ? a.totalAmount - b.totalAmount
          : b.totalAmount - a.totalAmount
      }
    })
    return sorted
  }

  const clearDateFilter = () => {
    setStartDate('')
    setEndDate('')
  }

  if (loading) {
    return <LoadingScreen message="Cargando historial de ventas..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#fff1eb] to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#f74116]/10 px-4 py-2 text-sm font-semibold text-[#f74116] mb-4">
            <span className="h-2 w-2 rounded-full bg-[#f74116]" />
            Historial de ventas
          </div>
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Registro de Ventas
          </h1>
          <p className="text-gray-600 mt-2">
            {getSortedSales().length} de {sales.length} {sales.length === 1 ? 'venta' : 'ventas'}
            {(startDate || endDate) && ' (filtrado)'}
          </p>
        </div>

        {/* Tarjeta de Resumen */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#f74116]/10 p-6 hover:shadow-lg transition-all duration-200 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">

            {/* Total de ventas */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                <IoCashOutline className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Total de Ventas</h2>
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(getSortedSales().reduce((sum, sale) => sum + sale.totalAmount, 0))}
                </p>
                <div className="flex gap-4 mt-2 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">📋 Manuales:</span> {getSortedSales().filter(s => !isTableOrder(s)).length}
                  </div>
                  <div>
                    <span className="font-medium">🪑 Por Mesa:</span> {getSortedSales().filter(s => isTableOrder(s)).length}
                  </div>
                </div>
              </div>
            </div>

            {/* Controles de filtros y ordenamiento */}
            <div className="flex flex-col sm:flex-row gap-4">

              {/* Filtros de fecha */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowDateFilter(!showDateFilter)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${showDateFilter || startDate || endDate
                        ? 'bg-[#f74116] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    <IoFunnelOutline className="w-4 h-4" />
                    <span>Filtrar por fecha</span>
                  </button>

                  {(startDate || endDate) && (
                    <button
                      onClick={clearDateFilter}
                      className="text-sm text-gray-600 hover:text-red-600 transition-colors px-2 py-1 hover:bg-red-50 rounded"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                {showDateFilter && (
                  <div className="flex items-center gap-2 text-sm">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f74116]/20 focus:border-[#f74116]"
                    />
                    <span className="text-gray-500">hasta</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f74116]/20 focus:border-[#f74116]"
                    />
                  </div>
                )}
              </div>

              {/* Controles de ordenamiento */}
              <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg">
                <IoSwapVerticalOutline className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-600">Ordenar:</span>
                <button
                  onClick={() => handleSort('date')}
                  className={`flex items-center gap-1 px-3 py-1 text-sm rounded-lg transition-colors ${sortField === 'date'
                      ? 'bg-[#f74116] text-white'
                      : 'text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  <IoCalendarOutline className="w-4 h-4" />
                  <span>Fecha</span>
                  {sortField === 'date' && (
                    <span className="text-xs">
                      {sortOrder === 'desc' ? '↓' : '↑'}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => handleSort('amount')}
                  className={`flex items-center gap-1 px-3 py-1 text-sm rounded-lg transition-colors ${sortField === 'amount'
                      ? 'bg-[#f74116] text-white'
                      : 'text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  <IoCashOutline className="w-4 h-4" />
                  <span>Monto</span>
                  {sortField === 'amount' && (
                    <span className="text-xs">
                      {sortOrder === 'desc' ? '↓' : '↑'}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>        {/* Lista de Ventas */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#f74116]/10 p-6 hover:shadow-lg transition-all duration-200">
          {getSortedSales().length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <IoReceiptOutline className="w-10 h-10 text-gray-400" />
              </div>
              {sales.length === 0 ? (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay ventas registradas</h3>
                  <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                    Las ventas que generes aparecerán aquí
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay ventas en el rango seleccionado</h3>
                  <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                    Intenta ajustar las fechas del filtro para ver más resultados
                  </p>
                  <button
                    onClick={clearDateFilter}
                    className="px-4 py-2 bg-[#f74116] text-white rounded-lg hover:bg-[#f74116]/90 transition-colors"
                  >
                    Limpiar filtro
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Ventas Registradas</h2>
                <p className="text-sm text-gray-500">
                  Mostrando {getSortedSales().length} {getSortedSales().length === 1 ? 'resultado' : 'resultados'}
                </p>
              </div>

              {getSortedSales().map((sale) => {
                const isAutomatic = isTableOrder(sale)
                const tableCode = getTableCode(sale)

                return (
                  <div
                    key={sale.id}
                    className="group p-5 bg-gray-50/50 rounded-xl hover:bg-gray-50 transition-all duration-200 border border-transparent hover:border-gray-200 hover:shadow-sm transform hover:scale-[1.01]"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-12 h-12 bg-gradient-to-br rounded-xl flex items-center justify-center flex-shrink-0 ${isAutomatic
                            ? 'from-blue-100 to-blue-200'
                            : 'from-[#f74116]/10 to-[#f74116]/20'
                          }`}>
                          {isAutomatic ? (
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          ) : (
                            <IoReceiptOutline className="w-6 h-6 text-[#f74116]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {isAutomatic && tableCode ? `Mesa ${tableCode} -` : ''} Venta #{sale.code}
                            </h3>
                            {isAutomatic ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full border border-blue-200">
                                🪑 Orden Automática
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-[#f74116] bg-[#f74116]/10 rounded-full">
                                📋 Orden Manual
                              </span>
                            )}
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-[#f74116] bg-[#f74116]/10 rounded-full">
                              {sale.items.length} {sale.items.length === 1 ? 'producto' : 'productos'}
                            </span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-gray-600">
                            {sale.occurredAt ? (
                              <div className="flex items-center gap-1">
                                <IoCalendarOutline className="w-4 h-4" />
                                <span>{formatDate(sale.occurredAt)}</span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-100 rounded-full border border-amber-300">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Orden Abierta
                              </span>
                            )}
                            <span className="hidden sm:inline text-gray-400">•</span>
                            <div className="flex items-center gap-1">
                              <IoPersonOutline className="w-4 h-4" />
                              <span>{sale.createdByUserName}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-2xl font-bold text-green-600 mb-1">
                            <IoCashOutline className="w-5 h-5" />
                            <span>{formatCurrency(sale.totalAmount)}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleViewDetails(sale.id)}
                          className="flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors group-hover:bg-white group-hover:shadow-sm"
                        >
                          <IoEyeOutline className="w-4 h-4" />
                          <span>Ver Detalles</span>
                        </button>
                      </div>
                    </div>

                    {/* Vista previa de productos */}
                    <div className="pt-4 mt-4 border-t border-gray-100">
                      <h4 className="mb-2 text-sm font-semibold text-gray-700">Productos vendidos:</h4>
                      <div className="flex flex-wrap gap-2">
                        {sale.items.slice(0, 3).map((item, index) => (
                          <div
                            key={index}
                            className="inline-flex items-center px-3 py-1 text-sm text-blue-700 rounded-full bg-blue-50 border border-blue-200"
                          >
                            <span className="truncate max-w-32">{item.productName}</span>
                            <span className="ml-2 font-medium">× {item.quantity}</span>
                          </div>
                        ))}
                        {sale.items.length > 3 && (
                          <div className="inline-flex items-center px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-full border border-gray-200">
                            +{sale.items.length - 3} más
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SalesHistory