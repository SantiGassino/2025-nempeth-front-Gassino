import { useState, useEffect, useCallback, useMemo } from 'react'
import { productService, type Product } from '../services/productService'
import { categoryService, type Category as CategoryType } from '../services/categoryService'
import { useAuth } from '../contexts/useAuth'
import { useToast } from '../hooks/useToast'
import LoadingScreen from '../components/LoadingScreen'
import EmptyState from '../components/Products/EmptyState'
import DescriptionModal from '../components/Products/DescriptionModal'
import ProductCard from '../components/Products/ProductCard'
import CategoryManagementModal from '../components/Products/CategoryManagementModal'
import ProductModal from '../components/Products/ProductModal'
import MealSuggestionsModal from '../components/Products/MealSuggestionsModal'
import { IoFilterCircle, IoSearchOutline } from 'react-icons/io5'

// Tipo para productos que vienen de la API con el objeto category anidado
interface ProductWithCategory extends Omit<Product, 'categoryId'> {
  category?: {
    id: string;
    name: string;
  };
}

interface ConfirmDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  productName: string
  isDeleting: boolean
}

function ConfirmDeleteModal({ isOpen, onClose, onConfirm, productName, isDeleting }: ConfirmDeleteModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm overflow-hidden bg-white shadow-2xl rounded-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800">Confirmar eliminación</h3>
          <button
            className="flex items-center justify-center w-8 h-8 text-2xl text-gray-500 transition rounded-md hover:bg-gray-200 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
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
            ¿Estás seguro de que deseas eliminar el producto <strong className="font-semibold text-gray-900">"{productName}"</strong>?
          </p>
          <p className="text-sm italic text-gray-500">Esta acción no se puede deshacer.</p>
        </div>

        <div className="flex items-center justify-center gap-3 px-6 py-4 border-t border-gray-200">
          <button
            type="button"
            className="px-4 py-2 text-sm font-semibold text-gray-700 transition bg-gray-200 rounded-lg hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="rounded-lg bg-red-500 px-5 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-red-600 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:text-white"
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

function Products() {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDescriptionModal, setShowDescriptionModal] = useState(false)
  const [selectedProductDescription, setSelectedProductDescription] = useState({ name: '', description: '' })
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [categories, setCategories] = useState<CategoryType[]>([])
  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState<string[]>([])
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showMealSuggestionsModal, setShowMealSuggestionsModal] = useState(false)
  const [prefilledProductName, setPrefilledProductName] = useState<string>('')

  const businessId = user?.businessId

  const loadCategories = useCallback(async () => {
    if (!businessId) return

    try {
      const fetchedCategories = await categoryService.getCategories(businessId)
      setCategories(fetchedCategories)
    } catch (err) {
      console.error('Error cargando categorías:', err)
      showError('Error al cargar las categorías')
    }
  }, [businessId, showError])

  const loadProducts = useCallback(async () => {
    if (!businessId) return

    try {
      setLoading(true)
      const fetchedProducts = await productService.getProducts(businessId)
      
      // Transformar los productos para extraer el categoryId del objeto category
      const transformedProducts = (fetchedProducts as ProductWithCategory[]).map((product) => ({
        ...product,
        categoryId: product.category?.id || ''
      })) as Product[]
      
      setProducts(transformedProducts)
    } catch (err) {
      console.error('Error cargando productos:', err)
      showError('Error al cargar los productos')
    } finally {
      setLoading(false)
    }
  }, [businessId, showError])

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

  // Función para contar productos por categoría
  const getProductCountByCategory = useCallback((categoryId: string) => {
    return products.filter(product => product.categoryId === categoryId).length
  }, [products])

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
    return <LoadingScreen message="Cargando productos..." />
  }

  const handleAddProduct = () => {
    setEditingProduct(null)
    setPrefilledProductName('')
    setIsModalOpen(true)
  }

  const handleSelectMealSuggestion = (mealName: string) => {
    setPrefilledProductName(mealName)
    setEditingProduct(null)
    setIsModalOpen(true)
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setIsModalOpen(true)
  }

  const handleDeleteProduct = (product: Product) => {
    if (!businessId || processing || isDeleting) return
    
    setProductToDelete(product)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!productToDelete || !businessId || isDeleting) return

    try {
      setIsDeleting(true)
      await productService.deleteProduct(businessId, productToDelete.id)
      // Recargar la lista para asegurar consistencia
      await loadProducts()
      showSuccess('Producto eliminado exitosamente')
      // Cerrar modal
      setShowDeleteModal(false)
      setProductToDelete(null)
    } catch (err) {
      console.error('Error eliminando producto:', err)
      showError('Error al eliminar el producto. Por favor, intenta nuevamente.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCloseDeleteModal = () => {
    if (isDeleting) return
    setShowDeleteModal(false)
    setProductToDelete(null)
  }

  const handleShowDescription = (product: Product) => {
    setSelectedProductDescription({ name: product.name, description: product.description })
    setShowDescriptionModal(true)
  }

  const handleSaveProduct = async (productData: Omit<Product, 'id'> & { id?: string }) => {
    if (!businessId || processing) return

    try {
      setProcessing(true)
      
      if (productData.id) {
        // Editar producto existente
        await productService.updateProduct(
          businessId,
          productData.id, 
          {
            name: productData.name,
            description: productData.description,
            price: productData.price,
            cost: productData.cost,
            categoryId: productData.categoryId!
          }
        )
        showSuccess('Producto actualizado exitosamente')
      } else {
        // Agregar nuevo producto
        await productService.createProduct(businessId, {
          name: productData.name,
          description: productData.description,
          price: productData.price,
          cost: productData.cost,
          categoryId: productData.categoryId!
        })
        showSuccess('Producto creado exitosamente')
      }
      
      // Recargar la lista de productos para asegurar consistencia
      await loadProducts()
      
      // Cerrar el modal después del guardado exitoso
      setIsModalOpen(false)
      setEditingProduct(null)
      
    } catch (err) {
      console.error('Error guardando producto:', err)
      showError('Error al guardar el producto. Por favor, intenta nuevamente.')
      // NO cerrar el modal si hay error, para que el usuario pueda reintentar
    } finally {
      setProcessing(false)
    }
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

  // Funciones para manejar categorías
  const handleAddCategory = async (category: Omit<CategoryType, 'id'>) => {
    if (!businessId) return
    
    try {
      await categoryService.createCategory(businessId, category)
      await loadCategories() // Recargar categorías
      showSuccess('Categoría creada exitosamente')
    } catch (err) {
      console.error('Error creando categoría:', err)
      showError('Error al crear la categoría')
    }
  }

  const handleEditCategory = async (id: string, category: Omit<CategoryType, 'id'>) => {
    if (!businessId) return
    
    try {
      await categoryService.updateCategory(businessId, id, category)
      await loadCategories() // Recargar categorías
      showSuccess('Categoría actualizada exitosamente')
    } catch (err) {
      console.error('Error actualizando categoría:', err)
      showError('Error al actualizar la categoría')
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!businessId) return
    
    // Verificar si hay productos asociados a esta categoría
    const productsWithCategory = products.filter(product => product.categoryId === id)
    
    if (productsWithCategory.length > 0) {
      showError(`No se puede eliminar la categoría porque tiene ${productsWithCategory.length} producto(s) asociado(s). Primero debe reasignar o eliminar estos productos.`)
      return
    }
    
    try {
      await categoryService.deleteCategory(businessId, id)
      await loadCategories() // Recargar categorías
      showSuccess('Categoría eliminada exitosamente')
    } catch (err) {
      console.error('Error eliminando categoría:', err)
      showError('Error al eliminar la categoría')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#fff1eb] to-white">
      <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#f74116]/10 px-4 py-2 text-sm font-semibold text-[#f74116] mb-4">
            <span className="h-2 w-2 rounded-full bg-[#f74116]" />
            Gestión de Inventario
          </div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900 sm:text-4xl">
            Productos
          </h1>
          <p className="text-gray-600">Administra tu catálogo y controla tu inventario</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-start gap-4 mb-8">
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-[#f74116] px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[#f74116]/90 hover:shadow-lg transform hover:scale-[1.02] duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            onClick={handleAddProduct}
            disabled={processing}
            type="button"
          >
            <span className="text-xl font-bold">+</span>
            {processing ? 'Procesando...' : 'Agregar Producto'}
          </button>

          <button
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-orange-600 hover:shadow-lg transform hover:scale-[1.02] duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            onClick={() => setShowCategoryModal(true)}
            disabled={processing}
            type="button"
          >
            <span className="text-xl font-bold">⚙️</span>
            {processing ? 'Procesando...' : 'Gestionar Categorías'}
          </button>

          <div className="flex flex-col gap-1.5">
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-600 hover:shadow-lg transform hover:scale-[1.02] duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              onClick={() => setShowMealSuggestionsModal(true)}
              disabled={processing}
              type="button"
            >
              <span className="text-xl font-bold">🍽️</span>
              {processing ? 'Procesando...' : 'Productos sugeridos'}
            </button>
            
            {/* Powered by - debajo del botón */}
            <div className="flex items-center gap-1.5 pl-2">
              <span className="text-xs text-gray-500">Proporcionado por</span>
              <img 
                src="/QueComemos.svg" 
                alt="Que Comemos" 
                className="h-4"
                style={{ maxHeight: '16px' }}
              />
            </div>
          </div>
        </div>

        {/* Filters Section */}
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
                disabled={processing}
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
                        className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors ${selectedCategoryFilters.includes(category.id) ? 'bg-[#f74116]/10 text-[#f74116]' : 'text-gray-700'}`}
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

        {/* Products Grid */}
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
                No hay productos que coincidan con los filtros seleccionados
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
              <EmptyState />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Catálogo de Productos</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Mostrando {filteredProducts.length} de {products.length} productos
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onEdit={handleEditProduct}
                    onDelete={handleDeleteProduct}
                    onShowDescription={handleShowDescription}
                    processing={processing}
                    isDeleting={isDeleting}
                    categories={categories}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Modals */}
        <ProductModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingProduct(null)
            setPrefilledProductName('')
          }}
          onSave={handleSaveProduct}
          product={editingProduct}
          categories={categories}
          prefilledName={prefilledProductName}
        />

        <ConfirmDeleteModal
          isOpen={showDeleteModal}
          onClose={handleCloseDeleteModal}
          onConfirm={handleConfirmDelete}
          productName={productToDelete?.name || ''}
          isDeleting={isDeleting}
        />

        <DescriptionModal
          isOpen={showDescriptionModal}
          onClose={() => setShowDescriptionModal(false)}
          productName={selectedProductDescription.name}
          description={selectedProductDescription.description}
        />

        <CategoryManagementModal
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          categories={categories}
          onAddCategory={handleAddCategory}
          onEditCategory={handleEditCategory}
          onDeleteCategory={handleDeleteCategory}
          getProductCountByCategory={getProductCountByCategory}
        />

        <MealSuggestionsModal
          isOpen={showMealSuggestionsModal}
          onClose={() => setShowMealSuggestionsModal(false)}
          onSelectMeal={handleSelectMealSuggestion}
        />
      </div>
    </div>
  )
}

export default Products