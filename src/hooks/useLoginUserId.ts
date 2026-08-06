import { ensureValidJwt } from '@/lib/authUtil';
import { getSubjectFromJWT } from '@/lib/jwtUtil';
import { useEffect, useState } from 'react';

/** ログインユーザーIDの解決状態。 */
export type LoginUserIdState = {
	/** ログインユーザーID。解決前・未認証の場合は null */
	userId: string | null;
	/** 解決中かどうか */
	isResolving: boolean;
};

/**
 * ログインユーザーIDを解決する。
 *
 * <p>JWTがCookieに無い場合はリフレッシュトークンで再発行を試みるため非同期になる。
 * ユーザーIDを含むURLをSWRのキーにする画面では、解決できるまでキーを null にして取得を止める用途で使う。
 *
 * @example
 * const { userId, isResolving } = useLoginUserId();
 * const { data } = useApiQuery<T>(userId ? swrKeys.userCourses(userId) : null);
 */
export function useLoginUserId(): LoginUserIdState {
	const [userId, setUserId] = useState<string | null>(null);
	const [isResolving, setIsResolving] = useState(true);

	useEffect(() => {
		let isMounted = true;

		const resolve = async () => {
			const jwt = await ensureValidJwt();
			if (!isMounted) return;
			setUserId(jwt ? getSubjectFromJWT(jwt) : null);
			setIsResolving(false);
		};

		resolve();

		return () => {
			isMounted = false;
		};
	}, []);

	return { userId, isResolving };
}
