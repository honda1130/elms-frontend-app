import { getJWTFromCookie } from '@/lib/jwtUtil';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import useSWR, { SWRConfiguration, SWRResponse, useSWRConfig } from 'swr';

/** APIがステータス異常を返したときにスローするエラー。 */
export class ApiError extends Error {
	readonly status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
	}
}

/**
 * GET用のデータ取得フック。
 *
 * <p>SWRがキャッシュを持つため、同じキーを使う複数のコンポーネントで取得が共有される。
 * 更新後は {@link useRevalidate} でキーを無効化すると、そのキーを使っている画面が自動で再取得する。
 *
 * @param key リクエストURL（= SWRのキャッシュキー）。nullを渡すと取得しない（条件付き取得）
 * @param config SWRの設定
 */
export function useApiQuery<T>(
	key: string | null,
	config?: SWRConfiguration<T, ApiError>
): SWRResponse<T, ApiError> {
	const router = useRouter();

	const fetcher = useCallback(
		async (url: string): Promise<T> => {
			const jwt = getJWTFromCookie();
			const headers: HeadersInit = {};
			if (jwt) {
				headers['Authorization'] = `Bearer ${jwt}`;
			}

			const response = await fetch(url, {
				method: 'GET',
				headers,
				credentials: 'include',
			});

			// 認証・認可エラーの扱いは useApiRequest と揃える
			if (response.status === 401) {
				router.push('/login');
				throw new ApiError(401, '認証されていません');
			}
			if (response.status === 403) {
				throw new ApiError(403, 'この操作を行う権限がありません');
			}
			if (!response.ok) {
				throw new ApiError(response.status, 'データの取得に失敗しました');
			}

			return (await response.json()) as T;
		},
		[router]
	);

	return useSWR<T, ApiError>(key, fetcher, config);
}

/**
 * 指定したキーのキャッシュを無効化して再取得させるフックを返す。
 *
 * <p>作成・更新・削除の直後に呼ぶことで、そのデータを表示している画面（サイドバー等）が最新化される。
 *
 * @example
 * const revalidate = useRevalidate();
 * await executeApi(url, 'POST', body);
 * revalidate(swrKeys.courseLessons(courseId));
 */
export function useRevalidate(): (...keys: string[]) => Promise<void> {
	const { mutate } = useSWRConfig();

	return useCallback(
		async (...keys: string[]) => {
			await Promise.all(keys.map((key) => mutate(key)));
		},
		[mutate]
	);
}
