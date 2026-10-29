import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Modal,
  Alert,
} from 'react-native';
import {
  MapPin,
  Store,
  Navigation,
  Search,
  X,
  Compass,
  ArrowRight,
  Clock,
  Sparkles,
  Shield,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react-native';
import { Coordinates, RouteInfo } from '../types/database';
import {
  searchAddress,
  isWithinCoveredArea,
  PRESET_LOCATIONS,
  PresetLocation,
  AddressSearchResult,
} from '../services/routingService';

interface AddressInputCardProps {
  origin: Coordinates | null;
  originAddress: string;
  onSelectOrigin: (address: string, coords: Coordinates) => void;
  destination: Coordinates | null;
  destinationAddress: string;
  onSelectDestination: (address: string, coords: Coordinates) => void;
  routeInfo: RouteInfo | null;
  isLoadingRoute: boolean;
}

export const AddressInputCard: React.FC<AddressInputCardProps> = ({
  origin,
  originAddress,
  onSelectOrigin,
  destination,
  destinationAddress,
  onSelectDestination,
  routeInfo,
  isLoadingRoute,
}) => {
  const [activePicker, setActivePicker] = useState<'origin' | 'destination' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Coverage checks for currently selected points
  const originCoverage = origin
    ? isWithinCoveredArea(origin, originAddress)
    : null;
  const destinationCoverage = destination
    ? isWithinCoveredArea(destination, destinationAddress)
    : null;

  // Debounced address search
  useEffect(() => {
    if (!activePicker) return;
    if (searchQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchAddress(searchQuery);
      setSuggestions(results);
      setIsSearching(false);
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery, activePicker]);

  const openPicker = (type: 'origin' | 'destination') => {
    setActivePicker(type);
    setSearchQuery('');
    setSuggestions([]);
  };

  const selectSuggestion = (
    name: string,
    lat: number,
    lng: number,
    isCovered: boolean
  ) => {
    if (!isCovered) {
      Alert.alert(
        'Zona Fuera de Cobertura',
        'Por el momento el servicio de entrega solo está habilitado en los distritos de Surquillo, Miraflores y Barranco.',
        [{ text: 'Entendido' }]
      );
    }

    if (activePicker === 'origin') {
      onSelectOrigin(name, { latitude: lat, longitude: lng });
    } else if (activePicker === 'destination') {
      onSelectDestination(name, { latitude: lat, longitude: lng });
    }
    setActivePicker(null);
  };

  const selectPreset = (preset: PresetLocation) => {
    selectSuggestion(
      preset.address,
      preset.coordinates.latitude,
      preset.coordinates.longitude,
      true
    );
  };

  return (
    <View style={styles.card}>
      {/* Covered Area Badge Pill */}
      <View style={styles.coverageBadgeRow}>
        <Shield size={13} color="#10B981" />
        <Text style={styles.coverageBadgeText}>
          Zona de cobertura habilitada: Surquillo • Miraflores • Barranco
        </Text>
      </View>

      {/* Dual Address Container with Cabify Connected Dots */}
      <View style={styles.addressInputsWrapper}>
        {/* Left Side: Connected Dots & Line */}
        <View style={styles.timelineColumn}>
          <View style={styles.originDot} />
          <View style={styles.connectingLine} />
          <View style={styles.destDot} />
        </View>

        {/* Right Side: Inputs */}
        <View style={styles.inputsColumn}>
          {/* Origin / Restaurant Pickup */}
          <TouchableOpacity
            style={styles.addressField}
            onPress={() => openPicker('origin')}
            activeOpacity={0.7}
          >
            <View style={styles.fieldContent}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>PUNTO DE RECOJO (RESTAURANTE)</Text>
                {originCoverage && (
                  <View
                    style={[
                      styles.districtTag,
                      originCoverage.isCovered
                        ? styles.districtTagCovered
                        : styles.districtTagOut,
                    ]}
                  >
                    <Text
                      style={[
                        styles.districtTagText,
                        originCoverage.isCovered
                          ? styles.districtTagTextCovered
                          : styles.districtTagTextOut,
                      ]}
                    >
                      {originCoverage.isCovered
                        ? originCoverage.district
                        : 'Fuera de zona'}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.fieldText,
                  !originAddress && styles.placeholderText,
                ]}
                numberOfLines={1}
              >
                {originAddress || 'Ingresar dirección o seleccionar restaurante...'}
              </Text>
            </View>
            <Store size={18} color="#10B981" />
          </TouchableOpacity>

          <View style={styles.horizontalDivider} />

          {/* Destination / Customer Delivery */}
          <TouchableOpacity
            style={styles.addressField}
            onPress={() => openPicker('destination')}
            activeOpacity={0.7}
          >
            <View style={styles.fieldContent}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>PUNTO DE ENTREGA (CLIENTE)</Text>
                {destinationCoverage && (
                  <View
                    style={[
                      styles.districtTag,
                      destinationCoverage.isCovered
                        ? styles.districtTagCovered
                        : styles.districtTagOut,
                    ]}
                  >
                    <Text
                      style={[
                        styles.districtTagText,
                        destinationCoverage.isCovered
                          ? styles.districtTagTextCovered
                          : styles.districtTagTextOut,
                      ]}
                    >
                      {destinationCoverage.isCovered
                        ? destinationCoverage.district
                        : 'Fuera de zona'}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.fieldText,
                  !destinationAddress && styles.placeholderText,
                ]}
                numberOfLines={1}
              >
                {destinationAddress || 'Ingresar dirección de entrega del cliente...'}
              </Text>
            </View>
            <MapPin size={18} color="#8B5CF6" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Coverage Warning Banner if either address is outside */}
      {((originCoverage && !originCoverage.isCovered) ||
        (destinationCoverage && !destinationCoverage.isCovered)) && (
        <View style={styles.coverageWarningBanner}>
          <AlertTriangle size={15} color="#EF4444" />
          <Text style={styles.coverageWarningText}>
            Una de las direcciones está fuera del área inicial de cobertura (Solo Surquillo, Miraflores y Barranco).
          </Text>
        </View>
      )}

      {/* Live Distance & Duration Banner */}
      {isLoadingRoute && (
        <View style={styles.loadingBanner}>
          <ActivityIndicator size="small" color="#8B5CF6" />
          <Text style={styles.loadingText}>Calculando ruta y kilometraje con OSRM...</Text>
        </View>
      )}

      {routeInfo && !isLoadingRoute && (
        <View style={styles.routeStatsRow}>
          <View style={styles.statChipPrimary}>
            <Navigation size={16} color="#10B981" />
            <Text style={styles.statDistanceKm}>{routeInfo.distanceKm} km</Text>
            <Text style={styles.statDistanceMiles}>
              ({routeInfo.distanceMiles} millas)
            </Text>
          </View>

          <View style={styles.statChipSecondary}>
            <Clock size={16} color="#A78BFA" />
            <Text style={styles.statDuration}>
              ~{routeInfo.durationMinutes} min de viaje
            </Text>
          </View>
        </View>
      )}

      {/* Address Selection Modal with Autocomplete & Presets */}
      <Modal visible={!!activePicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {activePicker === 'origin'
                    ? 'Seleccionar Punto de Recojo'
                    : 'Seleccionar Punto de Entrega'}
                </Text>
                <Text style={styles.modalSub}>
                  Área disponible: Surquillo, Miraflores y Barranco
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setActivePicker(null)}
                style={styles.closeBtn}
              >
                <X size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchBar}>
              <Search size={18} color="#94A3B8" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Calle, avenida o restaurante (Ej. La Mar, Villarán, Grau)..."
                placeholderTextColor="#64748B"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Results / Presets */}
            {isSearching ? (
              <View style={styles.searchingBox}>
                <ActivityIndicator size="small" color="#8B5CF6" />
                <Text style={styles.searchingText}>Buscando en zona de cobertura...</Text>
              </View>
            ) : suggestions.length > 0 ? (
              <FlatList
                data={suggestions}
                keyExtractor={(_, idx) => `sugg-${idx}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.suggestionItem,
                      !item.isCovered && styles.suggestionItemOut,
                    ]}
                    onPress={() =>
                      selectSuggestion(
                        item.displayName,
                        item.latitude,
                        item.longitude,
                        item.isCovered
                      )
                    }
                  >
                    <MapPin
                      size={18}
                      color={item.isCovered ? '#8B5CF6' : '#EF4444'}
                      style={{ marginTop: 2 }}
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.suggestionText}>{item.displayName}</Text>
                      <View style={styles.itemTagRow}>
                        {item.isCovered ? (
                          <View style={styles.itemCoveredTag}>
                            <CheckCircle2 size={10} color="#10B981" />
                            <Text style={styles.itemCoveredTagText}>
                              {item.district || 'Zona cubierta'}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.itemOutTag}>
                            <AlertTriangle size={10} color="#EF4444" />
                            <Text style={styles.itemOutTagText}>
                              Fuera de cobertura
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View style={styles.presetsContainer}>
                <View style={styles.presetsHeaderRow}>
                  <Sparkles size={16} color="#F59E0B" />
                  <Text style={styles.presetsTitle}>
                    Puntos frecuentes en Surquillo, Miraflores y Barranco
                  </Text>
                </View>

                {PRESET_LOCATIONS.map((preset) => (
                  <TouchableOpacity
                    key={preset.id}
                    style={styles.presetItem}
                    onPress={() => selectPreset(preset)}
                  >
                    <View style={styles.presetIconWrap}>
                      {preset.type === 'restaurant' ? (
                        <Store size={16} color="#10B981" />
                      ) : (
                        <MapPin size={16} color="#8B5CF6" />
                      )}
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.presetName}>{preset.name}</Text>
                      <Text style={styles.presetSub}>
                        {preset.address} • {preset.district}
                      </Text>
                    </View>
                    <View style={styles.presetDistrictPill}>
                      <Text style={styles.presetDistrictPillText}>
                        {preset.district}
                      </Text>
                    </View>
                    <ArrowRight size={14} color="#475569" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginVertical: 8,
  },
  coverageBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    marginBottom: 12,
  },
  coverageBadgeText: {
    color: '#6EE7B7',
    fontSize: 11,
    fontWeight: '600',
  },
  addressInputsWrapper: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  timelineColumn: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  originDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#D1FAE5',
  },
  connectingLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#475569',
    marginVertical: 4,
  },
  destDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#8B5CF6',
    borderWidth: 2,
    borderColor: '#DDD6FE',
  },
  inputsColumn: {
    flex: 1,
    paddingLeft: 8,
  },
  addressField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  fieldContent: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  fieldLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  districtTag: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    marginRight: 6,
  },
  districtTagCovered: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  districtTagOut: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  districtTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  districtTagTextCovered: {
    color: '#10B981',
  },
  districtTagTextOut: {
    color: '#EF4444',
  },
  fieldText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '500',
  },
  placeholderText: {
    color: '#64748B',
    fontStyle: 'italic',
  },
  horizontalDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 4,
  },
  coverageWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  coverageWarningText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  loadingText: {
    color: '#CBD5E1',
    fontSize: 12,
  },
  routeStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  statChipPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    gap: 6,
  },
  statDistanceKm: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '700',
  },
  statDistanceMiles: {
    color: '#6EE7B7',
    fontSize: 11,
  },
  statChipSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    gap: 6,
  },
  statDuration: {
    color: '#C4B5FD',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  modalSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
  },
  searchingBox: {
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  searchingText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  suggestionItemOut: {
    opacity: 0.6,
  },
  suggestionText: {
    color: '#F1F5F9',
    fontSize: 14,
  },
  itemTagRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  itemCoveredTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  itemCoveredTagText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '600',
  },
  itemOutTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  itemOutTagText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '600',
  },
  presetsContainer: {
    marginTop: 4,
  },
  presetsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  presetsTitle: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  presetIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  presetSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  presetDistrictPill: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  presetDistrictPillText: {
    color: '#C4B5FD',
    fontSize: 10,
    fontWeight: '700',
  },
});
