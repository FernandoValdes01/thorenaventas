import { env } from './env';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

function isApiResponseShape<T>(value: unknown): value is ApiResponse<T> {
  return typeof value === 'object' && value !== null && 'success' in value;
}

async function request<T>(path: string, method: HttpMethod, body?: unknown): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${env.apiUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      signal: controller.signal,
      body: body ? JSON.stringify(body) : undefined,
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? (await response.json())
      : ({
          success: false,
          error: {
            code: 'INVALID_RESPONSE',
            message: 'Respuesta invalida del servidor.',
          },
        } as ApiResponse<T>);

    if (isApiResponseShape<T>(payload)) {
      return payload;
    }

    if (response.ok) {
      return {
        success: true,
        data: payload as T,
      };
    }

    return {
      success: false,
      error: {
        code: 'HTTP_ERROR',
        message: 'Solicitud rechazada por el servidor.',
      },
    };
  } catch {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'No se pudo conectar con el servidor.',
      },
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path, 'GET'),
  post: <T>(path: string, body?: unknown) => request<T>(path, 'POST', body),
  patch: <T>(path: string, body?: unknown) => request<T>(path, 'PATCH', body),
  delete: <T>(path: string) => request<T>(path, 'DELETE'),
};
