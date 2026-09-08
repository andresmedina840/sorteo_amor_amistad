/**
 * Utilidades para validación y formato de números celulares de Colombia
 */

export interface PhoneValidationResult {
  isValid: boolean;
  cleanPhone: string;
  errorMessage?: string;
}

/**
 * Valida que un número celular de Colombia sea válido:
 * 1. Obligatorio (no vacío)
 * 2. Exactamente 10 dígitos numéricos
 * 3. Debe comenzar con el dígito 3
 */
export function validateColombiaPhone(input: string): PhoneValidationResult {
  const trimmed = (input || '').trim();

  if (!trimmed) {
    return {
      isValid: false,
      cleanPhone: '',
      errorMessage: 'El número de WhatsApp / celular es obligatorio.',
    };
  }

  // Extraer únicamente los dígitos numéricos
  let digits = trimmed.replace(/\D/g, '');

  // Si el usuario incluyó el prefijo de país 57 al inicio (ej: 573158889900)
  if (digits.length === 12 && digits.startsWith('57')) {
    digits = digits.substring(2);
  }

  // Validar primer dígito (debe empezar por 3 en Colombia)
  if (!digits.startsWith('3')) {
    return {
      isValid: false,
      cleanPhone: digits,
      errorMessage: 'En Colombia, el número de celular debe comenzar por el número 3 (ej: 300 123 4567).',
    };
  }

  // Validar longitud exacta de 10 dígitos
  if (digits.length !== 10) {
    return {
      isValid: false,
      cleanPhone: digits,
      errorMessage: `El número de celular debe tener exactamente 10 dígitos (has ingresado ${digits.length}).`,
    };
  }

  return {
    isValid: true,
    cleanPhone: digits,
  };
}

/**
 * Formatea un número de 10 dígitos a formato legible: 300 123 4567
 */
export function formatColombiaPhone(digits: string): string {
  const clean = digits.replace(/\D/g, '');
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)} ${clean.slice(3)}`;
  return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 10)}`;
}
