export const toasts = $state([]);
let toastId = 0;

export function showToast(message, type = 'info', duration = 4000) {
  const id = ++toastId;
  toasts.push({ id, message, type, duration });
  setTimeout(() => {
    removeToast(id);
  }, duration);
}

export function removeToast(id) {
  const index = toasts.findIndex(t => t.id === id);
  if (index !== -1) toasts.splice(index, 1);
}

export const modals = $state({ confirm: null });

export function showConfirm(title, message, onConfirm) {
  modals.confirm = { title, message, onConfirm };
}

export function closeModal() {
  modals.confirm = null;
}
