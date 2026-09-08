/**
 * Utilidades de formato de Fecha y Hora específicas para Colombia
 * Formato requerido: dd/mm/yyyy hh:mm:ss am/pm
 */

/**
 * Rellena ceros a la izquierda
 */
function padZero(num: number): string {
  return num.toString().padStart(2, '0');
}

/**
 * Formatea un objeto Date o timestamp ISO al formato estándar de Colombia:
 * "dd/mm/yyyy hh:mm:ss am" o "dd/mm/yyyy hh:mm:ss pm"
 * @param date Fecha a formatear
 * @param uppercaseAmPm Si se desea AM/PM en mayúsculas o minúsculas (por defecto minúsculas: am/pm)
 */
export function formatColombiaDateTime(dateInput: Date | string | number, uppercaseAmPm = false): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

  if (isNaN(date.getTime())) {
    return 'Fecha no válida';
  }

  const day = padZero(date.getDate());
  const month = padZero(date.getMonth() + 1);
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = padZero(date.getMinutes());
  const seconds = padZero(date.getSeconds());
  
  const ampm = hours >= 12 ? (uppercaseAmPm ? 'PM' : 'pm') : (uppercaseAmPm ? 'AM' : 'am');
  hours = hours % 12;
  hours = hours ? hours : 12; // La hora '0' se convierte en '12'
  const formattedHours = padZero(hours);

  return `${day}/${month}/${year} ${formattedHours}:${minutes}:${seconds} ${ampm}`;
}

/**
 * Formatea solo la fecha en formato colombiano dd/mm/yyyy
 */
export function formatColombiaDateOnly(dateInput: Date | string | number): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return 'Fecha no válida';
  return `${padZero(date.getDate())}/${padZero(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/**
 * Convierte un string en formato datetime-local de input HTML ("YYYY-MM-DDTHH:mm")
 * a formato ISO o Date
 */
export function fromInputToIsoString(dateTimeLocalValue: string): string {
  if (!dateTimeLocalValue) return '';
  const date = new Date(dateTimeLocalValue);
  return isNaN(date.getTime()) ? '' : date.toISOString();
}

/**
 * Convierte un ISO string al formato que requiere el input HTML <input type="datetime-local">
 */
export function toInputDateTimeLocal(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  
  const year = date.getFullYear();
  const month = padZero(date.getMonth() + 1);
  const day = padZero(date.getDate());
  const hours = padZero(date.getHours());
  const minutes = padZero(date.getMinutes());
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Calcula el tiempo restante hasta una fecha determinada
 */
export function getTimeRemaining(targetIso: string): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
} {
  const total = Date.parse(targetIso) - Date.now();
  if (isNaN(total) || total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }

  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return { days, hours, minutes, seconds, isPast: false };
}
