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

class ShoppingItemsDatabase extends Dexie {
  shoppingItems!: Table<ShoppingItem>;

  constructor() {
    super('ShoppingItemsDB');
    this.version(1).stores({
      shoppingItems: 'id, list_id, name, is_completed, is_deleted, created_at, updated_at'
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
      await db.transaction('rw', db.shoppingItems, async () => {
        for (const item of items) {
          await db.shoppingItems.put(item);
        }
      });
      
      console.log(`✅ [Dexie] Synced ${items.length} shopping items`);
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
}

export const dexieService = new DexieService(); 