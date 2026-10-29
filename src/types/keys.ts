import { Coordinates } from './database';

export const deliveryKeys = {
  all: ['deliveries'] as const,
  lists: () => [...deliveryKeys.all, 'list'] as const,
  list: (storeId?: string) => [...deliveryKeys.lists(), { storeId }] as const,
  details: () => [...deliveryKeys.all, 'detail'] as const,
  detail: (idOrCode: string) => [...deliveryKeys.details(), idOrCode] as const,
  logs: (deliveryId: string) => [...deliveryKeys.detail(deliveryId), 'logs'] as const,
  couriers: () => ['couriers'] as const,
  stores: () => ['stores'] as const,
  routes: () => ['routes'] as const,
  route: (origin: Coordinates | null, destination: Coordinates | null) =>
    [
      ...deliveryKeys.routes(),
      origin ? `${origin.latitude.toFixed(4)},${origin.longitude.toFixed(4)}` : 'null',
      destination ? `${destination.latitude.toFixed(4)},${destination.longitude.toFixed(4)}` : 'null',
    ] as const,
};
