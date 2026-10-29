import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import {
  Search,
  MapPin,
  Store,
  Navigation,
  Clock,
  ChevronRight,
  PackageCheck,
  Bike,
  Sparkles,
  Inbox,
} from 'lucide-react-native';
import { Delivery, DeliveryStatus } from '../types/database';
import { useDeliveriesQuery } from '../hooks/useDeliveries';

interface DeliveriesListProps {
  onSelectDelivery: (delivery: Delivery) => void;
  onNewDeliveryPress: () => void;
}

export const DeliveriesList: React.FC<DeliveriesListProps> = ({
  onSelectDelivery,
  onNewDeliveryPress,
}) => {
  const { data: deliveries = [], isLoading, isRefetching, refetch } = useDeliveriesQuery();
  const [filter, setFilter] = useState<'all' | 'active' | 'delivered'>('all');
  const [search, setSearch] = useState('');

  const filteredDeliveries = deliveries.filter((item) => {
    // Filter by status tab
    if (filter === 'active') {
      if (item.status === 'delivered' || item.status === 'cancelled') return false;
    } else if (filter === 'delivered') {
      if (item.status !== 'delivered') return false;
    }

    // Filter by search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchCode = item.tracking_code.toLowerCase().includes(q);
      const matchClient = item.recipient_name.toLowerCase().includes(q);
      const matchAddress = item.delivery_address.toLowerCase().includes(q);
      const matchRef = item.order_reference_id?.toLowerCase().includes(q);
      return matchCode || matchClient || matchAddress || matchRef;
    }

    return true;
  });

  const getStatusColor = (status: DeliveryStatus) => {
    switch (status) {
      case 'delivered':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', label: 'Entregado' };
      case 'in_transit':
        return { bg: 'rgba(139, 92, 246, 0.2)', text: '#A78BFA', label: 'En Ruta' };
      case 'arrived_at_pickup':
        return { bg: 'rgba(245, 158, 11, 0.2)', text: '#F59E0B', label: 'En Restaurante' };
      case 'heading_to_pickup':
        return { bg: 'rgba(59, 130, 246, 0.2)', text: '#60A5FA', label: 'Hacia Local' };
      case 'searching_courier':
        return { bg: 'rgba(236, 72, 153, 0.2)', text: '#F472B6', label: 'Buscando' };
      case 'cancelled':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', label: 'Cancelado' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.15)', text: '#94A3B8', label: status };
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchBar}>
        <Search size={16} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por código, cliente o pedido..."
          placeholderTextColor="#64748B"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabsRow}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
            Todos ({deliveries.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'active' && styles.filterTabActive]}
          onPress={() => setFilter('active')}
        >
          <Text style={[styles.filterTabText, filter === 'active' && styles.filterTabTextActive]}>
            Activos (
            {deliveries.filter((d) => d.status !== 'delivered' && d.status !== 'cancelled').length}
            )
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'delivered' && styles.filterTabActive]}
          onPress={() => setFilter('delivered')}
        >
          <Text style={[styles.filterTabText, filter === 'delivered' && styles.filterTabTextActive]}>
            Entregados ({deliveries.filter((d) => d.status === 'delivered').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Deliveries List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Cargando envíos desde Supabase...</Text>
        </View>
      ) : filteredDeliveries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Inbox size={48} color="#475569" />
          <Text style={styles.emptyTitle}>No hay envíos registrados</Text>
          <Text style={styles.emptySub}>
            Programa el primer despacho para un pedido de restaurante.
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={onNewDeliveryPress}>
            <Text style={styles.emptyButtonText}>Crear Primer Envío</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredDeliveries}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#8B5CF6"
            />
          }
          renderItem={({ item }) => {
            const statusStyle = getStatusColor(item.status);
            const miles = (Number(item.distance_km) * 0.621371).toFixed(2);

            return (
              <TouchableOpacity
                style={styles.deliveryCard}
                onPress={() => onSelectDelivery(item)}
                activeOpacity={0.7}
              >
                {/* Header row: tracking code + status */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.codeWrap}>
                    <Text style={styles.codeText}>{item.tracking_code}</Text>
                    {item.order_reference_id && (
                      <Text style={styles.refText}>• {item.order_reference_id}</Text>
                    )}
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusStyle.bg },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>
                      {statusStyle.label}
                    </Text>
                  </View>
                </View>

                {/* Addresses */}
                <View style={styles.routeCol}>
                  <View style={styles.addressRow}>
                    <View style={styles.originDot} />
                    <Text style={styles.addressText} numberOfLines={1}>
                      {item.pickup_address}
                    </Text>
                  </View>

                  <View style={styles.verticalDottedLine} />

                  <View style={styles.addressRow}>
                    <View style={styles.destDot} />
                    <Text style={styles.addressText} numberOfLines={1}>
                      {item.delivery_address}
                    </Text>
                  </View>
                </View>

                {/* Footer: recipient + mileage + courier */}
                <View style={styles.cardFooter}>
                  <View style={styles.footerLeft}>
                    <Text style={styles.clientName}>{item.recipient_name}</Text>
                    <View style={styles.distanceBadge}>
                      <Navigation size={12} color="#10B981" />
                      <Text style={styles.distanceText}>
                        {item.distance_km} km ({miles} mi)
                      </Text>
                    </View>
                  </View>

                  {item.courier ? (
                    <View style={styles.courierMiniWrap}>
                      <Image
                        source={{
                          uri:
                            item.courier.avatar_url ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                        }}
                        style={styles.courierMiniAvatar}
                      />
                      <View>
                        <Text style={styles.courierMiniName}>
                          {item.courier.name.split(' ')[0]}
                        </Text>
                        <Text style={styles.courierMiniVehicle}>
                          {item.courier.vehicle_plate || 'Moto'}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <ChevronRight size={18} color="#64748B" />
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
  },
  filterTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: '#8B5CF6',
  },
  filterTabText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySub: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 240,
  },
  emptyButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginTop: 16,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  deliveryCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  codeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  codeText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  refText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  routeCol: {
    marginBottom: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  originDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  destDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EC4899',
  },
  verticalDottedLine: {
    width: 1,
    height: 10,
    backgroundColor: '#475569',
    marginLeft: 3.5,
    marginVertical: 2,
  },
  addressText: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  footerLeft: {
    gap: 3,
  },
  clientName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
  },
  courierMiniWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  courierMiniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  courierMiniName: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
  },
  courierMiniVehicle: {
    color: '#94A3B8',
    fontSize: 10,
  },
});
