import Dexie, { type Table } from 'dexie';
import { logDebug, logInfo, logWarn, logError } from '../utils/logger';

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

export interface List {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string | null;
  is_deleted: number | boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  created_at: string;
  updated_at: string;
  sort_order: number;
}

export interface Unit {
  id: string;
  name: string;
  short_name: string;
  created_at: string;
  updated_at: string;
  sort_order: number;
}

export interface RollbackData {
  operation: 'create' | 'update' | 'delete';
  tableName: 'shoppingItems' | 'lists' | 'categories' | 'units';
  recordId: string;
  previousState?: ShoppingItem | List | Category | Unit; // State before optimistic update
}

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  timestamp: number;
  retryCount: number;
  lastAttempt: number;
  rollbackData?: RollbackData;
}

export interface DeadLetterQueueItem {
  id: string;
  endpoint: string;
  method: string;
  body?: any;
  headers?: any;
  timestamp: string;
  error: string;
  retryCount: number;
  originalQueueId: string;
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
  sort_order: number;
}

export interface Unit {
  id: string;
  name: string;
  short_name: string;
  created_at: string;
  updated_at: string;
  sort_order: number;
}

class ShoppingItemsDatabase extends Dexie {
  shoppingItems!: Table<ShoppingItem>;
  queuedRequests!: Table<QueuedRequest>;
  lists!: Table<List>;
  categories!: Table<Category>;
  units!: Table<Unit>;
  deadLetterQueue!: Table<DeadLetterQueueItem>;

  constructor() {
    super('ShoppingItemsDB');
    this.version(1).stores({
      shoppingItems: 'id, list_id, name, is_completed, is_deleted, created_at, updated_at',
      queuedRequests: 'id, url, method, timestamp',
      lists: 'id, name, created_by, is_deleted, created_at, updated_at',
      categories: 'id, name, created_at, updated_at',
      units: 'id, name, short_name, created_at, updated_at'
    });
    // Version 2: Add retryCount and lastAttempt to queuedRequests
    this.version(2).stores({
      shoppingItems: 'id, list_id, name, is_completed, is_deleted, created_at, updated_at',
      queuedRequests: 'id, url, method, timestamp, retryCount, lastAttempt',
      lists: 'id, name, created_by, is_deleted, created_at, updated_at',
      categories: 'id, name, created_at, updated_at',
      units: 'id, name, short_name, created_at, updated_at'
    }).upgrade(tx => {
      // Migrate existing queuedRequests to add new fields
      return tx.table('queuedRequests').toCollection().modify(request => {
        if (request.retryCount === undefined) {
          request.retryCount = 0;
        }
        if (request.lastAttempt === undefined) {
          request.lastAttempt = request.timestamp;
        }
      });
    });
    // Version 3: Add dead letter queue
    this.version(3).stores({
      shoppingItems: 'id, list_id, name, is_completed, is_deleted, created_at, updated_at',
      queuedRequests: 'id, url, method, timestamp, retryCount, lastAttempt',
      lists: 'id, name, created_by, is_deleted, created_at, updated_at',
      categories: 'id, name, created_at, updated_at',
      units: 'id, name, short_name, created_at, updated_at',
      deadLetterQueue: 'id, endpoint, method, timestamp, error, retryCount'
    });
    // Version 4: Add rollbackData to queuedRequests (non-indexed field, no migration needed)
    this.version(4).stores({
      shoppingItems: 'id, list_id, name, is_completed, is_deleted, created_at, updated_at',
      queuedRequests: 'id, url, method, timestamp, retryCount, lastAttempt',
      lists: 'id, name, created_by, is_deleted, created_at, updated_at',
      categories: 'id, name, created_at, updated_at',
      units: 'id, name, short_name, created_at, updated_at',
      deadLetterQueue: 'id, endpoint, method, timestamp, error, retryCount'
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
      
      logDebug(`📊 [Dexie] Retrieved ${items.length} items for list ${listId}`);
      return items;
    } catch (error) {
      logError('❌ [Dexie] Error getting shopping items:', error);
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
      
      logDebug(`📊 [Dexie] Retrieved ${items.length} total items`);
      return items;
    } catch (error) {
      logError('❌ [Dexie] Error getting all shopping items:', error);
      return [];
    }
  }

  // Add or update shopping items (for sync from Supabase)
  async syncShoppingItems(
    serverItems: any[],
    queuedItemIds?: Set<string>
  ): Promise<void> {
    logInfo('🔄 [Dexie] Starting syncShoppingItems', {
      serverItemsCount: serverItems.length,
      queuedItemsCount: queuedItemIds?.size || 0,
      queuedItemIds: Array.from(queuedItemIds || [])
    });
    
    try {
      // Handle empty items case - determine list_id from first item if available
      let listId: string | null = null;
      
      if (serverItems.length === 0) {
        logDebug('📝 [Dexie] No items to sync');
        return;
      }

      // Get the list_id from the first item (all items should have the same list_id)
      listId = serverItems[0].list_id;
      
      await db.transaction('rw', db.shoppingItems, async () => {
        // Get all existing items for this list
        const existingItems = await db.shoppingItems
          .where('list_id')
          .equals(listId!)
          .toArray();
        
        // Create a map of server items by ID for efficient lookup
        const serverItemsMap = new Map<string, ShoppingItem>();
        serverItems.forEach(item => {
          serverItemsMap.set(item.id, item);
        });
        
        // Create a map of existing items by ID for efficient lookup
        const existingItemsMap = new Map<string, ShoppingItem>();
        existingItems.forEach(item => {
          existingItemsMap.set(item.id, item);
        });
        
        // Prepare items to update/add
        const itemsToUpsert: ShoppingItem[] = [];
        let conflictsDetected = 0;
        let queuedItemsSkipped = 0;
        
        // Process all server items with conflict resolution
        serverItems.forEach(serverItem => {
          // Check if item is queued for update - if so, don't overwrite local changes
          if (queuedItemIds && queuedItemIds.has(serverItem.id)) {
            logDebug(`⏭️ [Dexie] Skipping queued item during sync: ${serverItem.id} (${serverItem.name})`);
            queuedItemsSkipped++;
            return;
          }

          const existingItem = existingItemsMap.get(serverItem.id);
          
          if (existingItem) {
            // Compare timestamps to resolve conflicts
            const localTimestamp = existingItem.updated_at || existingItem.created_at;
            const serverTimestamp = serverItem.updated_at || serverItem.created_at;
            
            // Handle missing timestamps
            if (!localTimestamp || !serverTimestamp) {
              logWarn(`⚠️ [Dexie] Missing timestamp for item ${serverItem.id}, using server version`);
              itemsToUpsert.push(serverItem);
              return;
            }
            
            // Compare timestamps as ISO date strings
            if (localTimestamp > serverTimestamp) {
              // Local version is newer - keep it
              logDebug(`🔄 [Dexie] Conflict detected for item ${serverItem.id} (${serverItem.name}): local newer (${localTimestamp} > ${serverTimestamp}), keeping local version`);
              conflictsDetected++;
              // Don't add to upsert list - keep existing local version
              return;
            } else {
              // Server version is newer or equal - use it
              itemsToUpsert.push(serverItem);
            }
          } else {
            // New item from server - add it
            itemsToUpsert.push(serverItem);
          }
        });
        
        logInfo('🔍 [Dexie] Checking for orphaned items', {
          existingItemsCount: existingItems.length,
          serverItemsCount: serverItems.length,
          existingItemIds: existingItems.map(i => i.id),
          serverItemIds: serverItems.map(i => i.id)
        });
        
        // Find local items that don't exist on server (potentially deleted on server)
        // Only mark as deleted if they're not already marked as deleted locally
        const itemsToMarkDeleted: ShoppingItem[] = [];
        existingItems.forEach(existingItem => {
          if (!serverItemsMap.has(existingItem.id) && !existingItem.is_deleted) {
            // Check if item is queued - don't mark as deleted if it's queued
            if (queuedItemIds && queuedItemIds.has(existingItem.id)) {
              logDebug(`⏭️ [Dexie] Skipping deletion of queued item: ${existingItem.id}`);
              return;
            }
            
            // ✅ CRITICAL FIX: Don't delete items created in the last 10 seconds
            // This protects against race conditions during online/offline transitions
            const itemAge = Date.now() - new Date(existingItem.created_at).getTime();
            if (itemAge < 10000) {
              logDebug(`⏭️ [Dexie] Skipping deletion of recently created item: ${existingItem.id} (age: ${itemAge}ms)`);
              return;
            }
            
            logDebug(`🗑️ [Dexie] Marking item as deleted (exists locally but not on server): ${existingItem.id}`);
            
            // This item exists locally but not on server - it was deleted on server
            itemsToMarkDeleted.push({
              ...existingItem,
              is_deleted: true,
              deleted_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        });
        
        // Combine all items to upsert (server items + locally deleted items)
        const allItemsToUpsert = [...itemsToUpsert, ...itemsToMarkDeleted];
        
        // Use bulkPut for atomic upsert operation
        if (allItemsToUpsert.length > 0) {
          await db.shoppingItems.bulkPut(allItemsToUpsert);
          logDebug(`✅ [Dexie] Upserted ${itemsToUpsert.length} items, marked ${itemsToMarkDeleted.length} as deleted for list ${listId}`);
        }
        
        if (conflictsDetected > 0) {
          logDebug(`⚠️ [Dexie] Resolved ${conflictsDetected} timestamp conflicts (kept local versions)`);
        }
        
        if (queuedItemsSkipped > 0) {
          logDebug(`⏭️ [Dexie] Skipped ${queuedItemsSkipped} queued items to prevent data loss`);
        }
      });
      
      logDebug(`✅ [Dexie] Synced ${serverItems.length} shopping items for list ${listId}`);
    } catch (error) {
      logError('❌ [Dexie] Error syncing shopping items:', error);
      throw error;
    }
  }

  // Add a single shopping item
  async addShoppingItem(item: ShoppingItem): Promise<void> {
    try {
      await db.shoppingItems.add(item);
      logDebug(`✅ [Dexie] Added shopping item: ${item.name}`);
    } catch (error) {
      logError('❌ [Dexie] Error adding shopping item:', error);
      throw error;
    }
  }

  // Update a shopping item
  async updateShoppingItem(item: ShoppingItem): Promise<void> {
    try {
      await db.shoppingItems.put(item);
      logDebug(`✅ [Dexie] Updated shopping item: ${item.name}`);
    } catch (error) {
      logError('❌ [Dexie] Error updating shopping item:', error);
      throw error;
    }
  }

  // Update a shopping item from PATCH response
  async updateShoppingItemFromResponse(response: ShoppingItem | ShoppingItem[], queuedItemIds?: Set<string>): Promise<void> {
    try {
      const items = Array.isArray(response) ? response : [response];
      const updatedItems: ShoppingItem[] = [];
      let conflictsDetected = 0;
      let queuedItemsSkipped = 0;
      
      for (const serverItem of items) {
        // Check if item is queued - if so, don't overwrite with potentially stale server data
        if (queuedItemIds && queuedItemIds.has(serverItem.id)) {
          logDebug(`⏭️ [Dexie] Skipping update from response for queued item: ${serverItem.id} (${serverItem.name})`);
          queuedItemsSkipped++;
          continue;
        }
        
        // Get existing item to compare timestamps
        const existingItem = await db.shoppingItems.get(serverItem.id);
        
        if (existingItem) {
          // Compare timestamps
          const localTimestamp = existingItem.updated_at || existingItem.created_at;
          const serverTimestamp = serverItem.updated_at || serverItem.created_at;
          
          // Handle missing timestamps
          if (!localTimestamp || !serverTimestamp) {
            logWarn(`⚠️ [Dexie] Missing timestamp for item ${serverItem.id}, using server version`);
            updatedItems.push(serverItem);
            continue;
          }
          
          // Compare timestamps
          if (localTimestamp > serverTimestamp) {
            // Local version is newer - don't overwrite
            logDebug(`🔄 [Dexie] Response conflict for item ${serverItem.id} (${serverItem.name}): local newer (${localTimestamp} > ${serverTimestamp}), keeping local version`);
            conflictsDetected++;
            continue;
          }
        }
        
        // Server data is newer or item doesn't exist locally - use it
        updatedItems.push(serverItem);
      }
      
      // Update items in bulk
      if (updatedItems.length > 0) {
        await db.shoppingItems.bulkPut(updatedItems);
      }
      
      const itemsDesc = Array.isArray(response) ? `${updatedItems.length}/${response.length} items` : response.name;
      logDebug(`✅ [Dexie] Updated shopping item from response: ${itemsDesc}`);
      
      if (conflictsDetected > 0) {
        logDebug(`⚠️ [Dexie] Skipped ${conflictsDetected} stale server updates (local newer)`);
      }
      
      if (queuedItemsSkipped > 0) {
        logDebug(`⏭️ [Dexie] Skipped ${queuedItemsSkipped} queued items to prevent data loss`);
      }
    } catch (error) {
      logError('❌ [Dexie] Error updating shopping item from response:', error);
      throw error;
    }
  }

  // Update a shopping item optimistically (for offline PATCH requests)
  async updateShoppingItemOptimistically(itemId: string, updates: Partial<ShoppingItem>): Promise<ShoppingItem | null> {
    try {
      const existingItem = await db.shoppingItems.get(itemId);
      if (!existingItem) {
        logWarn(`⚠️ [Dexie] Item not found for optimistic update: ${itemId}`);
        return null;
      }

      const updatedItem: ShoppingItem = {
        ...existingItem,
        ...updates,
        updated_at: new Date().toISOString()
      };

      await db.shoppingItems.put(updatedItem);
      logDebug(`✅ [Dexie] Optimistically updated shopping item: ${updatedItem.name}`);
      return updatedItem;
    } catch (error) {
      logError('❌ [Dexie] Error optimistically updating shopping item:', error);
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
        logDebug(`✅ [Dexie] Soft deleted shopping item: ${item.name}`);
      }
    } catch (error) {
      logError('❌ [Dexie] Error deleting shopping item:', error);
      throw error;
    }
  }

  // Get shopping item by ID
  async getShoppingItemById(id: string): Promise<ShoppingItem | undefined> {
    try {
      const item = await db.shoppingItems.get(id);
      return item;
    } catch (error) {
      logError('❌ [Dexie] Error getting shopping item by ID:', error);
      throw error;
    }
  }

  // Hard delete a shopping item (for rollback purposes)
  async deleteShoppingItemLocal(id: string): Promise<void> {
    try {
      await db.shoppingItems.delete(id);
      logDebug(`🗑️ [Dexie] Hard deleted shopping item: ${id}`);
    } catch (error) {
      logError('❌ [Dexie] Error hard deleting shopping item:', error);
      throw error;
    }
  }

  // Get list by ID
  async getListById(id: string): Promise<List | undefined> {
    try {
      const list = await db.lists.get(id);
      return list;
    } catch (error) {
      logError('❌ [Dexie] Error getting list by ID:', error);
      throw error;
    }
  }

  // Clear all data (for testing/reset)
  async clearAllData(): Promise<void> {
    try {
      await db.shoppingItems.clear();
      logDebug('🗑️ [Dexie] Cleared all shopping items');
    } catch (error) {
      logError('❌ [Dexie] Error clearing data:', error);
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
      logError('❌ [Dexie] Error getting stats:', error);
      return { total: 0, active: 0, deleted: 0 };
    }
  }

  // Queue Management Methods
  async addQueuedRequest(request: QueuedRequest): Promise<void> {
    try {
      await db.queuedRequests.add(request);
      logDebug(`📝 [Dexie] Added queued request: ${request.method} ${request.url}`);
    } catch (error) {
      logError('❌ [Dexie] Error adding queued request:', error);
      throw error;
    }
  }

  async getAllQueuedRequests(): Promise<QueuedRequest[]> {
    try {
      const requests = await db.queuedRequests
        .orderBy('timestamp')
        .toArray();
      
      logDebug(`📊 [Dexie] Retrieved ${requests.length} queued requests`);
      return requests;
    } catch (error) {
      logError('❌ [Dexie] Error getting queued requests:', error);
      return [];
    }
  }

  async removeQueuedRequest(id: string): Promise<void> {
    try {
      await db.queuedRequests.delete(id);
      logDebug(`🗑️ [Dexie] Removed queued request: ${id}`);
    } catch (error) {
      logError('❌ [Dexie] Error removing queued request:', error);
      throw error;
    }
  }

  async updateQueuedRequest(id: string, updates: Partial<QueuedRequest>): Promise<void> {
    try {
      await db.queuedRequests.update(id, updates);
      logDebug(`✅ [Dexie] Updated queued request: ${id}`);
    } catch (error) {
      logError('❌ [Dexie] Error updating queued request:', error);
      throw error;
    }
  }

  async clearQueuedRequests(): Promise<void> {
    try {
      await db.queuedRequests.clear();
      logDebug('🗑️ [Dexie] Cleared all queued requests');
    } catch (error) {
      logError('❌ [Dexie] Error clearing queued requests:', error);
      throw error;
    }
  }

  async getQueuedRequestsCount(): Promise<number> {
    try {
      return await db.queuedRequests.count();
    } catch (error) {
      logError('❌ [Dexie] Error getting queued requests count:', error);
      return 0;
    }
  }

  async getQueuedRequests(): Promise<QueuedRequest[]> {
    try {
      return await db.queuedRequests.toArray();
    } catch (error) {
      logError('❌ [Dexie] Error getting queued requests:', error);
      return [];
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
      logError('❌ [Dexie] Error getting full stats:', error);
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
      
      logDebug(`📊 [Dexie] Retrieved ${activeLists.length} lists (from ${allLists.length} total)`);
      return activeLists;
    } catch (error) {
      logError('❌ [Dexie] Error getting lists:', error);
      return [];
    }
  }

  async syncLists(lists: List[]): Promise<void> {
    try {
      await db.transaction('rw', db.lists, async () => {
        // Delete all existing lists
        await db.lists.clear();
        logDebug(`🗑️ [Dexie] Cleared all existing lists`);
        
        // Add all new lists
        for (const list of lists) {
          await db.lists.add(list);
        }
      });
      
      logDebug(`✅ [Dexie] Synced ${lists.length} lists`);
    } catch (error) {
      logError('❌ [Dexie] Error syncing lists:', error);
      throw error;
    }
  }

  async addList(list: List): Promise<void> {
    try {
      await db.lists.add(list);
      logDebug(`✅ [Dexie] Added list: ${list.name}`);
    } catch (error) {
      logError('❌ [Dexie] Error adding list:', error);
      throw error;
    }
  }

  async updateList(list: List): Promise<void> {
    try {
      await db.lists.update(list.id, list);
      logDebug(`✅ [Dexie] Updated list: ${list.name}`);
    } catch (error) {
      logError('❌ [Dexie] Error updating list:', error);
      throw error;
    }
  }

  async updateListFromResponse(response: List): Promise<void> {
    try {
      // Update the existing list with server response data
      await db.lists.update(response.id, response);
      logDebug(`✅ [Dexie] Updated list from response: ${response.name}`);
    } catch (error) {
      logError('❌ [Dexie] Error updating list from response:', error);
      throw error;
    }
  }

  async deleteList(id: string): Promise<void> {
    try {
      await db.lists.update(id, { 
        is_deleted: 1, 
        deleted_at: new Date().toISOString() 
      });
      logDebug(`🗑️ [Dexie] Deleted list: ${id}`);
    } catch (error) {
      logError('❌ [Dexie] Error deleting list:', error);
      throw error;
    }
  }

  // Debug method to check all lists in database
  async debugAllLists(): Promise<void> {
    try {
      const allLists = await db.lists.toArray();
      logDebug(`🔍 [Dexie] All lists in database:`, allLists);
      
      const activeLists = await db.lists.where('is_deleted').equals(0).toArray();
      logDebug(`🔍 [Dexie] Active lists (is_deleted=0):`, activeLists);
      
      const deletedLists = await db.lists.where('is_deleted').equals(1).toArray();
      logDebug(`🔍 [Dexie] Deleted lists (is_deleted=1):`, deletedLists);
    } catch (error) {
      logError('❌ [Dexie] Error debugging lists:', error);
    }
  }

  // Category methods
  async getAllCategories(): Promise<Category[]> {
    try {
      const categories = await db.categories
        .orderBy('name')
        .toArray();
      
      logDebug(`📊 [Dexie] Retrieved ${categories.length} categories`);
      return categories;
    } catch (error) {
      logError('❌ [Dexie] Error getting categories:', error);
      return [];
    }
  }

  async syncCategories(categories: Category[]): Promise<void> {
    try {
      await db.transaction('rw', db.categories, async () => {
        // Delete all existing categories
        await db.categories.clear();
        logDebug(`🗑️ [Dexie] Cleared all existing categories`);
        
        // Add all new categories
        for (const category of categories) {
          await db.categories.add(category);
        }
      });
      
      logDebug(`✅ [Dexie] Synced ${categories.length} categories`);
    } catch (error) {
      logError('❌ [Dexie] Error syncing categories:', error);
      throw error;
    }
  }

  async addCategory(category: Category): Promise<void> {
    try {
      await db.categories.add(category);
      logDebug(`✅ [Dexie] Added category: ${category.name}`);
    } catch (error) {
      logError('❌ [Dexie] Error adding category:', error);
      throw error;
    }
  }

  async updateCategory(category: Category): Promise<void> {
    try {
      await db.categories.update(category.id, category);
      logDebug(`✅ [Dexie] Updated category: ${category.name}`);
    } catch (error) {
      logError('❌ [Dexie] Error updating category:', error);
      throw error;
    }
  }

  // Unit methods
  async getAllUnits(): Promise<Unit[]> {
    try {
      const units = await db.units
        .orderBy('name')
        .toArray();
      
      logDebug(`📊 [Dexie] Retrieved ${units.length} units`);
      return units;
    } catch (error) {
      logError('❌ [Dexie] Error getting units:', error);
      return [];
    }
  }

  async syncUnits(units: Unit[]): Promise<void> {
    try {
      await db.transaction('rw', db.units, async () => {
        // Delete all existing units
        await db.units.clear();
        logDebug(`🗑️ [Dexie] Cleared all existing units`);
        
        // Add all new units
        for (const unit of units) {
          await db.units.add(unit);
        }
      });
      
      logDebug(`✅ [Dexie] Synced ${units.length} units`);
    } catch (error) {
      logError('❌ [Dexie] Error syncing units:', error);
      throw error;
    }
  }

  async addUnit(unit: Unit): Promise<void> {
    try {
      await db.units.add(unit);
      logDebug(`✅ [Dexie] Added unit: ${unit.name}`);
    } catch (error) {
      logError('❌ [Dexie] Error adding unit:', error);
      throw error;
    }
  }

  async updateUnit(unit: Unit): Promise<void> {
    try {
      await db.units.update(unit.id, unit);
      logDebug(`✅ [Dexie] Updated unit: ${unit.name}`);
    } catch (error) {
      logError('❌ [Dexie] Error updating unit:', error);
      throw error;
    }
  }

  // Dead Letter Queue methods
  async addToDeadLetterQueue(queueItem: QueuedRequest, error: string): Promise<void> {
    try {
      const dlqItem: DeadLetterQueueItem = {
        id: Date.now() + Math.random().toString(),
        endpoint: queueItem.url,
        method: queueItem.method,
        body: queueItem.body ? JSON.parse(queueItem.body) : undefined,
        headers: queueItem.headers,
        timestamp: new Date().toISOString(),
        error: error,
        retryCount: queueItem.retryCount,
        originalQueueId: queueItem.id
      };
      
      await db.deadLetterQueue.add(dlqItem);
      logDebug(`💀 [Dexie] Added item to dead letter queue: ${queueItem.method} ${queueItem.url}`);
    } catch (error) {
      logError('❌ [Dexie] Error adding to dead letter queue:', error);
      throw error;
    }
  }

  async getDeadLetterQueue(): Promise<DeadLetterQueueItem[]> {
    try {
      const items = await db.deadLetterQueue
        .orderBy('timestamp')
        .reverse()
        .toArray();
      
      logDebug(`📊 [Dexie] Retrieved ${items.length} dead letter queue items`);
      return items;
    } catch (error) {
      logError('❌ [Dexie] Error getting dead letter queue:', error);
      return [];
    }
  }

  async retryFromDeadLetterQueue(id: string): Promise<void> {
    try {
      const dlqItem = await db.deadLetterQueue.get(id);
      if (!dlqItem) {
        logWarn(`⚠️ [Dexie] Dead letter queue item not found: ${id}`);
        return;
      }

      // Re-add to regular queue with reset retry count
      const queuedRequest: QueuedRequest = {
        id: Date.now() + Math.random().toString(),
        url: dlqItem.endpoint,
        method: dlqItem.method,
        headers: dlqItem.headers || {},
        body: dlqItem.body ? JSON.stringify(dlqItem.body) : null,
        timestamp: Date.now(),
        retryCount: 0,
        lastAttempt: 0
      };

      await this.addQueuedRequest(queuedRequest);
      await db.deadLetterQueue.delete(id);
      
      logDebug(`♻️ [Dexie] Moved item from dead letter queue back to regular queue: ${dlqItem.method} ${dlqItem.endpoint}`);
    } catch (error) {
      logError('❌ [Dexie] Error retrying from dead letter queue:', error);
      throw error;
    }
  }

  async removeFromDeadLetterQueue(id: string): Promise<void> {
    try {
      await db.deadLetterQueue.delete(id);
      logDebug(`🗑️ [Dexie] Removed item from dead letter queue: ${id}`);
    } catch (error) {
      logError('❌ [Dexie] Error removing from dead letter queue:', error);
      throw error;
    }
  }

  async getDeadLetterQueueCount(): Promise<number> {
    try {
      return await db.deadLetterQueue.count();
    } catch (error) {
      logError('❌ [Dexie] Error getting dead letter queue count:', error);
      return 0;
    }
  }
}

export const dexieService = new DexieService(); 