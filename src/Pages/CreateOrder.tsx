import { useState, useEffect, useCallback, useMemo } from 'react'
import { productService, type Product } from '../services/productService'
import { categoryService, type Category as CategoryType } from '../services/categoryService'

// Tipo para productos que vienen de la API con el objeto category anidado
interface ProductWithCategory extends Omit<Product, 'categoryId'> {
  category?: {
    id: string;
    name: string;
  };
}
import { salesService, type Sale, type SaleItem } from '../services/salesService'
import { useAuth } from '../contexts/useAuth'
import LoadingScreen from '../components/LoadingScreen'
import EmptyState from '../components/Products/EmptyState'
import SuccessOperation from '../components/SuccesOperation'
import { OrderProductCard } from '../components/Orders'
import { IoFilterCircle, IoSearchOutline, IoAddCircle, IoCheckmarkCircle, IoCloseCircle, IoTrashOutline, IoPencilOutline, IoCartOutline, IoClose } from 'react-icons/io5'

function CreateOrder() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<CategoryType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState<string[]>([])
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Estados para manejar órdenes
  const [openSales, setOpenSales] = useState<Sale[]>([])
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [selectedSaleItems, setSelectedSaleItems] = useState<SaleItem[]>([])
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)
  const [isClosingOrder, setIsClosingOrder] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  
  // Estados para editar items
  const [editingItem, setEditingItem] = useState<SaleItem | null>(null)
  const [editQuantity, setEditQuantity] = useState(1)
  
  // Estados para confirmar eliminación
  const [deletingItem, setDeletingItem] = useState<SaleItem | null>(null)
  
  // Estado para controlar el carrito
  const [isCartOpen, setIsCartOpen] = useState(false)

  const businessId = user?.businessId

  const loadCategories = useCallback(async () => {
    if (!businessId) return

    try {
      const fetchedCategories = await categoryService.getCategories(businessId)
      setCategories(fetchedCategories)
    } catch (err) {
      console.error('Error cargando categorías:', err)
      setError('Error al cargar las categorías')
    }
  }, [businessId])

  const loadProducts = useCallback(async () => {
    if (!businessId) return

    try {
      setLoading(true)
      setError(null)
      const fetchedProducts = await productService.getProducts(businessId)
      
      // Transformar los productos para extraer el categoryId del objeto category
      const transformedProducts = (fetchedProducts as ProductWithCategory[]).map((product) => ({
        ...product,
        categoryId: product.category?.id || ''
      })) as Product[]
      
      setProducts(transformedProducts)
    } catch (err) {
      console.error('Error cargando productos:', err)
      setError('Error al cargar los productos')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  const loadOpenSales = useCallback(async () => {
    if (!businessId) return

    try {
      const sales = await salesService.getOpenSales(businessId)
      setOpenSales(sales)
    } catch (err) {
      console.error('Error cargando órdenes abiertas:', err)
      setError('Error al cargar las órdenes abiertas')
    }
  }, [businessId])

  const loadSaleItems = useCallback(async (saleId: string) => {
    if (!businessId) return

    try {
      const items = await salesService.getSaleItems(businessId, saleId)
      setSelectedSaleItems(items)
    } catch (err) {
      console.error('Error cargando items de la orden:', err)
      setError('Error al cargar los items de la orden')
    }
  }, [businessId])
  
  // Actualizar la orden seleccionada cuando cambian las órdenes abiertas
  useEffect(() => {
    if (selectedSale && openSales.length > 0) {
      const updatedSale = openSales.find(s => s.id === selectedSale.id)
      if (updatedSale && JSON.stringify(updatedSale) !== JSON.stringify(selectedSale)) {
        setSelectedSale(updatedSale)
      } else if (!updatedSale) {
        // La venta seleccionada ya no está abierta
        setSelectedSale(null)
      }
    }
  }, [openSales])

  // Filtrar productos basado en las categorías seleccionadas y búsqueda
  const filteredProducts = useMemo(() => {
    let filtered = products

    // Filtrar por categoría
    if (selectedCategoryFilters.length > 0) {
      filtered = filtered.filter(product => 
        selectedCategoryFilters.includes(product.categoryId || '')
      )
    }

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [products, selectedCategoryFilters, searchQuery])

  // Cargar productos, categorías y órdenes abiertas al montar el componente
  useEffect(() => {
    loadProducts()
    loadCategories()
    loadOpenSales()
  }, [loadProducts, loadCategories, loadOpenSales])

  // Efecto para cerrar el dropdown cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (showFilterDropdown && !target.closest('.filter-dropdown-container')) {
        setShowFilterDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFilterDropdown])

  if (loading) {
    return <LoadingScreen message="Cargando catálogo de productos..." />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-[#fff1eb] to-white">
        <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="p-8 text-center transition-all duration-200 bg-white border border-red-200 shadow-sm rounded-2xl hover:shadow-lg">
            <div className="flex items-center justify-center w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="mb-3 text-xl font-bold text-gray-900">Error al cargar productos</h2>
            <p className="mb-8 text-gray-600">{error}</p>
            <button
              onClick={loadProducts}
              className="px-6 py-3 bg-[#f74116] text-white rounded-lg hover:bg-[#f74116]/90 transition-colors font-medium"
              type="button"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Funciones para manejar filtros de categorías
  const handleToggleCategoryFilter = (categoryId: string) => {
    setSelectedCategoryFilters(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleClearAllFilters = () => {
    setSelectedCategoryFilters([])
    setSearchQuery('')
  }

  const handleToggleFilterDropdown = () => {
    setShowFilterDropdown(!showFilterDropdown)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  // Funciones para manejar órdenes
  const handleCreateNewOrder = async () => {
    if (!businessId) {
      setError('No se pudo encontrar el ID del negocio')
      return
    }

    setIsCreatingOrder(true)
    
    try {
      const response = await salesService.createSale(businessId)
      
      // Recargar las órdenes abiertas
      await loadOpenSales()
      
      // Seleccionar automáticamente la nueva orden
      const newSale = openSales.find(s => s.id === response.saleId)
      if (newSale) {
        setSelectedSale(newSale)
      }
      
      setSuccessMessage('Nueva orden creada exitosamente')
      setShowSuccessModal(true)
      
    } catch (err) {
      console.error('Error creando orden:', err)
      setError('Error al crear la orden')
    } finally {
      setIsCreatingOrder(false)
    }
  }

  const handleSelectSale = async (sale: Sale) => {
    setSelectedSale(sale)
    await loadSaleItems(sale.id)
  }

  const handleAddToOrder = async (product: Product, quantity: number) => {
    if (!selectedSale) {
      setError('Debes seleccionar una orden primero')
      return
    }

    if (!businessId) {
      setError('No se pudo encontrar el ID del negocio')
      return
    }

    try {
      // Verificar si el producto ya está en la orden
      const existingItem = selectedSaleItems.find(item => item.productName === product.name)
      
      // Si ya existe, sumar la cantidad nueva a la existente
      const totalQuantity = existingItem 
        ? existingItem.quantity + quantity 
        : quantity
      
      await salesService.addItemToSale(businessId, selectedSale.id, {
        productId: product.id,
        quantity: totalQuantity
      })
      
      // Recargar las órdenes abiertas para actualizar los totales
      await loadOpenSales()
      
      // Recargar los items de la orden seleccionada
      await loadSaleItems(selectedSale.id)
      
      const message = existingItem
        ? `${product.name} actualizado (cantidad total: ${totalQuantity})`
        : `${product.name} agregado a la orden`
      
      setSuccessMessage(message)
      setShowSuccessModal(true)
      
    } catch (err) {
      console.error('Error agregando producto a la orden:', err)
      setError('Error al agregar el producto a la orden')
    }
  }

  const handleCloseOrder = async () => {
    if (!selectedSale) return
    if (!businessId) {
      setError('No se pudo encontrar el ID del negocio')
      return
    }

    setIsClosingOrder(true)
    
    try {
      await salesService.closeSale(businessId, selectedSale.id)
      
      // Limpiar la orden seleccionada y sus items
      setSelectedSale(null)
      setSelectedSaleItems([])
      
      // Recargar las órdenes abiertas
      await loadOpenSales()
      
      setSuccessMessage('Orden cerrada exitosamente')
      setShowSuccessModal(true)
      
    } catch (err) {
      console.error('Error cerrando orden:', err)
      setError('Error al cerrar la orden')
    } finally {
      setIsClosingOrder(false)
    }
  }

  const handleEditItem = (item: SaleItem) => {
    setEditingItem(item)
    setEditQuantity(item.quantity)
  }

  const handleSaveEdit = async () => {
    if (!editingItem || !selectedSale || !businessId) return
    if (editQuantity <= 0) return

    try {
      // Buscar el producto por nombre para obtener su ID
      const product = products.find(p => p.name === editingItem.productName)
      
      if (!product) {
        setError('No se pudo encontrar el producto')
        return
      }

      // Agregar el item nuevamente con la nueva cantidad
      await salesService.addItemToSale(businessId, selectedSale.id, {
        productId: product.id,
        quantity: editQuantity
      })
      
      // Recargar las órdenes y los items
      await loadOpenSales()
      await loadSaleItems(selectedSale.id)
      
      setEditingItem(null)
      setSuccessMessage('Cantidad actualizada')
      setShowSuccessModal(true)
      
    } catch (err) {
      console.error('Error actualizando item:', err)
      setError('Error al actualizar el item')
    }
  }

  const handleDeleteItem = (item: SaleItem) => {
    setDeletingItem(item)
  }

  const confirmDeleteItem = async () => {
    if (!deletingItem || !selectedSale || !businessId) return

    try {
      // Buscar el producto por nombre para obtener su ID
      const product = products.find(p => p.name === deletingItem.productName)
      
      if (!product) {
        setError('No se pudo encontrar el producto')
        return
      }

      // Enviar cantidad 0 para eliminar el item
      await salesService.addItemToSale(businessId, selectedSale.id, {
        productId: product.id,
        quantity: 0
      })
      
      // Recargar las órdenes y los items
      await loadOpenSales()
      await loadSaleItems(selectedSale.id)
      
      setDeletingItem(null)
      setSuccessMessage(`${deletingItem.productName} eliminado de la orden`)
      setShowSuccessModal(true)
      
    } catch (err) {
      console.error('Error eliminando item:', err)
      setError('Error al eliminar el item')
      setDeletingItem(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#fff1eb] to-white">
      <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#f74116]/10 px-4 py-2 text-sm font-semibold text-[#f74116] mb-4">
            <span className="h-2 w-2 rounded-full bg-[#f74116]" />
            Gestión de Ventas - V2
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-gray-900 sm:text-4xl">
                Crear Orden de Venta (V2)
              </h1>
              <p className="text-gray-600">Gestiona órdenes abiertas y agrega productos</p>
            </div>
            <button
              onClick={handleCreateNewOrder}
              disabled={isCreatingOrder}
              className="flex items-center gap-2 bg-[#f74116] text-white px-6 py-3 rounded-lg hover:bg-[#f74116]/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
            >
              <IoAddCircle className="text-xl" />
              Nueva Orden
            </button>
          </div>
        </div>

        {/* Sección de órdenes abiertas */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#f74116]/10 p-6 mb-8 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Órdenes Abiertas</h2>
            <span className="text-sm text-gray-500">{openSales.length} orden(es)</span>
          </div>
          
          {openSales.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-gray-500">No hay órdenes abiertas. Crea una nueva para comenzar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {openSales.map(sale => {
                // Calcular total para cada orden en la lista
                const saleTotal = sale.items?.reduce((sum, item) => {
                  return sum + (item.lineTotal || 0)
                }, 0) || 0
                
                return (
                  <button
                    key={sale.id}
                    onClick={() => handleSelectSale(sale)}
                    className={`
                      p-4 rounded-lg border-2 text-left transition-all duration-200
                      ${selectedSale?.id === sale.id 
                        ? 'border-[#f74116] bg-[#f74116]/5 shadow-md' 
                        : 'border-gray-200 hover:border-[#f74116]/50 hover:shadow-sm'
                      }
                    `}
                    type="button"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Orden #{sale.id.slice(0, 8)}
                        </h3>
                      </div>
                      {selectedSale?.id === sale.id && (
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#f74116]">
                          <IoCheckmarkCircle className="text-white" />
                        </span>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-sm text-gray-600">
                        Total: <span className="font-semibold text-gray-900">${saleTotal.toFixed(2)}</span>
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Botón flotante del carrito */}
        {selectedSale && (() => {
          // Calcular el total basado en los items
          const totalCalculado = selectedSaleItems.reduce((sum, item) => {
            return sum + (item.lineTotal || 0)
          }, 0)
          
          return (
            <>
              {/* Botón flotante */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="fixed bottom-8 right-8 z-40 flex items-center gap-3 bg-[#f74116] text-white px-6 py-4 rounded-full shadow-2xl hover:bg-[#f74116]/90 transition-all duration-200 hover:scale-105"
                type="button"
              >
                <div className="relative">
                  <IoCartOutline className="w-7 h-7" />
                  {selectedSaleItems.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-white text-[#f74116] text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                      {selectedSaleItems.length}
                    </span>
                  )}
                </div>
                <div className="text-left">
                  <p className="text-lg font-bold">${totalCalculado.toFixed(2)}</p>
                </div>
              </button>

              {/* Panel lateral del carrito */}
              <div
                className={`fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${
                  isCartOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
              >
                <div className="flex flex-col h-full">
                  {/* Header del carrito */}
                  <div className="bg-[#f74116] text-white p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <IoCartOutline className="w-8 h-8" />
                        <div>
                          <h3 className="text-xl font-bold">
                            Orden #{selectedSale.id.slice(0, 8)}
                          </h3>
                          <p className="text-sm text-white/80">{selectedSaleItems.length} producto(s)</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsCartOpen(false)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        type="button"
                      >
                        <IoClose className="w-6 h-6" />
                      </button>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Total de la Orden</span>
                        <span className="text-2xl font-bold">${totalCalculado.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Lista de items */}
                  <div className="flex-1 overflow-y-auto p-6">
                    {selectedSaleItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-20 h-20 mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                          <IoCartOutline className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="text-gray-500">No hay productos agregados aún</p>
                        <p className="text-sm text-gray-400 mt-2">Selecciona productos para agregar a la orden</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedSaleItems.map((item) => {
                          const unitCost = item.unitCost || 0
                          const quantity = item.quantity || 0
                          const subtotal = item.lineTotal || 0
                          
                          return (
                            <div
                              key={item.id}
                              className="border border-gray-200 rounded-lg p-4 hover:border-[#f74116]/30 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-900 mb-1">{item.productName || 'Producto'}</p>
                                  <p className="text-sm text-gray-500">{item.categoryName}</p>
                                  <p className="text-sm text-gray-600 mt-2">
                                    {quantity} × ${unitCost.toFixed(2)}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-gray-500 mb-1">Subtotal</p>
                                  <p className="font-bold text-lg text-gray-900">${subtotal.toFixed(2)}</p>
                                </div>
                              </div>
                              <div className="flex gap-2 pt-3 border-t border-gray-100">
                                <button
                                  onClick={() => handleEditItem(item)}
                                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors font-medium"
                                  type="button"
                                >
                                  <IoPencilOutline className="w-4 h-4" />
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item)}
                                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors font-medium"
                                  type="button"
                                >
                                  <IoTrashOutline className="w-4 h-4" />
                                  Eliminar
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Footer con botón de cerrar orden */}
                  <div className="border-t border-gray-200 p-6 bg-gray-50">
                    <button
                      onClick={handleCloseOrder}
                      disabled={isClosingOrder || selectedSaleItems.length === 0}
                      className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-4 rounded-lg hover:bg-green-700 transition-colors font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      type="button"
                    >
                      <IoCheckmarkCircle className="text-xl" />
                      {isClosingOrder ? 'Cerrando...' : 'Cerrar Orden'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Overlay para cerrar el carrito al hacer clic fuera */}
              {isCartOpen && (
                <div
                  className="fixed inset-0 bg-black bg-opacity-50 z-40"
                  onClick={() => setIsCartOpen(false)}
                />
              )}
            </>
          )
        })()}

        {/* Sección de filtros */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#f74116]/10 p-6 mb-8 hover:shadow-lg transition-all duration-200">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            {/* Buscador */}
            <div className="relative flex-1 min-w-[250px]">
              <IoSearchOutline className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
              <input
                type="text"
                placeholder="Buscar productos por nombre o descripción..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f74116]/20 focus:border-[#f74116] transition-all"
              />
            </div>

            {/* Dropdown de filtros */}
            <div className="relative filter-dropdown-container">
              <button
                className="flex items-center gap-2 px-4 py-2 text-gray-700 transition-colors border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
                type="button"
                onClick={handleToggleFilterDropdown}
              >
                <IoFilterCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Filtrar por categoría</span>
              </button>
              
              {/* Dropdown menu */}
              {showFilterDropdown && (
                <div className="absolute left-0 z-50 w-64 py-2 mt-2 bg-white border border-gray-200 shadow-xl top-full rounded-xl">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-800">Seleccionar categorías</h4>
                  </div>
                  
                  <div className="overflow-y-auto max-h-64">
                    {categories.map(category => (
                      <button
                        key={category.id}
                        className={`
                          w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors
                          ${selectedCategoryFilters.includes(category.id) ? 'bg-[#f74116]/10 text-[#f74116]' : 'text-gray-700'}
                        `}
                        onClick={() => handleToggleCategoryFilter(category.id)}
                        type="button"
                      >
                        <span className="text-lg">{category.icon}</span>
                        <span className="flex-1 text-sm font-medium">{category.name}</span>
                        {selectedCategoryFilters.includes(category.id) && (
                          <span className="text-[#f74116]">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                  
                  {selectedCategoryFilters.length > 0 && (
                    <div className="px-4 py-2 border-t border-gray-100">
                      <button
                        className="w-full text-sm font-medium text-red-600 hover:text-red-800"
                        onClick={handleClearAllFilters}
                        type="button"
                      >
                        Limpiar filtros
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Categorías seleccionadas como filtros */}
          <div className="flex flex-wrap items-center gap-3">
            {selectedCategoryFilters.map(categoryId => {
              const category = categories.find(cat => cat.id === categoryId)
              if (!category) return null
              
              return (
                <div 
                  key={categoryId}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#f74116] bg-[#f74116]/10 border border-[#f74116]/20 rounded-full"
                >
                  <span>{category.icon}</span>
                  <span>{category.name}</span>
                  <button 
                    className="ml-1 font-bold text-[#f74116] hover:text-[#f74116]/80"
                    onClick={() => handleToggleCategoryFilter(categoryId)}
                    type="button"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Grid de Productos */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#f74116]/10 p-6 hover:shadow-lg transition-all duration-200">
          {!selectedSale ? (
            <div className="py-16 text-center">
              <div className="flex items-center justify-center w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full">
                <IoCloseCircle className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">Selecciona una orden</h3>
              <p className="max-w-sm mx-auto mb-6 text-gray-600">
                Debes seleccionar una orden abierta o crear una nueva para poder agregar productos.
              </p>
            </div>
          ) : filteredProducts.length === 0 && products.length > 0 ? (
            <div className="py-16 text-center">
              <div className="flex items-center justify-center w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">No se encontraron productos</h3>
              <p className="max-w-sm mx-auto mb-6 text-gray-600">
                No hay productos que coincidan con los filtros seleccionados.
              </p>
              <button
                className="px-6 py-3 bg-[#f74116] text-white rounded-lg hover:bg-[#f74116]/90 transition-colors font-medium"
                onClick={handleClearAllFilters}
                type="button"
              >
                Limpiar filtros
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-16 text-center">
              <EmptyState  />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Catálogo de Productos</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Selecciona productos para agregar a la orden
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map(product => (
                  <OrderProductCard
                    key={product.id}
                    product={product}
                    categories={categories}
                    onAddToCart={handleAddToOrder}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal de éxito */}
      {showSuccessModal && (
        <SuccessOperation
          message={successMessage}
          onClose={() => setShowSuccessModal(false)}
        />
      )}

      {/* Modal de edición de cantidad */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Editar Cantidad</h3>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                <span className="font-semibold">Producto:</span> {editingItem.productName}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Precio unitario: ${(editingItem.unitCost || 0).toFixed(2)}
              </p>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nueva cantidad:
              </label>
              <input
                type="number"
                min="1"
                value={editQuantity}
                onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f74116]/20 focus:border-[#f74116]"
                autoFocus
              />
              
              <p className="text-sm text-gray-600 mt-2">
                Nuevo subtotal: ${((editingItem.unitCost || 0) * editQuantity).toFixed(2)}
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setEditingItem(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                type="button"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-2 bg-[#f74116] text-white rounded-lg hover:bg-[#f74116]/90 transition-colors font-medium"
                type="button"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
              <IoTrashOutline className="w-8 h-8 text-red-600" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">Eliminar Producto</h3>
            
            <p className="text-gray-600 mb-6 text-center">
              ¿Estás seguro de eliminar <span className="font-semibold">{deletingItem.productName}</span> de la orden?
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingItem(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                type="button"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteItem}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                type="button"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CreateOrder
