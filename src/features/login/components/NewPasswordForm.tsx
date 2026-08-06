'use client';
import { API_URL } from '@/lib/apiUrl';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApiRequest } from '@/hooks/useApiRequest';
import { getJWTFromCookie, getSubjectFromJWT } from '@/lib/jwtUtil';
import { UserDto } from '@/features/user/types';

type Props = {
	token: string;
};

export default function NewPasswordForm({ token }: Props) {
	const router = useRouter();
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [error, setError] = useState('');

	const { executeApi: executeConfirmApi, isLoading: isLoadingConfirm } = useApiRequest();
	const {
		executeApi: executeFindUserApi,
		isLoading: isLoadingFindUser,
		response: findUserResponse,
	} = useApiRequest();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		if (newPassword !== confirmPassword) {
			setError('パスワードが一致しません。');
			return;
		}

		if (newPassword.length < 8) {
			setError('パスワードは8文字以上で入力してください。');
			return;
		}

		try {
			const res = await executeConfirmApi(
				`${API_URL}/api/password-reset/confirm`,
				'POST',
				{ token, newPassword }
			);

			if (!res || !res.ok) {
				setError('パスワードの再設定に失敗しました。リンクの有効期限が切れているか、すでに使用済みの可能性があります。');
				return;
			}

			const jwt = getJWTFromCookie();
			if (!jwt) {
				router.push('/login');
				return;
			}

			const userId = getSubjectFromJWT(jwt);
			await executeFindUserApi(`${API_URL}/api/users/${userId}`, 'GET');
		} catch {
			setError('エラーが発生しました。もう一度お試しください。');
		}
	};

	useEffect(() => {
		if (findUserResponse) {
			findUserResponse.json()?.then((user: UserDto) => {
				if (user.userRole === '管理者') {
					router.push('/admin/courses');
				} else {
					router.push('/courses');
				}
			});
		}
	}, [findUserResponse, router]);

	if (!token) {
		return (
			<div className="flex justify-center items-center min-h-screen">
				<div className="w-full max-w-md px-4">
					<div className="text-center mb-8">
						<h1 className="text-2xl font-bold text-aurora tracking-wide">Javaエンジニア養成講座</h1>
					</div>
					<div className="glass-panel p-8 rounded-3xl text-center">
						<p className="text-sm text-rose-600 mb-6">無効なリンクです。再度パスワード再設定をお試しください。</p>
						<Link href="/password" className="text-sm text-sky-600 hover:text-sky-500 hover:underline transition-colors">
							パスワード再設定画面へ
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex justify-center items-center min-h-screen">
			<div className="w-full max-w-md px-4">
				<div className="text-center mb-8">
					<h1 className="text-2xl font-bold text-aurora tracking-wide">Javaエンジニア養成講座</h1>
					<p className="text-slate-500 mt-2 text-sm">新しいパスワードを設定</p>
				</div>

				<form onSubmit={handleSubmit} className="glass-panel p-8 rounded-3xl">
					{error && (
						<div className="mb-4 px-4 py-3 bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-xl">
							{error}
						</div>
					)}

					<div className="mb-5">
						<label htmlFor="newPassword" className="block text-sm font-medium text-slate-600 mb-1.5">
							新しいパスワード
						</label>
						<input
							type="password"
							id="newPassword"
							className="glass-input w-full px-4 py-2.5 rounded-xl"
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							placeholder="8文字以上"
							required
						/>
					</div>

					<div className="mb-6">
						<label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-600 mb-1.5">
							パスワード（確認）
						</label>
						<input
							type="password"
							id="confirmPassword"
							className="glass-input w-full px-4 py-2.5 rounded-xl"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							placeholder="もう一度入力してください"
							required
						/>
					</div>

					<button
						type="submit"
						className="btn-aurora w-full py-3 rounded-xl font-semibold hover:cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
						disabled={isLoadingConfirm || isLoadingFindUser}
					>
						{isLoadingConfirm || isLoadingFindUser ? '処理中...' : 'パスワードを設定する'}
					</button>

					<div className="mt-5 text-center">
						<Link href="/login" className="text-sm text-sky-600 hover:text-sky-500 hover:underline transition-colors">
							ログイン画面へ戻る
						</Link>
					</div>
				</form>
			</div>
		</div>
	);
}
