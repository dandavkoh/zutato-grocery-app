import { shoppingItemsApi as mockApi } from './mockApi';
import type { 
  ShoppingItem, 
  CreateShoppingItemRequest, 
  UpdateShoppingItemRequest,
  ApiResponse 
} from './mockApi';

// Mock API Adapter für RTK Query
// Dieser Adapter fängt die HTTP-Requests von RTK Query ab und leitet sie an die Mock-API weiter

export const mockApiAdapter = {
  // GET /api/shopping-items/:householdId
  async getItems(householdId: string): Promise<ApiResponse<ShoppingItem[]>> {
    return await mockApi.getItems(householdId);
  },

  // GET /api/shopping-items/:householdId/category/:category
  async getItemsByCategory(householdId: string, category: string): Promise<ApiResponse<ShoppingItem[]>> {
    return await mockApi.getItemsByCategory(householdId, category);
  },

  // GET /api/shopping-items/:householdId/completed
  async getCompletedItems(householdId: string): Promise<ApiResponse<ShoppingItem[]>> {
    return await mockApi.getCompletedItems(householdId);
  },

  // POST /api/shopping-items
  async createItem(itemData: CreateShoppingItemRequest): Promise<ApiResponse<ShoppingItem>> {
    return await mockApi.createItem(itemData);
  },

  // PUT /api/shopping-items/:id
  async updateItem(id: string, updates: UpdateShoppingItemRequest): Promise<ApiResponse<ShoppingItem>> {
    return await mockApi.updateItem(id, updates);
  },

  // DELETE /api/shopping-items/:id
  async deleteItem(id: string): Promise<ApiResponse<null>> {
    return await mockApi.deleteItem(id);
  },

  // PATCH /api/shopping-items/:id/toggle
  async toggleItemCompletion(id: string): Promise<ApiResponse<ShoppingItem>> {
    return await mockApi.toggleItemCompletion(id);
  },

  // GET /api/shopping-items/:householdId/search?q=:query
  async searchItems(householdId: string, query: string): Promise<ApiResponse<ShoppingItem[]>> {
    return await mockApi.searchItems(householdId, query);
  },
};

// Custom baseQuery für RTK Query, der die Mock-API verwendet
export const mockBaseQuery = async (args: { url: string; method: string; body?: any; params?: any }) => {
  const { url, method, body, params } = args;
  
  try {
    let response: any;
    
    // URL-Parsing für verschiedene Endpoints
    if (method === 'GET') {
      if (url.includes('/api/shopping-items/') && url.includes('/category/')) {
        // GET /api/shopping-items/:householdId/category/:category
        const parts = url.split('/');
        const householdId = parts[3];
        const category = decodeURIComponent(parts[5]);
        response = await mockApiAdapter.getItemsByCategory(householdId, category);
      } else if (url.includes('/api/shopping-items/') && url.includes('/completed')) {
        // GET /api/shopping-items/:householdId/completed
        const householdId = url.split('/')[3];
        response = await mockApiAdapter.getCompletedItems(householdId);
      } else if (url.includes('/api/shopping-items/') && url.includes('/search')) {
        // GET /api/shopping-items/:householdId/search?q=:query
        const householdId = url.split('/')[3];
        const query = params?.q || '';
        response = await mockApiAdapter.searchItems(householdId, query);
      } else if (url.includes('/api/shopping-items/')) {
        // GET /api/shopping-items/:householdId
        const householdId = url.split('/')[3];
        response = await mockApiAdapter.getItems(householdId);
      }
    } else if (method === 'POST' && url === '/api/shopping-items') {
      // POST /api/shopping-items
      response = await mockApiAdapter.createItem(body);
    } else if (method === 'PUT' && url.includes('/api/shopping-items/')) {
      // PUT /api/shopping-items/:id
      const id = url.split('/')[3];
      response = await mockApiAdapter.updateItem(id, body);
    } else if (method === 'DELETE' && url.includes('/api/shopping-items/')) {
      // DELETE /api/shopping-items/:id
      const id = url.split('/')[3];
      response = await mockApiAdapter.deleteItem(id);
    } else if (method === 'PATCH' && url.includes('/api/shopping-items/') && url.includes('/toggle')) {
      // PATCH /api/shopping-items/:id/toggle
      const id = url.split('/')[3];
      response = await mockApiAdapter.toggleItemCompletion(id);
    }
    
    if (!response) {
      throw new Error('Endpoint not found');
    }
    
    // RTK Query erwartet eine bestimmte Response-Struktur
    if (response.error) {
      return { error: { status: response.status, data: response.error } };
    }
    
    return { data: response.data };
  } catch (error) {
    return { 
      error: { 
        status: 500, 
        data: error instanceof Error ? error.message : 'Unknown error' 
      } 
    };
  }
}; 