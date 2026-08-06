'use client';
import { API_URL } from '@/lib/apiUrl';

import { useState } from 'react';
import Link from 'next/link';
import { useApiRequest } from '@/hooks/useApiRequest';

export default function PasswordResetForm() {
	const [emailAddress, setEmailAddress] = useState('');
	const [sent, setSent] = useState(false);

	const { executeApi, isLoading } = useApiRequest();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		await executeApi(`${API_URL}/api/password-reset/request`, 'POST', { emailAddress });
		setSent(true);
	};

	if (sent) {
		return (
			<div className="flex justify-center items-center min-h-screen">
				<div className="w-full max-w-md px-4">
					<div className="text-center mb-8">
						<h1 className="text-2xl font-bold text-aurora tracking-wide">Javaエンジニア養成講座</h1>
					</div>
					<div className="glass-panel p-8 rounded-3xl text-center">
						<div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-300 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(52,211,153,0.25)]">
							<svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
							</svg>
						</div>
						<h2 className="text-lg font-semibold text-slate-800 mb-2">メールを送信しました</h2>
						<p className="text-sm text-slate-500 mb-6">
							ご登録のメールアドレスにパスワード再設定リンクをお送りしました。<br />
							メールをご確認ください。
						</p>
						<Link href="/login" className="text-sm text-sky-600 hover:text-sky-500 hover:underline transition-colors">
							ログイン画面へ戻る
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
					<p className="text-slate-500 mt-2 text-sm">パスワード再設定</p>
				</div>

				<form onSubmit={handleSubmit} className="glass-panel p-8 rounded-3xl">
					<p className="text-sm text-slate-600 mb-6">
						ご登録のメールアドレスを入力してください。<br />
						パスワード再設定リンクをお送りします。
					</p>

					<div className="mb-6">
						<label htmlFor="emailAddress" className="block text-sm font-medium text-slate-600 mb-1.5">
							メールアドレス
						</label>
						<input
							type="email"
							id="emailAddress"
							className="glass-input w-full px-4 py-2.5 rounded-xl"
							value={emailAddress}
							onChange={(e) => setEmailAddress(e.target.value)}
							required
						/>
					</div>

					<button
						type="submit"
						className="btn-aurora w-full py-3 rounded-xl font-semibold hover:cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
						disabled={isLoading}
					>
						{isLoading ? '送信中...' : '再設定リンクを送信'}
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
