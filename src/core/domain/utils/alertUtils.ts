import Swal, { type SweetAlertOptions } from 'sweetalert2';

// Configuración de tema base para SweetAlert2 acorde a la estética de Amor y Amistad
const customThemeOptions: SweetAlertOptions = {
  background: '#180f28',
  color: '#ffffff',
  confirmButtonColor: '#e11d48',
  cancelButtonColor: '#475569',
  customClass: {
    popup: 'swal2-amor-amistad-popup',
    confirmButton: 'btn btn-primary',
    cancelButton: 'btn btn-secondary',
  },
};

/**
 * PIN de seguridad oficial requerido por el usuario para borrar el grupo
 */
export const SECURITY_PIN = '471414';

/**
 * Notificación de éxito con animación
 */
export const showSuccessAlert = (title: string, text: string) => {
  return Swal.fire({
    ...customThemeOptions,
    icon: 'success',
    iconColor: '#fb7185',
    title: `<span style="font-family: 'Outfit', sans-serif; font-weight: 700;">${title}</span>`,
    html: `<div style="font-size: 0.95rem; color: #cbd5e1;">${text}</div>`,
    confirmButtonText: '¡Genial!',
  });
};

/**
 * Alerta de error
 */
export const showErrorAlert = (title: string, text: string) => {
  return Swal.fire({
    ...customThemeOptions,
    icon: 'error',
    iconColor: '#f43f5e',
    title: `<span style="font-family: 'Outfit', sans-serif; font-weight: 700;">${title}</span>`,
    html: `<div style="font-size: 0.95rem; color: #fca5a5;">${text}</div>`,
    confirmButtonText: 'Entendido',
  });
};

/**
 * Diálogo de confirmación interactivo
 */
export const showConfirmDialog = async (
  title: string,
  text: string,
  confirmText = 'Sí, continuar',
  cancelText = 'Cancelar'
): Promise<boolean> => {
  const result = await Swal.fire({
    ...customThemeOptions,
    icon: 'question',
    iconColor: '#fbbf24',
    title: `<span style="font-family: 'Outfit', sans-serif; font-weight: 700;">${title}</span>`,
    html: `<div style="font-size: 0.95rem; color: #cbd5e1;">${text}</div>`,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
  });

  return result.isConfirmed;
};

/**
 * Solicita el PIN 471414 para autorizar el borrado del grupo
 */
export const requestPinToDeleteGroup = async (): Promise<boolean> => {
  const { value: inputPin } = await Swal.fire({
    ...customThemeOptions,
    icon: 'warning',
    iconColor: '#f43f5e',
    title: `<span style="font-family: 'Outfit', sans-serif; font-weight: 700; color: #f43f5e;">Borrar Grupo</span>`,
    html: `
      <div style="font-size: 0.95rem; color: #cbd5e1; margin-bottom: 1rem;">
        Esta acción eliminará el grupo, los participantes y todos los enlaces generados.<br/>
        Ingresa el <strong>PIN de seguridad</strong> para confirmar:
      </div>
    `,
    input: 'password',
    inputPlaceholder: 'PIN (6 dígitos)',
    inputAttributes: {
      maxlength: '10',
      autocapitalize: 'off',
      autocorrect: 'off',
      style: 'text-align: center; font-size: 1.35rem; letter-spacing: 0.25em; color: #fbbf24; background: #0c0814; border: 1px solid rgba(251, 191, 36, 0.4); border-radius: 8px; padding: 0.5rem; width: 220px; margin: 0 auto;',
    },
    showCancelButton: true,
    confirmButtonText: 'Confirmar y Borrar',
    cancelButtonText: 'Cancelar',
    preConfirm: (val) => {
      if (val !== SECURITY_PIN) {
        Swal.showValidationMessage('PIN incorrecto. No tienes autorización para borrar este grupo.');
        return false;
      }
      return true;
    },
  });

  return Boolean(inputPin);
};

/**
 * Toast flotante de notificación rápida
 */
export const showToast = (title: string, icon: 'success' | 'info' | 'warning' = 'success') => {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
    background: '#1f1335',
    color: '#ffffff',
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    },
  });

  return Toast.fire({
    icon,
    title,
  });
};
