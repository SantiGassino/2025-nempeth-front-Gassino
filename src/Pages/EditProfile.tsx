import React, { useState } from 'react'
import { UserService } from '../services/userService'
import { useAuth } from '../contexts/useAuth'
import { businessService, type BusinessMemberDetailResponse } from '../services/businessService'
import Modal from '../components/Modal'
import PasswordValidationList from '../components/PasswordValidationList'
import { IoEye, IoEyeOff } from 'react-icons/io5'

function EditProfile() {
  const { user, updateUser, logout } = useAuth();

  const [formData, setFormData] = useState({
    nombre: user?.name || '',
    apellido: user?.lastName || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Sincroniza formData con user cuando user cambie (por fetchUserProfile)
  React.useEffect(() => {
    if (user?.name || user?.lastName) {
      setFormData(prev => ({
        ...prev,
        nombre: user?.name || '',
        apellido: user?.lastName || '',
        email: user?.email || ''
      }));
    }
  }, [user]);

  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Estados para la confirmación de eliminación
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [employeesForDeletion, setEmployeesForDeletion] = useState<BusinessMemberDetailResponse[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)

  // Estados para el modal
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info',
    onConfirm: undefined as (() => void) | undefined
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const showModal = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info', onConfirm?: () => void) => {
    setModal({
      isOpen: true,
      title,
      message,
      type,
      onConfirm
    })
  }

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }))
  }

  const handleModalConfirm = () => {
    if (modal.onConfirm) {
      modal.onConfirm()
    }
    closeModal()
  }

  // Helper para extraer mensaje de error del backend
  const extractErrorMessage = (error: unknown, fallback: string): string => {
    if (error && typeof error === 'object') {
      const err = error as Record<string, unknown>
      if (err.response && typeof err.response === 'object') {
        const response = err.response as Record<string, unknown>
        if (response.data && typeof response.data === 'object') {
          const data = response.data as Record<string, unknown>
          if (typeof data.error === 'string') return data.error
          if (typeof data.message === 'string') return data.message
        }
      } else if (typeof err.message === 'string') {
        return err.message
      }
    } else if (typeof error === 'string') {
      return error
    }
    return fallback
  }

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      await UserService.updateProfile(
        user?.userId,
        {
          name: formData.nombre,
          lastName: formData.apellido
        }
      );
      // Actualiza el contexto global de usuario
      updateUser({ name: formData.nombre, lastName: formData.apellido });
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      setShowPasswordSection(false);
      showModal('¡Éxito!', 'Perfil actualizado correctamente', 'success');
    } catch (error) {
      console.error('Error al guardar perfil:', error);
      showModal('Error', extractErrorMessage(error, 'No se pudo guardar el perfil. Por favor, inténtalo de nuevo.'), 'error');
    } finally {
      setIsLoading(false);
    }
  }

  const handleChangePassword = async () => {
    if (formData.newPassword !== formData.confirmPassword) {
      showModal('Error de validación', 'Las contraseñas no coinciden. Por favor, verifica que ambas contraseñas sean iguales.', 'error');
      return;
    }
    if (formData.newPassword.length < 8) {
      showModal('Error de validación', 'La contraseña debe tener al menos 8 caracteres.', 'error');
      return;
    }
    if (!/(?=.*[a-z])/.test(formData.newPassword)) {
      showModal('Error de validación', 'La contraseña debe contener al menos una letra minúscula.', 'error');
      return;
    }
    if (!/(?=.*[A-Z])/.test(formData.newPassword)) {
      showModal('Error de validación', 'La contraseña debe contener al menos una letra mayúscula.', 'error');
      return;
    }
    if (!/(?=.*\d)/.test(formData.newPassword)) {
      showModal('Error de validación', 'La contraseña debe contener al menos un número.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      await UserService.updatePassword(
        user?.userId,
        {
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        }
      );
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      setShowPasswordSection(false);
      showModal(
        '¡Contraseña actualizada!',
        'Tu contraseña ha sido cambiada exitosamente. Por seguridad, deberás iniciar sesión nuevamente con tus nuevas credenciales.',
        'success',
        () => logout() // Se ejecuta al hacer clic en Aceptar
      );
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      showModal('Error', extractErrorMessage(error, 'No se pudo cambiar la contraseña. Por favor, verifica que tu contraseña actual sea correcta.'), 'error');
    } finally {
      setIsLoading(false);
    }
  }

  const isOwner = user?.role === 'OWNER'

  const handleOpenDeleteConfirmation = async () => {
    setShowDeleteConfirmation(true)
    setDeleteConfirmText('')

    // Si es OWNER, cargar la lista de empleados asociados
    if (isOwner && user?.businessId) {
      setLoadingEmployees(true)
      try {
        const employees = await businessService.getBusinessEmployees(user.businessId)
        // Filtrar para no incluir al propio owner
        setEmployeesForDeletion(employees.filter(emp => emp.userId !== user.userId))
      } catch (error) {
        console.error('Error al cargar empleados:', error)
        setEmployeesForDeletion([])
      } finally {
        setLoadingEmployees(false)
      }
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false)
    setDeleteConfirmText('')
    setEmployeesForDeletion([])
  }

  const handleConfirmDelete = async () => {
    if (deleteConfirmText.toLowerCase() !== 'eliminar') return
    setIsLoading(true)
    try {
      await UserService.deleteAccount(user?.userId)
      showModal(
        'Cuenta eliminada',
        'Tu cuenta ha sido eliminada exitosamente.',
        'success',
        () => logout()
      )
    } catch (error) {
      console.error('Error al eliminar cuenta:', error)
      showModal('Error', extractErrorMessage(error, 'No se pudo eliminar la cuenta. Por favor, inténtalo de nuevo más tarde.'), 'error')
    } finally {
      setIsLoading(false)
      setShowDeleteConfirmation(false)
      setDeleteConfirmText('')
    }
  }

  const canSaveProfile = formData.nombre.trim() && formData.apellido.trim()
  const canChangePassword = formData.currentPassword &&
    formData.newPassword &&
    formData.confirmPassword &&
    formData.newPassword === formData.confirmPassword

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#fff1eb] to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#f74116]/10 px-4 py-2 text-sm font-semibold text-[#f74116] mb-4">
            <span className="h-2 w-2 rounded-full bg-[#f74116]" />
            Configuración de Cuenta
          </div>
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-2">
            Editar Perfil
          </h1>
          <p className="text-gray-600">Gestiona tu información personal y configuración de seguridad</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#f74116]/10 mb-6 hover:shadow-lg transition-all duration-200">
          {/* Profile Header */}
          <div className="bg-gradient-to-br from-[#f74116] to-[#e63912] p-6 rounded-t-2xl">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold text-white border-2 border-white/30">
                {formData.nombre.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="text-white">
                <h2 className="text-xl font-bold">{formData.nombre} {formData.apellido}</h2>
                <p className="text-white/90 text-sm">{formData.email}</p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6">
            <div className="grid gap-8 md:grid-cols-2">

              {/* Personal Information */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Información Personal</h3>
                </div>

                <div className="space-y-5">
                  <div>
                    <label htmlFor="nombre" className="block text-sm font-semibold text-gray-700 mb-2">
                      Nombre
                    </label>
                    <input
                      type="text"
                      id="nombre"
                      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-[#f74116] focus:outline-none focus:ring-2 focus:ring-[#f74116]/20 transition-colors"
                      value={formData.nombre}
                      onChange={(e) => handleInputChange('nombre', e.target.value)}
                      placeholder="Ingresa tu nombre"
                    />
                  </div>

                  <div>
                    <label htmlFor="apellido" className="block text-sm font-semibold text-gray-700 mb-2">
                      Apellido
                    </label>
                    <input
                      type="text"
                      id="apellido"
                      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-[#f74116] focus:outline-none focus:ring-2 focus:ring-[#f74116]/20 transition-colors"
                      value={formData.apellido}
                      onChange={(e) => handleInputChange('apellido', e.target.value)}
                      placeholder="Ingresa tu apellido"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 cursor-not-allowed"
                      value={formData.email}
                      disabled
                      title="El email no puede ser modificado"
                    />
                    <p className="mt-2 text-xs text-gray-500">El email no puede ser modificado</p>
                  </div>
                </div>
              </div>

              {/* Security Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Seguridad</h3>
                  </div>
                  <button
                    onClick={() => setShowPasswordSection(!showPasswordSection)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showPasswordSection
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-[#f74116]/10 text-[#f74116] hover:bg-[#f74116]/20'
                      }`}
                  >
                    {showPasswordSection ? 'Cancelar' : 'Cambiar Contraseña'}
                  </button>
                </div>

                {showPasswordSection && (
                  <div className="bg-gray-50/50 rounded-xl p-5 border border-gray-200 space-y-5">
                    <div>
                      <label htmlFor="currentPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                        Contraseña Actual
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          id="currentPassword"
                          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 pr-12 text-sm text-gray-900 focus:border-[#f74116] focus:outline-none focus:ring-2 focus:ring-[#f74116]/20 transition-colors"
                          value={formData.currentPassword}
                          onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                          placeholder="Ingresa tu contraseña actual"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          {showCurrentPassword ? <IoEye className="w-5 h-5" /> : <IoEyeOff className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                        Nueva Contraseña
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          id="newPassword"
                          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 pr-12 text-sm text-gray-900 focus:border-[#f74116] focus:outline-none focus:ring-2 focus:ring-[#f74116]/20 transition-colors"
                          value={formData.newPassword}
                          onChange={(e) => handleInputChange('newPassword', e.target.value)}
                          placeholder="Ingresa tu nueva contraseña"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          {showNewPassword ? <IoEye className="w-5 h-5" /> : <IoEyeOff className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <PasswordValidationList password={formData.newPassword} />

                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                        Confirmar Nueva Contraseña
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          id="confirmPassword"
                          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 pr-12 text-sm text-gray-900 focus:border-[#f74116] focus:outline-none focus:ring-2 focus:ring-[#f74116]/20 transition-colors"
                          value={formData.confirmPassword}
                          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                          placeholder="Confirma tu nueva contraseña"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          {showConfirmPassword ? <IoEye className="w-5 h-5" /> : <IoEyeOff className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleChangePassword}
                        disabled={!canChangePassword || isLoading}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#f74116] text-white rounded-lg hover:bg-[#f74116]/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading && (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8" />
                          </svg>
                        )}
                        {isLoading ? 'Cambiando...' : 'Cambiar Contraseña'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-200 rounded-b-2xl">
            <div className="flex justify-center">
              <button
                onClick={handleSaveProfile}
                disabled={!canSaveProfile || isLoading}
                className="inline-flex items-center gap-2 px-8 py-3 bg-[#f74116] text-white rounded-lg hover:bg-[#f74116]/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isLoading && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8" />
                  </svg>
                )}
                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl shadow-sm border border-red-200 hover:shadow-lg transition-all duration-200">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.764-.833-2.532 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-900">Zona de Peligro</h3>
                <p className="text-sm text-red-600">Esta acción es irreversible</p>
              </div>
            </div>

            {!showDeleteConfirmation ? (
              /* Vista inicial — botón para iniciar el proceso */
              <>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-red-800">
                    Al eliminar tu cuenta se borrarán permanentemente todos tus datos. Esta acción no se puede deshacer.
                  </p>
                </div>

                <button
                  onClick={handleOpenDeleteConfirmation}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Eliminar Cuenta
                </button>
              </>
            ) : (
              /* Panel de confirmación expandido */
              <div className="space-y-4 animate-in">

                {/* Mensaje diferenciado por rol */}
                {isOwner ? (
                  /* -------- OWNER -------- */
                  <div className="space-y-4">
                    <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4">
                      <div className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.764-.833-2.532 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <div>
                          <h4 className="text-base font-bold text-red-900 mb-2">⚠️ Atención: Eres el propietario del negocio</h4>
                          <p className="text-sm text-red-800 leading-relaxed mb-2">
                            Al eliminar tu cuenta se eliminarán <strong>TODOS</strong> los datos de tu negocio de forma permanente, incluyendo:
                          </p>
                          <ul className="text-sm text-red-800 list-disc list-inside space-y-1 mb-3">
                            <li>Todos los productos y categorías</li>
                            <li>Historial completo de ventas y transacciones</li>
                            <li>Configuraciones del negocio</li>
                            <li>Cuentas corrientes de clientes</li>
                            <li>Reservas y mesas</li>
                          </ul>
                          <p className="text-sm text-red-900 font-semibold">
                            🚨 Esta acción NO tiene marcha atrás. No será posible recuperar ningún dato.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Aviso sobre empleados */}
                    <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-amber-900 mb-1">Usuarios asociados (Empleados)</h4>
                          <p className="text-sm text-amber-800 mb-3">
                            Las cuentas de los empleados vinculados a tu negocio también serán eliminadas. Asegurate de notificarles antes de continuar.
                          </p>

                          {loadingEmployees ? (
                            <div className="flex items-center gap-2 text-sm text-amber-700">
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8" />
                              </svg>
                              Cargando lista de empleados...
                            </div>
                          ) : employeesForDeletion.length === 0 ? (
                            <p className="text-sm text-amber-700 italic">No hay empleados asociados al negocio.</p>
                          ) : (
                            <div className="bg-white/60 rounded-lg border border-amber-200 overflow-hidden">
                              <div className="px-3 py-2 bg-amber-100/50 border-b border-amber-200">
                                <p className="text-xs font-semibold text-amber-900">
                                  {employeesForDeletion.length} empleado{employeesForDeletion.length !== 1 ? 's' : ''} será{employeesForDeletion.length !== 1 ? 'n' : ''} eliminado{employeesForDeletion.length !== 1 ? 's' : ''}:
                                </p>
                              </div>
                              <ul className="divide-y divide-amber-100">
                                {employeesForDeletion.map((emp) => (
                                  <li key={emp.userId} className="flex items-center gap-3 px-3 py-2.5">
                                    <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-sm font-bold text-amber-700 flex-shrink-0">
                                      {(emp.userName || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {emp.userName && emp.userLastName
                                          ? `${emp.userName} ${emp.userLastName}`
                                          : emp.userName || 'Sin nombre'}
                                      </p>
                                      <p className="text-xs text-gray-500 truncate">{emp.userEmail}</p>
                                    </div>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${emp.status === 'ACTIVE'
                                      ? 'bg-green-100 text-green-700'
                                      : emp.status === 'PENDING'
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-red-100 text-red-700'
                                      }`}>
                                      {emp.status === 'ACTIVE' ? 'Activo' : emp.status === 'PENDING' ? 'Pendiente' : 'Inactivo'}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* -------- EMPLOYEE -------- */
                  <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.764-.833-2.532 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <h4 className="text-base font-bold text-red-900 mb-2">Estás a punto de borrar tu cuenta</h4>
                        <p className="text-sm text-red-800 leading-relaxed mb-2">
                          Al eliminar tu cuenta se borrarán permanentemente todos tus datos personales y dejarás de estar asociado al negocio <strong>{user?.businessName}</strong>.
                        </p>
                        <ul className="text-sm text-red-800 list-disc list-inside space-y-1">
                          <li>Tu acceso al negocio actual será revocado de forma inmediata</li>
                          <li>Si deseás volver a ingresar a este u otro negocio, deberás crear una nueva cuenta</li>
                          <li>Tus datos no podrán ser recuperados</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Campo de confirmación: escribir "eliminar" */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <label htmlFor="deleteConfirmInput" className="block text-sm font-semibold text-gray-800 mb-2">
                    Para confirmar, escribí <span className="font-mono bg-red-100 text-red-700 px-1.5 py-0.5 rounded">eliminar</span> en el siguiente campo:
                  </label>
                  <input
                    type="text"
                    id="deleteConfirmInput"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200 transition-colors"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder='Escribí "eliminar" para continuar'
                    autoComplete="off"
                  />
                </div>

                {/* Botones de acción */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleCancelDelete}
                    disabled={isLoading}
                    className="px-5 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    disabled={deleteConfirmText.toLowerCase() !== 'eliminar' || isLoading}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading && (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8" />
                      </svg>
                    )}
                    {isLoading ? 'Eliminando cuenta...' : 'Eliminar mi cuenta permanentemente'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onConfirm={modal.onConfirm ? handleModalConfirm : undefined}
      />
    </div>
  )
}

export default EditProfile
