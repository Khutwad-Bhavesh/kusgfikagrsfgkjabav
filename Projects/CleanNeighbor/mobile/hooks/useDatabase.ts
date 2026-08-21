import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useDatabaseQuery(collectionName: string, queryConstraints: any[] = []) {
  const [data, setData] = useState<any>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (queryConstraints.includes('skip')) {
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
        
        setData(result);
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
        setData(result);
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (action: 'add' | 'update' | 'delete', docIdOrData: any, dataOrNothing?: any) => {
    setLoading(true);
    setError(null);
    try {
      if (action === 'add') {
        const { data, error } = await supabase.from(collectionName.toLowerCase()).insert(docIdOrData).select().single();
        if (error) throw error;
        setLoading(false);
        return data._id;
      } else if (action === 'update') {
        const { error } = await supabase.from(collectionName.toLowerCase()).update(dataOrNothing).eq('_id', docIdOrData);
        if (error) throw error;
        setLoading(false);
      } else if (action === 'delete') {
        const { error } = await supabase.from(collectionName.toLowerCase()).delete().eq('_id', docIdOrData);
        if (error) throw error;
        setLoading(false);
      }
    } catch (err: any) {
      console.error(`Supabase mutation error for ${collectionName}:`, err);
      setError(err);
      setLoading(false);
      throw err;
    }
  };

  return { mutate, loading, error };
}
