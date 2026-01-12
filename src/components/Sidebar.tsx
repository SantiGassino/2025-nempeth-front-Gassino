import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { isEmployeeActive, isOwner } from '../guards/getDefaultRoute'
import korvenLogo from '../assets/bee.jpeg'

// Iconos SVG simples
const HomeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
)

const ShoppingBagIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
)

const UserIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)

const BuildingStorefrontIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.001 3.001 0 01-3.75-.614C.75 8.737.75 8.737.75 8.737s-.75 0-.75 0v10.5z" />
  </svg>
)

const DocumentTextIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const ClipboardDocumentListIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
)

const ArrowRightOnRectangleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
)

const ChartBarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const TargetIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const TrophyIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
  </svg>
)

const OWNER_NAVIGATION = [
  { name: 'Home', path: '/home', icon: HomeIcon },
  { name: 'Productos', path: '/products', icon: ShoppingBagIcon },
  { name: 'Crear Orden', path: '/orders/create', icon: DocumentTextIcon },
  { name: 'Historial de Ventas', path: '/sales-history', icon: ClipboardDocumentListIcon },
  { name: 'Ranking', path: '/internal-ranking', icon: TrophyIcon },
  { name: 'Analiticas', path: '/analytics', icon: ChartBarIcon },
  { name: 'Metas', path: '/goals', icon: TargetIcon },
  { name: 'Mi Negocio', path: '/business', icon: BuildingStorefrontIcon },
  { name: 'Perfil', path: '/profile', icon: UserIcon },
]

const EMPLOYEE_NAVIGATION = [
  { name: 'Home', path: '/home', icon: HomeIcon },
  { name: 'Crear Orden', path: '/orders/create', icon: DocumentTextIcon },
  { name: 'Historial de Ventas', path: '/sales-history', icon: ClipboardDocumentListIcon },
  { name: 'Ranking', path: '/internal-ranking', icon: TrophyIcon },
  { name: 'Perfil', path: '/profile', icon: UserIcon },
  
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuth()

  // Build the menu based on the authenticated user role and status
  const navigationItems = isOwner(user ?? null)
    ? OWNER_NAVIGATION
    : isEmployeeActive(user ?? null)
      ? EMPLOYEE_NAVIGATION
      : []

  const handleNavigation = (path: string) => {
    navigate(path)
    onClose()
  }

  const handleLogout = () => {
    logout()
    navigate('/')
    onClose()
  }

  const isActivePath = (path: string) => {
    return location.pathname === path
  }

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 z-50 h-full w-80 transform bg-white shadow-xl border-r border-gray-200 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header del Sidebar */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3 rounded-[13px] p-1">
              <img src={korvenLogo} className="w-auto h-9 rounded-xl md:h-11" alt="Korven Logo" />
              <div className="flex flex-col">
                <h1 className="text-xl font-bold leading-tight text-gray-900 md:text-2xl">Korven</h1>
                <span className="text-xs font-medium text-gray-600 md:text-sm">Sistema de Gestión</span>
              </div>
            </div>
          </div>

          {/* Navegación */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive = isActivePath(item.path)
                
                return (
                  <li key={item.name}>
                    <button
                      onClick={() => handleNavigation(item.path)}
                      className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors duration-200 ${
                        isActive
                          ? 'bg-[#f74116]/10 text-[#f74116] border border-[#f74116]/20'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? 'text-[#f74116]' : 'text-gray-400'}`} />
                      <span className="font-medium">{item.name}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Cerrar Sesión */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="flex items-center w-full gap-3 px-4 py-3 text-left text-gray-700 transition-colors duration-200 rounded-lg hover:bg-red-50 hover:text-red-600"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5 text-gray-400" />
              <span className="font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar
