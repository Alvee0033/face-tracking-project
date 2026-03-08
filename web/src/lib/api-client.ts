import { useAuthStore } from '@/stores/useAuthStore';
import type { paths } from '@/types/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

export class ApiError extends Error {
    status: number;
    body: unknown;

    constructor(status: number, message: string, body?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.body = body;
    }
}

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

type ExtractResponseBody<
    Path extends keyof paths,
    Method extends HttpMethod
> = paths[Path][Method] extends {
    responses: { 200: { content: { 'application/json': infer R } } }
}
    ? R
    : paths[Path][Method] extends {
        responses: { 201: { content: { 'application/json': infer R } } }
    }
    ? R
    : unknown;

type ExtractRequestBody<
    Path extends keyof paths,
    Method extends HttpMethod
> = paths[Path][Method] extends {
    requestBody: { content: { 'application/json': infer R } }
}
    ? R
    : never;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string>),
    };

    // Attach token from Zustand or localStorage if available (client-side)
    if (typeof window !== 'undefined') {
        const token = useAuthStore.getState().token || localStorage.getItem('access_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    let res: Response;
    try {
        res = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers,
        });
    } catch (err) {
        if (err instanceof Error) {
            throw new ApiError(0, err.message || 'Network error.');
        }
        throw new ApiError(0, 'Request failed.');
    }

    if (!res.ok) {
        // Handle 401 Unauthorized globally
        if (res.status === 401) {
            if (typeof window !== 'undefined') {
                // Only run logout logic on client-side
                const state = useAuthStore.getState();
                if (state.isAuthenticated) {
                    state.logout();
                }
                localStorage.removeItem('access_token');
                localStorage.removeItem('user');
                document.cookie = 'access_token=; path=/; max-age=0';
                document.cookie = 'user=; path=/; max-age=0';
                window.location.href = '/auth/login';
            }
        }

        let body: unknown;
        try {
            body = await res.json();
        } catch {
            body = await res.text();
        }

        let message: string;
        if (typeof body === 'object' && body !== null && 'message' in body) {
            const m = (body as { message: string | string[] }).message;
            message = Array.isArray(m) ? m.join(' ') : String(m);
        } else {
            message = `Request failed (${res.status})`;
        }

        throw new ApiError(res.status, message, body);
    }

    if (res.status === 204) return undefined as T;

    const json = await res.json();
    // NestJS StandardResponse Interceptor wraps responses in data
    if (typeof json === 'object' && json !== null && 'data' in json) {
        return (json as { data: T }).data as T;
    }
    return json as T;
}

export const apiClient = {
    get: <Path extends keyof paths>(
        path: Path,
        options?: RequestInit
    ): Promise<ExtractResponseBody<Path, 'get'>> => {
        return request<ExtractResponseBody<Path, 'get'>>(path as string, { ...options, method: 'GET' });
    },

    post: <Path extends keyof paths>(
        path: Path,
        data?: ExtractRequestBody<Path, 'post'>,
        options?: RequestInit
    ): Promise<ExtractResponseBody<Path, 'post'>> => {
        return request<ExtractResponseBody<Path, 'post'>>(path as string, {
            ...options,
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        });
    },

    put: <Path extends keyof paths>(
        path: Path,
        data?: ExtractRequestBody<Path, 'put'>,
        options?: RequestInit
    ): Promise<ExtractResponseBody<Path, 'put'>> => {
        return request<ExtractResponseBody<Path, 'put'>>(path as string, {
            ...options,
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        });
    },

    patch: <Path extends keyof paths>(
        path: Path,
        data?: ExtractRequestBody<Path, 'patch'>,
        options?: RequestInit
    ): Promise<ExtractResponseBody<Path, 'patch'>> => {
        return request<ExtractResponseBody<Path, 'patch'>>(path as string, {
            ...options,
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        });
    },

    delete: <Path extends keyof paths>(
        path: Path,
        options?: RequestInit
    ): Promise<ExtractResponseBody<Path, 'delete'>> => {
        return request<ExtractResponseBody<Path, 'delete'>>(path as string, { ...options, method: 'DELETE' });
    },
};
