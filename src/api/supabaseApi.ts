import { supabase } from '../config/supabase';
import { logDebug, logError, logInfo, environment } from '../config/environment';
import { globalQueueService } from '../services/globalQueueService';
import { dexieService } from '../services/dexieService';
import type { AuthError } from '@supabase/supabase-js';
import { realtimeService } from '../services/realtimeService';
import { sentryErrorService } from '../services/sentryErrorService';

// Initialize PWA service when Supabase API is imported
if (typeof window !== 'undefined') {
  import('../services/pwaService').then(({ pwaService }) => {
    pwaService.ensureFetchInterceptor();
  });
}

// Auth Types
export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  emailVerified?: boolean;
  created_at?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user?: AuthUser;
  error?: AuthError;
}

// Supabase API Types - Compatible with Supabase
export interface Unit {
  id: string;
  name: string; // Langer Name, z.B. "Packungen"
  short_name: string; // Kurze Abkürzung, z.B. "Pkg"
  sort_order: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
}

export interface ProductOrGroup {
  id: string;
  title: string;
  rank: number;
  src: 'fts' | 'fuzzy' | 'exact';
  icon: string;
  category_id: string;
  type?: 'product' | 'group';
}

export interface ShoppingItem {
  id: string;
  name: string;
  category_id: string | null;
  icon?: string; // Font Awesome icon name (e.g., "fa-apple", "fa-bread-slice")
  unit_id?: string | null;
  quantity?: number;
  is_completed: boolean;
  is_deleted?: boolean;
  created_at: string;
  updatedAt: string;
  listId: string;
  createdBy: string;
  notes?: string;
  store?: string;
  assignedTo?: string;
}

export interface CreateShoppingItemRequest {
  id: string; // Required GUID - must be provided
  name: string;
  category_id: string | null;
  icon?: string;
  unit_id?: string | null;
  quantity?: number;
  listId: string;
  createdBy: string;
  notes?: string;
  store?: string;
  assignedTo?: string;
}

export interface UpdateShoppingItemRequest {
  name?: string;
  category_id?: string | null;
  icon?: string;
  unit_id?: string | null;
  quantity?: number;
  is_completed?: boolean;
  is_deleted?: boolean;
  notes?: string;
  store?: string;
  assignedTo?: string;
}

// Lists API Types
export interface List {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  is_deleted: boolean;
}

export interface CreateListRequest {
  id: string; // Required GUID - must be provided
  name: string;
  description?: string;
  created_by: string;
}

export interface UpdateListRequest {
  name?: string;
  description?: string;
}

export interface ListMember {
  id: string;
  list_id: string;
  user_id: string;
  role: 'owner' | 'member';
  accepted_at: string;
}

// Invitation API Types
export interface ListInvitation {
  id: string;
  list_id: string;
  invitation_code: string;
  created_by: string;
  created_at: string;
  expires_at: string;
  used_by?: string;
  used_at?: string;
  is_deleted: boolean;
  deleted_at?: string;
  deleted_by?: string;
  is_invalidated: boolean;
  invalidated_at?: string;
  invalidated_by?: string;
}

export interface CreateInvitationResponse {
  invitation_code: string;
  expires_at: string;
  created_at: string;
}

export interface RedeemInvitationResponse {
  success: boolean;
  message: string;
  list_id?: string;
  list_name?: string;
}

export interface InvitationActionResponse {
  success: boolean;
  message: string;
}

export interface ListInvitationWithStatus {
  id: string;
  invitation_code: string;
  created_at: string;
  expires_at: string;
  used_by?: string;
  used_at?: string;
  is_invalidated: boolean;
  invalidated_at?: string;
  is_deleted: boolean;
  status: 'active' | 'used' | 'expired' | 'invalidated' | 'deleted';
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

// No more mock data - using real Supabase database

// Supabase API Controller
export class ShoppingItemsController {
  // Get all items for a list
  async getItems(listId: string): Promise<ApiResponse<ShoppingItem[]>> {
    try {
      logDebug('Fetching items from Supabase', { listId });

      // 1) If online and queue has items, process queue first (wait until not processing)
      if (navigator.onLine) {
        const queueStatus = await globalQueueService.getQueueStatus();
        if (queueStatus.queueLength > 0) {
          logInfo('Queue has items; processing before GET shopping_items', queueStatus);
          await globalQueueService.processQueuedRequests();
          // Wait briefly if still processing
          let waits = 0;
          while (await (async () => (await globalQueueService.getQueueStatus()).isProcessing)()) {
            if (waits++ > 30) break; // max ~3s
            await new Promise(r => setTimeout(r, 100));
          }
        }
      }

      // 2) Timeboxed Supabase GET
      const timeoutMs = environment.supabaseRequestTimeoutMs ?? 1500;
      const totalLimit = environment.shoppingListMaxActiveItems + environment.shoppingListMaxCompletedItems;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort('timeout'), timeoutMs);
      let data: ShoppingItem[] | null = null;
      let error: any = null;
      try {
        const builder = supabase
          .from('shopping_items')
          .select('*')
          .eq('list_id', listId)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(totalLimit);
        const result = (builder as any).abortSignal
          ? await (builder as any).abortSignal(controller.signal)
          : await builder;
        data = result.data as any;
        error = result.error as any;
      } catch (err: any) {
        if (err?.name === 'AbortError' || err === 'timeout') {
          error = new Error('Request timeout');
        } else {
          error = err;
        }
      } finally {
        clearTimeout(timeoutId);
      }

      if (error) {
        logError('Failed to fetch items from Supabase', error);
        
        // Report to Sentry
        sentryErrorService.reportSupabaseError(error, {
          operation: 'getItems',
          table: 'shopping_items',
          listId: listId,
        });
        // Do NOT queue GET requests

        return {
          data: null,
          error: error.message || String(error),
          status: 500
        };
      }

      // Sync to Dexie
      try {
        await dexieService.syncShoppingItems((data || []) as any);
      } catch (syncErr) {
        logError('Failed to sync fetched items to Dexie', syncErr);
      }
      logInfo('Successfully fetched items from Supabase (single query with limit)', { count: data?.length || 0, limit: totalLimit });
      return {
        data: data || [],
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error fetching items', error);
      
      // Report to Sentry
      sentryErrorService.reportSupabaseError(error, {
        operation: 'getItems',
        table: 'shopping_items',
        listId: listId,
      });
      
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Create new item
  async createItem(itemData: CreateShoppingItemRequest): Promise<ApiResponse<ShoppingItem>> {
    try {
      logDebug('Creating new item in Supabase', { name: itemData.name, id: itemData.id });
      
      const insertData: any = {
        id: itemData.id, // GUID is always required
        name: itemData.name,
        category_id: itemData.category_id,
        icon: itemData.icon,
        unit_id: itemData.unit_id,
        quantity: itemData.quantity,
        list_id: itemData.listId,
        created_by: itemData.createdBy,
        notes: itemData.notes,
        store: itemData.store,
        assigned_to: itemData.assignedTo,
        is_completed: false,
        is_deleted: false,
      };
      
      // Optimistic Dexie write
      try {
        await dexieService.addShoppingItem({
          id: itemData.id,
          list_id: itemData.listId,
          name: itemData.name,
          quantity: itemData.quantity ?? null,
          unit_id: itemData.unit_id ?? null,
          category_id: itemData.category_id ?? null,
          icon: itemData.icon ?? null,
          notes: itemData.notes ?? null,
          store: itemData.store ?? null,
          assigned_to: itemData.assignedTo ?? null,
          is_completed: false,
          completed_at: null,
          completed_by: null,
          created_by: itemData.createdBy,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_deleted: false,
          deleted_at: null,
          deleted_by: null,
        } as any);
      } catch (dexieErr) {
        logError('Failed optimistic insert into Dexie', dexieErr);
      }

      // Timeboxed Supabase insert
      const timeoutMs = environment.supabaseRequestTimeoutMs ?? 1500;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort('timeout'), timeoutMs);

      let data: any = null;
      let error: any = null;
      try {
        const result = await supabase
          .from('shopping_items')
          .insert([insertData])
          .select()
          .single();
        data = result.data;
        error = result.error;
      } catch (err: any) {
        if (err?.name === 'AbortError' || err === 'timeout') {
          error = new Error('Request timeout');
        } else {
          error = err;
        }
      } finally {
        clearTimeout(timeoutId);
      }
      
      if (error) {
        logError('Failed to create item in Supabase', error);
        
        // Report to Sentry
        sentryErrorService.reportSupabaseError(error, {
          operation: 'createItem',
          table: 'shopping_items',
          listId: itemData.listId,
        });
        
        // Queue POST on any error (including offline/timeout)
        try {
          const { data: { session } } = await (window as any).supabase.auth.getSession();
          const headers: Record<string, string> = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'apikey': (window as any).supabase.supabaseKey || ''
          };
          if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
          const url = `${environment.supabaseUrl}/rest/v1/shopping_items`;
          const req = new Request(url, { method: 'POST', headers: new Headers(headers), body: JSON.stringify([insertData]) });
          await globalQueueService.addRequestToQueue(req);
          logInfo('Queued POST shopping_items due to error/timeout/offline');
        } catch (queueErr) {
          logError('Failed to queue POST shopping_items', queueErr);
        }

        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      // Map database response to our interface
      const shoppingItem: ShoppingItem = {
        id: data.id,
        name: data.name,
        category_id: data.category_id,
        icon: data.icon,
        unit_id: data.unit_id,
        quantity: data.quantity,
        is_completed: data.is_completed,
        is_deleted: data.is_deleted,
        created_at: data.created_at,
        updatedAt: data.updated_at,
        listId: data.list_id,
        createdBy: data.created_by,
        notes: data.notes,
        store: data.store,
        assignedTo: data.assigned_to,
      };
      
      logInfo('Successfully created item in Supabase', { itemId: data.id });
      
      // Broadcast update to all subscribers
      await realtimeService.broadcastUpdate(itemData.listId, {
        type: 'item_created',
        listId: itemData.listId,
        itemId: data.id
      });
      
      return {
        data: shoppingItem,
        error: null,
        status: 201
      };
    } catch (error) {
      logError('Unexpected error creating item', error);
      
      // Report to Sentry
      sentryErrorService.reportSupabaseError(error, {
        operation: 'createItem',
        table: 'shopping_items',
        listId: itemData.listId,
      });
      
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Update item
  async updateItem(id: string, updates: UpdateShoppingItemRequest): Promise<ApiResponse<ShoppingItem>> {
    try {
      logDebug('Updating item in Supabase', { itemId: id });
      
      const updateData: any = { ...updates };
      updateData.updated_at = new Date().toISOString();

      // Optimistic Dexie update
      try {
        await dexieService.updateShoppingItemOptimistically(id, updateData);
      } catch (dexieErr) {
        logError('Failed optimistic update in Dexie', dexieErr);
      }

      // Timebox the Supabase update using Promise.race
      const timeoutMs = environment.supabaseRequestTimeoutMs ?? 1500;
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timeout')), timeoutMs));

      let data: any = null;
      let error: any = null;
      try {
        const result = await Promise.race([
          supabase
            .from('shopping_items')
            .update(updateData)
            .eq('id', id)
            .select()
            .single(),
          timeoutPromise,
        ]);
        data = (result as any).data;
        error = (result as any).error;
      } catch (err: any) {
        error = err;
      }
      
      if (error) {
        logError('Failed to update item in Supabase', error);
        // Report to Sentry
        sentryErrorService.reportSupabaseError(error, {
          operation: 'updateItem',
          table: 'shopping_items',
          itemId: id,
        });
        // Queue PATCH on any error
        try {
          const { data: { session } } = await (window as any).supabase.auth.getSession();
          const headers: Record<string, string> = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'apikey': (window as any).supabase.supabaseKey || ''
          };
          if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
          const url = `${environment.supabaseUrl}/rest/v1/shopping_items?id=eq.${id}`;
          const req = new Request(url, { method: 'PATCH', headers: new Headers(headers), body: JSON.stringify(updateData) });
          await globalQueueService.addRequestToQueue(req);
          logInfo('Queued PATCH shopping_items due to error/timeout/offline');
        } catch (queueErr) {
          logError('Failed to queue PATCH shopping_items', queueErr);
        }

        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      // Map database response to our interface
      const shoppingItem: ShoppingItem = {
        id: data.id,
        name: data.name,
        category_id: data.category_id,
        icon: data.icon,
        unit_id: data.unit_id,
        quantity: data.quantity,
        is_completed: data.is_completed,
        is_deleted: data.is_deleted,
        created_at: data.created_at,
        updatedAt: data.updated_at,
        listId: data.list_id,
        createdBy: data.created_by,
        notes: data.notes,
        store: data.store,
        assignedTo: data.assigned_to,
      };
      
      logInfo('Successfully updated item in Supabase', { itemId: id });
      // Sync Dexie with server response
      try {
        await dexieService.updateShoppingItemFromResponse(data);
      } catch (syncErr) {
        logError('Failed to sync updated item to Dexie', syncErr);
      }
      
      // Broadcast update to all subscribers
      await realtimeService.broadcastUpdate(data.list_id, {
        type: 'item_updated',
        listId: data.list_id,
        itemId: id
      });
      
      return {
        data: shoppingItem,
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error updating item', error);
      // Report to Sentry
      sentryErrorService.reportSupabaseError(error, {
        operation: 'updateItem',
        table: 'shopping_items',
        itemId: id,
      });
      
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Delete item (soft delete)
  async deleteItem(id: string, listId: string): Promise<ApiResponse<null>> {
    try {
      logDebug('Deleting item in Supabase', { itemId: id });
      const deleteData = { is_deleted: true, updated_at: new Date().toISOString() };

      // Optimistic Dexie delete
      try {
        await dexieService.deleteShoppingItem(id, 'client');
      } catch (dexieErr) {
        logError('Failed optimistic delete in Dexie', dexieErr);
      }

      // Timeboxed Supabase update
      const timeoutMs = environment.supabaseRequestTimeoutMs ?? 1500;
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timeout')), timeoutMs));
      let error: any = null;
      try {
        await Promise.race([
          supabase
            .from('shopping_items')
            .update(deleteData)
            .eq('id', id),
          timeoutPromise,
        ]);
      } catch (err: any) {
        error = err;
      }
      
      if (error) {
        logError('Failed to delete item in Supabase', error);
        // Report to Sentry
        sentryErrorService.reportSupabaseError(error, {
          operation: 'deleteItem',
          table: 'shopping_items',
          itemId: id,
          listId: listId,
        });
        // Queue PATCH on any error
        try {
          const { data: { session } } = await (window as any).supabase.auth.getSession();
          const headers: Record<string, string> = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'apikey': (window as any).supabase.supabaseKey || ''
          };
          if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
          const url = `${environment.supabaseUrl}/rest/v1/shopping_items?id=eq.${id}`;
          const req = new Request(url, { method: 'PATCH', headers: new Headers(headers), body: JSON.stringify(deleteData) });
          await globalQueueService.addRequestToQueue(req);
          logInfo('Queued DELETE(PATCH) shopping_items due to error/timeout/offline');
        } catch (queueErr) {
          logError('Failed to queue DELETE(PATCH) shopping_items', queueErr);
        }
        
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      logInfo('Successfully deleted item in Supabase', { itemId: id });
      
      // Broadcast update to all subscribers
      await realtimeService.broadcastUpdate(listId, {
        type: 'item_deleted',
        listId: listId,
        itemId: id
      });
      
      return {
        data: null,
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error deleting item', error);
      // Report to Sentry
      sentryErrorService.reportSupabaseError(error, {
        operation: 'deleteItem',
        table: 'shopping_items',
        itemId: id,
        listId: listId,
      });
      
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Set item completion status
  async setItemCompletion(id: string, isCompleted: boolean): Promise<ApiResponse<ShoppingItem>> {
    try {
      logDebug('Setting item completion status in Supabase', { itemId: id, isCompleted });
      const updateData: any = {
        is_completed: isCompleted,
        updated_at: new Date().toISOString(),
      };

      // Optimistic Dexie update
      try {
        await dexieService.updateShoppingItemOptimistically(id, updateData);
      } catch (dexieErr) {
        logError('Failed optimistic completion update in Dexie', dexieErr);
      }

      // Timeboxed Supabase update
      const timeoutMs = environment.supabaseRequestTimeoutMs ?? 1500;
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timeout')), timeoutMs));
      let data: any = null; let error: any = null;
      try {
        const result = await Promise.race([
          supabase
            .from('shopping_items')
            .update(updateData)
            .eq('id', id)
            .select()
            .single(),
          timeoutPromise,
        ]);
        data = (result as any).data;
        error = (result as any).error;
      } catch (err: any) {
        error = err;
      }
      
      if (error) {
        logError('Failed to set item completion status in Supabase', error);
        
        // Report to Sentry
        sentryErrorService.reportSupabaseError(error, {
          operation: 'setItemCompletion',
          table: 'shopping_items',
          itemId: id,
        });
        // Queue PATCH on any error
        try {
          const { data: { session } } = await (window as any).supabase.auth.getSession();
          const headers: Record<string, string> = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'apikey': (window as any).supabase.supabaseKey || ''
          };
          if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
          const url = `${environment.supabaseUrl}/rest/v1/shopping_items?id=eq.${id}`;
          const req = new Request(url, { method: 'PATCH', headers: new Headers(headers), body: JSON.stringify(updateData) });
          await globalQueueService.addRequestToQueue(req);
          logInfo('Queued PATCH shopping_items (setItemCompletion) due to error/timeout/offline');
        } catch (queueErr) {
          logError('Failed to queue PATCH shopping_items (setItemCompletion)', queueErr);
        }

        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      // Map database response to our interface
      const shoppingItem: ShoppingItem = {
        id: data.id,
        name: data.name,
        category_id: data.category_id,
        icon: data.icon,
        unit_id: data.unit_id,
        quantity: data.quantity,
        is_completed: data.is_completed,
        is_deleted: data.is_deleted,
        created_at: data.created_at,
        updatedAt: data.updated_at,
        listId: data.list_id,
        createdBy: data.created_by,
        notes: data.notes,
        store: data.store,
        assignedTo: data.assigned_to,
      };
      
      logInfo('Successfully set item completion status in Supabase', { itemId: id, isCompleted });
      // Sync Dexie with server response
      try { await dexieService.updateShoppingItemFromResponse(data); } catch {}
      
      // Broadcast update to all subscribers
      await realtimeService.broadcastUpdate(data.list_id, {
        type: 'item_updated',
        listId: data.list_id,
        itemId: id
      });
      
      return {
        data: shoppingItem,
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error setting item completion status', error);
      
      // Report to Sentry
      sentryErrorService.reportSupabaseError(error, {
        operation: 'setItemCompletion',
        table: 'shopping_items',
        itemId: id,
      });
      
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }
}

// Lists API Controller
export class ListsController {
  // Get all lists for current user
  async getLists(): Promise<ApiResponse<List[]>> {
    try {
      logDebug('Fetching lists from Supabase');

      // If online and queue has items, process queue first
      if (navigator.onLine) {
        const queueStatus = await globalQueueService.getQueueStatus();
        if (queueStatus.queueLength > 0) {
          await globalQueueService.processQueuedRequests();
          let waits = 0;
          while (await (async () => (await globalQueueService.getQueueStatus()).isProcessing)()) {
            if (waits++ > 30) break;
            await new Promise(r => setTimeout(r, 100));
          }
        }
      }

      const timeoutMs = environment.supabaseRequestTimeoutMs ?? 1500;
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timeout')), timeoutMs));
      let data: any = null;
      let error: any = null;
      try {
        const result = await Promise.race([
          supabase
            .from('lists')
            .select(`*`)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false }),
          timeoutPromise,
        ]);
        data = (result as any).data;
        error = (result as any).error;
      } catch (err: any) {
        error = err;
      }
      
      if (error) {
        logError('Failed to fetch lists from Supabase', error);
        // Report to Sentry
        sentryErrorService.reportSupabaseError(error, {
          operation: 'getLists',
          table: 'lists',
        });
        // Do NOT queue GET
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      // Sync to Dexie
      try {
        await dexieService.syncLists((data || []) as any);
      } catch {}

      logInfo('Successfully fetched lists from Supabase', { count: data?.length || 0 });
      return {
        data: data || [],
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error fetching lists', error);
      // Report to Sentry
      sentryErrorService.reportSupabaseError(error, {
        operation: 'getLists',
        table: 'lists',
      });
      
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Get single list by ID
  async getList(id: string): Promise<ApiResponse<List>> {
    try {
      logDebug('Fetching list by ID from Supabase', { listId: id });
      
      const { data, error } = await supabase
        .from('lists')
        .select('*')
        .eq('id', id)
        .eq('is_deleted', false)
        .single();
      
      if (error) {
        logError('Failed to fetch list from Supabase', error);
        
        // Report to Sentry
        sentryErrorService.reportSupabaseError(error, {
          operation: 'getList',
          table: 'lists',
          listId: id,
        });
        
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      logInfo('Successfully fetched list from Supabase', { listId: id });
      return {
        data,
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error fetching list', error);
      
      // Report to Sentry
      sentryErrorService.reportSupabaseError(error, {
        operation: 'getList',
        table: 'lists',
        listId: id,
      });
      
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Create new list
  async createList(listData: CreateListRequest): Promise<ApiResponse<List>> {
    try {
      logDebug('Creating new list in Supabase', { name: listData.name });

      // Optimistic Dexie add
      try {
        await dexieService.addList({
          id: listData.id,
          name: listData.name,
          description: listData.description || null,
          created_by: listData.created_by,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_deleted: 0,
          deleted_at: null,
          deleted_by: null,
        } as any);
      } catch {}

      const timeoutMs = environment.supabaseRequestTimeoutMs ?? 1500;
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timeout')), timeoutMs));
      let list: any = null;
      let listError: any = null;
      try {
        const result = await Promise.race([
          supabase
            .from('lists')
            .insert({ id: listData.id, name: listData.name, description: listData.description, created_by: listData.created_by }),
          timeoutPromise,
        ]);
        listError = (result as any).error;
      } catch (err: any) { listError = err; }
      
      if (listError) {
        logError('Failed to create list in Supabase', listError);
        // queue POST
        try {
          const { data: { session } } = await (window as any).supabase.auth.getSession();
          const headers: Record<string, string> = { 'Accept': 'application/json', 'Content-Type': 'application/json', 'apikey': (window as any).supabase.supabaseKey || '' };
          if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
          const url = `${environment.supabaseUrl}/rest/v1/lists`;
          const req = new Request(url, { method: 'POST', headers: new Headers(headers), body: JSON.stringify({ id: listData.id, name: listData.name, description: listData.description, created_by: listData.created_by }) });
          await globalQueueService.addRequestToQueue(req);
        } catch {}
        return {
          data: null,
          error: listError.message,
          status: 500
        };
      }

      // We optimistically added to Dexie already; return a minimal object
      logInfo('Successfully created list in Supabase', { listId: listData.id });
      return {
        data: { id: listData.id, name: listData.name, description: listData.description, created_by: listData.created_by, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), is_deleted: false } as any,
        error: null,
        status: 201
      };
    } catch (error) {
      logError('Unexpected error creating list', error);
      
      // Report to Sentry
      sentryErrorService.reportSupabaseError(error, {
        operation: 'createList',
        table: 'lists',
      });
      
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Update list
  async updateList(id: string, updates: UpdateListRequest): Promise<ApiResponse<List>> {
    try {
      logDebug('Updating list in Supabase', { listId: id });
      
      const updateData: any = { ...updates };
      updateData.updated_at = new Date().toISOString();

      // Optimistic Dexie update
      try {
        await dexieService.updateList({ id, ...updateData } as any);
      } catch {}

      const timeoutMs = environment.supabaseRequestTimeoutMs ?? 1500;
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timeout')), timeoutMs));
      let data: any = null; let error: any = null;
      try {
        const result = await Promise.race([
          supabase
            .from('lists')
            .update(updateData)
            .eq('id', id)
            .select()
            .single(),
          timeoutPromise,
        ]);
        data = (result as any).data;
        error = (result as any).error;
      } catch (err: any) { error = err; }
      
      if (error) {
        logError('Failed to update list in Supabase', error);
        
        // Report to Sentry
        sentryErrorService.reportSupabaseError(error, {
          operation: 'updateList',
          table: 'lists',
          listId: id,
        });
        // Queue PATCH
        try {
          const { data: { session } } = await (window as any).supabase.auth.getSession();
          const headers: Record<string, string> = { 'Accept': 'application/json', 'Content-Type': 'application/json', 'apikey': (window as any).supabase.supabaseKey || '' };
          if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
          const url = `${environment.supabaseUrl}/rest/v1/lists?id=eq.${id}`;
          const req = new Request(url, { method: 'PATCH', headers: new Headers(headers), body: JSON.stringify(updateData) });
          await globalQueueService.addRequestToQueue(req);
        } catch {}
        
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      logInfo('Successfully updated list in Supabase', { listId: id });
      // Sync Dexie
      try { await dexieService.updateList(data as any); } catch {}
      return {
        data,
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error updating list', error);
      
      // Report to Sentry
      sentryErrorService.reportSupabaseError(error, {
        operation: 'updateList',
        table: 'lists',
        listId: id,
      });
      
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Delete list (soft delete)
  async deleteList(id: string): Promise<ApiResponse<null>> {
    try {
      logDebug('Deleting list in Supabase', { listId: id });

      const deleteData = { is_deleted: true, updated_at: new Date().toISOString() };

      // Optimistic Dexie delete
      try {
        await dexieService.deleteList(id);
      } catch (dexieErr) {
        logError('Failed optimistic list delete in Dexie', dexieErr);
      }

      // Timeboxed Supabase update
      const timeoutMs = environment.supabaseRequestTimeoutMs ?? 1500;
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timeout')), timeoutMs));
      let error: any = null;
      try {
        await Promise.race([
          supabase
            .from('lists')
            .update(deleteData)
            .eq('id', id),
          timeoutPromise,
        ]);
      } catch (err: any) {
        error = err;
      }
      
      if (error) {
        logError('Failed to delete list in Supabase', error);
        
        // Report to Sentry
        sentryErrorService.reportSupabaseError(error, {
          operation: 'deleteList',
          table: 'lists',
          listId: id,
        });
        // Queue PATCH on any error/offline/timeout
        try {
          const { data: { session } } = await (window as any).supabase.auth.getSession();
          const headers: Record<string, string> = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'apikey': (window as any).supabase.supabaseKey || ''
          };
          if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
          const url = `${environment.supabaseUrl}/rest/v1/lists?id=eq.${id}`;
          const req = new Request(url, { method: 'PATCH', headers: new Headers(headers), body: JSON.stringify(deleteData) });
          await globalQueueService.addRequestToQueue(req);
          logInfo('Queued DELETE(PATCH) lists due to error/timeout/offline');
        } catch (queueErr) {
          logError('Failed to queue DELETE(PATCH) lists', queueErr);
        }
        
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      logInfo('Successfully deleted list in Supabase', { listId: id });
      return {
        data: null,
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error deleting list', error);
      
      // Report to Sentry
      sentryErrorService.reportSupabaseError(error, {
        operation: 'deleteList',
        table: 'lists',
        listId: id,
      });
      
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Get list members
  async getListMembers(listId: string): Promise<ApiResponse<ListMember[]>> {
    try {
      logDebug('Fetching list members from Supabase', { listId });
      
      const { data, error } = await supabase
        .from('list_members')
        .select('*')
        .eq('list_id', listId)
        .order('accepted_at', { ascending: true });
      
      if (error) {
        logError('Failed to fetch list members from Supabase', error);
        
        // Report to Sentry
        sentryErrorService.reportSupabaseError(error, {
          operation: 'getListMembers',
          table: 'list_members',
          listId: listId,
        });
        
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      logInfo('Successfully fetched list members from Supabase', { count: data?.length || 0 });
      return {
        data: data || [],
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error fetching list members', error);
      
      // Report to Sentry
      sentryErrorService.reportSupabaseError(error, {
        operation: 'getListMembers',
        table: 'list_members',
        listId: listId,
      });
      
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Add member to list
  async addListMember(listId: string, userId: string, role: 'owner' | 'member' = 'member'): Promise<ApiResponse<ListMember>> {
    try {
      logDebug('Adding member to list in Supabase', { listId, userId, role });
      
      const { data, error } = await supabase
        .from('list_members')
        .insert([{
          list_id: listId,
          user_id: userId,
          role: role,
        }])
        .select()
        .single();
      
      if (error) {
        logError('Failed to add member to list in Supabase', error);
        
        // Report to Sentry
        sentryErrorService.reportSupabaseError(error, {
          operation: 'addListMember',
          table: 'list_members',
          listId: listId,
          userId: userId,
        });
        
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      logInfo('Successfully added member to list in Supabase', { listId, userId });
      return {
        data,
        error: null,
        status: 201
      };
    } catch (error) {
      logError('Unexpected error adding member to list', error);
      
      // Report to Sentry
      sentryErrorService.reportSupabaseError(error, {
        operation: 'addListMember',
        table: 'list_members',
        listId: listId,
        userId: userId,
      });
      
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Remove member from list
  async removeListMember(listId: string, userId: string): Promise<ApiResponse<null>> {
    try {
      logDebug('Removing member from list in Supabase', { listId, userId });
      
      const { error } = await supabase
        .from('list_members')
        .delete()
        .eq('list_id', listId)
        .eq('user_id', userId);
      
      if (error) {
        logError('Failed to remove member from list in Supabase', error);
        
        // Report to Sentry
        sentryErrorService.reportSupabaseError(error, {
          operation: 'removeListMember',
          table: 'list_members',
          listId: listId,
          userId: userId,
        });
        
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      logInfo('Successfully removed member from list in Supabase', { listId, userId });
      return {
        data: null,
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error removing member from list', error);
      
      // Report to Sentry
      sentryErrorService.reportSupabaseError(error, {
        operation: 'removeListMember',
        table: 'list_members',
        listId: listId,
        userId: userId,
      });
      
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }
}

// Invitation Controller
export class InvitationController {
  // Create a new invitation for a list
  async createInvitation(listId: string): Promise<ApiResponse<CreateInvitationResponse>> {
    try {
      logDebug('Creating invitation from Supabase', { listId });
      
      const { data, error } = await supabase
        .rpc('create_list_invitation', { list_uuid: listId });
      
      if (error) {
        logError('Failed to create invitation from Supabase', error);
        
        // Report to Sentry
        sentryErrorService.reportSupabaseError(error, {
          operation: 'createInvitation',
          table: 'list_invitations',
          listId: listId,
        });
        
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      logInfo('Successfully created invitation from Supabase', { invitation_code: data?.[0]?.invitation_code });
      return {
        data: data?.[0] || null,
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error creating invitation', error);
      
      // Report to Sentry
      sentryErrorService.reportSupabaseError(error, {
        operation: 'createInvitation',
        table: 'list_invitations',
        listId: listId,
      });
      
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Redeem an invitation code
  async redeemInvitationCode(code: string): Promise<ApiResponse<RedeemInvitationResponse>> {
    try {
      logDebug('Redeeming invitation code from Supabase', { code });
      
      const { data, error } = await supabase
        .rpc('redeem_invitation_code', { code });
      
      if (error) {
        logError('Failed to redeem invitation code from Supabase', error);
        
        // Report to Sentry
        sentryErrorService.reportSupabaseError(error, {
          operation: 'redeemInvitationCode',
          table: 'list_invitations',
        });
        
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      logInfo('Successfully redeemed invitation code from Supabase', { success: data?.[0]?.success });
      return {
        data: data?.[0] || null,
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error redeeming invitation code', error);
      
      // Report to Sentry
      sentryErrorService.reportSupabaseError(error, {
        operation: 'redeemInvitationCode',
        table: 'list_invitations',
      });
      
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Get all invitations for a list
  async getListInvitations(listId: string): Promise<ApiResponse<ListInvitationWithStatus[]>> {
    try {
      logDebug('Fetching list invitations from Supabase', { listId });
      
      const { data, error } = await supabase
        .rpc('get_list_invitations', { list_uuid: listId });
      
      if (error) {
        logError('Failed to fetch list invitations from Supabase', error);
        
        // Report to Sentry
        sentryErrorService.reportSupabaseError(error, {
          operation: 'getListInvitations',
          table: 'list_invitations',
          listId: listId,
        });
        
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      logInfo('Successfully fetched list invitations from Supabase', { count: data?.length || 0 });
      return {
        data: data || [],
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error fetching list invitations', error);
      
      // Report to Sentry
      sentryErrorService.reportSupabaseError(error, {
        operation: 'getListInvitations',
        table: 'list_invitations',
        listId: listId,
      });
      
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Invalidate an invitation
  async invalidateInvitation(invitationId: string): Promise<ApiResponse<InvitationActionResponse>> {
    try {
      logDebug('Invalidating invitation from Supabase', { invitationId });
      
      const { data, error } = await supabase
        .rpc('invalidate_invitation', { invitation_uuid: invitationId });
      
      if (error) {
        logError('Failed to invalidate invitation from Supabase', error);
        
        // Report to Sentry
        sentryErrorService.reportSupabaseError(error, {
          operation: 'invalidateInvitation',
          table: 'list_invitations',
        });
        
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      logInfo('Successfully invalidated invitation from Supabase', { success: data?.[0]?.success });
      return {
        data: data?.[0] || null,
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error invalidating invitation', error);
      
      // Report to Sentry
      sentryErrorService.reportSupabaseError(error, {
        operation: 'invalidateInvitation',
        table: 'list_invitations',
      });
      
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Soft delete an invitation
  async deleteInvitation(invitationId: string): Promise<ApiResponse<InvitationActionResponse>> {
    try {
      logDebug('Deleting invitation from Supabase', { invitationId });
      
      const { data, error } = await supabase
        .rpc('soft_delete_invitation', { invitation_uuid: invitationId });
      
      if (error) {
        logError('Failed to delete invitation from Supabase', error);
        
        // Report to Sentry
        sentryErrorService.reportSupabaseError(error, {
          operation: 'deleteInvitation',
          table: 'list_invitations',
        });
        
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      logInfo('Successfully deleted invitation from Supabase', { success: data?.[0]?.success });
      return {
        data: data?.[0] || null,
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error deleting invitation', error);
      
      // Report to Sentry
      sentryErrorService.reportSupabaseError(error, {
        operation: 'deleteInvitation',
        table: 'list_invitations',
      });
      
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }
}

// Category API Controller
export class CategoryController {
  // Get all grocery_categories
  async getCategories(): Promise<ApiResponse<Category[]>> {
    try {
      logDebug('Fetching grocery_categories from Supabase');

      // Process queue first if online
      if (navigator.onLine) {
        const qs = await globalQueueService.getQueueStatus();
        if (qs.queueLength > 0) {
          await globalQueueService.processQueuedRequests();
          let waits = 0;
          while (await (async () => (await globalQueueService.getQueueStatus()).isProcessing)()) {
            if (waits++ > 30) break;
            await new Promise(r => setTimeout(r, 100));
          }
        }
      }

      // Timebox
      const timeoutMs = environment.supabaseRequestTimeoutMs ?? 1500;
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timeout')), timeoutMs));
      let data: any = null; let error: any = null;
      try {
        const result = await Promise.race([
          supabase
            .from('grocery_categories')
            .select('*')
            .order('name', { ascending: true }),
          timeoutPromise,
        ]);
        data = (result as any).data;
        error = (result as any).error;
      } catch (err: any) { error = err; }
      
      if (error) {
        logError('Failed to fetch grocery_categories from Supabase', error);
        // Report to Sentry
        sentryErrorService.reportSupabaseError(error, {
          operation: 'getCategories',
          table: 'grocery_categories',
        });
        
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      // Sync to Dexie
      try { await dexieService.syncCategories((data || []) as any); } catch {}

      logInfo('Successfully fetched grocery_categories from Supabase', { count: data?.length || 0 });
      return {
        data: data || [],
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error fetching grocery_categories', error);
      // Report to Sentry
      sentryErrorService.reportSupabaseError(error, {
        operation: 'getCategories',
        table: 'grocery_categories',
      });
      
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Get grocery_category by ID
  async getCategoryById(id: string): Promise<ApiResponse<Category>> {
    try {
      logDebug('Fetching grocery_category by ID from Supabase', { categoryId: id });

      // Timebox
      const timeoutMs = environment.supabaseRequestTimeoutMs ?? 1500;
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timeout')), timeoutMs));
      let data: any = null; let error: any = null;
      try {
        const result = await Promise.race([
          supabase
            .from('grocery_categories')
            .select('*')
            .eq('id', id)
            .single(),
          timeoutPromise,
        ]);
        data = (result as any).data;
        error = (result as any).error;
      } catch (err: any) { error = err; }
      
      if (error) {
        logError('Failed to fetch grocery_category by ID from Supabase', error);
        
        // Report to Sentry
        sentryErrorService.reportSupabaseError(error, {
          operation: 'getCategoryById',
          table: 'grocery_categories',
        });
        
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      // Upsert to Dexie
      try { await dexieService.updateCategory(data as any); } catch {}

      logInfo('Successfully fetched grocery_category by ID from Supabase', { categoryId: id });
      return {
        data: data,
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error fetching grocery_category by ID', error);
      
      // Report to Sentry
      sentryErrorService.reportSupabaseError(error, {
        operation: 'getCategoryById',
        table: 'grocery_categories',
      });
      
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }
}

// Unit API Controller
export class UnitController {
  async getUnits(): Promise<ApiResponse<Unit[]>> {
    try {
      logDebug('Fetching grocery_units from Supabase');
      // Process queue first if online
      if (navigator.onLine) {
        const qs = await globalQueueService.getQueueStatus();
        if (qs.queueLength > 0) {
          await globalQueueService.processQueuedRequests();
          let waits = 0;
          while (await (async () => (await globalQueueService.getQueueStatus()).isProcessing)()) {
            if (waits++ > 30) break;
            await new Promise(r => setTimeout(r, 100));
          }
        }
      }

      // Timebox
      const timeoutMs = environment.supabaseRequestTimeoutMs ?? 1500;
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timeout')), timeoutMs));
      let data: any = null; let error: any = null;
      try {
        const result = await Promise.race([
          supabase
            .from('grocery_units')
            .select('*')
            .order('name'),
          timeoutPromise,
        ]);
        data = (result as any).data;
        error = (result as any).error;
      } catch (err: any) {
        error = err;
      }
      
      if (error) {
        logError('Error fetching grocery_units:', error);
        // Report to Sentry
        sentryErrorService.reportSupabaseError(error, {
          operation: 'getUnits',
          table: 'grocery_units',
        });
        
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      // Sync to Dexie
      try { await dexieService.syncUnits((data || []) as any); } catch {}

      logDebug('grocery_units fetched successfully:', data);
      return {
        data: data || [],
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error fetching grocery_units:', error);
      // Report to Sentry
      sentryErrorService.reportSupabaseError(error, {
        operation: 'getUnits',
        table: 'grocery_units',
      });
      
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  async getUnitById(id: string): Promise<ApiResponse<Unit>> {
    try {
      logDebug('Fetching grocery_units by ID:', id);

      // Timebox
      const timeoutMs = environment.supabaseRequestTimeoutMs ?? 1500;
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timeout')), timeoutMs));
      let data: any = null; let error: any = null;
      try {
        const result = await Promise.race([
          supabase
            .from('grocery_units')
            .select('*')
            .eq('id', id)
            .single(),
          timeoutPromise,
        ]);
        data = (result as any).data;
        error = (result as any).error;
      } catch (err: any) { error = err; }
      
      if (error) {
        logError('Error fetching grocery_units by ID:', error);
        
        // Report to Sentry
        sentryErrorService.reportSupabaseError(error, {
          operation: 'getUnitById',
          table: 'grocery_units',
        });
        
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      // Upsert to Dexie
      try { await dexieService.updateUnit(data as any); } catch {}

      logDebug('Unit fetched successfully:', data);
      return {
        data: data,
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error fetching unit by ID:', error);
      
      // Report to Sentry
      sentryErrorService.reportSupabaseError(error, {
        operation: 'getUnitById',
        table: 'grocery_units',
      });
      
      return {
        data: null,
        error: 'Unexpected error occurred',
        status: 500
      };
    }
  }
}

export class ProductGroupController {
  async searchProductGroups(
    term: string, 
    limitFts: number = 10, 
    limitFuzzy: number = 10
  ): Promise<ApiResponse<ProductOrGroup[]>> {
    try {
      logDebug('Searching product groups with term:', term);
      
      // Timebox search
      const timeoutMs = environment.supabaseRequestTimeoutMs ?? 1500;
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timeout')), timeoutMs));
      let data: any = null; let error: any = null;
      try {
        const result = await Promise.race([
          supabase
            .rpc('search_products_and_groups', {
              term: term,
              limit_fts: limitFts,
              limit_fuzzy: limitFuzzy
            }),
          timeoutPromise,
        ]);
        data = (result as any).data;
        error = (result as any).error;
      } catch (err: any) { error = err; }
      
      if (error) {
        logError('Error searching product groups:', error);
        
        // Report to Sentry
        sentryErrorService.reportSupabaseError(error, {
          operation: 'searchProductGroups',
          table: 'product_groups',
        });
        
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      logDebug('Product groups search successful:', data);
      return {
        data: data || [],
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error searching product groups:', error);
      
      // Report to Sentry
      sentryErrorService.reportSupabaseError(error, {
        operation: 'searchProductGroups',
        table: 'product_groups',
      });
      
      return {
        data: null,
        error: 'Unexpected error occurred',
        status: 500
      };
    }
  }
}

// Database Service Functions
export const shoppingItemsApi = new ShoppingItemsController();
export const listsApi = new ListsController();
export const categoriesApi = new CategoryController();
export const unitsApi = new UnitController();
export const productGroupsApi = new ProductGroupController();

// Auth Service Functions
export const authService = {
  register: async (email: string, password: string, userData: { firstName: string; lastName: string }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
          },
        },
      });
      if (error) throw error;
      return { user: data.user, error: null };
    } catch (error) {
      // Report auth error to Sentry
      sentryErrorService.reportApiError(error, {
        url: '/auth/register',
        method: 'POST',
        requestBody: { email, userData },
      });
      return { user: null, error };
    }
  },

  login: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { user: data.user, error: null };
    } catch (error) {
      // Report auth error to Sentry
      sentryErrorService.reportApiError(error, {
        url: '/auth/login',
        method: 'POST',
        requestBody: { email },
      });
      return { user: null, error };
    }
  },

  logout: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Logout error:', error);
      // Report auth error to Sentry
      sentryErrorService.reportApiError(error, {
        url: '/auth/logout',
        method: 'POST',
      });
    }
  },

  getCurrentUser: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      
      if (user) {
        const authUser: AuthUser = {
          id: user.id,
          email: user.email!,
          firstName: user.user_metadata?.first_name,
          lastName: user.user_metadata?.last_name,
          emailVerified: user.email_confirmed_at !== null,
          created_at: user.created_at,
          updatedAt: user.updated_at,
        };
        return authUser;
      }
      
      return null;
    } catch (error) {
      logError('Unexpected error getting current user', error);
      // Report auth error to Sentry
      sentryErrorService.reportApiError(error, {
        url: '/auth/user',
        method: 'GET',
      });
      return null;
    }
  },

  isAuthenticated: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      return !error && !!user;
    } catch (error) {
      console.error('Auth check failed:', error);
      // Report auth error to Sentry
      sentryErrorService.reportApiError(error, {
        url: '/auth/check',
        method: 'GET',
      });
      return false;
    }
  },

  onAuthStateChange: (callback: (user: AuthUser | null) => void) => {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const authUser: AuthUser = {
          id: session.user.id,
          email: session.user.email!,
          firstName: session.user.user_metadata?.first_name,
          lastName: session.user.user_metadata?.last_name,
          emailVerified: session.user.email_confirmed_at !== null,
          created_at: session.user.created_at,
          updatedAt: session.user.updated_at,
        };
        callback(authUser);
      } else {
        callback(null);
      }
    });
  },

  resetPassword: async (email: string) => {
    try {
      // Get the current origin for the redirect URL
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      // Report auth error to Sentry
      sentryErrorService.reportApiError(error, {
        url: '/auth/reset-password',
        method: 'POST',
      });
      return { error };
    }
  },

  updateProfile: async (userData: { firstName: string; lastName: string; email: string }) => {
    try {
      // Get current user to check if email is actually changing
      const { data: currentUser } = await supabase.auth.getUser();
      const currentEmail = currentUser.user?.email;
      
      // Update user metadata (first_name, last_name)
      const { data, error } = await supabase.auth.updateUser({
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
        },
      });
      
      if (error) throw error;
      
      // If email is changing, update it separately
      if (currentEmail && currentEmail !== userData.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: userData.email,
        });
        
        if (emailError) {
          return { user: null, error: emailError.message };
        }
        
        // Return the user with updated metadata, email change will require confirmation
        return { 
          user: data.user, 
          error: null,
          message: 'Profil aktualisiert. Bitte bestätige die E-Mail-Änderung in deinem Posteingang.'
        };
      }
      
      return { user: data.user, error: null };
    } catch (error) {
      // Report auth error to Sentry
      sentryErrorService.reportApiError(error, {
        url: '/auth/update-profile',
        method: 'PUT',
      });
      return { user: null, error };
    }
  },

  updatePassword: async (currentPassword: string, newPassword: string) => {
    try {
      // First, verify the current password by trying to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: (await supabase.auth.getUser()).data.user?.email || '',
        password: currentPassword,
      });
      
      if (signInError) {
        return { user: null, error: 'Aktuelles Passwort ist falsch' };
      }
      
      // If current password is correct, update to new password
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      return { user: data.user, error: null };
    } catch (error) {
      // Report auth error to Sentry
      sentryErrorService.reportApiError(error, {
        url: '/auth/update-password',
        method: 'PUT',
      });
      return { user: null, error };
    }
  },
};

// Helper function to group items by category
export const groupItemsByCategory = (items: ShoppingItem[], categories: Category[]) => {
  const grouped: { [categoryName: string]: { items: ShoppingItem[], category: Category } } = {};
  
  const activeItems = items.filter(item => !item.is_deleted);
  
  // Create a map of category IDs to categories
  const categoryMap = new Map<string, Category>();
  categories.forEach(category => {
    categoryMap.set(category.id, category);
  });
  
  activeItems.forEach(item => {
    const category = item.category_id ? categoryMap.get(item.category_id) : null;
    const categoryName = category ? category.name : 'Keine Kategorie';
    const fallbackCategory: Category = {
      id: 'none',
      name: 'Keine Kategorie',
    icon: 'fa-basket-shopping',
    sort_order: 0
    };
    
    if (!grouped[categoryName]) {
      grouped[categoryName] = {
        items: [],
        category: category || fallbackCategory
      };
    }
    grouped[categoryName].items.push(item);
  });
  
  return grouped;
};

// Helper function to get category name by ID
export const getCategoryNameById = (categoryId: string | null, categories: Category[]): string => {
  if (!categoryId) return '';
  const category = categories.find(cat => cat.id === categoryId);
  return category ? category.name : '';
};

// Helper function to get category icon by ID
export const getCategoryIconById = (categoryId: string | null, categories: Category[]): string => {
  if (!categoryId) return 'fa-basket-shopping';
  const category = categories.find(cat => cat.id === categoryId);
  return category ? category.icon : 'fa-basket-shopping';
};

// Helper function to get unit short name by ID
export const getUnitShortNameById = (unitId: string | null, units: Unit[]): string => {
  if (!unitId) return '';
  const unit = units.find(u => u.id === unitId);
  return unit ? unit.short_name : '';
};

// Helper function to get unit full name by ID
export const getUnitNameById = (unitId: string | null, units: Unit[]): string => {
  if (!unitId) return '';
  const unit = units.find(u => u.id === unitId);
  return unit ? unit.name : '';
};

// Helper function to get completed and incomplete items
export const separateCompletedItems = (items: ShoppingItem[]) => {
  const activeItems = items.filter(item => !item.is_deleted);
  
  const completed = activeItems.filter(item => item.is_completed);
  const incomplete = activeItems.filter(item => !item.is_completed);
  
  return { completed, incomplete };
};

// Helper function to get unit details by ID
export const getUnitById = async (unitId: string): Promise<Unit | null> => {
  try {
    const { data, error } = await supabase
      .from('grocery_units')
      .select('*')
      .eq('id', unitId)
      .single();
    
    if (error) {
      logError('Failed to fetch unit', error);
      // Report to Sentry
      sentryErrorService.reportSupabaseError(error, {
        operation: 'getUnit',
        table: 'grocery_units',
      });
      return null;
    }
    
    return data;
  } catch (error) {
    logError('Unexpected error fetching unit', error);
    // Report to Sentry
    sentryErrorService.reportSupabaseError(error, {
      operation: 'getUnit',
      table: 'grocery_units',
    });
    return null;
  }
}; 