import { useEffect } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from '@tanstack/react-query';
import {
  fetchDeliveries,
  fetchDeliveryById,
  fetchAvailableCouriers,
  fetchRestaurantStores,
  fetchDeliveryLogs,
  createDelivery,
  updateDeliveryStatus,
  verifyAndCompleteDelivery,
  CreateDeliveryInput,
} from '../services/deliveryService';
import { getRouteBetweenPoints } from '../services/routingService';
import {
  Delivery,
  Courier,
  RestaurantStore,
  DeliveryStatusLog,
  RouteInfo,
  Coordinates,
  DeliveryStatus,
} from '../types/database';
import { supabase } from '../lib/supabase';

import { deliveryKeys } from '../types/keys';
export { deliveryKeys };

/**
 * Hook to fetch deliveries list with TanStack caching
 */
export function useDeliveriesQuery(storeId?: string): UseQueryResult<Delivery[], Error> {
  return useQuery({
    queryKey: deliveryKeys.list(storeId),
    queryFn: () => fetchDeliveries(storeId),
    staleTime: 15 * 1000, // 15 seconds
    refetchInterval: 30 * 1000, // poll fallback every 30s
  });
}

/**
 * Hook to fetch single delivery detail
 */
export function useDeliveryDetailQuery(idOrCode: string | null): UseQueryResult<Delivery | null, Error> {
  return useQuery({
    queryKey: deliveryKeys.detail(idOrCode || ''),
    queryFn: () => (idOrCode ? fetchDeliveryById(idOrCode) : Promise.resolve(null)),
    enabled: !!idOrCode,
    staleTime: 10 * 1000,
  });
}

/**
 * Hook to fetch logs for a delivery
 */
export function useDeliveryLogsQuery(deliveryId: string | null): UseQueryResult<DeliveryStatusLog[], Error> {
  return useQuery({
    queryKey: deliveryKeys.logs(deliveryId || ''),
    queryFn: () => (deliveryId ? fetchDeliveryLogs(deliveryId) : Promise.resolve([])),
    enabled: !!deliveryId,
    staleTime: 10 * 1000,
  });
}

/**
 * Hook to fetch available couriers
 */
export function useCouriersQuery(): UseQueryResult<Courier[], Error> {
  return useQuery({
    queryKey: deliveryKeys.couriers(),
    queryFn: fetchAvailableCouriers,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook to fetch restaurant stores from Alacarta
 */
export function useStoresQuery(): UseQueryResult<RestaurantStore[], Error> {
  return useQuery({
    queryKey: deliveryKeys.stores(),
    queryFn: fetchRestaurantStores,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to calculate road route with distance in KM and Miles (TanStack cached)
 */
export function useRouteQuery(
  origin: Coordinates | null,
  destination: Coordinates | null
): UseQueryResult<RouteInfo | null, Error> {
  return useQuery({
    queryKey: deliveryKeys.route(origin, destination),
    queryFn: async () => {
      if (!origin || !destination) return null;
      return await getRouteBetweenPoints(origin, destination);
    },
    enabled: !!origin && !!destination,
    staleTime: 10 * 60 * 1000, // 10 minutes cache for coordinates route
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to dispatch / create a new delivery with optimistic cache updates
 */
export function useCreateDeliveryMutation(): UseMutationResult<Delivery, Error, CreateDeliveryInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDeliveryInput) => createDelivery(input),
    onSuccess: (newDelivery) => {
      // Optimistically prepend to active lists
      queryClient.setQueriesData<Delivery[]>({ queryKey: deliveryKeys.lists() }, (old) => {
        if (!old) return [newDelivery];
        return [newDelivery, ...old];
      });

      // Set individual detail cache
      queryClient.setQueryData(deliveryKeys.detail(newDelivery.id), newDelivery);
      queryClient.setQueryData(deliveryKeys.detail(newDelivery.tracking_code), newDelivery);

      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: deliveryKeys.lists() });
    },
  });
}

/**
 * Hook to advance delivery status (e.g. Assigned -> In Transit -> Delivered)
 */
export function useUpdateDeliveryStatusMutation(): UseMutationResult<
  Delivery,
  Error,
  { deliveryId: string; status: DeliveryStatus; note?: string; courierId?: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ deliveryId, status, note, courierId }) =>
      updateDeliveryStatus(deliveryId, status, note, courierId),
    onSuccess: (updatedDelivery) => {
      // Update lists cache
      queryClient.setQueriesData<Delivery[]>({ queryKey: deliveryKeys.lists() }, (old) => {
        if (!old) return [];
        return old.map((d) => (d.id === updatedDelivery.id ? updatedDelivery : d));
      });

      // Update detail cache
      queryClient.setQueryData(deliveryKeys.detail(updatedDelivery.id), updatedDelivery);
      queryClient.setQueryData(deliveryKeys.detail(updatedDelivery.tracking_code), updatedDelivery);

      // Invalidate logs
      queryClient.invalidateQueries({ queryKey: deliveryKeys.logs(updatedDelivery.id) });
    },
  });
}

/**
 * Hook to verify the 4-digit reception code dictated to courier and complete last-mile delivery
 */
export function useVerifyReceptionCodeMutation(): UseMutationResult<
  { success: boolean; delivery?: Delivery; error?: string },
  Error,
  { deliveryId: string; inputCode: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ deliveryId, inputCode }) =>
      verifyAndCompleteDelivery(deliveryId, inputCode),
    onSuccess: (result) => {
      if (result.success && result.delivery) {
        const updatedDelivery = result.delivery;

        // Update list cache
        queryClient.setQueriesData<Delivery[]>({ queryKey: deliveryKeys.lists() }, (old) => {
          if (!old) return [];
          return old.map((d) => (d.id === updatedDelivery.id ? updatedDelivery : d));
        });

        // Update detail cache
        queryClient.setQueryData(deliveryKeys.detail(updatedDelivery.id), updatedDelivery);
        queryClient.setQueryData(deliveryKeys.detail(updatedDelivery.tracking_code), updatedDelivery);

        // Invalidate logs
        queryClient.invalidateQueries({ queryKey: deliveryKeys.logs(updatedDelivery.id) });
      }
    },
  });
}

/**
 * Real-time sync hook: Listens to Supabase Realtime channel and synchronizes TanStack Query cache!
 */
export function useRealtimeDeliverySync(activeStoreId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('realtime_deliveries_stream')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deliveries',
        },
        (payload) => {
          const updatedRow = payload.new as any;
          if (!updatedRow?.id) return;

          // Invalidate and refresh TanStack cache for lists and details
          queryClient.invalidateQueries({ queryKey: deliveryKeys.lists() });
          queryClient.invalidateQueries({ queryKey: deliveryKeys.detail(updatedRow.id) });
          if (updatedRow.tracking_code) {
            queryClient.invalidateQueries({ queryKey: deliveryKeys.detail(updatedRow.tracking_code) });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, activeStoreId]);
}
