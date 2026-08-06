'use client';
import { API_URL } from '@/lib/apiUrl';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { useApiRequest } from '@/hooks/useApiRequest';
import { getJWTFromCookie, getSubjectFromJWT, setUserRoleCookie } from '@/lib/jwtUtil';
import { UserDto } from '@/features/user/types';

export default function LoginForm() {
	const router = useRouter();
	const [emailAddress, setEmailAddress] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [rememberMe, setRememberMe] = useState(false);
	const [isCheckingAuth, setIsCheckingAuth] = useState(true);

	// ユーザー取得API
	const {
		executeApi: executeFindUserByIdApi,
		isLoading: isLoadingFindUserByIdApi,
		response: responseOfFindUserByIdApi
	} = useApiRequest();

	// ログインAPI
	const {
		executeApi: executeLoginApi,
		isLoading: isLoadingLoginApi,
	} = useApiRequest();

	// 画面表示時に既ログイン済みか確認し、済みならリダイレクトする
	useEffect(() => {
		const checkAuth = async () => {
			try {
				const jwt = getJWTFromCookie();
				const res = await fetch(`${API_URL}/api/auth/refresh`, {
					method: 'GET',
					headers: { 'Authorization': `Bearer ${jwt ?? 'dummy'}` },
					credentials: 'include',
				});

				if (res.ok) {
					// 認証済み：新しいJWTを取得してユーザー情報を確認しリダイレクト
					const newToken = getJWTFromCookie();
					if (newToken) {
						const userId = getSubjectFromJWT(newToken);
						const userRes = await executeFindUserByIdApi(`${API_URL}/api/users/${userId}`, 'GET');
						if (userRes?.ok) return;
					}
				}
			} catch {
				// ネットワークエラー等は無視してログイン画面を表示
			}
			setIsCheckingAuth(false);
		};

		checkAuth();
	}, [executeFindUserByIdApi]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			await executeLoginApi(`${API_URL}/api/auth/login`, 'POST', { emailAddress, password, rememberMe });
			// 新しい JWT をクッキーから取得
			const newToken = getJWTFromCookie();
			console.log('token: ' + newToken)
			if (!newToken) {
				// ログインAPIでJWTがクッキーに登録されるため、運用上ここに処理が渡ることは起こりえないが、後続の処理でnullでないことを確約してある必要があるため、実装。
				router.push("/login");
				return;
			}

			// JWT から userId を取得して、ユーザー取得APIを実行。
			const userId = getSubjectFromJWT(newToken);
			await executeFindUserByIdApi(`${API_URL}/api/users/${userId}`, 'GET');
		} catch (err) {
			// ログインAPI失敗時
			console.log('ログインAPI - 失敗')
			console.log(err);
		}
	};

	useEffect(() => {
		// API結果を待ってから画面遷移を行う。
		if (responseOfFindUserByIdApi) {
			responseOfFindUserByIdApi.json()?.then((response: UserDto) => {
				setUserRoleCookie(response.userRole);
				if (response.userRole === '管理者') {
					router.push('/admin/courses');
				} else {
					router.push('/courses');
				}
			})
		}
	}, [responseOfFindUserByIdApi, router]);

	if (isCheckingAuth) return null;

	return (
		<div className="min-h-screen flex items-center justify-center px-4 py-10">
			<div className="glass-panel w-full max-w-5xl rounded-[2rem] overflow-hidden shadow-[0_20px_56px_rgba(56,189,248,0.14)] border-sky-100/60 grid grid-cols-1 lg:grid-cols-[1.12fr_1fr]">
				{/* 左：やわらかいスカイのアクセントパネル */}
				<div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-sky-100/80 via-cyan-50/70 to-slate-50 border-r border-sky-100">
					<div className="pointer-events-none absolute -top-20 -right-10 h-52 w-52 rounded-full bg-sky-300/25 blur-3xl" />
					<div className="pointer-events-none absolute bottom-8 left-6 h-40 w-40 rounded-full bg-cyan-200/30 blur-3xl" />

					<div className="relative">
						<div className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-white/50 px-3.5 py-1.5 mb-6 backdrop-blur-sm">
							<Sparkles size={14} className="text-sky-600" />
							<p className="text-[10px] font-bold uppercase tracking-[0.32em] text-sky-700/80">
								Video Learning Platform
							</p>
						</div>
						<div>
							<div className="flex items-stretch gap-3">
								<span className="aurora-bar w-1 rounded-full shrink-0" />
								<h1 className="text-4xl font-extrabold leading-tight tracking-tight text-aurora">
									Javaエンジニア<br />養成講座
								</h1>
							</div>
							<p className="mt-5 text-sm leading-relaxed text-slate-600 max-w-sm">
								動画とテキストで学ぶ、実践型のJava研修プラットフォーム。
								進捗を可視化しながら、自分のペースでエンジニアへの道を進めます。
							</p>
						</div>
					</div>

					<ul className="relative space-y-3">
						{[
							"動画×リッチテキストのハイブリッド教材",
							"レッスンごとの進捗トラッキング",
							"いつでも・どこでも学習を再開",
						].map((feature) => (
							<li key={feature} className="flex items-center gap-3 text-sm text-slate-600">
								<span className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/60 border border-sky-200/70 shadow-[0_0_10px_rgba(56,189,248,0.25)]">
									<span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-sky-400 to-cyan-300 shadow-[0_0_8px_rgba(56,189,248,0.9),0_0_16px_rgba(34,211,238,0.5)]" />
								</span>
								{feature}
							</li>
						))}
					</ul>
				</div>

				{/* 右：ログインフォーム */}
				<div className="relative p-8 md:p-12 flex flex-col justify-center bg-gradient-to-b from-white via-white to-sky-50/50">
					{/* モバイル用ブランド見出し */}
					<div className="lg:hidden text-center mb-8 pb-6 border-b border-sky-100 bg-gradient-to-b from-sky-50/80 to-transparent -mx-8 -mt-8 px-8 pt-8 md:-mx-12 md:-mt-12 md:px-12 md:pt-10">
						<div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 text-white mb-3 shadow-[0_4px_16px_rgba(56,189,248,0.3)]">
							<Sparkles size={18} />
						</div>
						<h1 className="text-xl font-extrabold text-aurora tracking-wide">
							Javaエンジニア養成講座
						</h1>
					</div>

					<div className="mb-8">
						<p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-600/70 mb-2">
							Welcome Back
						</p>
						<h2 className="text-xl font-bold text-slate-800">おかえりなさい</h2>
						<p className="text-slate-500 mt-1.5 text-sm">アカウントにログインして学習を続けましょう</p>
					</div>

					<form onSubmit={handleSubmit}>
					{error && (
						<div className="mb-4 px-4 py-3 bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-xl">
							{error}
						</div>
					)}

					<div className="mb-5">
						<label htmlFor="emailAddress" className="block text-sm font-medium text-slate-700 mb-1.5">
							メールアドレス
						</label>
						<input
							type="email"
							id="emailAddress"
							className="glass-input w-full px-4 py-2.5 rounded-xl bg-white"
							value={emailAddress}
							onChange={(e) => setEmailAddress(e.target.value)}
							required
						/>
					</div>

					<div className="mb-5">
						<label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
							パスワード
						</label>
						<input
							type="password"
							id="password"
							className="glass-input w-full px-4 py-2.5 rounded-xl bg-white"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
						/>
					</div>

					<div className="flex items-center mb-6">
						<input
							type="checkbox"
							id="remember"
							className="h-4 w-4 accent-sky-600 rounded cursor-pointer"
							checked={rememberMe}
							onChange={(e) => setRememberMe(e.target.checked)}
						/>
						<label htmlFor="remember" className="ml-2 text-sm text-slate-500 cursor-pointer">
							ログイン状態を保持する
						</label>
					</div>

					<button
						type="submit"
						className="btn-aurora w-full py-3 rounded-xl font-semibold hover:cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_6px_20px_rgba(14,165,233,0.28)]"
						disabled={isLoadingLoginApi || isLoadingFindUserByIdApi}
					>
						{isLoadingLoginApi || isLoadingFindUserByIdApi ? 'ログイン中...' : 'ログイン'}
					</button>

					<div className="mt-5 text-center">
						<Link href="/password" className="text-sm text-sky-700 hover:text-sky-600 hover:underline transition-colors">
							パスワードをお忘れの方はこちら
						</Link>
					</div>
					</form>
				</div>
			</div>
		</div>
	);
}
