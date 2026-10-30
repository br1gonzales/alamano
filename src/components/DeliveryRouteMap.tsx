import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import Svg, {
  Path,
  Circle,
  G,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
  Rect,
} from 'react-native-svg';
import {
  MapPin,
  Navigation,
  ExternalLink,
  Store,
  Bike,
  Clock,
  Compass,
  Shield,
} from 'lucide-react-native';
import { Coordinates, RouteInfo } from '../types/database';

export interface DeliveryRouteMapProps {
  origin: Coordinates | null;
  destination: Coordinates | null;
  routeInfo: RouteInfo | null;
  originLabel?: string;
  destinationLabel?: string;
  courierLocation?: Coordinates | null;
  courierName?: string;
  height?: number;
}

export const DeliveryRouteMap: React.FC<DeliveryRouteMapProps> = ({
  origin,
  destination,
  routeInfo,
  originLabel = 'Punto de recojo (Restaurante)',
  destinationLabel = 'Punto de entrega (Cliente)',
  courierLocation,
  courierName,
  height = 240,
}) => {
  // Compute bounding box and projected SVG path coordinates
  const svgData = useMemo(() => {
    if (!origin || !destination) return null;

    const coords: [number, number][] =
      routeInfo && routeInfo.coordinates.length > 0
        ? routeInfo.coordinates
        : [
            [origin.latitude, origin.longitude],
            [destination.latitude, destination.longitude],
          ];

    if (courierLocation) {
      coords.push([courierLocation.latitude, courierLocation.longitude]);
    }

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    for (const [lat, lng] of coords) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }

    // Add 15% padding
    const latSpan = Math.max(0.005, maxLat - minLat);
    const lngSpan = Math.max(0.005, maxLng - minLng);
    const padLat = latSpan * 0.18;
    const padLng = lngSpan * 0.18;

    const bMinLat = minLat - padLat;
    const bMaxLat = maxLat + padLat;
    const bMinLng = minLng - padLng;
    const bMaxLng = maxLng + padLng;

    const width = 360;
    const h = height;

    // Project [lat, lng] to SVG [x, y]
    const project = (lat: number, lng: number): [number, number] => {
      const x = ((lng - bMinLng) / (bMaxLng - bMinLng)) * width;
      // Invert Y because latitude grows northward (up), SVG grows down
      const y = ((bMaxLat - lat) / (bMaxLat - bMinLat)) * h;
      return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
    };

    const originPt = project(origin.latitude, origin.longitude);
    const destPt = project(destination.latitude, destination.longitude);

    let pathD = '';
    coords.forEach(([lat, lng], idx) => {
      const [px, py] = project(lat, lng);
      pathD += idx === 0 ? `M ${px} ${py}` : ` L ${px} ${py}`;
    });

    const courierPt = courierLocation
      ? project(courierLocation.latitude, courierLocation.longitude)
      : null;

    return {
      width,
      height: h,
      pathD,
      originPt,
      destPt,
      courierPt,
    };
  }, [origin, destination, routeInfo, courierLocation, height]);

  const openExternalMap = () => {
    if (!origin || !destination) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;
    Linking.openURL(url).catch((err) => console.warn('Could not open map URL:', err));
  };

  return (
    <View style={[styles.container, { height }]}>
      {/* Background Stylized Map Canvas */}
      <View style={StyleSheet.absoluteFill}>
        {svgData ? (
          <Svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${svgData.width} ${svgData.height}`}
            preserveAspectRatio="xMidYMid meet"
          >
            <Defs>
              <LinearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#10B981" stopOpacity="1" />
                <Stop offset="50%" stopColor="#8B5CF6" stopOpacity="1" />
                <Stop offset="100%" stopColor="#EC4899" stopOpacity="1" />
              </LinearGradient>
              <LinearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#0B132B" stopOpacity="1" />
                <Stop offset="100%" stopColor="#1C2541" stopOpacity="1" />
              </LinearGradient>
            </Defs>

            {/* Dark Mode City Grid Base */}
            <Rect x="0" y="0" width={svgData.width} height={svgData.height} fill="url(#bgGradient)" />

            {/* Stylized background grid streets */}
            <Path
              d={`M 0 ${svgData.height * 0.3} L ${svgData.width} ${svgData.height * 0.3} M 0 ${svgData.height * 0.7} L ${svgData.width} ${svgData.height * 0.7} M ${svgData.width * 0.25} 0 L ${svgData.width * 0.25} ${svgData.height} M ${svgData.width * 0.75} 0 L ${svgData.width * 0.75} ${svgData.height}`}
              stroke="#2E3856"
              strokeWidth="2"
              strokeDasharray="4,4"
              opacity="0.3"
            />

            {/* Route Shadow glow */}
            <Path
              d={svgData.pathD}
              stroke="#8B5CF6"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.25"
            />

            {/* Active Route Polyline */}
            <Path
              d={svgData.pathD}
              stroke="url(#routeGradient)"
              strokeWidth="4.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Point A (Pickup / Restaurant) */}
            <G transform={`translate(${svgData.originPt[0]}, ${svgData.originPt[1]})`}>
              <Circle r="12" fill="#10B981" opacity="0.3" />
              <Circle r="7" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
              <SvgText
                x="0"
                y="-11"
                fill="#10B981"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
              >
                A (Origen)
              </SvgText>
            </G>

            {/* Point B (Destination / Client) */}
            <G transform={`translate(${svgData.destPt[0]}, ${svgData.destPt[1]})`}>
              <Circle r="12" fill="#EC4899" opacity="0.3" />
              <Circle r="7" fill="#EC4899" stroke="#FFFFFF" strokeWidth="2" />
              <SvgText
                x="0"
                y="-11"
                fill="#EC4899"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
              >
                B (Entrega)
              </SvgText>
            </G>

            {/* Courier Position (if in transit) */}
            {svgData.courierPt && (
              <G transform={`translate(${svgData.courierPt[0]}, ${svgData.courierPt[1]})`}>
                <Circle r="14" fill="#F59E0B" opacity="0.4" />
                <Circle r="8" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="2" />
                <SvgText
                  x="0"
                  y="18"
                  fill="#F59E0B"
                  fontSize="9"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {courierName || 'Repartidor'}
                </SvgText>
              </G>
            )}
          </Svg>
        ) : (
          <View style={styles.placeholderContainer}>
            <Compass size={40} color="#64748B" />
            <Text style={styles.placeholderText}>
              Ingresa la dirección de origen y destino para trazar la ruta
            </Text>
          </View>
        )}
      </View>

      {/* Top Floating Badge with Route Info */}
      {routeInfo && (
        <View style={styles.routeBadge}>
          <View style={styles.badgeItem}>
            <Navigation size={14} color="#10B981" />
            <Text style={styles.badgeTextBold}>
              {routeInfo.distanceKm} km
            </Text>
            <Text style={styles.badgeSubText}>
              ({routeInfo.distanceMiles} mi)
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.badgeItem}>
            <Clock size={14} color="#A78BFA" />
            <Text style={styles.badgeTextBold}>
              ~{routeInfo.durationMinutes} min
            </Text>
          </View>
        </View>
      )}

      {/* Coverage Area Tag */}
      <View style={styles.coveragePill}>
        <Shield size={11} color="#10B981" />
        <Text style={styles.coveragePillText}>Surquillo • Miraflores • Barranco</Text>
      </View>

      {/* External Map Action Button */}
      {origin && destination && (
        <TouchableOpacity
          style={styles.openExternalBtn}
          onPress={openExternalMap}
          activeOpacity={0.8}
        >
          <ExternalLink size={13} color="#CBD5E1" />
          <Text style={styles.openExternalText}>Ver en Google Maps</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    position: 'relative',
    marginVertical: 10,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0F172A',
  },
  placeholderText: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
    maxWidth: 240,
  },
  routeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3b4b68',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  badgeTextBold: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  badgeSubText: {
    color: '#94A3B8',
    fontSize: 11,
    marginLeft: 2,
  },
  divider: {
    width: 1,
    height: 14,
    backgroundColor: '#475569',
    marginHorizontal: 8,
  },
  openExternalBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#475569',
  },
  openExternalText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '500',
  },
  coveragePill: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  coveragePillText: {
    color: '#6EE7B7',
    fontSize: 10,
    fontWeight: '600',
  },
});
