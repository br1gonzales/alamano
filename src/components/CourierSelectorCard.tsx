import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  Bike,
  Car,
  Truck,
  Zap,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react-native';
import { VehicleType } from '../types/database';

interface CourierOption {
  type: VehicleType;
  title: string;
  tagline: string;
  capacity: string;
  icon: any;
  speedLabel: string;
}

const COURIER_OPTIONS: CourierOption[] = [
  {
    type: 'motorcycle',
    title: 'Moto Express',
    tagline: 'Mochila térmica aislada (pizzas, platos calientes)',
    capacity: 'Hasta 20 kg',
    icon: Zap,
    speedLabel: 'Más rápido',
  },
  {
    type: 'bicycle',
    title: 'Bicicleta Eco',
    tagline: 'Cero emisiones, entregas de cercanía (< 5 km)',
    capacity: 'Hasta 8 kg',
    icon: Bike,
    speedLabel: 'Ecológico',
  },
  {
    type: 'car',
    title: 'Auto / Furgoneta',
    tagline: 'Catering, bandejas múltiples y banquetes',
    capacity: 'Hasta 120 kg',
    icon: Car,
    speedLabel: 'Gran volumen',
  },
];

interface CourierSelectorCardProps {
  selectedVehicle: VehicleType;
  onSelectVehicle: (vehicle: VehicleType) => void;
  isScheduled: boolean;
  onToggleScheduled: (scheduled: boolean) => void;
  scheduledTime: string;
  onSelectScheduledTime: (time: string) => void;
  durationMinutes: number;
}

export const CourierSelectorCard: React.FC<CourierSelectorCardProps> = ({
  selectedVehicle,
  onSelectVehicle,
  isScheduled,
  onToggleScheduled,
  scheduledTime,
  onSelectScheduledTime,
  durationMinutes,
}) => {
  const quickTimes = ['En 30 min', 'En 1 hora', 'Almuerzo (13:30)', 'Cena (20:00)'];

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>TIPO DE SERVICIO DE REPARTO</Text>

      {/* Vehicle Options List */}
      <View style={styles.optionsList}>
        {COURIER_OPTIONS.map((opt) => {
          const isSelected = selectedVehicle === opt.type;
          const IconComponent = opt.icon;

          return (
            <TouchableOpacity
              key={opt.type}
              style={[
                styles.optionRow,
                isSelected && styles.optionRowSelected,
              ]}
              onPress={() => onSelectVehicle(opt.type)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}>
                <IconComponent
                  size={20}
                  color={isSelected ? '#8B5CF6' : '#94A3B8'}
                />
              </View>

              <View style={styles.optionDetails}>
                <View style={styles.titleRow}>
                  <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                    {opt.title}
                  </Text>
                  <View style={[styles.speedBadge, isSelected && styles.speedBadgeSelected]}>
                    <Text style={styles.speedBadgeText}>{opt.speedLabel}</Text>
                  </View>
                </View>
                <Text style={styles.optionTagline} numberOfLines={1}>
                  {opt.tagline}
                </Text>
                <Text style={styles.optionCapacity}>
                  Capacidad: {opt.capacity}
                </Text>
              </View>

              <View style={styles.checkCol}>
                {isSelected ? (
                  <CheckCircle2 size={20} color="#8B5CF6" />
                ) : (
                  <View style={styles.radioEmpty} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Schedule Dispatch vs Immediate Toggle */}
      <View style={styles.dispatchModeWrap}>
        <TouchableOpacity
          style={[styles.modeButton, !isScheduled && styles.modeButtonActive]}
          onPress={() => onToggleScheduled(false)}
        >
          <Zap size={15} color={!isScheduled ? '#F8FAFC' : '#94A3B8'} />
          <Text style={[styles.modeButtonText, !isScheduled && styles.modeButtonTextActive]}>
            Enviar Ahora
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeButton, isScheduled && styles.modeButtonActive]}
          onPress={() => onToggleScheduled(true)}
        >
          <Calendar size={15} color={isScheduled ? '#F8FAFC' : '#94A3B8'} />
          <Text style={[styles.modeButtonText, isScheduled && styles.modeButtonTextActive]}>
            Programar Horario
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick Scheduled Times */}
      {isScheduled && (
        <View style={styles.scheduledTimePicker}>
          <Text style={styles.scheduledLabel}>Horario deseado de entrega:</Text>
          <View style={styles.quickTimeChips}>
            {quickTimes.map((t) => {
              const isPicked = scheduledTime === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.timeChip, isPicked && styles.timeChipPicked]}
                  onPress={() => onSelectScheduledTime(t)}
                >
                  <Clock size={12} color={isPicked ? '#F8FAFC' : '#94A3B8'} />
                  <Text style={[styles.timeChipText, isPicked && styles.timeChipTextPicked]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
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
  sectionTitle: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  optionsList: {
    gap: 10,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  optionRowSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconWrapSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  optionDetails: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  optionTitleSelected: {
    color: '#C4B5FD',
  },
  speedBadge: {
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  speedBadgeSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
  },
  speedBadgeText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '600',
  },
  optionTagline: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  optionCapacity: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },
  checkCol: {
    paddingLeft: 8,
  },
  radioEmpty: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#475569',
  },
  dispatchModeWrap: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 4,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  modeButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  modeButtonText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
  },
  scheduledTimePicker: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  scheduledLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '500',
  },
  quickTimeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F172A',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  timeChipPicked: {
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    borderColor: '#8B5CF6',
  },
  timeChipText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  timeChipTextPicked: {
    color: '#DDD6FE',
    fontWeight: '600',
  },
});
