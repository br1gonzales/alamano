export type VehicleType = 'motorcycle' | 'bicycle' | 'car' | 'van';

export type CourierStatus = 'available' | 'busy' | 'offline';

export type DeliveryStatus =
  | 'draft'
  | 'scheduled'
  | 'searching_courier'
  | 'assigned'
  | 'heading_to_pickup'
  | 'arrived_at_pickup'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export type PackageType = 'food' | 'documents' | 'fragile' | 'box' | 'other';

export interface Courier {
  id: string;
  name: string;
  phone: string | null;
  vehicle_type: VehicleType;
  vehicle_plate: string | null;
  status: CourierStatus;
  current_latitude: number | null;
  current_longitude: number | null;
  rating: number;
  avatar_url: string | null;
  created_at: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface RouteInfo {
  distanceKm: number;
  distanceMiles: number;
  durationMinutes: number;
  coordinates: [number, number][]; // [lat, lng] array
  summary: string;
  tollOrHighways?: boolean;
}

export interface Delivery {
  id: string;
  store_id: string | null;
  tracking_code: string;
  status: DeliveryStatus;
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  pickup_notes?: string | null;
  pickup_contact_name?: string | null;
  pickup_contact_phone?: string | null;
  delivery_address: string;
  delivery_latitude: number;
  delivery_longitude: number;
  delivery_notes?: string | null;
  recipient_name: string;
  recipient_phone: string;
  distance_km: number;
  estimated_duration_min: number;
  route_geometry?: [number, number][] | any;
  package_type: PackageType;
  package_description?: string | null;
  scheduled_for?: string | null;
  courier_id?: string | null;
  order_reference_id?: string | null;
  reception_code: string; // 4-digit code recited by recipient to courier
  reception_verified_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  // Joined relation:
  courier?: Courier | null;
  store?: {
    id: string;
    name: string;
    address: string | null;
  } | null;
}

export interface DeliveryStatusLog {
  id: string;
  delivery_id: string;
  status: DeliveryStatus;
  note: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface RestaurantStore {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
}
