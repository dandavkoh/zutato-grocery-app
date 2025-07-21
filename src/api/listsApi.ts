import { createApi } from '@reduxjs/toolkit/query/react';
import { supabaseBaseQuery } from './supabaseApiAdapter';

// Types für Lists
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
  created_at: string;
}

// RTK Query API für Lists
export const listsApi = createApi({
  reducerPath: 'listsApi',
  baseQuery: supabaseBaseQuery,
  tagTypes: ['List', 'ListMember'],
  endpoints: (builder) => ({
    // Alle Lists für den aktuellen User abrufen
    getLists: builder.query<List[], void>({
      query: () => ({
        url: '/api/lists',
        method: 'GET',
      }),
      keepUnusedDataFor: 300, // 5 Minuten Cache
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'List' as const, id })),
              { type: 'List', id: 'USER_LISTS' }
            ]
          : [{ type: 'List', id: 'USER_LISTS' }],
      async onQueryStarted(_, { queryFulfilled, getState }) {
        const state = getState() as any;
        const queryKey = 'getLists()';
        const queryState = state.listsApi.queries[queryKey];
        
        if (queryState && queryState.data && !queryState.isLoading) {
          console.log(`⚡ [Lists API] Using CACHED data (${queryState.data.length} lists)`);
          return;
        }
        
        console.log(`🔄 [Lists API] Starting DATABASE query for user lists`);
        
        try {
          const { data } = await queryFulfilled;
          console.log(`✅ [Lists API] Successfully loaded ${data.length} lists from DATABASE`);
        } catch (error) {
          console.error(`❌ [Lists API] Failed to load lists from DATABASE`, error);
        }
      },
    }),

    // Einzelne List abrufen
    getList: builder.query<List, string>({
      query: (listId) => ({
        url: `/api/lists/${listId}`,
        method: 'GET',
      }),
      keepUnusedDataFor: 300,
      providesTags: (result, error, listId) => [
        { type: 'List', id: listId }
      ],
    }),

    // Neue List erstellen
    createList: builder.mutation<List, CreateListRequest>({
      query: (listData) => ({
        url: '/api/lists',
        method: 'POST',
        body: listData,
      }),
      async onQueryStarted(listData, { dispatch, queryFulfilled }) {
        console.log(`➕ [Lists API] Creating new list: "${listData.name}" (Optimistic Update)`);
        
        const patchResult = dispatch(
          listsApi.util.updateQueryData('getLists', undefined, (draft) => {
            const newList: List = {
              id: `temp-${Date.now()}`,
              ...listData,
              created_at: new Date().toISOString(),
              is_deleted: false,
            };
            draft.unshift(newList); // Am Anfang einfügen
          })
        );
        
        try {
          const { data: newList } = await queryFulfilled;
          console.log(`✅ [Lists API] Successfully created list: "${newList.name}" in DATABASE`);
          
          // Temporäre ID durch echte ID ersetzen
          dispatch(
            listsApi.util.updateQueryData('getLists', undefined, (draft) => {
              const index = draft.findIndex(list => list.id === `temp-${Date.now() - 1000}`);
              if (index !== -1) {
                draft[index] = newList;
              }
            })
          );
        } catch (error) {
          console.error(`❌ [Lists API] Failed to create list: "${listData.name}" in DATABASE`, error);
          patchResult.undo();
        }
      },
      invalidatesTags: [{ type: 'List', id: 'USER_LISTS' }],
    }),

    // List aktualisieren
    updateList: builder.mutation<List, { id: string; updates: UpdateListRequest }>({
      query: ({ id, updates }) => ({
        url: `/api/lists/${id}`,
        method: 'PUT',
        body: updates,
      }),
      async onQueryStarted({ id, updates }, { dispatch, queryFulfilled }) {
        console.log(`✏️ [Lists API] Updating list ID: ${id} (Optimistic Update)`);
        
        const patchResult = dispatch(
          listsApi.util.updateQueryData('getLists', undefined, (draft) => {
            const list = draft.find(list => list.id === id);
            if (list) {
              Object.assign(list, updates, { updated_at: new Date().toISOString() });
            }
          })
        );
        
        try {
          await queryFulfilled;
          console.log(`✅ [Lists API] Successfully updated list ID: ${id} in DATABASE`);
        } catch (error) {
          console.error(`❌ [Lists API] Failed to update list ID: ${id} in DATABASE`, error);
          patchResult.undo();
        }
      },
      invalidatesTags: (result, error, { id }) => [
        { type: 'List', id },
        { type: 'List', id: 'USER_LISTS' }
      ],
    }),

    // List löschen (Soft Delete)
    deleteList: builder.mutation<null, string>({
      query: (id) => ({
        url: `/api/lists/${id}`,
        method: 'DELETE',
      }),
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        console.log(`🗑️ [Lists API] Soft deleting list ID: ${id} (Optimistic Update)`);
        
        const patchResult = dispatch(
          listsApi.util.updateQueryData('getLists', undefined, (draft) => {
            const list = draft.find(list => list.id === id);
            if (list) {
              list.is_deleted = true;
              list.updated_at = new Date().toISOString();
            }
          })
        );
        
        try {
          await queryFulfilled;
          console.log(`✅ [Lists API] Successfully soft deleted list ID: ${id} in DATABASE`);
        } catch (error) {
          console.error(`❌ [Lists API] Failed to soft delete list ID: ${id} in DATABASE`, error);
          patchResult.undo();
        }
      },
      invalidatesTags: (result, error, id) => [
        { type: 'List', id },
        { type: 'List', id: 'USER_LISTS' }
      ],
    }),

    // List Members abrufen
    getListMembers: builder.query<ListMember[], string>({
      query: (listId) => ({
        url: `/api/lists/${listId}/members`,
        method: 'GET',
      }),
      keepUnusedDataFor: 300,
      providesTags: (result, error, listId) => [
        { type: 'ListMember', id: `LIST-${listId}` }
      ],
    }),

    // Member zu List hinzufügen
    addListMember: builder.mutation<ListMember, { listId: string; userId: string; role?: 'owner' | 'member' }>({
      query: ({ listId, userId, role = 'member' }) => ({
        url: `/api/lists/${listId}/members`,
        method: 'POST',
        body: { userId, role },
      }),
      invalidatesTags: (result, error, { listId }) => [
        { type: 'ListMember', id: `LIST-${listId}` }
      ],
    }),

    // Member von List entfernen
    removeListMember: builder.mutation<null, { listId: string; userId: string }>({
      query: ({ listId, userId }) => ({
        url: `/api/lists/${listId}/members/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { listId }) => [
        { type: 'ListMember', id: `LIST-${listId}` }
      ],
    }),
  }),
});

// Export der generierten Hooks
export const {
  useGetListsQuery,
  useGetListQuery,
  useCreateListMutation,
  useUpdateListMutation,
  useDeleteListMutation,
  useGetListMembersQuery,
  useAddListMemberMutation,
  useRemoveListMemberMutation,
} = listsApi; 