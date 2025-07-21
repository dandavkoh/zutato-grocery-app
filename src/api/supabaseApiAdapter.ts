import { ShoppingItemsController, ListsController } from './supabaseApi';
import type { 
  ShoppingItem, 
  CreateShoppingItemRequest, 
  UpdateShoppingItemRequest,
  ApiResponse,
  List,
  CreateListRequest,
  UpdateListRequest,
  ListMember
} from './supabaseApi';

// Create controller instances
const supabaseApi = new ShoppingItemsController();
const supabaseListsApi = new ListsController();

// Supabase API Adapter für RTK Query
// Dieser Adapter fängt die HTTP-Requests von RTK Query ab und leitet sie an die Supabase-API weiter

export const supabaseApiAdapter = {
  // Shopping Items API
  // GET /api/shopping-items/:listId
  async getItems(listId: string): Promise<ApiResponse<ShoppingItem[]>> {
    return await supabaseApi.getItems(listId);
  },

  // GET /api/shopping-items/:listId/category/:category
  async getItemsByCategory(listId: string, category_id: string): Promise<ApiResponse<ShoppingItem[]>> {
    return await supabaseApi.getItemsByCategory(listId, category_id);
  },

  // GET /api/shopping-items/:listId/completed
  async getCompletedItems(listId: string): Promise<ApiResponse<ShoppingItem[]>> {
    return await supabaseApi.getCompletedItems(listId);
  },

  // POST /api/shopping-items
  async createItem(itemData: CreateShoppingItemRequest): Promise<ApiResponse<ShoppingItem>> {
    return await supabaseApi.createItem(itemData);
  },

  // PUT /api/shopping-items/:id
  async updateItem(id: string, updates: UpdateShoppingItemRequest): Promise<ApiResponse<ShoppingItem>> {
    return await supabaseApi.updateItem(id, updates);
  },

  // DELETE /api/shopping-items/:id
  async deleteItem(id: string): Promise<ApiResponse<null>> {
    return await supabaseApi.deleteItem(id);
  },

  // PATCH /api/shopping-items/:id/toggle
  async toggleItemCompletion(id: string): Promise<ApiResponse<ShoppingItem>> {
    return await supabaseApi.toggleItemCompletion(id);
  },

  // GET /api/shopping-items/:listId/search?q=:query
  async searchItems(listId: string, query: string): Promise<ApiResponse<ShoppingItem[]>> {
    return await supabaseApi.searchItems(listId, query);
  },

  // Lists API
  // GET /api/lists
  async getLists(): Promise<ApiResponse<List[]>> {
    return await supabaseListsApi.getLists();
  },

  // GET /api/lists/:id
  async getList(id: string): Promise<ApiResponse<List>> {
    return await supabaseListsApi.getList(id);
  },

  // POST /api/lists
  async createList(listData: CreateListRequest): Promise<ApiResponse<List>> {
    return await supabaseListsApi.createList(listData);
  },

  // PUT /api/lists/:id
  async updateList(id: string, updates: UpdateListRequest): Promise<ApiResponse<List>> {
    return await supabaseListsApi.updateList(id, updates);
  },

  // DELETE /api/lists/:id
  async deleteList(id: string): Promise<ApiResponse<null>> {
    return await supabaseListsApi.deleteList(id);
  },

  // GET /api/lists/:id/members
  async getListMembers(listId: string): Promise<ApiResponse<ListMember[]>> {
    return await supabaseListsApi.getListMembers(listId);
  },

  // POST /api/lists/:id/members
  async addListMember(listId: string, userId: string, role: 'owner' | 'member'): Promise<ApiResponse<ListMember>> {
    return await supabaseListsApi.addListMember(listId, userId, role);
  },

  // DELETE /api/lists/:id/members/:userId
  async removeListMember(listId: string, userId: string): Promise<ApiResponse<null>> {
    return await supabaseListsApi.removeListMember(listId, userId);
  },
};

// Custom baseQuery für RTK Query, der die Supabase-API verwendet
export const supabaseBaseQuery = async (args: { url: string; method: string; body?: any; params?: any }) => {
  const { url, method, body, params } = args;
  
  try {
    let response: any;
    
    // URL-Parsing für verschiedene Endpoints
    if (method === 'GET') {
      if (url.includes('/api/shopping-items/') && url.includes('/category/')) {
        // GET /api/shopping-items/:listId/category/:category
        const parts = url.split('/');
        const listId = parts[3];
        const category = decodeURIComponent(parts[5]);
        response = await supabaseApiAdapter.getItemsByCategory(listId, category);
      } else if (url.includes('/api/shopping-items/') && url.includes('/completed')) {
        // GET /api/shopping-items/:listId/completed
        const listId = url.split('/')[3];
        response = await supabaseApiAdapter.getCompletedItems(listId);
      } else if (url.includes('/api/shopping-items/') && url.includes('/search')) {
        // GET /api/shopping-items/:listId/search?q=:query
        const listId = url.split('/')[3];
        const query = params?.q || '';
        response = await supabaseApiAdapter.searchItems(listId, query);
      } else if (url.includes('/api/shopping-items/')) {
        // GET /api/shopping-items/:listId
        const listId = url.split('/')[3];
        response = await supabaseApiAdapter.getItems(listId);
      } else if (url === '/api/lists') {
        // GET /api/lists
        response = await supabaseApiAdapter.getLists();
      } else if (url.includes('/api/lists/') && url.includes('/members')) {
        // GET /api/lists/:id/members
        const listId = url.split('/')[3];
        response = await supabaseApiAdapter.getListMembers(listId);
      } else if (url.includes('/api/lists/')) {
        // GET /api/lists/:id
        const listId = url.split('/')[3];
        response = await supabaseApiAdapter.getList(listId);
      }
    } else if (method === 'POST') {
      if (url === '/api/shopping-items') {
        // POST /api/shopping-items
        response = await supabaseApiAdapter.createItem(body);
      } else if (url === '/api/lists') {
        // POST /api/lists
        response = await supabaseApiAdapter.createList(body);
      } else if (url.includes('/api/lists/') && url.includes('/members')) {
        // POST /api/lists/:id/members
        const listId = url.split('/')[3];
        response = await supabaseApiAdapter.addListMember(listId, body.userId, body.role);
      }
    } else if (method === 'PUT') {
      if (url.includes('/api/shopping-items/')) {
        // PUT /api/shopping-items/:id
        const id = url.split('/')[3];
        response = await supabaseApiAdapter.updateItem(id, body);
      } else if (url.includes('/api/lists/')) {
        // PUT /api/lists/:id
        const id = url.split('/')[3];
        response = await supabaseApiAdapter.updateList(id, body);
      }
    } else if (method === 'DELETE') {
      if (url.includes('/api/shopping-items/')) {
        // DELETE /api/shopping-items/:id
        const id = url.split('/')[3];
        response = await supabaseApiAdapter.deleteItem(id);
      } else if (url.includes('/api/lists/') && url.includes('/members/')) {
        // DELETE /api/lists/:id/members/:userId
        const parts = url.split('/');
        const listId = parts[3];
        const userId = parts[5];
        response = await supabaseApiAdapter.removeListMember(listId, userId);
      } else if (url.includes('/api/lists/')) {
        // DELETE /api/lists/:id
        const id = url.split('/')[3];
        response = await supabaseApiAdapter.deleteList(id);
      }
    } else if (method === 'PATCH' && url.includes('/api/shopping-items/') && url.includes('/toggle')) {
      // PATCH /api/shopping-items/:id/toggle
      const id = url.split('/')[3];
      response = await supabaseApiAdapter.toggleItemCompletion(id);
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