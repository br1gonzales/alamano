import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateReceptionCode,
  verifyReceptionCode,
  generateTrackingCode,
  validateLastMileHandover,
} from '../src/services/handoverService';
import {
  calculateHaversineDistanceKm,
  kmToMiles,
  PRESET_LOCATIONS,
  isWithinCoveredArea,
  ALLOWED_DISTRICTS,
} from '../src/services/routingService';
import { deliveryKeys } from '../src/types/keys';
import { DeliveryStatus } from '../src/types/database';

describe('Last-Mile Delivery Flow & Package Reception Verification', () => {
  describe('1. Reception Code Generation', () => {
    it('should generate a 4-digit numeric code', () => {
      const code = generateReceptionCode();
      assert.equal(typeof code, 'string');
      assert.equal(code.length, 4, `Expected 4 characters, got ${code.length}`);
      assert.match(code, /^\d{4}$/, 'Code should be strictly 4 numeric digits');
    });

    it('should generate code strictly between 1000 and 9999', () => {
      for (let i = 0; i < 50; i++) {
        const code = generateReceptionCode();
        const num = parseInt(code, 10);
        assert.ok(num >= 1000 && num <= 9999, `Code ${num} outside valid range 1000-9999`);
      }
    });

    it('should generate distinct codes with high entropy', () => {
      const codeSet = new Set<string>();
      const iterations = 50;
      for (let i = 0; i < iterations; i++) {
        codeSet.add(generateReceptionCode());
      }
      assert.ok(
        codeSet.size >= 45,
        `Expected at least 45 unique codes out of 50, got ${codeSet.size}`
      );
    });

    it('should generate unique tracking codes with ALM- prefix', () => {
      const trackingCode = generateTrackingCode();
      assert.match(trackingCode, /^ALM-\d{4}$/);
    });
  });

  describe('2. Code Verification for Messenger Handover', () => {
    it('should accept exact matching 4-digit code', () => {
      const expected = '8392';
      const provided = '8392';
      assert.equal(verifyReceptionCode(expected, provided), true);
    });

    it('should reject incorrect code read to messenger', () => {
      const expected = '8392';
      const wrong = '1234';
      assert.equal(verifyReceptionCode(expected, wrong), false);
    });

    it('should accept code with whitespace or trimming issues', () => {
      const expected = '4521';
      const providedWithSpaces = '  4521  ';
      assert.equal(verifyReceptionCode(expected, providedWithSpaces), true);
    });

    it('should reject codes that are too short, empty, or contain non-digits', () => {
      const expected = '7712';
      assert.equal(verifyReceptionCode(expected, '771'), false);
      assert.equal(verifyReceptionCode(expected, ''), false);
      assert.equal(verifyReceptionCode(expected, 'abcd'), false);
      assert.equal(verifyReceptionCode(expected, '77129'), false);
    });
  });

  describe('3. Last-Mile Lifecycle State Machine & Handover Validation', () => {
    it('should reject handover if delivery is not in-transit', () => {
      const expectedCode = '4455';
      const result = validateLastMileHandover('searching_courier', expectedCode, '4455');
      assert.equal(result.success, false);
      assert.match(result.error || '', /Debe estar en ruta/);
      assert.equal(result.receptionVerifiedAt, null);
    });

    it('should reject handover when messenger receives wrong code from recipient', () => {
      const expectedCode = '9123';
      const wrongCodeAttempt = '1111';

      const result = validateLastMileHandover('in_transit', expectedCode, wrongCodeAttempt);
      assert.equal(result.success, false);
      assert.equal(result.status, 'in_transit', 'Status must stay in_transit on failure');
      assert.equal(result.receptionVerifiedAt, null);
      assert.match(result.error || '', /Código de entrega incorrecto/);
      assert.match(result.auditNote, /Intento fallido/);
    });

    it('should approve handover and transition to delivered when recipient reads correct code', () => {
      const expectedCode = '9123';
      const result = validateLastMileHandover('in_transit', expectedCode, '9123');

      assert.equal(result.success, true);
      assert.equal(result.status, 'delivered', 'Status must transition to delivered');
      assert.ok(result.receptionVerifiedAt !== null, 'Must timestamp verified handover');
      assert.match(result.auditNote, /Código verificado exitosamente/);
    });

    it('should reject redundant handover if already delivered', () => {
      const expectedCode = '9123';
      const result = validateLastMileHandover('delivered', expectedCode, '9123');

      assert.equal(result.success, false);
      assert.match(result.error || '', /ya fue entregado previamente/);
    });
  });

  describe('4. Mileage and Distance Calculations', () => {
    it('should accurately calculate Haversine distance between Miraflores and San Isidro', () => {
      const miraflores = PRESET_LOCATIONS[0].coordinates; // Av. La Mar
      const sanIsidro = PRESET_LOCATIONS[2].coordinates; // Miguel Dasso

      const distanceKm = calculateHaversineDistanceKm(miraflores, sanIsidro);
      // Straight-line distance between these points in Lima is approx 1.8 - 2.6 km
      assert.ok(
        distanceKm >= 1.5 && distanceKm <= 3.0,
        `Expected distance between 1.5 and 3.0 km, got ${distanceKm} km`
      );
    });

    it('should correctly convert kilometers to miles', () => {
      const km = 10;
      const miles = kmToMiles(km);
      assert.equal(miles, 6.21);

      const fiveKm = 5;
      assert.equal(kmToMiles(fiveKm), 3.11);
    });

    it('should return 0 distance when origin and destination are identical', () => {
      const point = PRESET_LOCATIONS[1].coordinates;
      const distance = calculateHaversineDistanceKm(point, point);
      assert.equal(distance, 0);
    });
  });

  describe('5. TanStack Query Cache Structure', () => {
    it('should produce predictable hierarchical query keys for cache invalidation', () => {
      assert.deepEqual(deliveryKeys.all, ['deliveries']);
      assert.deepEqual(deliveryKeys.lists(), ['deliveries', 'list']);
      assert.deepEqual(deliveryKeys.list('store-123'), [
        'deliveries',
        'list',
        { storeId: 'store-123' },
      ]);
      assert.deepEqual(deliveryKeys.detail('ALM-4921'), [
        'deliveries',
        'detail',
        'ALM-4921',
      ]);
      assert.deepEqual(deliveryKeys.couriers(), ['couriers']);
      assert.deepEqual(deliveryKeys.stores(), ['stores']);
    });

    it('should generate coordinate-bound route cache keys to prevent duplicate routing calls', () => {
      const origin = { latitude: -12.1154, longitude: -77.0428 };
      const dest = { latitude: -12.1215, longitude: -77.0295 };

      const key1 = deliveryKeys.route(origin, dest);
      const key2 = deliveryKeys.route(origin, dest);

      assert.deepEqual(key1, key2, 'Identical coordinates must yield the exact same cache key');
      assert.equal(key1[0], 'routes');
    });
  });

  describe('6. District Boundary & Geofence (Surquillo, Miraflores, Barranco)', () => {
    it('should define exactly Miraflores, Barranco, and Surquillo as covered districts', () => {
      assert.deepEqual([...ALLOWED_DISTRICTS], ['miraflores', 'barranco', 'surquillo']);
    });

    it('should approve addresses located in Miraflores', () => {
      const mirafloresPt = { latitude: -12.1215, longitude: -77.0295 }; // Parque Kennedy
      const result = isWithinCoveredArea(mirafloresPt, 'Av. Larco 500, Miraflores');
      assert.equal(result.isCovered, true);
      assert.equal(result.district, 'Miraflores');
    });

    it('should approve addresses located in Barranco', () => {
      const barrancoPt = { latitude: -12.1489, longitude: -77.021 }; // Plaza Barranco
      const result = isWithinCoveredArea(barrancoPt, 'Av. Pedro de Osma 102, Barranco');
      assert.equal(result.isCovered, true);
      assert.equal(result.district, 'Barranco');
    });

    it('should approve addresses located in Surquillo', () => {
      const surquilloPt = { latitude: -12.1121, longitude: -77.0267 }; // Mercado 1 Surquillo
      const result = isWithinCoveredArea(surquilloPt, 'Ca. Lizardo Montero 705, Surquillo');
      assert.equal(result.isCovered, true);
      assert.equal(result.district, 'Surquillo');
    });

    it('should reject addresses outside the allowed boundary (e.g., San Isidro, San Borja, Los Olivos)', () => {
      const sanIsidroPt = { latitude: -12.0945, longitude: -77.0345 }; // Dasso / San Isidro centro
      const resultSanIsidro = isWithinCoveredArea(sanIsidroPt, 'Av. Conquistadores 400, San Isidro');
      assert.equal(resultSanIsidro.isCovered, false);
      assert.match(resultSanIsidro.reason || '', /fuera de cobertura/i);

      const losOlivosPt = { latitude: -11.9922, longitude: -77.0711 }; // Los Olivos
      const resultLosOlivos = isWithinCoveredArea(losOlivosPt, 'Av. Antúnez de Mayolo, Los Olivos');
      assert.equal(resultLosOlivos.isCovered, false);
    });

    it('should confirm that all preset locations are within the covered area', () => {
      for (const preset of PRESET_LOCATIONS) {
        const check = isWithinCoveredArea(preset.coordinates, preset.district);
        assert.equal(
          check.isCovered,
          true,
          `Preset "${preset.name}" in district "${preset.district}" must be in covered area`
        );
      }
    });

    it('should allow trip planning between covered districts but block when one end is outside', () => {
      const pickupMiraflores = { latitude: -12.1154, longitude: -77.0428 };
      const dropoffSurquillo = { latitude: -12.1121, longitude: -77.0267 };
      const dropoffSanBorja = { latitude: -12.0886, longitude: -77.0012 };

      const tripValidOrigin = isWithinCoveredArea(pickupMiraflores, 'Miraflores').isCovered;
      const tripValidDest = isWithinCoveredArea(dropoffSurquillo, 'Surquillo').isCovered;
      assert.equal(tripValidOrigin && tripValidDest, true, 'Miraflores to Surquillo trip must be allowed');

      const tripInvalidDest = isWithinCoveredArea(dropoffSanBorja, 'San Borja').isCovered;
      assert.equal(tripValidOrigin && tripInvalidDest, false, 'Miraflores to San Borja trip must be blocked');
    });
  });
});
