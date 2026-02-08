import { businessService, type BusinessDetailResponse } from '../services/businessService'
import { salesManagementService, type SaleResponse } from '../services/salesManagementService'
import { useEffect, useState, useCallback } from "react"
import { useAuth } from "../contexts/useAuth"
import { useNavigate } from "react-router-dom"
import LoadingScreen from "../components/LoadingScreen"

function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [businessDetail, setBusinessDetail] = useState<BusinessDetailResponse | null>(null)
  const [recentSales, setRecentSales] = useState<SaleResponse[]>([])
  const [allSales, setAllSales] = useState<SaleResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalSalesAmount, setTotalSalesAmount] = useState(0)
  const [salesPeriod, setSalesPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month')
  const [filteredSalesCount, setFilteredSalesCount] = useState(0)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const businessId = user?.businessId

  // Función para filtrar ventas por período
  const filterSalesByPeriod = (sales: SaleResponse[], period: 'today' | 'week' | 'month' | 'all') => {
    const now = new Date()

    switch (period) {
      case 'today': {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        return sales.filter(sale => sale.occurredAt && new Date(sale.occurredAt) >= today)
      }

      case 'week': {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return sales.filter(sale => sale.occurredAt && new Date(sale.occurredAt) >= weekAgo)
      }

      case 'month': {
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        return sales.filter(sale => sale.occurredAt && new Date(sale.occurredAt) >= monthAgo)
      }

      case 'all':
      default:
        return sales
    }
  }

  // Función para obtener el total de ventas filtradas
  const getFilteredSalesData = useCallback(() => {
    const filteredSales = filterSalesByPeriod(allSales, salesPeriod)
    return {
      total: filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0),
      count: filteredSales.length
    }
  }, [allSales, salesPeriod])

  // Recalcular cuando cambian las ventas o el período
  useEffect(() => {
    if (allSales.length > 0) {
      const { total, count } = getFilteredSalesData()
      setTotalSalesAmount(total)
      setFilteredSalesCount(count)
    }
  }, [allSales, salesPeriod, getFilteredSalesData])

  // Cargar datos del dashboard
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!businessId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Cargar detalles del negocio y ventas en paralelo
        const [businessData, salesData] = await Promise.all([
          businessService.getBusinessDetail(businessId),
          salesManagementService.getAllSales(businessId)
        ])

        setBusinessDetail(businessData)
        setAllSales(salesData)

        // Obtener las últimas 3 ventas
        const sortedSales = salesData.sort((a, b) =>
          new Date(b.occurredAt || 0).getTime() - new Date(a.occurredAt || 0).getTime()
        )
        setRecentSales(sortedSales.slice(0, 3))

      } catch (err) {
        console.error('Error cargando datos del dashboard:', err)
        setError('Error al cargar la información del dashboard')
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [businessId])

  function capitalize(word?: string) {
    if (!word) return ''
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function getPeriodText(period: 'today' | 'week' | 'month' | 'all'): string {
    switch (period) {
      case 'today': return 'Hoy'
      case 'week': return 'Esta semana'
      case 'month': return 'Este mes'
      case 'all': return 'Total histórico'
      default: return 'Este mes'
    }
  }

  // Mostrar pantalla de carga
  if (loading) {
    return <LoadingScreen message="Cargando dashboard..." />
  }

  // Mostrar error si ocurrió
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-white via-[#fff1eb] to-white">
        <div className="text-center">
          <div className="mb-4 text-red-500">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">Error al cargar datos</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-[#f74116] text-white rounded-lg hover:bg-[#f74116]/90 transition-colors"
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#fff1eb] to-white">
      <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#f74116]/10 px-4 py-2 text-sm font-semibold text-[#f74116] mb-4">
            <span className="h-2 w-2 rounded-full bg-[#f74116]" />
            Dashboard de {businessDetail?.name}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Bienvenido, {capitalize(user?.name)} {capitalize(user?.lastName)}
          </h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-3">

          {/* Empleados */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#f74116]/10 p-6 hover:shadow-lg transition-all duration-200 group">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-12 h-12 transition-transform bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl group-hover:scale-105">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 ml-4">
                <p className="mb-1 text-sm font-medium text-gray-600">Equipo</p>
                <p className="text-3xl font-bold text-gray-900">
                  {businessDetail?.stats.totalMembers || 0}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  miembro{(businessDetail?.stats.totalMembers || 0) !== 1 ? 's' : ''} activo{(businessDetail?.stats.totalMembers || 0) !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Productos */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#f74116]/10 p-6 hover:shadow-lg transition-all duration-200 group">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-12 h-12 transition-transform bg-gradient-to-br from-green-100 to-green-200 rounded-xl group-hover:scale-105">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 ml-4">
                <p className="mb-1 text-sm font-medium text-gray-600">Catálogo</p>
                <p className="text-3xl font-bold text-gray-900">
                  {businessDetail?.stats.totalProducts || 0}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  producto{(businessDetail?.stats.totalProducts || 0) !== 1 ? 's' : ''} disponible{(businessDetail?.stats.totalProducts || 0) !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Ventas con Filtro */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#f74116]/10 p-6 hover:shadow-lg transition-all duration-200 group lg:col-span-1">
            <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-[#f74116]/10 to-[#f74116]/20 rounded-xl flex items-center justify-center mr-4 group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6 text-[#f74116]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-600">Ventas</p>
                  <p className="text-xs text-[#f74116] font-medium">{getPeriodText(salesPeriod)}</p>
                </div>
              </div>

              {/* Selector de período mejorado */}
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-[#f74116]/30 focus:outline-none focus:ring-2 focus:ring-[#f74116]/20 focus:border-[#f74116] transition-all duration-200 w-full sm:w-auto min-w-[90px] sm:min-w-[110px]"
                >
                  <span className="truncate">{getPeriodText(salesPeriod)}</span>
                  <svg
                    className={`w-3 h-3 text-gray-400 transition-transform duration-200 flex-shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isDropdownOpen && (
                  <>
                    {/* Overlay para cerrar al hacer click fuera */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsDropdownOpen(false)}
                    />

                    {/* Menú desplegable */}
                    <div className="absolute right-0 z-20 py-1 mt-1 duration-200 bg-white border border-gray-200 rounded-lg shadow-lg sm:left-0 top-full w-36 sm:w-40 animate-in fade-in slide-in-from-top-2">
                      {[
                        { value: 'today', label: 'Hoy' },
                        { value: 'week', label: '7 días' },
                        { value: 'month', label: '30 días' },
                        { value: 'all', label: 'Total' }
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSalesPeriod(option.value as 'today' | 'week' | 'month' | 'all')
                            setIsDropdownOpen(false)
                          }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-[#f74116]/5 hover:text-[#f74116] transition-colors ${salesPeriod === option.value
                              ? 'bg-[#f74116]/10 text-[#f74116] font-medium'
                              : 'text-gray-700'
                            }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(totalSalesAmount)}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {filteredSalesCount} venta{filteredSalesCount !== 1 ? 's' : ''} registrada{filteredSalesCount !== 1 ? 's' : ''}
                </p>
                {filteredSalesCount > 0 && (
                  <div className="flex items-center text-xs text-green-600">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span>Activo</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Acciones Rápidas</h2>
          <div className={`grid grid-cols-1 gap-4 ${user?.role === 'OWNER' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            <button
              onClick={() => navigate('/create-order')}
              className="group bg-gradient-to-r from-[#f74116] to-[#e63912] text-white rounded-xl p-6 text-left hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center mb-3">
                    <div className="flex items-center justify-center w-10 h-10 mr-3 rounded-lg bg-white/20">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <span className="text-lg font-semibold">Nueva Venta</span>
                  </div>
                  <p className="text-sm leading-relaxed text-white/90">
                    Registrar una venta y actualizar el inventario en tiempo real
                  </p>
                </div>
                <svg className="w-5 h-5 transition-transform opacity-75 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Botón de Productos - Solo para OWNER */}
            {user?.role === 'OWNER' && (
              <button
                onClick={() => navigate('/products')}
                className="group bg-white border border-gray-200 text-gray-900 rounded-xl p-6 text-left hover:border-[#f74116]/40 hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center mb-3">
                      <div className="flex items-center justify-center w-10 h-10 mr-3 bg-green-100 rounded-lg">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <span className="text-lg font-semibold text-gray-900">Productos</span>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-600">
                      Gestionar catálogo, precios y disponibilidad de productos
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            )}

            <button
              onClick={() => navigate('/analytics')}
              className="group bg-white border border-gray-200 text-gray-900 rounded-xl p-6 text-left hover:border-[#f74116]/40 hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center mb-3">
                    <div className="flex items-center justify-center w-10 h-10 mr-3 bg-blue-100 rounded-lg">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <span className="text-lg font-semibold text-gray-900">Reportes</span>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-600">
                    Analizar ventas, tendencias y métricas de rendimiento
                  </p>
                </div>
                <svg className="w-5 h-5 text-gray-400 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#f74116]/10 p-6 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Actividad Reciente</h2>
              <p className="mt-1 text-sm text-gray-500">Últimas ventas realizadas</p>
            </div>
            <button
              onClick={() => navigate('/sales-history')}
              className="inline-flex items-center text-[#f74116] hover:text-[#f74116]/80 text-sm font-medium transition-colors group"
            >
              <span>Ver historial completo</span>
              <svg className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {recentSales.length === 0 ? (
            <div className="py-16 text-center">
              <div className="flex items-center justify-center w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">¡Todo listo para empezar!</h3>
              <p className="max-w-sm mx-auto mb-6 text-gray-600">
                Cuando realices tu primera venta, aparecerá aquí junto con el resto de la actividad
              </p>
              <button
                onClick={() => navigate('/create-order')}
                className="inline-flex items-center px-4 py-2 bg-[#f74116] text-white rounded-lg hover:bg-[#f74116]/90 transition-colors font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Crear primera venta
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSales.map((sale) => (
                <div key={sale.id} className="p-4 transition-all duration-200 border border-transparent group bg-gray-50/50 rounded-xl hover:bg-gray-50 hover:border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">
                              Venta #{sale.id.slice(-6)}
                            </h3>
                            <p className="text-xs text-gray-500">
                              {sale.items.length} producto{sale.items.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-[#f74116]">
                            {formatCurrency(sale.totalAmount)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-600 pl-11">
                        <div className="flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>{sale.createdByUserName}</span>
                        </div>
                        <div className="flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{sale.occurredAt ? formatDate(sale.occurredAt) : 'Sin fecha'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Home
