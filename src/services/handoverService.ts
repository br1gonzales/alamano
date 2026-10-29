import { DeliveryStatus } from '../types/database';

/**
 * Generates a 4-digit numeric code to be read to the messenger for package reception.
 * Range: 1000 - 9999
 */
export function generateReceptionCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * Validates the 4-digit code recited by recipient upon handover.
 * Normalizes by trimming whitespace and stripping non-digits.
 */
export function verifyReceptionCode(expected: string, input: string): boolean {
  if (!expected || !input) return false;
  const cleanExpected = expected.trim().replace(/\D/g, '');
  const cleanInput = input.trim().replace(/\D/g, '');
  return cleanExpected === cleanInput && cleanExpected.length === 4;
}

/**
 * Generates human-friendly tracking code with prefix "ALM-" (e.g. "ALM-8391")
 */
export function generateTrackingCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `ALM-${num}`;
}

export interface HandoverValidationResult {
  success: boolean;
  status: DeliveryStatus;
  receptionVerifiedAt: string | null;
  error?: string;
  auditNote: string;
}

/**
 * Last-Mile Handover Domain Validator:
 * Checks whether the delivery can be handed over to recipient based on code match.
 */
export function validateLastMileHandover(
  currentStatus: DeliveryStatus,
  expectedCode: string,
  providedCode: string
): HandoverValidationResult {
  if (currentStatus === 'delivered') {
    return {
      success: false,
      status: 'delivered',
      receptionVerifiedAt: null,
      error: 'El pedido ya fue entregado previamente.',
      auditNote: 'Intento de entrega duplicado ignorado.',
    };
  }

  if (currentStatus !== 'in_transit' && currentStatus !== 'arrived_at_pickup' && currentStatus !== 'picked_up') {
    return {
      success: false,
      status: currentStatus,
      receptionVerifiedAt: null,
      error: `No se puede entregar un pedido en estado "${currentStatus}". Debe estar en ruta.`,
      auditNote: `Intento de entrega inválido desde estado ${currentStatus}.`,
    };
  }

  const isValid = verifyReceptionCode(expectedCode, providedCode);

  if (!isValid) {
    return {
      success: false,
      status: currentStatus,
      receptionVerifiedAt: null,
      error: 'Código de entrega incorrecto. El cliente debe dictar el código de 4 dígitos exacto.',
      auditNote: `Intento fallido de validación de entrega con código: "${providedCode}"`,
    };
  }

  const timestamp = new Date().toISOString();
  return {
    success: true,
    status: 'delivered',
    receptionVerifiedAt: timestamp,
    auditNote: `Código verificado exitosamente (${providedCode}). Paquete entregado al destinatario.`,
  };
}
