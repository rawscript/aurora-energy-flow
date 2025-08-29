import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface OfflineData {
  id: string;
  table: string;
  data: any;
  operation: 'insert' | 'update' | 'delete';
  timestamp: number;
  retries: number;
  lastAttempt?: number;
}

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingChanges: number;
  lastSync?: Date;
  error?: string;
}

export const useOfflineSupport = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingChanges: 0
  });
  const [offlineData, setOfflineData] = useState<OfflineData[]>([]);
  const { user, session } = useAuth();
  const { toast } = useToast();

  // Load offline data from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedData = localStorage.getItem(`offlineData_${user?.id}`);
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          setOfflineData(parsedData);
          setSyncStatus(prev => ({
            ...prev,
            pendingChanges: parsedData.length
          }));
        }
      } catch (error) {
        console.error('Error loading offline data:', error);
      }
    }
  }, [user?.id]);

  // Save offline data to localStorage
  const saveOfflineData = useCallback((data: OfflineData[]) => {
    try {
      if (typeof window !== 'undefined' && user?.id) {
        localStorage.setItem(`offlineData_${user.id}`, JSON.stringify(data));
        setSyncStatus(prev => ({
          ...prev,
          pendingChanges: data.length
        }));
      }
    } catch (error) {
      console.error('Error saving offline data:', error);
    }
  }, [user?.id]);

  // Add data to offline queue
  const queueOfflineOperation = useCallback((operation: OfflineData) => {
    setOfflineData(prev => {
      const existingIndex = prev.findIndex(item =>
        item.table === operation.table &&
        item.data.id === operation.data.id &&
        item.operation === operation.operation
      );

      let newData;
      if (existingIndex >= 0) {
        // Update existing operation
        newData = [...prev];
        newData[existingIndex] = {
          ...operation,
          retries: prev[existingIndex].retries,
          timestamp: Date.now()
        };
      } else {
        // Add new operation
        newData = [
          ...prev,
          {
            ...operation,
            id: `${operation.table}_${operation.data.id}_${Date.now()}`,
            timestamp: Date.now(),
            retries: 0
          }
        ];
      }

      saveOfflineData(newData);
      return newData;
    });
  }, [saveOfflineData]);

  // Sync offline data with server
  const syncOfflineData = useCallback(async () => {
    if (!user || !session || !navigator.onLine || syncStatus.isSyncing) {
      return;
    }

    setSyncStatus(prev => ({ ...prev, isSyncing: true }));

    try {
      let successCount = 0;
      const dataToSync = [...offlineData];

      // Process each queued operation
      for (const operation of dataToSync) {
        try {
          let result;

          switch (operation.operation) {
            case 'insert':
              // For insert operations, we need to handle each table differently
              if (operation.table === 'energy_readings') {
                result = await supabase
                  .from(operation.table)
                  .insert(operation.data)
                  .select();
              } else if (operation.table === 'kplc_token_transactions') {
                result = await supabase
                  .from(operation.table)
                  .insert(operation.data)
                  .select();
              }
              // Add more table-specific handling as needed
              break;

            case 'update':
              result = await supabase
                .from(operation.table)
                .update(operation.data)
                .eq('id', operation.data.id)
                .select();
              break;

            case 'delete':
              result = await supabase
                .from(operation.table)
                .delete()
                .eq('id', operation.data.id)
                .select();
              break;
          }

          if (result && !result.error) {
            successCount++;
            console.log(`Successfully synced ${operation.operation} operation for ${operation.table}`);
          } else {
            console.error(`Error syncing ${operation.operation} operation for ${operation.table}:`, result?.error);
            throw result?.error;
          }
        } catch (error) {
          console.error(`Failed to sync operation ${operation.id}:`, error);
          // We'll keep the operation in the queue for retry
        }
      }

      // Remove successfully synced operations
      if (successCount > 0) {
        setOfflineData(prev => {
          const remainingData = prev.filter(operation =>
            !dataToSync.some(syncedOp => syncedOp.id === operation.id)
          );
          saveOfflineData(remainingData);
          return remainingData;
        });

        setSyncStatus(prev => ({
          ...prev,
          isSyncing: false,
          lastSync: new Date(),
          pendingChanges: Math.max(0, prev.pendingChanges - successCount)
        }));

        if (successCount > 0) {
          toast({
            title: 'Data Synced',
            description: `Successfully synced ${successCount} ${successCount === 1 ? 'operation' : 'operations'}.`,
          });
        }
      } else {
        setSyncStatus(prev => ({ ...prev, isSyncing: false }));
      }
    } catch (error) {
      console.error('Error during sync:', error);
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: error instanceof Error ? error.message : 'Unknown sync error'
      }));

      toast({
        title: 'Sync Error',
        description: 'Failed to sync offline data. Will retry later.',
        variant: 'destructive'
      });
    }
  }, [user, session, offlineData, syncStatus.isSyncing, toast, saveOfflineData]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network connection restored');
      setSyncStatus(prev => ({ ...prev, isOnline: true }));

      // Attempt to sync when coming back online
      if (offlineData.length > 0) {
        toast({
          title: 'Connection Restored',
          description: 'Syncing your offline changes...',
        });
        syncOfflineData();
      }
    };

    const handleOffline = () => {
      console.log('Network connection lost');
      setSyncStatus(prev => ({ ...prev, isOnline: false }));

      toast({
        title: 'Offline Mode',
        description: 'You are currently offline. Changes will be saved and synced when you reconnect.',
        variant: 'warning',
        duration: 10000
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineData, syncOfflineData, toast]);

  // Periodically attempt to sync when online
  useEffect(() => {
    if (!syncStatus.isOnline || !user || !session || syncStatus.isSyncing) {
      return;
    }

    // Sync every 5 minutes when online and there are pending changes
    if (offlineData.length > 0) {
      const syncInterval = setInterval(() => {
        syncOfflineData();
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearInterval(syncInterval);
    }
  }, [syncStatus.isOnline, user, session, offlineData, syncStatus.isSyncing, syncOfflineData]);

  // Function to handle operations with offline support
  const withOfflineSupport = useCallback(
    async <T>(operation: () => Promise<T>, table: string, data: any, opType: 'insert' | 'update' | 'delete'): Promise<T> => {
      try {
        // Try to perform the operation online
        const result = await operation();
        return result;
      } catch (error) {
        console.error(`Error in ${opType} operation for ${table}:`, error);

        // If offline or network error, queue the operation
        if (!navigator.onLine ||
            error.message.includes('network') ||
            error.message.includes('offline') ||
            error.message.includes('fetch')) {

          toast({
            title: 'Offline Mode',
            description: `Your ${opType} operation will be saved and synced when you're back online.`,
            variant: 'warning',
            duration: 5000
          });

          // Queue the operation for later sync
          queueOfflineOperation({
            table,
            data,
            operation: opType,
            id: `${table}_${data.id || Date.now()}_${opType}`,
            timestamp: Date.now(),
            retries: 0
          });

          // Return a mock result for UI consistency
          if (opType === 'insert') {
            return { data: [{ ...data, id: `temp_${Date.now()}` }], error: null } as unknown as T;
          } else if (opType === 'update') {
            return { data: [data], error: null } as unknown as T;
          } else {
            return { data: null, error: null } as unknown as T;
          }
        }

        // Re-throw other errors
        throw error;
      }
    },
    [queueOfflineOperation, toast]
  );

  return {
    syncStatus,
    offlineData,
    queueOfflineOperation,
    syncOfflineData,
    withOfflineSupport
  };
};
