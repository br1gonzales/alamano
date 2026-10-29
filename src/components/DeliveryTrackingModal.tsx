import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  Phone,
  MapPin,
  Store,
  Navigation,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  Bike,
  ShieldCheck,
  Play,
  RotateCcw,
} from 'lucide-react-native';
import { Delivery, DeliveryStatus } from '../types/database';
import { CabifyMap } from './CabifyMap';
import { useUpdateDeliveryStatusMutation, useDeliveryLogsQuery } from '../hooks/useDeliveries';

interface DeliveryTrackingModalProps {
  delivery: Delivery | null;
  onClose: () => void;
}

const STATUS_STEPS: Array<{ key: DeliveryStatus; label: string; desc: string }> = [
  { key: 'searching_courier', label: 'Buscando Repartidor', desc: 'Asignando repartidor cercano' },
  { key: 'heading_to_pickup', label: 'En camino al Restaurante', desc: 'Repartidor dirigiéndose a recoger' },
  { key: 'arrived_at_pickup', label: 'En el Restaurante', desc: 'Esperando empaque del pedido' },
  { key: 'in_transit', label: 'En Ruta de Entrega', desc: 'Llevando pedido al cliente' },
  { key: 'delivered', label: 'Entregado con Éxito', desc: 'Pedido recibido por el cliente' },
];

export const DeliveryTrackingModal: React.FC<DeliveryTrackingModalProps> = ({
  delivery,
  onClose,
}) => {
  const updateStatusMutation = useUpdateDeliveryStatusMutation();
  const { data: logs = [] } = useDeliveryLogsQuery(delivery?.id || null);

  if (!delivery) return null;

  const getStatusIndex = (current: DeliveryStatus): number => {
    if (current === 'draft' || current === 'searching_courier' || current === 'scheduled') return 0;
    if (current === 'assigned' || current === 'heading_to_pickup') return 1;
    if (current === 'arrived_at_pickup' || current === 'picked_up') return 2;
    if (current === 'in_transit') return 3;
    if (current === 'delivered') return 4;
    return 0;
  };

  const currentStepIdx = getStatusIndex(delivery.status);

  // Simulation: advance to the next delivery lifecycle stage
  const advanceToNextStatus = () => {
    let nextStatus: DeliveryStatus = 'heading_to_pickup';
    let note = '';

    if (delivery.status === 'draft' || delivery.status === 'searching_courier' || delivery.status === 'scheduled') {
      nextStatus = 'heading_to_pickup';
      note = 'Repartidor aceptó y viaja al local';
    } else if (delivery.status === 'assigned' || delivery.status === 'heading_to_pickup') {
      nextStatus = 'arrived_at_pickup';
      note = 'Repartidor llegó a la cocina / local';
    } else if (delivery.status === 'arrived_at_pickup' || delivery.status === 'picked_up') {
      nextStatus = 'in_transit';
      note = 'Pedido empacado y en camino al cliente';
    } else if (delivery.status === 'in_transit') {
      nextStatus = 'delivered';
      note = 'Pedido entregado en puerta al destinatario';
    }

    updateStatusMutation.mutate({
      deliveryId: delivery.id,
      status: nextStatus,
      note,
    });
  };

  const cancelDelivery = () => {
    updateStatusMutation.mutate({
      deliveryId: delivery.id,
      status: 'cancelled',
      note: 'Envío cancelado por el restaurante',
    });
  };

  const callPhone = (phone: string | null) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`).catch((e) =>
      console.warn('Could not call:', e)
    );
  };

  const originCoords = {
    latitude: delivery.pickup_latitude,
    longitude: delivery.pickup_longitude,
  };
  const destCoords = {
    latitude: delivery.delivery_latitude,
    longitude: delivery.delivery_longitude,
  };

  const courierCoords = delivery.courier?.current_latitude && delivery.courier?.current_longitude
    ? {
        latitude: delivery.courier.current_latitude,
        longitude: delivery.courier.current_longitude,
      }
    : null;

  return (
    <Modal visible={!!delivery} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Top Header */}
          <View style={styles.header}>
            <View>
              <View style={styles.trackingBadgeRow}>
                <Text style={styles.trackingCode}>{delivery.tracking_code}</Text>
                <View
                  style={[
                    styles.statusPill,
                    delivery.status === 'delivered'
                      ? styles.statusPillDelivered
                      : delivery.status === 'cancelled'
                      ? styles.statusPillCancelled
                      : styles.statusPillActive,
                  ]}
                >
                  <Text style={styles.statusPillText}>
                    {delivery.status === 'delivered'
                      ? 'ENTREGADO'
                      : delivery.status === 'cancelled'
                      ? 'CANCELADO'
                      : 'EN CURSO'}
                  </Text>
                </View>
              </View>
              <Text style={styles.headerSub}>
                {delivery.order_reference_id
                  ? `Pedido Alacarta: ${delivery.order_reference_id}`
                  : 'Envío de Restaurante'}
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Live Visual Route Map */}
            <CabifyMap
              origin={originCoords}
              destination={destCoords}
              routeInfo={{
                distanceKm: Number(delivery.distance_km),
                distanceMiles: Number((Number(delivery.distance_km) * 0.621371).toFixed(2)),
                durationMinutes: delivery.estimated_duration_min,
                coordinates: Array.isArray(delivery.route_geometry)
                  ? delivery.route_geometry
                  : [],
                summary: 'Ruta activa',
              }}
              courierLocation={courierCoords}
              courierName={delivery.courier?.name}
              height={200}
            />

            {/* Courier Card (if assigned) */}
            {delivery.courier ? (
              <View style={styles.courierCard}>
                <Image
                  source={{
                    uri:
                      delivery.courier.avatar_url ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                  }}
                  style={styles.courierAvatar}
                />
                <View style={styles.courierInfo}>
                  <Text style={styles.courierName}>{delivery.courier.name}</Text>
                  <Text style={styles.courierVehicle}>
                    {delivery.courier.vehicle_type === 'motorcycle' ? 'Moto' : 'Bicicleta'} •{' '}
                    {delivery.courier.vehicle_plate || 'Sin placa'}
                  </Text>
                  <View style={styles.ratingRow}>
                    <Text style={styles.ratingText}>★ {delivery.courier.rating.toFixed(1)}</Text>
                    <ShieldCheck size={12} color="#10B981" />
                    <Text style={styles.verifiedText}>Repartidor Verificado</Text>
                  </View>
                </View>

                {delivery.courier.phone && (
                  <TouchableOpacity
                    style={styles.callButton}
                    onPress={() => callPhone(delivery.courier?.phone || null)}
                  >
                    <Phone size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.searchingCourierBanner}>
                <ActivityIndicator size="small" color="#8B5CF6" />
                <Text style={styles.searchingCourierText}>
                  Buscando repartidor disponible en la zona...
                </Text>
              </View>
            )}

            {/* Step Timeline */}
            <View style={styles.timelineCard}>
              <Text style={styles.timelineTitle}>ESTADO DEL ENVÍO</Text>
              <View style={styles.stepsWrapper}>
                {STATUS_STEPS.map((step, idx) => {
                  const isDone = idx < currentStepIdx;
                  const isCurrent = idx === currentStepIdx;

                  return (
                    <View key={step.key} style={styles.stepRow}>
                      <View style={styles.stepIndicatorCol}>
                        <View
                          style={[
                            styles.stepCircle,
                            isDone && styles.stepCircleDone,
                            isCurrent && styles.stepCircleCurrent,
                          ]}
                        >
                          {isDone ? (
                            <CheckCircle2 size={12} color="#FFFFFF" />
                          ) : (
                            <View
                              style={[
                                styles.stepInnerDot,
                                isCurrent && styles.stepInnerDotCurrent,
                              ]}
                            />
                          )}
                        </View>
                        {idx < STATUS_STEPS.length - 1 && (
                          <View
                            style={[
                              styles.stepLine,
                              isDone && styles.stepLineDone,
                            ]}
                          />
                        )}
                      </View>

                      <View style={styles.stepTextCol}>
                        <Text
                          style={[
                            styles.stepLabel,
                            (isDone || isCurrent) && styles.stepLabelActive,
                          ]}
                        >
                          {step.label}
                        </Text>
                        <Text style={styles.stepDesc}>{step.desc}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Address Details */}
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <Store size={16} color="#10B981" style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.detailTitle}>Origen / Restaurante</Text>
                  <Text style={styles.detailValue}>{delivery.pickup_address}</Text>
                  {delivery.pickup_notes && (
                    <Text style={styles.detailNote}>Nota: {delivery.pickup_notes}</Text>
                  )}
                </View>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.detailRow}>
                <MapPin size={16} color="#EC4899" style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.detailTitle}>Destino / Cliente</Text>
                  <Text style={styles.detailValue}>{delivery.delivery_address}</Text>
                  <Text style={styles.recipientInfo}>
                    Recibe: {delivery.recipient_name} • {delivery.recipient_phone}
                  </Text>
                  {delivery.delivery_notes && (
                    <Text style={styles.detailNote}>Indicación: {delivery.delivery_notes}</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Dispatcher Actions */}
            {delivery.status !== 'delivered' && delivery.status !== 'cancelled' && (
              <View style={styles.actionButtonsWrap}>
                <TouchableOpacity
                  style={styles.advanceStatusBtn}
                  onPress={advanceToNextStatus}
                  disabled={updateStatusMutation.isPending}
                >
                  <Play size={16} color="#FFFFFF" />
                  <Text style={styles.advanceStatusText}>
                    {updateStatusMutation.isPending
                      ? 'Actualizando...'
                      : 'Simular Siguiente Estado de Repartidor'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={cancelDelivery}
                  disabled={updateStatusMutation.isPending}
                >
                  <Text style={styles.cancelBtnText}>Cancelar Envío</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  trackingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackingCode: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusPill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statusPillActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  statusPillDelivered: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  statusPillCancelled: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  statusPillText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '700',
  },
  headerSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  scrollArea: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  courierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginVertical: 10,
  },
  courierAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  courierInfo: {
    flex: 1,
  },
  courierName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  courierVehicle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
  },
  verifiedText: {
    color: '#10B981',
    fontSize: 11,
  },
  callButton: {
    backgroundColor: '#10B981',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchingCourierBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchingCourierText: {
    color: '#C4B5FD',
    fontSize: 13,
    fontWeight: '500',
  },
  timelineCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginVertical: 8,
  },
  timelineTitle: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  stepsWrapper: {
    paddingLeft: 4,
  },
  stepRow: {
    flexDirection: 'row',
    minHeight: 44,
  },
  stepIndicatorCol: {
    width: 20,
    alignItems: 'center',
  },
  stepCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#475569',
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  stepCircleCurrent: {
    borderColor: '#8B5CF6',
  },
  stepInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'transparent',
  },
  stepInnerDotCurrent: {
    backgroundColor: '#8B5CF6',
  },
  stepLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#334155',
    marginVertical: 2,
  },
  stepLineDone: {
    backgroundColor: '#10B981',
  },
  stepTextCol: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 14,
  },
  stepLabel: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  stepLabelActive: {
    color: '#F8FAFC',
  },
  stepDesc: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  detailsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginVertical: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  recipientInfo: {
    color: '#C4B5FD',
    fontSize: 12,
    marginTop: 4,
  },
  detailNote: {
    color: '#F59E0B',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 12,
  },
  actionButtonsWrap: {
    marginVertical: 16,
    gap: 10,
  },
  advanceStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  advanceStatusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
});
