import api from './api';

export interface SaleItemResponse {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  totalPrice: number;
}

export interface SaleTableInfo {
  id: string;
  tableCode: string;
}

export interface SaleResponse {
  id: string;
  code: string;
  occurredAt: string | null;
  totalAmount: number;
  createdByUserName: string;
  table: SaleTableInfo | null;
  items: SaleItemResponse[];
}

export const salesManagementService = {
  async getAllSales(businessId: string): Promise<SaleResponse[]> {
    try {
      const response = await api.get(`/businesses/${businessId}/sales`);
      return response.data;
    } catch (error) {
      console.error('Error fetching sales:', error);
      throw error;
    }
  },

  async getSaleById(businessId: string, saleId: string): Promise<SaleResponse> {
    try {
      const response = await api.get(
        `/businesses/${businessId}/sales/${saleId}`,
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching sale details:', error);
      throw error;
    }
  },
};
