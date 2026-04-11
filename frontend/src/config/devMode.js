const hostname =
  typeof window !== 'undefined' && window.location?.hostname
    ? window.location.hostname
    : '127.0.0.1';

export const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || `http://${hostname}:8001`;

export const LOCAL_DEV_MODE =
  process.env.REACT_APP_LOCAL_DEV_MODE === 'true' ||
  process.env.NODE_ENV === 'development';

export const DEMO_ACCOUNTS = [
  {
    label: 'Demo UX',
    email: 'designer@example.com',
    password: 'Designer123!',
    role: 'user',
  },
  {
    label: 'Admin',
    email: 'admin@aic.it',
    password: 'Admin123!',
    role: 'admin',
  },
  {
    label: 'Creator',
    email: 'creator@example.com',
    password: 'Creator123!',
    role: 'creator',
  },
];
