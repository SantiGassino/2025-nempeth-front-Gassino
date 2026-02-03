import api from './api';

// Estados de mesa según la documentación
export type TableStatus = 'FREE' | 'RESERVED' | 'OCCUPIED';

// Interfaz principal de Mesa
export interface Table {
  id: string;
  tableCode: string;
  capacity: number;
  sector: string;
  status: TableStatus;
}

// Request para crear mesa
export interface CreateTableRequest {
  tableCode: string;
  capacity: number;
  sector: string;
}

// Request para actualizar mesa (PUT)
export interface UpdateTableRequest {
  tableCode?: string;
  capacity?: number;
  sector?: string;
}

// Request para cambiar estado
export interface UpdateTableStatusRequest {
  status: TableStatus;
}

// Request para cambiar capacidad
export interface UpdateTableCapacityRequest {
  capacity: number;
}

// Estadísticas de ocupación
export interface TableStats {
  totalTables: number;
  freeTables: number;
  reservedTables: number;
  occupiedTables: number;
  occupancyRate: number;
}

export const tableService = {
  /**
   * Obtener todas las mesas del negocio
   * Permisos: OWNER y EMPLOYEE
   */
  getTables: async (businessId: string): Promise<Table[]> => {
    try {
      const response = await api.get(`/businesses/${businessId}/tables`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener mesas:', error);
      throw error;
    }
  },

  /**
   * Obtener una mesa específica por ID
   * Permisos: OWNER y EMPLOYEE
   */
  getTableById: async (businessId: string, tableId: string): Promise<Table> => {
    try {
      const response = await api.get(
        `/businesses/${businessId}/tables/${tableId}`,
      );
      return response.data;
    } catch (error) {
      console.error('Error al obtener mesa:', error);
      throw error;
    }
  },

  /**
   * Crear nueva mesa
   * Permisos: Solo OWNER
   */
  createTable: async (
    businessId: string,
    tableData: CreateTableRequest,
  ): Promise<{ message: string; tableId: string }> => {
    try {
      // Validaciones del cliente
      if (!tableData.tableCode?.trim()) {
        throw new Error('El código de mesa es obligatorio');
      }
      if (tableData.capacity < 1 || tableData.capacity > 100) {
        throw new Error('La capacidad debe estar entre 1 y 100 personas');
      }
      if (!tableData.sector?.trim()) {
        throw new Error('El sector es obligatorio');
      }

      const response = await api.post(
        `/businesses/${businessId}/tables`,
        tableData,
      );
      return response.data;
    } catch (error) {
      console.error('Error al crear mesa:', error);
      throw error;
    }
  },

  /**
   * Actualizar mesa completa (PUT)
   * Permisos: Solo OWNER
   * Restricción: Solo si la mesa está en estado FREE
   */
  updateTable: async (
    businessId: string,
    tableId: string,
    tableData: UpdateTableRequest,
  ): Promise<{ message: string }> => {
    try {
      // Validaciones del cliente
      if (
        tableData.capacity &&
        (tableData.capacity < 1 || tableData.capacity > 100)
      ) {
        throw new Error('La capacidad debe estar entre 1 y 100 personas');
      }

      const response = await api.put(
        `/businesses/${businessId}/tables/${tableId}`,
        tableData,
      );
      return response.data;
    } catch (error) {
      console.error('Error al actualizar mesa:', error);
      throw error;
    }
  },

  /**
   * Cambiar estado de mesa (PATCH)
   * Permisos: OWNER y EMPLOYEE
   * Nota: No se puede cambiar a RESERVED manualmente
   */
  updateTableStatus: async (
    businessId: string,
    tableId: string,
    statusData: UpdateTableStatusRequest,
  ): Promise<{ message: string }> => {
    try {
      // Validación: no se puede cambiar a RESERVED manualmente
      if (statusData.status === 'RESERVED') {
        throw new Error(
          'No se puede cambiar manualmente a RESERVED. El estado RESERVED se asigna automáticamente 45 minutos antes del inicio de una reserva.',
        );
      }

      const response = await api.patch(
        `/businesses/${businessId}/tables/${tableId}/status`,
        statusData,
      );
      return response.data;
    } catch (error) {
      console.error('Error al cambiar estado de mesa:', error);
      throw error;
    }
  },

  /**
   * Cambiar capacidad de mesa (PATCH)
   * Permisos: OWNER y EMPLOYEE
   * Restricción: Solo se puede cambiar si la mesa está en estado FREE
   */
  updateTableCapacity: async (
    businessId: string,
    tableId: string,
    capacityData: UpdateTableCapacityRequest,
  ): Promise<{ message: string }> => {
    try {
      // Validación del rango
      if (capacityData.capacity < 1 || capacityData.capacity > 100) {
        throw new Error('La capacidad debe estar entre 1 y 100 personas');
      }

      const response = await api.patch(
        `/businesses/${businessId}/tables/${tableId}/capacity`,
        capacityData,
      );
      return response.data;
    } catch (error) {
      console.error('Error al cambiar capacidad de mesa:', error);
      throw error;
    }
  },

  /**
   * Eliminar mesa
   * Permisos: Solo OWNER
   * Restricción: Solo si la mesa está en estado FREE
   */
  deleteTable: async (
    businessId: string,
    tableId: string,
  ): Promise<{ message: string }> => {
    try {
      const response = await api.delete(
        `/businesses/${businessId}/tables/${tableId}`,
      );
      return response.data;
    } catch (error) {
      console.error('Error al eliminar mesa:', error);
      throw error;
    }
  },

  /**
   * Obtener estadísticas de ocupación
   * Permisos: OWNER y EMPLOYEE
   */
  getTableStats: async (businessId: string): Promise<TableStats> => {
    try {
      const response = await api.get(`/businesses/${businessId}/tables/stats`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      throw error;
    }
  },
};

export default tableService;
