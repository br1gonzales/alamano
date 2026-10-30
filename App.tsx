import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import {
  Bike,
  PlusCircle,
  ListOrdered,
  UtensilsCrossed,
  ShieldCheck,
  Compass,
  Navigation,
} from 'lucide-react-native';
import { NewDeliveryForm } from './src/components/NewDeliveryForm';
import { DeliveriesList } from './src/components/DeliveriesList';
import { DeliveryTrackingModal } from './src/components/DeliveryTrackingModal';
import { Delivery } from './src/types/database';
import { useRealtimeDeliverySync } from './src/hooks/useDeliveries';

// Create a singleton TanStack QueryClient with optimal caching settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 10 * 60 * 1000, // 10 minutes cache retention
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const AlamanoDeliveryApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'new' | 'list'>('new');
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);

  // Activate Supabase Realtime cache synchronization
  useRealtimeDeliverySync();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0B132B" />

      {/* Top Navigation Bar / Branding */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Bike size={20} color="#8B5CF6" />
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.appName}>alamano</Text>
              <View style={styles.taglineBadge}>
                <Text style={styles.taglineText}>Envío Express</Text>
              </View>
            </View>
            <Text style={styles.appSub}>
              Despacho de Envíos para Restaurantes Alacarta
            </Text>
          </View>
        </View>

        {/* Integration Pill */}
        <View style={styles.alacartaPill}>
          <UtensilsCrossed size={12} color="#10B981" />
          <Text style={styles.alacartaText}>Alacarta Sync</Text>
        </View>
      </View>

      {/* Main Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'new' && styles.tabButtonActive]}
          onPress={() => setActiveTab('new')}
          activeOpacity={0.8}
        >
          <PlusCircle
            size={16}
            color={activeTab === 'new' ? '#FFFFFF' : '#94A3B8'}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'new' && styles.tabButtonTextActive,
            ]}
          >
            Nuevo Despacho
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'list' && styles.tabButtonActive]}
          onPress={() => setActiveTab('list')}
          activeOpacity={0.8}
        >
          <ListOrdered
            size={16}
            color={activeTab === 'list' ? '#FFFFFF' : '#94A3B8'}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'list' && styles.tabButtonTextActive,
            ]}
          >
            Envíos Activos & Historial
          </Text>
        </TouchableOpacity>
      </View>

      {/* Screen Body */}
      <View style={styles.body}>
        {activeTab === 'new' ? (
          <NewDeliveryForm
            onDeliveryCreated={(created) => {
              setSelectedDelivery(created);
              setActiveTab('list');
            }}
          />
        ) : (
          <DeliveriesList
            onSelectDelivery={(delivery) => setSelectedDelivery(delivery)}
            onNewDeliveryPress={() => setActiveTab('new')}
          />
        )}
      </View>

      {/* Real-time Order Tracking Drawer / Modal */}
      <DeliveryTrackingModal
        delivery={selectedDelivery}
        onClose={() => setSelectedDelivery(null)}
      />
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AlamanoDeliveryApp />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B132B',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  appName: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  taglineBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  taglineText: {
    color: '#C4B5FD',
    fontSize: 10,
    fontWeight: '700',
  },
  appSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },
  alacartaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  alacartaText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  tabButtonText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  body: {
    flex: 1,
    backgroundColor: '#0B132B',
  },
});
