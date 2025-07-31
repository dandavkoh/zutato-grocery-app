import Dexie, { type Table } from 'dexie';

export interface ShoppingItem {
  id: string;
  list_id: string;
  name: string;
  quantity: number | null;
  unit_id: string | null;
  category_id: string | null;
  icon: string | null;
  notes: string | null;
  store: string | null;
  assigned_to: string | null;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  timestamp: number;
}

export interface List {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string | null;
  is_deleted: number | boolean; // Support both formats for compatibility
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  name: string;
  short_name: string;
  created_at: string;
  updated_at: string;
}

class ShoppingItemsDatabase extends Dexie {
  shoppingItems!: Table<ShoppingItem>;
  queuedRequests!: Table<QueuedRequest>;
  lists!: Table<List>;
  categories!: Table<Category>;
  units!: Table<Unit>;

  constructor() {
    super('ShoppingItemsDB');
    this.version(1).stores({
      shoppingItems: 'id, list_id, name, is_completed, is_deleted, created_at, updated_at',
      queuedRequests: 'id, url, method, timestamp',
      lists: 'id, name, created_by, is_deleted, created_at, updated_at',
      categories: 'id, name, created_at, updated_at',
      units: 'id, name, short_name, created_at, updated_at'
    });
  }
}

export const db = new ShoppingItemsDatabase();

export class DexieService {
  // Get all shopping items for a specific list
  async getShoppingItemsByListId(listId: string): Promise<ShoppingItem[]> {
    try {
      const items = await db.shoppingItems
        .where('list_id')
        .equals(listId)
        .filter(item => !item.is_deleted)
        .reverse()
        .sortBy('created_at');
      
      console.log(`📊 [Dexie] Retrieved ${items.length} items for list ${listId}`);
      return items;
    } catch (error) {
      console.error('❌ [Dexie] Error getting shopping items:', error);
      return [];
    }
  }

  // Get all shopping items (for sync purposes)
  async getAllShoppingItems(): Promise<ShoppingItem[]> {
    try {
      const items = await db.shoppingItems
        .where('is_deleted')
        .equals(0)
        .toArray();
      
      console.log(`📊 [Dexie] Retrieved ${items.length} total items`);
      return items;
    } catch (error) {
      console.error('❌ [Dexie] Error getting all shopping items:', error);
      return [];
    }
  }

  // Add or update shopping items (for sync from Supabase)
  async syncShoppingItems(items: ShoppingItem[]): Promise<void> {
    try {
      if (items.length === 0) { // TODO: If we have no items, we should delete the items from the list anyway
        console.log('📝 [Dexie] No items to sync');
        return;
      }

      // Get the list_id from the first item (all items should have the same list_id)
      const listId = items[0].list_id;
      
      await db.transaction('rw', db.shoppingItems, async () => {
        // First, delete all existing items for this list_id
        const existingItems = await db.shoppingItems
          .where('list_id')
          .equals(listId)
          .toArray();
        
        if (existingItems.length > 0) {
          await db.shoppingItems
            .where('list_id')
            .equals(listId)
            .delete();
          console.log(`🗑️ [Dexie] Deleted ${existingItems.length} existing items for list ${listId}`);
        }
        
        // Then, add all new items
        for (const item of items) {
          await db.shoppingItems.add(item);
        }
      });
      
      console.log(`✅ [Dexie] Synced ${items.length} shopping items for list ${listId}`);
    } catch (error) {
      console.error('❌ [Dexie] Error syncing shopping items:', error);
      throw error;
    }
  }

  // Add a single shopping item
  async addShoppingItem(item: ShoppingItem): Promise<void> {
    try {
      await db.shoppingItems.add(item);
      console.log(`✅ [Dexie] Added shopping item: ${item.name}`);
    } catch (error) {
      console.error('❌ [Dexie] Error adding shopping item:', error);
      throw error;
    }
  }

  // Update a shopping item
  async updateShoppingItem(item: ShoppingItem): Promise<void> {
    try {
      await db.shoppingItems.put(item);
      console.log(`✅ [Dexie] Updated shopping item: ${item.name}`);
    } catch (error) {
      console.error('❌ [Dexie] Error updating shopping item:', error);
      throw error;
    }
  }

  // Update a shopping item from PATCH response
  async updateShoppingItemFromResponse(response: ShoppingItem): Promise<void> {
    try {
      await db.shoppingItems.put(response);
      console.log(`✅ [Dexie] Updated shopping item from response: ${response.name}`);
    } catch (error) {
      console.error('❌ [Dexie] Error updating shopping item from response:', error);
      throw error;
    }
  }

  // Update a shopping item optimistically (for offline PATCH requests)
  async updateShoppingItemOptimistically(itemId: string, updates: Partial<ShoppingItem>): Promise<ShoppingItem | null> {
    try {
      const existingItem = await db.shoppingItems.get(itemId);
      if (!existingItem) {
        console.warn(`⚠️ [Dexie] Item not found for optimistic update: ${itemId}`);
        return null;
      }

      const updatedItem: ShoppingItem = {
        ...existingItem,
        ...updates,
        updated_at: new Date().toISOString()
      };

      await db.shoppingItems.put(updatedItem);
      console.log(`✅ [Dexie] Optimistically updated shopping item: ${updatedItem.name}`);
      return updatedItem;
    } catch (error) {
      console.error('❌ [Dexie] Error optimistically updating shopping item:', error);
      throw error;
    }
  }

  // Delete a shopping item (soft delete)
  async deleteShoppingItem(id: string, deletedBy: string): Promise<void> {
    try {
      const item = await db.shoppingItems.get(id);
      if (item) {
        item.is_deleted = true;
        item.deleted_at = new Date().toISOString();
        item.deleted_by = deletedBy;
        await db.shoppingItems.put(item);
        console.log(`✅ [Dexie] Soft deleted shopping item: ${item.name}`);
      }
    } catch (error) {
      console.error('❌ [Dexie] Error deleting shopping item:', error);
      throw error;
    }
  }

  // Clear all data (for testing/reset)
  async clearAllData(): Promise<void> {
    try {
      await db.shoppingItems.clear();
      console.log('🗑️ [Dexie] Cleared all shopping items');
    } catch (error) {
      console.error('❌ [Dexie] Error clearing data:', error);
      throw error;
    }
  }

  // Get database statistics
  async getStats(): Promise<{ total: number; active: number; deleted: number }> {
    try {
      const total = await db.shoppingItems.count();
      const active = await db.shoppingItems.where('is_deleted').equals(0).count();
      const deleted = await db.shoppingItems.where('is_deleted').equals(1).count();
      
      return { total, active, deleted };
    } catch (error) {
      console.error('❌ [Dexie] Error getting stats:', error);
      return { total: 0, active: 0, deleted: 0 };
    }
  }

  // Queue Management Methods
  async addQueuedRequest(request: QueuedRequest): Promise<void> {
    try {
      await db.queuedRequests.add(request);
      console.log(`📝 [Dexie] Added queued request: ${request.method} ${request.url}`);
    } catch (error) {
      console.error('❌ [Dexie] Error adding queued request:', error);
      throw error;
    }
  }

  async getAllQueuedRequests(): Promise<QueuedRequest[]> {
    try {
      const requests = await db.queuedRequests
        .orderBy('timestamp')
        .toArray();
      
      console.log(`📊 [Dexie] Retrieved ${requests.length} queued requests`);
      return requests;
    } catch (error) {
      console.error('❌ [Dexie] Error getting queued requests:', error);
      return [];
    }
  }

  async removeQueuedRequest(id: string): Promise<void> {
    try {
      await db.queuedRequests.delete(id);
      console.log(`🗑️ [Dexie] Removed queued request: ${id}`);
    } catch (error) {
      console.error('❌ [Dexie] Error removing queued request:', error);
      throw error;
    }
  }

  async clearQueuedRequests(): Promise<void> {
    try {
      await db.queuedRequests.clear();
      console.log('🗑️ [Dexie] Cleared all queued requests');
    } catch (error) {
      console.error('❌ [Dexie] Error clearing queued requests:', error);
      throw error;
    }
  }

  async getQueuedRequestsCount(): Promise<number> {
    try {
      return await db.queuedRequests.count();
    } catch (error) {
      console.error('❌ [Dexie] Error getting queued requests count:', error);
      return 0;
    }
  }

  // Get comprehensive database statistics including queue
  async getFullStats(): Promise<{ 
    total: number; 
    active: number; 
    deleted: number; 
    queuedRequests: number;
    lists: number;
  }> {
    try {
      const [total, active, deleted, queuedRequests, lists] = await Promise.all([
        db.shoppingItems.count(),
        db.shoppingItems.where('is_deleted').equals(0).count(),
        db.shoppingItems.where('is_deleted').equals(1).count(),
        db.queuedRequests.count(),
        (async () => {
          const allLists = await db.lists.toArray();
          return allLists.filter(list => list.is_deleted === false || list.is_deleted === 0).length;
        })()
      ]);
      
      return { total, active, deleted, queuedRequests, lists };
    } catch (error) {
      console.error('❌ [Dexie] Error getting full stats:', error);
      return { total: 0, active: 0, deleted: 0, queuedRequests: 0, lists: 0 };
    }
  }

  // List methods
  async getAllLists(): Promise<List[]> {
    try {
      // Get all lists and filter manually to handle both boolean and number formats
      const allLists = await db.lists.toArray();
      const activeLists = allLists.filter(list => 
        list.is_deleted === false || list.is_deleted === 0
      );
      
      // Sort by created_at descending
      activeLists.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      console.log(`📊 [Dexie] Retrieved ${activeLists.length} lists (from ${allLists.length} total)`);
      return activeLists;
    } catch (error) {
      console.error('❌ [Dexie] Error getting lists:', error);
      return [];
    }
  }

  async syncLists(lists: List[]): Promise<void> {
    try {
      await db.transaction('rw', db.lists, async () => {
        // Delete all existing lists
        await db.lists.clear();
        console.log(`🗑️ [Dexie] Cleared all existing lists`);
        
        // Add all new lists
        for (const list of lists) {
          await db.lists.add(list);
        }
      });
      
      console.log(`✅ [Dexie] Synced ${lists.length} lists`);
    } catch (error) {
      console.error('❌ [Dexie] Error syncing lists:', error);
      throw error;
    }
  }

  async addList(list: List): Promise<void> {
    try {
      await db.lists.add(list);
      console.log(`✅ [Dexie] Added list: ${list.name}`);
    } catch (error) {
      console.error('❌ [Dexie] Error adding list:', error);
      throw error;
    }
  }

  async updateList(list: List): Promise<void> {
    try {
      await db.lists.update(list.id, list);
      console.log(`✅ [Dexie] Updated list: ${list.name}`);
    } catch (error) {
      console.error('❌ [Dexie] Error updating list:', error);
      throw error;
    }
  }

  async updateListFromResponse(response: List): Promise<void> {
    try {
      // Update the existing list with server response data
      await db.lists.update(response.id, response);
      console.log(`✅ [Dexie] Updated list from response: ${response.name}`);
    } catch (error) {
      console.error('❌ [Dexie] Error updating list from response:', error);
      throw error;
    }
  }

  async deleteList(id: string): Promise<void> {
    try {
      await db.lists.update(id, { 
        is_deleted: 1, 
        deleted_at: new Date().toISOString() 
      });
      console.log(`🗑️ [Dexie] Deleted list: ${id}`);
    } catch (error) {
      console.error('❌ [Dexie] Error deleting list:', error);
      throw error;
    }
  }

  // Debug method to check all lists in database
  async debugAllLists(): Promise<void> {
    try {
      const allLists = await db.lists.toArray();
      console.log(`🔍 [Dexie] All lists in database:`, allLists);
      
      const activeLists = await db.lists.where('is_deleted').equals(0).toArray();
      console.log(`🔍 [Dexie] Active lists (is_deleted=0):`, activeLists);
      
      const deletedLists = await db.lists.where('is_deleted').equals(1).toArray();
      console.log(`🔍 [Dexie] Deleted lists (is_deleted=1):`, deletedLists);
    } catch (error) {
      console.error('❌ [Dexie] Error debugging lists:', error);
    }
  }

  // Category methods
  async getAllCategories(): Promise<Category[]> {
    try {
      const categories = await db.categories
        .orderBy('name')
        .toArray();
      
      console.log(`📊 [Dexie] Retrieved ${categories.length} categories`);
      return categories;
    } catch (error) {
      console.error('❌ [Dexie] Error getting categories:', error);
      return [];
    }
  }

  async syncCategories(categories: Category[]): Promise<void> {
    try {
      await db.transaction('rw', db.categories, async () => {
        // Delete all existing categories
        await db.categories.clear();
        console.log(`🗑️ [Dexie] Cleared all existing categories`);
        
        // Add all new categories
        for (const category of categories) {
          await db.categories.add(category);
        }
      });
      
      console.log(`✅ [Dexie] Synced ${categories.length} categories`);
    } catch (error) {
      console.error('❌ [Dexie] Error syncing categories:', error);
      throw error;
    }
  }

  async addCategory(category: Category): Promise<void> {
    try {
      await db.categories.add(category);
      console.log(`✅ [Dexie] Added category: ${category.name}`);
    } catch (error) {
      console.error('❌ [Dexie] Error adding category:', error);
      throw error;
    }
  }

  async updateCategory(category: Category): Promise<void> {
    try {
      await db.categories.update(category.id, category);
      console.log(`✅ [Dexie] Updated category: ${category.name}`);
    } catch (error) {
      console.error('❌ [Dexie] Error updating category:', error);
      throw error;
    }
  }

  // Unit methods
  async getAllUnits(): Promise<Unit[]> {
    try {
      const units = await db.units
        .orderBy('name')
        .toArray();
      
      console.log(`📊 [Dexie] Retrieved ${units.length} units`);
      return units;
    } catch (error) {
      console.error('❌ [Dexie] Error getting units:', error);
      return [];
    }
  }

  async syncUnits(units: Unit[]): Promise<void> {
    try {
      await db.transaction('rw', db.units, async () => {
        // Delete all existing units
        await db.units.clear();
        console.log(`🗑️ [Dexie] Cleared all existing units`);
        
        // Add all new units
        for (const unit of units) {
          await db.units.add(unit);
        }
      });
      
      console.log(`✅ [Dexie] Synced ${units.length} units`);
    } catch (error) {
      console.error('❌ [Dexie] Error syncing units:', error);
      throw error;
    }
  }

  async addUnit(unit: Unit): Promise<void> {
    try {
      await db.units.add(unit);
      console.log(`✅ [Dexie] Added unit: ${unit.name}`);
    } catch (error) {
      console.error('❌ [Dexie] Error adding unit:', error);
      throw error;
    }
  }

  async updateUnit(unit: Unit): Promise<void> {
    try {
      await db.units.update(unit.id, unit);
      console.log(`✅ [Dexie] Updated unit: ${unit.name}`);
    } catch (error) {
      console.error('❌ [Dexie] Error updating unit:', error);
      throw error;
    }
  }
}

export const dexieService = new DexieService(); 