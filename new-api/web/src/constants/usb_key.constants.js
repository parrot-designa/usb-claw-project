export const USB_KEY_STATUS = {
  ENABLED: 1,
  DISABLED: 0,
};

export const USB_KEY_STATUS_MAP = {
  [USB_KEY_STATUS.ENABLED]: { text: '启用', color: 'green' },
  [USB_KEY_STATUS.DISABLED]: { text: '禁用', color: 'grey' },
};

export const USB_KEY_ACTIONS = {
  ENABLE: 'enable',
  DISABLE: 'disable',
};
