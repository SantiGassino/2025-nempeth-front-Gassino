import api from './api';

// Estados de reserva según la documentación
export type ReservationStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

// Información de mesa en reserva
export interface ReservationTable {
  id: string;
  tableCode: string;
  capacity: number;
}

// Interfaz principal de Reserva
export interface Reservation {
  id: string;
  tables: ReservationTable[];
  customerName: string;
  customerContact: string;
  startDateTime: string; // ISO 8601 con zona horaria
  endDateTime: string;
  partySize: number;
  status: ReservationStatus;
  forced: boolean;
  createdBy: string;
  createdAt: string;
  notes?: string;
}

// Request para crear reserva
export interface CreateReservationRequest {
  customerName: string;
  customerContact: string;
  startDateTime: string;
  endDateTime: string;
  partySize: number;
  tableIds: string[];
  forced?: boolean;
  notes?: string;
}

// Request para actualizar reserva
export interface UpdateReservationRequest {
  customerName?: string;
  customerContact?: string;
  startDateTime?: string;
  endDateTime?: string;
  partySize?: number;
  tableIds?: string[];
  notes?: string;
}

// Datos para Gantt - Reserva simplificada
export interface GanttReservation {
  reservationId: string;
  customerName: string;
  startDateTime: string;
  endDateTime: string;
  partySize: number;
  status: ReservationStatus;
}

// Datos para Gantt - Mesa con sus reservas
export interface GanttTableData {
  tableId: string;
  tableCode: string;
  capacity: number;
  reservations: GanttReservation[];
}

export const reservationService = {
  /**
   * Obtener todas las reservas del negocio
   * Permisos: OWNER y EMPLOYEE
   * @param startDate - Filtro opcional de fecha de inicio
   * @param endDate - Filtro opcional de fecha de fin
   */
  getReservations: async (
    businessId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<Reservation[]> => {
    try {
      let url = `/businesses/${businessId}/reservations`;
      const params = new URLSearchParams();

      if (startDate) {
        params.append('startDate', startDate);
      }
      if (endDate) {
        params.append('endDate', endDate);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error al obtener reservas:', error);
      throw error;
    }
  },

  /**
   * Obtener una reserva específica por ID
   * Permisos: OWNER y EMPLOYEE
   */
  getReservationById: async (
    businessId: string,
    reservationId: string,
  ): Promise<Reservation> => {
    try {
      const response = await api.get(
        `/businesses/${businessId}/reservations/${reservationId}`,
      );
      return response.data;
    } catch (error) {
      console.error('Error al obtener reserva:', error);
      throw error;
    }
  },

  /**
   * Crear nueva reserva
   * Permisos: OWNER y EMPLOYEE
   *
   * Validaciones:
   * - startDateTime no puede estar en el pasado
   * - startDateTime debe ser < endDateTime
   * - Duración máxima: 12 horas
   * - Suma de capacidades >= partySize (salvo forced=true)
   * - No solapamiento en ninguna mesa (salvo forced=true)
   */
  createReservation: async (
    businessId: string,
    reservationData: CreateReservationRequest,
  ): Promise<Reservation> => {
    try {
      // Validaciones del cliente
      if (!reservationData.customerName?.trim()) {
        throw new Error('El nombre del cliente es obligatorio');
      }
      if (!reservationData.customerContact?.trim()) {
        throw new Error('El contacto del cliente es obligatorio');
      }
      if (reservationData.partySize < 1) {
        throw new Error('El tamaño del grupo debe ser al menos 1 persona');
      }
      if (!reservationData.tableIds || reservationData.tableIds.length === 0) {
        throw new Error('Debe seleccionar al menos una mesa');
      }

      // Validar que las fechas sean válidas
      const start = new Date(reservationData.startDateTime);
      const end = new Date(reservationData.endDateTime);

      if (isNaN(start.getTime())) {
        throw new Error('Fecha de inicio inválida');
      }
      if (isNaN(end.getTime())) {
        throw new Error('Fecha de fin inválida');
      }
      if (start >= end) {
        throw new Error(
          'La fecha de inicio debe ser anterior a la fecha de fin',
        );
      }

      // Validar duración máxima (12 horas)
      const durationHours =
        (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      if (durationHours > 12) {
        throw new Error('La duración máxima de una reserva es 12 horas');
      }

      const response = await api.post(
        `/businesses/${businessId}/reservations`,
        reservationData,
      );
      return response.data;
    } catch (error) {
      console.error('Error al crear reserva:', error);
      throw error;
    }
  },

  /**
   * Actualizar reserva completa (PUT)
   * Permisos: OWNER y EMPLOYEE
   * Restricción: Solo se puede actualizar si la reserva está en PENDING
   */
  updateReservation: async (
    businessId: string,
    reservationId: string,
    reservationData: UpdateReservationRequest,
  ): Promise<void> => {
    try {
      // Validar fechas si se proporcionan
      if (reservationData.startDateTime && reservationData.endDateTime) {
        const start = new Date(reservationData.startDateTime);
        const end = new Date(reservationData.endDateTime);

        if (start >= end) {
          throw new Error(
            'La fecha de inicio debe ser anterior a la fecha de fin',
          );
        }

        const durationHours =
          (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        if (durationHours > 12) {
          throw new Error('La duración máxima de una reserva es 12 horas');
        }
      }

      await api.put(
        `/businesses/${businessId}/reservations/${reservationId}`,
        reservationData,
      );
    } catch (error) {
      console.error('Error al actualizar reserva:', error);
      throw error;
    }
  },

  /**
   * Iniciar reserva (PENDING → IN_PROGRESS)
   * Permisos: OWNER y EMPLOYEE
   * Efectos: Todas las mesas cambian a OCCUPIED
   */
  startReservation: async (
    businessId: string,
    reservationId: string,
  ): Promise<void> => {
    try {
      await api.post(
        `/businesses/${businessId}/reservations/${reservationId}/start`,
      );
    } catch (error) {
      console.error('Error al iniciar reserva:', error);
      throw error;
    }
  },

  /**
   * Completar reserva (IN_PROGRESS → COMPLETED)
   * Permisos: OWNER y EMPLOYEE
   * Efectos: Todas las mesas cambian a FREE
   */
  completeReservation: async (
    businessId: string,
    reservationId: string,
  ): Promise<void> => {
    try {
      await api.post(
        `/businesses/${businessId}/reservations/${reservationId}/complete`,
      );
    } catch (error) {
      console.error('Error al completar reserva:', error);
      throw error;
    }
  },

  /**
   * Cancelar reserva (PENDING/IN_PROGRESS → CANCELLED)
   * Permisos: OWNER y EMPLOYEE
   * Efectos: Todas las mesas cambian a FREE
   * Restricción: No se pueden cancelar reservas COMPLETED
   */
  cancelReservation: async (
    businessId: string,
    reservationId: string,
  ): Promise<void> => {
    try {
      await api.post(
        `/businesses/${businessId}/reservations/${reservationId}/cancel`,
      );
    } catch (error) {
      console.error('Error al cancelar reserva:', error);
      throw error;
    }
  },

  /**
   * Marcar reserva como no-show (PENDING → NO_SHOW)
   * Permisos: OWNER y EMPLOYEE
   * Efectos: Todas las mesas cambian a FREE
   * Uso: Cliente no se presentó
   */
  markNoShow: async (
    businessId: string,
    reservationId: string,
  ): Promise<void> => {
    try {
      await api.post(
        `/businesses/${businessId}/reservations/${reservationId}/no-show`,
      );
    } catch (error) {
      console.error('Error al marcar no-show:', error);
      throw error;
    }
  },

  /**
   * Obtener datos para diagrama de Gantt
   * Permisos: OWNER y EMPLOYEE
   *
   * Retorna todas las mesas del negocio con sus reservas en un día específico.
   * - Incluye mesas sin reservas (array vacío)
   * - Reservas ordenadas por startDateTime
   * - Una reserva puede aparecer en múltiples mesas
   * - Ideal para visualización de ocupación horaria
   *
   * @param businessId - ID del negocio
   * @param date - Fecha del día (formato: YYYY-MM-DD, ej: 2026-02-15)
   */
  getGanttData: async (
    businessId: string,
    date: string,
  ): Promise<GanttTableData[]> => {
    try {
      const response = await api.get(
        `/businesses/${businessId}/reservations/gantt?date=${date}`,
      );
      return response.data;
    } catch (error) {
      console.error('Error al obtener datos de Gantt:', error);
      throw error;
    }
  },
};

export default reservationService;
