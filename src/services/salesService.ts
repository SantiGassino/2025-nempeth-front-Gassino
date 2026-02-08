import api from './api';

export interface CreateSaleItemRequest {
  productId: string;
  quantity: number;
}

export interface CreateSaleRequest {
  items: CreateSaleItemRequest[];
}

export interface SaleItem {
  id: string;
  productId?: string;
  productName: string;
  categoryName?: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
}

export interface SaleTableInfo {
  id: string;
  tableCode: string;
}

export interface Sale {
  id: string;
  businessId: string;
  items?: SaleItem[];
  createdAt: string;
  closedAt?: string | null;
  total?: number;
  isOpen?: boolean;
  employeeId?: string;
  createdByUserName: string;
  table: SaleTableInfo | null;
}

export interface CreateSaleResponse {
  saleId: string;
}

export const salesService = {
  // Crear una nueva orden (vacía)
  async createSale(businessId: string): Promise<CreateSaleResponse> {
    try {
      const response = await api.post(`/businesses/${businessId}/sales`);
      return response.data;
    } catch (error) {
      console.error('Error creating sale:', error);
      throw error;
    }
  },

  // Obtener todas las órdenes abiertas
  async getOpenSales(businessId: string): Promise<Sale[]> {
    try {
      const response = await api.get(
        `/businesses/${businessId}/sales?open=true`,
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching open sales:', error);
      throw error;
    }
  },

  // Obtener una orden específica con sus items
  async getSaleById(businessId: string, saleId: string): Promise<Sale> {
    try {
      const response = await api.get(
        `/businesses/${businessId}/sales/${saleId}`,
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching sale:', error);
      throw error;
    }
  },

  // Obtener los items de una orden
  async getSaleItems(businessId: string, saleId: string): Promise<SaleItem[]> {
    try {
      const response = await api.get(
        `/businesses/${businessId}/sales/${saleId}/items`,
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching sale items:', error);
      throw error;
    }
  },

  // Agregar un item a una orden existente
  async addItemToSale(
    businessId: string,
    saleId: string,
    item: CreateSaleItemRequest,
  ): Promise<SaleItem> {
    try {
      const response = await api.post(
        `/businesses/${businessId}/sales/${saleId}/items`,
        item,
      );
      return response.data;
    } catch (error) {
      console.error('Error adding item to sale:', error);
      throw error;
    }
  },

  // Cerrar una orden
  async closeSale(businessId: string, saleId: string): Promise<Sale> {
    try {
      const response = await api.post(
        `/businesses/${businessId}/sales/${saleId}/close`,
      );
      return response.data;
    } catch (error) {
      console.error('Error closing sale:', error);
      throw error;
    }
  },

  // Eliminar una orden abierta
  async deleteSale(
    businessId: string,
    saleId: string,
  ): Promise<{ message: string }> {
    try {
      const response = await api.delete(
        `/businesses/${businessId}/sales/${saleId}`,
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting sale:', error);
      throw error;
    }
  },
};
