const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface ApiError {
  code: string;
  message: string;
  details?: { field: string; message: string }[];
}

interface ApiResponse<T> {
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class ApiClient {
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  private async refreshToken(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retry = true
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // トークン期限切れの場合、リフレッシュを試みる
    if (response.status === 401 && retry) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.error?.code === 'TOKEN_EXPIRED') {
        // 既にリフレッシュ中の場合は待機
        if (this.isRefreshing) {
          const refreshed = await this.refreshPromise;
          if (refreshed) {
            return this.request<T>(endpoint, options, false);
          }
        } else {
          // リフレッシュを開始
          this.isRefreshing = true;
          this.refreshPromise = this.refreshToken();
          const refreshed = await this.refreshPromise;
          this.isRefreshing = false;
          this.refreshPromise = null;

          if (refreshed) {
            // リフレッシュ成功、リクエストを再試行
            return this.request<T>(endpoint, options, false);
          }
        }
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(
        errorData.error?.message || 'APIエラーが発生しました'
      ) as Error & {
        status: number;
        code: string;
        details?: ApiError['details'];
      };
      error.status = response.status;
      error.code = errorData.error?.code || 'UNKNOWN_ERROR';
      error.details = errorData.error?.details;
      throw error;
    }

    // 204 No Content
    if (response.status === 204) {
      return { data: null as T };
    }

    return response.json();
  }

  // Auth API
  async login(username: string, password: string) {
    return this.request<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async register(username: string, email: string, password: string) {
    return this.request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  }

  async logout() {
    return this.request<null>('/auth/logout', { method: 'POST' });
  }

  async getMe() {
    return this.request<User>('/auth/me');
  }

  // Bookmark API
  async getBookmarks(params?: {
    search?: string;
    pathType?: string;
    tags?: string;
    favorite?: boolean;
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return this.request<Bookmark[]>(`/bookmarks${query ? `?${query}` : ''}`);
  }

  async getBookmark(id: number) {
    return this.request<Bookmark>(`/bookmarks/${id}`);
  }

  async createBookmark(data: CreateBookmarkInput) {
    return this.request<Bookmark>('/bookmarks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBookmark(id: number, data: UpdateBookmarkInput) {
    return this.request<Bookmark>(`/bookmarks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBookmark(id: number) {
    return this.request<null>(`/bookmarks/${id}`, { method: 'DELETE' });
  }

  async toggleFavorite(id: number) {
    return this.request<Bookmark>(`/bookmarks/${id}/favorite`, {
      method: 'PUT',
    });
  }

  // Tag API
  async getTags(params?: {
    search?: string;
    favorite?: boolean;
    sort?: string;
    order?: 'asc' | 'desc';
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return this.request<Tag[]>(`/tags${query ? `?${query}` : ''}`);
  }

  async createTag(name: string, isFavorite?: boolean) {
    return this.request<Tag>('/tags', {
      method: 'POST',
      body: JSON.stringify({ name, isFavorite }),
    });
  }

  async updateTag(id: number, data: { name?: string; isFavorite?: boolean }) {
    return this.request<Tag>(`/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async toggleTagFavorite(id: number) {
    return this.request<Tag>(`/tags/${id}/favorite`, {
      method: 'PUT',
    });
  }

  async deleteTag(id: number) {
    return this.request<null>(`/tags/${id}`, { method: 'DELETE' });
  }

  // Export/Import API
  async exportBookmarks(): Promise<Blob> {
    const url = `${API_BASE_URL}/bookmarks/export`;
    const response = await fetch(url, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('エクスポートに失敗しました');
    }
    return response.blob();
  }

  async exportTags(): Promise<Blob> {
    const url = `${API_BASE_URL}/tags/export`;
    const response = await fetch(url, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('エクスポートに失敗しました');
    }
    return response.blob();
  }

  async importBookmarks(
    csv: string,
    options?: { preview?: boolean; mode?: 'skip' | 'update' | 'duplicate' }
  ) {
    return this.request<ImportResult>('/bookmarks/import', {
      method: 'POST',
      body: JSON.stringify({
        csv,
        preview: options?.preview ?? false,
        mode: options?.mode ?? 'skip',
      }),
    });
  }

  async importTags(
    csv: string,
    options?: { preview?: boolean; mode?: 'skip' | 'update' }
  ) {
    return this.request<ImportResult>('/tags/import', {
      method: 'POST',
      body: JSON.stringify({
        csv,
        preview: options?.preview ?? false,
        mode: options?.mode ?? 'skip',
      }),
    });
  }
}

// Types
export interface User {
  id: number;
  username: string;
  email: string;
  createdAt?: string;
}

export interface Bookmark {
  id: number;
  path: string;
  pathType: 'url' | 'file' | 'network';
  title: string;
  description: string | null;
  isFavorite: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookmarkInput {
  path: string;
  title: string;
  description?: string;
  tags?: string[];
  isFavorite?: boolean;
}

export interface UpdateBookmarkInput {
  path?: string;
  title?: string;
  description?: string;
  tags?: string[];
  isFavorite?: boolean;
}

export interface Tag {
  id: number;
  name: string;
  isFavorite: boolean;
  bookmarkCount: number;
  createdAt: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  updated: number;
  errors: string[];
  tagsCreated: string[];
  preview: {
    toImport: Array<{ path: string; title: string; tags: string[] }>;
    toSkip: Array<{ path: string; title: string; reason: string }>;
    toUpdate: Array<{ path: string; title: string }>;
  };
}

export const api = new ApiClient();
