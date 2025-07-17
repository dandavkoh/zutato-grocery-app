// Mock API Types - Compatible with Supabase
export interface Unit {
  name: string; // Langer Name, z.B. "Packungen"
  short: string; // Kurze Abkürzung, z.B. "Pkg"
}

export interface ShoppingItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  icon?: string; // Font Awesome icon name (e.g., "fa-apple", "fa-bread-slice")
  unit?: Unit;
  amount?: number;
  isCompleted: boolean;
  deleted?: boolean;
  createdAt: string;
  updatedAt: string;
  householdId: string;
  addedBy: string;
  notes?: string;
  stores?: string[];
  assignedTo?: string[];
}

export interface CreateShoppingItemRequest {
  name: string;
  description?: string;
  category: string;
  icon?: string;
  unit?: Unit;
  amount?: number;
  householdId: string;
  addedBy: string;
  notes?: string;
  stores?: string[];
  assignedTo?: string[];
}

export interface UpdateShoppingItemRequest {
  name?: string;
  description?: string;
  category?: string;
  icon?: string;
  unit?: Unit;
  amount?: number;
  isCompleted?: boolean;
  deleted?: boolean;
  notes?: string;
  stores?: string[];
  assignedTo?: string[];
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

// Mock Data
const mockItems: ShoppingItem[] = [
  {
    id: '1',
    name: 'Ananas',
    category: 'Obst',
    icon: 'fa-pineapple',
    unit: { name: 'Stücke', short: 'Stk' },
    amount: 1,
    isCompleted: false,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    householdId: 'household-1',
    addedBy: 'user-1',
    notes: 'Reife Ananas bevorzugen',
    stores: ['Rewe', 'Edeka'],
    assignedTo: ['user-1']
  },
  {
    id: '2',
    name: 'Donuts',
    category: 'Brot & Backwaren',
    icon: 'fa-donut',
    unit: { name: 'Stücke', short: 'Stk' },
    amount: 6,
    isCompleted: false,
    createdAt: '2024-01-15T09:30:00Z',
    updatedAt: '2024-01-15T09:30:00Z',
    householdId: 'household-1',
    addedBy: 'user-2',
    stores: ['Bäckerei'],
    assignedTo: ['user-2']
  },
  {
    id: '3',
    name: 'Haribo',
    description: 'Schlangen',
    category: 'Süßigkeiten & Snacks',
    icon: undefined,
    unit: { name: 'Packungen', short: 'Pkg' },
    amount: 2,
    isCompleted: false,
    createdAt: '2024-01-15T08:45:00Z',
    updatedAt: '2024-01-15T08:45:00Z',
    householdId: 'household-1',
    addedBy: 'user-1',
    stores: ['Rewe', 'Lidl'],
    assignedTo: ['user-1']
  },
  {
    id: '4',
    name: 'Butter',
    category: 'Milchprodukte & Eier',
    icon: 'fa-butter',
    unit: { name: 'Packungen', short: 'Pkg' },
    amount: 1,
    isCompleted: true,
    createdAt: '2024-01-14T16:20:00Z',
    updatedAt: '2024-01-15T11:30:00Z',
    householdId: 'household-1',
    addedBy: 'user-1',
    stores: ['Rewe'],
    assignedTo: ['user-1']
  },
  {
    id: '5',
    name: 'Milch',
    category: 'Milchprodukte & Eier',
    icon: 'fa-glass',
    unit: { name: 'Liter', short: 'l' },
    amount: 1.5,
    isCompleted: true,
    createdAt: '2024-01-14T15:10:00Z',
    updatedAt: '2024-01-15T10:15:00Z',
    householdId: 'household-1',
    addedBy: 'user-2',
    stores: ['Rewe'],
    assignedTo: ['user-2']
  },
  {
    id: '6',
    name: 'Eier',
    category: 'Milchprodukte & Eier',
    icon: 'fa-egg',
    unit: { name: 'Stücke', short: 'Stk' },
    amount: 10,
    isCompleted: false,
    createdAt: '2024-01-15T07:30:00Z',
    updatedAt: '2024-01-15T07:30:00Z',
    householdId: 'household-1',
    addedBy: 'user-1',
    stores: ['Rewe', 'Edeka'],
    assignedTo: ['user-1']
  },
  {
    id: '7',
    name: 'Sahne',
    category: 'Milchprodukte & Eier',
    icon: 'fa-bowl-soft-serve',
    unit: { name: 'Packungen', short: 'Pkg' },
    amount: 4,
    isCompleted: false,
    createdAt: '2024-01-15T06:45:00Z',
    updatedAt: '2024-01-15T06:45:00Z',
    householdId: 'household-1',
    addedBy: 'user-2',
    notes: 'Für Kuchen',
    stores: ['Rewe'],
    assignedTo: ['user-2']
  }
];

// Mock API Controller
export class ShoppingItemsController {
  // Get all items for a household
  async getItems(householdId: string): Promise<ApiResponse<ShoppingItem[]>> {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const items = mockItems.filter(item => 
        item.householdId === householdId && 
        !item.deleted
      );
      
      return {
        data: items,
        error: null,
        status: 200
      };
    } catch (error) {
      return {
        data: null,
        error: 'Failed to fetch items',
        status: 500
      };
    }
  }

  // Get items by category
  async getItemsByCategory(householdId: string, category: string): Promise<ApiResponse<ShoppingItem[]>> {
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const items = mockItems.filter(
        item => 
          item.householdId === householdId && 
          item.category === category &&
          !item.deleted
      );
      
      return {
        data: items,
        error: null,
        status: 200
      };
    } catch (error) {
      return {
        data: null,
        error: 'Failed to fetch items by category',
        status: 500
      };
    }
  }

  // Get completed items
  async getCompletedItems(householdId: string): Promise<ApiResponse<ShoppingItem[]>> {
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const items = mockItems.filter(
        item => 
          item.householdId === householdId && 
          item.isCompleted &&
          !item.deleted
      );
      
      return {
        data: items,
        error: null,
        status: 200
      };
    } catch (error) {
      return {
        data: null,
        error: 'Failed to fetch completed items',
        status: 500
      };
    }
  }

  // Create new item
  async createItem(itemData: CreateShoppingItemRequest): Promise<ApiResponse<ShoppingItem>> {
    try {
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const newItem: ShoppingItem = {
        id: Date.now().toString(),
        ...itemData,
        isCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      mockItems.push(newItem);
      
      return {
        data: newItem,
        error: null,
        status: 201
      };
    } catch (error) {
      return {
        data: null,
        error: 'Failed to create item',
        status: 500
      };
    }
  }

  // Update item
  async updateItem(id: string, updates: UpdateShoppingItemRequest): Promise<ApiResponse<ShoppingItem>> {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const itemIndex = mockItems.findIndex(item => item.id === id);
      
      if (itemIndex === -1) {
        return {
          data: null,
          error: 'Item not found',
          status: 404
        };
      }
      
      const updatedItem = {
        ...mockItems[itemIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      mockItems[itemIndex] = updatedItem;
      
      return {
        data: updatedItem,
        error: null,
        status: 200
      };
    } catch (error) {
      return {
        data: null,
        error: 'Failed to update item',
        status: 500
      };
    }
  }

  // Delete item
  async deleteItem(id: string): Promise<ApiResponse<null>> {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const itemIndex = mockItems.findIndex(item => item.id === id);
      
      if (itemIndex === -1) {
        return {
          data: null,
          error: 'Item not found',
          status: 404
        };
      }
      
      mockItems[itemIndex] = {
        ...mockItems[itemIndex],
        deleted: true,
        updatedAt: new Date().toISOString()
      };
      
      return {
        data: null,
        error: null,
        status: 204
      };
    } catch (error) {
      return {
        data: null,
        error: 'Failed to delete item',
        status: 500
      };
    }
  }

  // Toggle item completion
  async toggleItemCompletion(id: string): Promise<ApiResponse<ShoppingItem>> {
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const itemIndex = mockItems.findIndex(item => item.id === id);
      
      if (itemIndex === -1) {
        return {
          data: null,
          error: 'Item not found',
          status: 404
        };
      }
      
      const updatedItem = {
        ...mockItems[itemIndex],
        isCompleted: !mockItems[itemIndex].isCompleted,
        updatedAt: new Date().toISOString()
      };
      
      mockItems[itemIndex] = updatedItem;
      
      return {
        data: updatedItem,
        error: null,
        status: 200
      };
    } catch (error) {
      return {
        data: null,
        error: 'Failed to toggle item completion',
        status: 500
      };
    }
  }

  // Search items
  async searchItems(householdId: string, query: string): Promise<ApiResponse<ShoppingItem[]>> {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const items = mockItems.filter(
        item => 
          item.householdId === householdId && 
          item.name.toLowerCase().includes(query.toLowerCase()) &&
          !item.deleted
      );
      
      return {
        data: items,
        error: null,
        status: 200
      };
    } catch (error) {
      return {
        data: null,
        error: 'Failed to search items',
        status: 500
      };
    }
  }
}

// Export singleton instance
export const shoppingItemsApi = new ShoppingItemsController();

// Helper function to group items by category
export const groupItemsByCategory = (items: ShoppingItem[]) => {
  const grouped: { [category: string]: ShoppingItem[] } = {};
  
  const activeItems = items.filter(item => !item.deleted);
  
  activeItems.forEach(item => {
    if (!grouped[item.category]) {
      grouped[item.category] = [];
    }
    grouped[item.category].push(item);
  });
  
  return grouped;
};

// Helper function to get completed and incomplete items
export const separateCompletedItems = (items: ShoppingItem[]) => {
  const activeItems = items.filter(item => !item.deleted);
  
  const completed = activeItems.filter(item => item.isCompleted);
  const incomplete = activeItems.filter(item => !item.isCompleted);
  
  return { completed, incomplete };
}; 