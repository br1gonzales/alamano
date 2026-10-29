import { supabase } from '../lib/supabase';
import {
  Courier,
  Delivery,
  DeliveryStatus,
  DeliveryStatusLog,
  RestaurantStore,
} from '../types/database';
import {
  generateTrackingCode,
  generateReceptionCode,
  verifyReceptionCode,
  validateLastMileHandover,
} from './handoverService';

export {
  generateTrackingCode,
  generateReceptionCode,
  verifyReceptionCode,
  validateLastMileHandover,
};

export async function fetchDeliveries(storeId?: string): Promise<Delivery[]> {
  let query = supabase
    .from('deliveries')
    .select(`
      *,
      courier:couriers(*),
      store:stores(id, name, address)
    `)
    .order('created_at', { ascending: false });

  if (storeId) {
    query = query.eq('store_id', storeId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching deliveries:', error);
    throw new Error(error.message);
  }

  return (data as Delivery[]) || [];
}

export async function fetchDeliveryById(idOrTrackingCode: string): Promise<Delivery | null> {
  const isUuid = idOrTrackingCode.includes('-');
  
  const query = supabase
    .from('deliveries')
    .select(`
      *,
      courier:couriers(*),
      store:stores(id, name, address)
    `);

  const { data, error } = isUuid && idOrTrackingCode.length > 20
    ? await query.eq('id', idOrTrackingCode).single()
    : await query.eq('tracking_code', idOrTrackingCode.toUpperCase()).single();

  if (error) {
    console.error('Error fetching delivery:', error);
    return null;
  }

  return data as Delivery;
}

export async function fetchAvailableCouriers(): Promise<Courier[]> {
  const { data, error } = await supabase
    .from('couriers')
    .select('*')
    .order('rating', { ascending: false });

  if (error) {
    console.error('Error fetching couriers:', error);
    throw new Error(error.message);
  }

  return (data as Courier[]) || [];
}

export async function fetchRestaurantStores(): Promise<RestaurantStore[]> {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching stores:', error);
    return [];
  }

  return (data as RestaurantStore[]) || [];
}

export interface CreateDeliveryInput {
  storeId?: string | null;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  pickupNotes?: string;
  pickupContactName?: string;
  pickupContactPhone?: string;
  deliveryAddress: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  deliveryNotes?: string;
  recipientName: string;
  recipientPhone: string;
  distanceKm: number;
  estimatedDurationMin: number;
  routeGeometry?: any;
  packageType?: string;
  packageDescription?: string;
  scheduledFor?: string | null;
  orderReferenceId?: string;
  receptionCode?: string;
  autoAssignCourier?: boolean;
}

export async function createDelivery(input: CreateDeliveryInput): Promise<Delivery> {
  const trackingCode = generateTrackingCode();
  const receptionCode = input.receptionCode || generateReceptionCode();
  const initialStatus: DeliveryStatus = input.scheduledFor
    ? 'scheduled'
    : input.autoAssignCourier
    ? 'searching_courier'
    : 'draft';

  const insertPayload = {
    tracking_code: trackingCode,
    reception_code: receptionCode,
    store_id: input.storeId || null,
    status: initialStatus,
    pickup_address: input.pickupAddress,
    pickup_latitude: input.pickupLatitude,
    pickup_longitude: input.pickupLongitude,
    pickup_notes: input.pickupNotes || null,
    pickup_contact_name: input.pickupContactName || 'Restaurante',
    pickup_contact_phone: input.pickupContactPhone || '',
    delivery_address: input.deliveryAddress,
    delivery_latitude: input.deliveryLatitude,
    delivery_longitude: input.deliveryLongitude,
    delivery_notes: input.deliveryNotes || null,
    recipient_name: input.recipientName,
    recipient_phone: input.recipientPhone,
    distance_km: input.distanceKm,
    estimated_duration_min: input.estimatedDurationMin,
    route_geometry: input.routeGeometry || [],
    package_type: input.packageType || 'food',
    package_description: input.packageDescription || 'Pedido de restaurante',
    scheduled_for: input.scheduledFor || null,
    order_reference_id: input.orderReferenceId || null,
  };

  const { data, error } = await supabase
    .from('deliveries')
    .insert(insertPayload)
    .select(`
      *,
      courier:couriers(*),
      store:stores(id, name, address)
    `)
    .single();

  if (error) {
    console.error('Error creating delivery:', error);
    throw new Error(error.message);
  }

  const createdDelivery = data as Delivery;

  // Log creation
  await supabase.from('delivery_status_logs').insert({
    delivery_id: createdDelivery.id,
    status: initialStatus,
    note: input.scheduledFor
      ? `Envío programado para ${new Date(input.scheduledFor).toLocaleTimeString()}`
      : 'Envío registrado en plataforma',
    latitude: input.pickupLatitude,
    longitude: input.pickupLongitude,
  });

  // If auto-assign is requested and not scheduled, match a courier
  if (input.autoAssignCourier && !input.scheduledFor) {
    try {
      const couriers = await fetchAvailableCouriers();
      if (couriers.length > 0) {
        const selected = couriers[Math.floor(Math.random() * couriers.length)];
        return await updateDeliveryStatus(
          createdDelivery.id,
          'assigned',
          `Repartidor asignado: ${selected.name}`,
          selected.id
        );
      }
    } catch (e) {
      console.warn('Auto-assignment failed, courier remains pending:', e);
    }
  }

  return createdDelivery;
}

export async function updateDeliveryStatus(
  deliveryId: string,
  newStatus: DeliveryStatus,
  note?: string,
  courierId?: string
): Promise<Delivery> {
  const updateData: any = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (courierId) {
    updateData.courier_id = courierId;
  }

  const { data, error } = await supabase
    .from('deliveries')
    .update(updateData)
    .eq('id', deliveryId)
    .select(`
      *,
      courier:couriers(*),
      store:stores(id, name, address)
    `)
    .single();

  if (error) {
    console.error('Error updating delivery status:', error);
    throw new Error(error.message);
  }

  // Insert status event log
  await supabase.from('delivery_status_logs').insert({
    delivery_id: deliveryId,
    status: newStatus,
    note: note || `Estado actualizado a ${newStatus}`,
  });

  return data as Delivery;
}

/**
 * Last Mile Handover: verifies the 4-digit reception code dictated by the recipient to the messenger.
 * If valid, completes the delivery and records the verification timestamp.
 */
export async function verifyAndCompleteDelivery(
  deliveryId: string,
  inputCode: string
): Promise<{ success: boolean; delivery?: Delivery; error?: string }> {
  // 1. Fetch current delivery with expected reception_code
  const { data: delivery, error: fetchErr } = await supabase
    .from('deliveries')
    .select('*')
    .eq('id', deliveryId)
    .single();

  if (fetchErr || !delivery) {
    return { success: false, error: 'No se encontró el envío para verificar entrega' };
  }

  // 2. Validate reception code
  const isValid = verifyReceptionCode(delivery.reception_code, inputCode);
  if (!isValid) {
    // Log failed attempt
    await supabase.from('delivery_status_logs').insert({
      delivery_id: deliveryId,
      status: delivery.status,
      note: `Intento fallido de validación de entrega con código: "${inputCode}"`,
    });
    return {
      success: false,
      error: 'Código de entrega incorrecto. El cliente debe dictar el código de 4 dígitos exacto.',
    };
  }

  // 3. Mark as delivered with timestamp
  const now = new Date().toISOString();
  const { data: updatedDelivery, error: updateErr } = await supabase
    .from('deliveries')
    .update({
      status: 'delivered',
      reception_verified_at: now,
      updated_at: now,
    })
    .eq('id', deliveryId)
    .select(`
      *,
      courier:couriers(*),
      store:stores(id, name, address)
    `)
    .single();

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  // 4. Log successful handover
  await supabase.from('delivery_status_logs').insert({
    delivery_id: deliveryId,
    status: 'delivered',
    note: `Código verificado exitosamente (${inputCode}). Paquete entregado al cliente en destino.`,
  });

  return { success: true, delivery: updatedDelivery as Delivery };
}

export async function fetchDeliveryLogs(deliveryId: string): Promise<DeliveryStatusLog[]> {
  const { data, error } = await supabase
    .from('delivery_status_logs')
    .select('*')
    .eq('delivery_id', deliveryId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching logs:', error);
    return [];
  }

  return (data as DeliveryStatusLog[]) || [];
}
