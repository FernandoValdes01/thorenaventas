const defaultApiUrl = import.meta.env.DEV ? 'http://localhost:3001' : '/_/backend';

export const env = {
  apiUrl: import.meta.env.VITE_API_URL || defaultApiUrl,
};
