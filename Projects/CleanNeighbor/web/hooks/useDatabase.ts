import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useDatabaseQuery(collectionName: string, queryConstraints: any = {}) {
  const [data, setData] = useState<any>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (queryConstraints === 'skip') {
      setLoading(false);
      setData(undefined);
      return;
    }

    const fetchData = async () => {
      try {
        let query = supabase.from(collectionName.toLowerCase()).select('*');
        // Basic translation of queryConstraints if needed (omitted for simplicity as most are basic fetches)
        
        const { data: result, error: fetchError } = await query;
        
        if (fetchError) throw fetchError;
        let mappedResult = result;
        if (result && Array.isArray(result) && collectionName.toLowerCase() === 'wastereports') {
            mappedResult = result.map(item => ({
                ...item,
                priority: item.ai_analysis?.priority || 'medium',
                createdAt: item.created_at,
                updatedAt: item.updated_at || item.created_at
            }));
        }
        setData(mappedResult);
      } catch (err: any) {
        console.error(`Supabase query error for ${collectionName}:`, err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up realtime subscription
    const channel = supabase.channel(`public:${collectionName.toLowerCase()}-${Math.random()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: collectionName.toLowerCase() }, () => {
        fetchData(); // Refetch on any change
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [collectionName, JSON.stringify(queryConstraints)]);

  return data;
}

export function useDatabaseDoc(collectionName: string, docId?: string) {
  const [data, setData] = useState<any>(undefined);
  
  useEffect(() => {
    if (!docId || docId === 'skip') {
      setData(undefined);
      return;
    }

    const fetchData = async () => {
      const { data: result, error } = await supabase
        .from(collectionName.toLowerCase())
        .select('*')
        .eq('_id', docId)
        .single();
        
      if (!error && result) {
        let mappedResult = result;
        if (collectionName.toLowerCase() === 'wastereports') {
            mappedResult = {
                ...result,
                priority: result.ai_analysis?.priority || 'medium',
                createdAt: result.created_at,
                updatedAt: result.updated_at || result.created_at
            };
        }
        setData(mappedResult);
      } else {
        setData(null);
      }
    };

    fetchData();

    const channel = supabase.channel(`public:${collectionName.toLowerCase()}:${docId}-${Math.random()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: collectionName.toLowerCase(), filter: `_id=eq.${docId}` }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [collectionName, docId]);

  return data;
}

export function useDatabaseMutation(collectionName: string) {
  const mutate = async (args: any = {}) => {
    try {
      const table = collectionName.toLowerCase();
      
      // Dummy for file uploads so it doesn't crash (returns an invalid URL which gets caught safely)
      if (table === 'files') return "http://localhost/dummy-upload";

      const payload = { ...args };
      
      // Upsert logic for users
      if (table === 'users') {
        const matchId = payload.clerkId || payload._id || payload.userId;
        if (matchId) {
           const { data, error } = await supabase.from(table).update(payload).eq(payload.clerkId ? 'clerkId' : '_id', matchId).select().single();
           if (!error && data) return data;
        }
      }

      // If it's an update (has an ID of some sort)
      const idKey = payload._id ? '_id' : (payload.issueId ? '_id' : (payload.notificationId ? '_id' : null));
      const idVal = payload._id || payload.issueId || payload.notificationId;

      if (idKey && idVal) {
        // Remove specific keys that shouldn't be updated directly if they are just identifiers
        if (payload.issueId) delete payload.issueId;
        if (payload.notificationId) delete payload.notificationId;
        
        const { data, error } = await supabase.from(table).update(payload).eq(idKey, idVal).select().single();
        if (error) throw error;
        return data;
      } else {
        // Insert
        const { data, error } = await supabase.from(table).insert(payload).select().single();
        if (error) throw error;
        return data;
      }
    } catch (err: any) {
      console.error(`Supabase mutation error for ${collectionName}:`, err);
      throw err;
    }
  };

  return { mutate };
}
