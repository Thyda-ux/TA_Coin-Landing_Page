import { useEffect, useState } from 'react';
import { subscribeToFaqUpdates } from '../lib/vectorService';

export const useRealtimeFaqs = () => {
  const [updates, setUpdates] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const subscription = subscribeToFaqUpdates((update) => {
      setUpdates(update);
      console.log('FAQ Realtime Update:', update);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { updates, loading };
};