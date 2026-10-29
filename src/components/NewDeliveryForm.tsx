import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Store,
  User,
  Phone,
  FileText,
  Send,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react-native';
import { AddressInputCard } from './AddressInputCard';
import { CabifyMap } from './CabifyMap';
import { CourierSelectorCard } from './CourierSelectorCard';
import { Coordinates, VehicleType, Delivery } from '../types/database';
import {
  useRouteQuery,
  useCreateDeliveryMutation,
  useStoresQuery,
} from '../hooks/useDeliveries';
import { PRESET_LOCATIONS, isWithinCoveredArea } from '../services/routingService';

interface NewDeliveryFormProps {
  onDeliveryCreated: (delivery: Delivery) => void;
}

export const NewDeliveryForm: React.FC<NewDeliveryFormProps> = ({
  onDeliveryCreated,
}) => {
  // Store integration (from alacarta)
  const { data: stores = [], isLoading: isLoadingStores } = useStoresQuery();
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');

  // Dual Addresses & Coordinates
  const [originAddress, setOriginAddress] = useState<string>(
    PRESET_LOCATIONS[0].address
  );
  const [originCoords, setOriginCoords] = useState<Coordinates>(
    PRESET_LOCATIONS[0].coordinates
  );

  const [destinationAddress, setDestinationAddress] = useState<string>(
    PRESET_LOCATIONS[1].address
  );
  const [destinationCoords, setDestinationCoords] = useState<Coordinates>(
    PRESET_LOCATIONS[1].coordinates
  );

  // Recipient details
  const [recipientName, setRecipientName] = useState<string>('María Rojas');
  const [recipientPhone, setRecipientPhone] = useState<string>('+51 987 112 233');
  const [pickupNotes, setPickupNotes] = useState<string>('Mesa 4 / Recoger en barra');
  const [deliveryNotes, setDeliveryNotes] = useState<string>('Piso 5, timbre 501');
  const [orderReferenceId, setOrderReferenceId] = useState<string>('ALACARTA-#104');

  // Courier service options
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('motorcycle');
  const [isScheduled, setIsScheduled] = useState<boolean>(false);
  const [scheduledTime, setScheduledTime] = useState<string>('En 30 min');

  // TanStack Query for Road Route calculation (cached!)
  const { data: routeInfo, isLoading: isLoadingRoute } = useRouteQuery(
    originCoords,
    destinationCoords
  );

  // TanStack Query mutation for creating delivery
  const createDeliveryMutation = useCreateDeliveryMutation();

  // District Coverage Validation (Only Surquillo, Miraflores, Barranco)
  const originCoverage = isWithinCoveredArea(originCoords, originAddress);
  const destinationCoverage = isWithinCoveredArea(destinationCoords, destinationAddress);
  const isTripAllowed = originCoverage.isCovered && destinationCoverage.isCovered;

  // If stores loaded and none selected, auto-select first or match
  useEffect(() => {
    if (stores.length > 0 && !selectedStoreId) {
      setSelectedStoreId(stores[0].id);
      if (stores[0].address) {
        setOriginAddress(stores[0].address);
      }
    }
  }, [stores, selectedStoreId]);

  const handleSelectStore = (storeId: string) => {
    setSelectedStoreId(storeId);
    const store = stores.find((s) => s.id === storeId);
    if (store && store.address) {
      setOriginAddress(store.address);
    }
  };

  const handleDispatch = () => {
    if (!originAddress || !destinationAddress) {
      Alert.alert('Falta dirección', 'Por favor ingresa punto de origen y punto de entrega.');
      return;
    }
    if (!isTripAllowed) {
      Alert.alert(
        'Ruta Fuera de Cobertura',
        'Por el momento solo se permite planificar viajes dentro de los distritos iniciales: Surquillo, Miraflores y Barranco.'
      );
      return;
    }
    if (!recipientName || !recipientPhone) {
      Alert.alert('Falta destinatario', 'Por favor ingresa nombre y teléfono del destinatario.');
      return;
    }

    const distanceKm = routeInfo?.distanceKm || 4.5;
    const durationMin = routeInfo?.durationMinutes || 15;

    createDeliveryMutation.mutate(
      {
        storeId: selectedStoreId || null,
        pickupAddress: originAddress,
        pickupLatitude: originCoords.latitude,
        pickupLongitude: originCoords.longitude,
        pickupNotes,
        deliveryAddress: destinationAddress,
        deliveryLatitude: destinationCoords.latitude,
        deliveryLongitude: destinationCoords.longitude,
        deliveryNotes,
        recipientName,
        recipientPhone,
        distanceKm,
        estimatedDurationMin: durationMin,
        routeGeometry: routeInfo?.coordinates || [],
        packageType: 'food',
        packageDescription: `Pedido de comida - ${orderReferenceId || 'Alacarta'}`,
        scheduledFor: isScheduled ? new Date(Date.now() + 45 * 60000).toISOString() : null,
        orderReferenceId,
        autoAssignCourier: true,
      },
      {
        onSuccess: (newDelivery) => {
          onDeliveryCreated(newDelivery);
        },
        onError: (err) => {
          Alert.alert('Error', `No se pudo registrar el envío: ${err.message}`);
        },
      }
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Restaurant Store Header Picker */}
      <View style={styles.storePickerSection}>
        <View style={styles.sectionHeaderRow}>
          <Store size={16} color="#10B981" />
          <Text style={styles.sectionHeaderTitle}>RESTAURANTE / SUCURSAL EMISORA</Text>
        </View>

        {stores.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storesChipsRow}>
            {stores.map((s) => {
              const isSelected = s.id === selectedStoreId;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.storeChip, isSelected && styles.storeChipSelected]}
                  onPress={() => handleSelectStore(s.id)}
                >
                  <Text style={[styles.storeChipText, isSelected && styles.storeChipTextSelected]}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.defaultStoreBanner}>
            <Text style={styles.defaultStoreText}>Alacarta Central Kitchen (Modo Restaurante)</Text>
          </View>
        )}
      </View>

      {/* Visual Cabify Route Map */}
      <CabifyMap
        origin={originCoords}
        destination={destinationCoords}
        routeInfo={routeInfo || null}
        originLabel={originAddress}
        destinationLabel={destinationAddress}
        height={220}
      />

      {/* Dual Address Input Card with mileage calculation */}
      <AddressInputCard
        origin={originCoords}
        originAddress={originAddress}
        onSelectOrigin={(addr, coords) => {
          setOriginAddress(addr);
          setOriginCoords(coords);
        }}
        destination={destinationCoords}
        destinationAddress={destinationAddress}
        onSelectDestination={(addr, coords) => {
          setDestinationAddress(addr);
          setDestinationCoords(coords);
        }}
        routeInfo={routeInfo || null}
        isLoadingRoute={isLoadingRoute}
      />

      {/* Courier Vehicle & Schedule Selector */}
      <CourierSelectorCard
        selectedVehicle={selectedVehicle}
        onSelectVehicle={setSelectedVehicle}
        isScheduled={isScheduled}
        onToggleScheduled={setIsScheduled}
        scheduledTime={scheduledTime}
        onSelectScheduledTime={setScheduledTime}
        durationMinutes={routeInfo?.durationMinutes || 15}
      />

      {/* Recipient and Order Details Card */}
      <View style={styles.detailsCard}>
        <Text style={styles.cardHeader}>DATOS DEL CLIENTE Y PEDIDO ALACARTA</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Nombre del Destinatario</Text>
          <View style={styles.inputWrap}>
            <User size={16} color="#94A3B8" />
            <TextInput
              style={styles.textInput}
              value={recipientName}
              onChangeText={setRecipientName}
              placeholder="Ej. Juan Pérez"
              placeholderTextColor="#64748B"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Teléfono de Contacto</Text>
          <View style={styles.inputWrap}>
            <Phone size={16} color="#94A3B8" />
            <TextInput
              style={styles.textInput}
              value={recipientPhone}
              onChangeText={setRecipientPhone}
              placeholder="+51 999 000 111"
              placeholderTextColor="#64748B"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Referencia / N° de Pedido Alacarta</Text>
          <View style={styles.inputWrap}>
            <FileText size={16} color="#94A3B8" />
            <TextInput
              style={styles.textInput}
              value={orderReferenceId}
              onChangeText={setOrderReferenceId}
              placeholder="Ej. PEDIDO-3891"
              placeholderTextColor="#64748B"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Instrucciones de Entrega (Dpto, timbre, etc.)</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={deliveryNotes}
            onChangeText={setDeliveryNotes}
            placeholder="Ej. Piso 4, Dpto 402, llamar al llegar..."
            placeholderTextColor="#64748B"
            multiline
            numberOfLines={2}
          />
        </View>
      </View>

      {/* Final Action Button */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          (!isTripAllowed || createDeliveryMutation.isPending) && styles.submitButtonDisabled,
          !isTripAllowed && styles.submitButtonBlocked,
        ]}
        onPress={handleDispatch}
        disabled={!isTripAllowed || createDeliveryMutation.isPending}
        activeOpacity={0.8}
      >
        {createDeliveryMutation.isPending ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : !isTripAllowed ? (
          <>
            <AlertTriangle size={18} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>
              Fuera de Cobertura (Solo Surquillo, Miraflores y Barranco)
            </Text>
          </>
        ) : (
          <>
            <Send size={18} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>
              {isScheduled ? 'Programar Envío' : 'Solicitar Repartidor Ahora'}
            </Text>
          </>
        )}
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  storePickerSection: {
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionHeaderTitle: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  storesChipsRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  storeChip: {
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  storeChipSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  storeChipText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  storeChipTextSelected: {
    color: '#10B981',
    fontWeight: '700',
  },
  defaultStoreBanner: {
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  defaultStoreText: {
    color: '#CBD5E1',
    fontSize: 13,
  },
  detailsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginVertical: 8,
  },
  cardHeader: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  textInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    paddingVertical: 10,
  },
  textArea: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#334155',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
    marginTop: 10,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonBlocked: {
    backgroundColor: '#7F1D1D',
    borderColor: '#EF4444',
    borderWidth: 1,
    shadowColor: '#EF4444',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
