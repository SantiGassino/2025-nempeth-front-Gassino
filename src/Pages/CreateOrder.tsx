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
import { salesService, type CreateSaleRequest } from '../services/salesService'
import { useAuth } from '../contexts/useAuth'
import LoadingScreen from '../components/LoadingScreen'
import EmptyState from '../components/Products/EmptyState'
import SuccessOperation from '../components/SuccesOperation'
import { OrderProductCard, ShoppingCart, type CartItem } from '../components/Orders'
import { IoFilterCircle, IoCartOutline, IoSearchOutline } from 'react-icons/io5'

function CreateOrder() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<CategoryType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState<string[]>([])
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showCartModal, setShowCartModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

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

  // Cargar productos y categorías al montar el componente
  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [loadProducts, loadCategories])

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

  // Funciones del carrito
  const handleAddToCart = (product: Product, quantity: number) => {
    setCartItems(prev => {
      const existingItem = prev.find(item => item.product.id === product.id)
      if (existingItem) {
        // Si el producto ya existe, actualizar la cantidad
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      } else {
        // Si es un producto nuevo, agregarlo
        return [...prev, { product, quantity }]
      }
    })
  }

  const handleUpdateCartQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveFromCart(productId)
      return
    }
    
    setCartItems(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    )
  }

  const handleRemoveFromCart = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.product.id !== productId))
  }

  const handleCreateOrder = async () => {
    if (cartItems.length === 0) return
    if (!businessId) {
      setError('No se pudo encontrar el ID del negocio')
      return
    }

    setIsCreatingOrder(true)
    
    try {
      
      // Crear la venta usando el servicio
      await salesService.createSale(businessId)
      
      // Limpiar carrito después de crear la orden
      setCartItems([])
      
      // Cerrar modal del carrito si está abierto
      setShowCartModal(false)
      
      // Mostrar modal de éxito
      setShowSuccessModal(true)
      
    } catch (err) {
      console.error('Error creando orden:', err)
      setError('Error al crear la orden')
    } finally {
      setIsCreatingOrder(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#fff1eb] to-white">
      <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#f74116]/10 px-4 py-2 text-sm font-semibold text-[#f74116] mb-4">
            <span className="h-2 w-2 rounded-full bg-[#f74116]" />
            Gestión de Ventas
          </div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900 sm:text-4xl">
            Crear Orden de Venta
          </h1>
          <p className="text-gray-600">Selecciona productos para crear una nueva orden</p>
        </div>

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
          {filteredProducts.length === 0 && products.length > 0 ? (
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
                    Selecciona productos para agregar al carrito
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map(product => (
                  <OrderProductCard
                    key={product.id}
                    product={product}
                    categories={categories}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Botón flotante del carrito (visible cuando hay items) */}
        {cartItems.length > 0 && (
          <div className="fixed z-40 bottom-6 right-6">
            <button
              className="flex items-center gap-2 bg-[#f74116] text-white px-5 py-3.5 rounded-full shadow-lg hover:bg-[#f74116]/90 transition-all duration-200 hover:scale-105"
              onClick={() => setShowCartModal(true)}
              type="button"
            >
              <IoCartOutline className="text-xl" />
              <span className="font-semibold">{cartItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </button>
          </div>
        )}
      </div>

      {/* Componente del carrito como modal */}
      <ShoppingCart
        items={cartItems}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveFromCart}
        onCreateOrder={handleCreateOrder}
        isCreatingOrder={isCreatingOrder}
        isOpen={showCartModal}
        onClose={() => setShowCartModal(false)}
      />

      {/* Modal de éxito */}
      {showSuccessModal && (
        <SuccessOperation
          message="Orden de venta creada exitosamente"
          onClose={() => setShowSuccessModal(false)}
        />
      )}
    </div>
  )
}

export default CreateOrder