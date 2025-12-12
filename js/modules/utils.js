export function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU');
}

export function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatDateFull(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function getStatusText(status) {
  const statusMap = {
    'BOOKED': 'Записан',
    'CONFIRMED': 'Подтверждён',
    'ARRIVED': 'Пришёл',
    'NO_SHOW': 'Не пришёл',
    'CANCELED': 'Отменён',
    'new': 'Новая',
    'confirmed': 'Подтверждена',
    'cancelled': 'Отменена'
  };
  return statusMap[status] || status;
}

export function getCategoryText(category) {
  const categories = {
    'DRUGS': 'Медикаменты',
    'MED_DEVICES': 'Медицинские изделия',
    'MED_CONSUMABLES': 'Медицинские расходники',
    'HOUSEHOLD_CONSUMABLES': 'Хозяйственные расходники'
  };
  return categories[category] || category;
}

export function getUnitText(unit) {
  const units = { 'pcs': 'шт', 'kg': 'кг', 'l': 'л', 'm': 'м' };
  return units[unit] || unit;
}

export function getActionText(action) {
  const actions = {
    'INVENTORY_WRITE_OFF': 'Списание',
    'INVENTORY_RECEIPT': 'Поступление',
    'INVENTORY_ISSUE': 'Выдача'
  };
  return actions[action] || action;
}
