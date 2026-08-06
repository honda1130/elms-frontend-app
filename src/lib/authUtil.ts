import { API_URL } from '@/lib/apiUrl';
import { clearUserRoleCookie, getJWTFromCookie } from '@/lib/jwtUtil';

/**
 * 有効な JWT を返す。Cookie に JWT が無い場合は RefreshToken で再発行を試みる。
 * 再発行に失敗した場合は null を返す。
 */
export async function ensureValidJwt(): Promise<string | null> {
	const existing = getJWTFromCookie();
	if (existing) return existing;

	try {
		const res = await fetch(`${API_URL}/api/auth/refresh`, {
			method: 'GET',
			headers: { Authorization: 'Bearer dummy' },
			credentials: 'include',
		});

		if (!res.ok) return null;
		return getJWTFromCookie();
	} catch {
		return null;
	}
}

/** 認証 Cookie をクリアしてログイン画面へ遷移する前処理 */
export function clearAuthState(): void {
	clearUserRoleCookie();
}
