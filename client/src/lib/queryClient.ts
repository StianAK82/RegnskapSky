import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (token && token !== 'null' && token !== 'undefined') {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Handle expired token
  if (res.status === 403 || res.status === 401) {
    const responseClone = res.clone();
    const errorText = await responseClone.text();
    if (errorText.includes('Invalid token') || errorText.includes('expired')) {
      console.log('Token expired, clearing auth data');
      localStorage.removeItem('token');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Token expired - redirecting to login');
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    const headers: Record<string, string> = {};
    
    if (token && token !== 'null' && token !== 'undefined') {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const url = Array.isArray(queryKey) ? queryKey.join("/") : String(queryKey);
    const res = await fetch(url, {
      headers,
      credentials: "include",
    });

    // Handle expired token
    if (res.status === 403 || res.status === 401) {
      const responseClone = res.clone();
      const errorText = await responseClone.text();
      if (errorText.includes('Invalid token') || errorText.includes('expired')) {
        console.log('Token expired, clearing auth data');
        localStorage.removeItem('token');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return null;
      }
    }

    if (unauthorizedBehavior === "returnNull" && (res.status === 401 || res.status === 403)) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
