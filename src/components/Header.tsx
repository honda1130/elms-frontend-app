'use client';
import { API_URL } from '@/lib/apiUrl';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Sparkles, UserRound, LogOut, ChevronDown } from 'lucide-react';
import { useApiRequest } from '@/hooks/useApiRequest';
import { getJWTFromCookie, getSubjectFromJWT, setUserRoleCookie, clearUserRoleCookie } from '@/lib/jwtUtil';
import { UserDto } from '@/features/user/types';

const Header = () => {
	const router = useRouter();

	// リフレッシュトークンAPI
	const {
		executeApi: executeRefreshTokenApi,
	} = useApiRequest();

	// ログアウトAPI
	const {
		executeApi: executeLogoutApi,
	} = useApiRequest();

	// ユーザー取得API
	const {
		executeApi: executeFindUserByIdApi,
		response: responseOfFindUserByIdApi
	} = useApiRequest();

	const [isOpen, setIsOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	const toTopPage = async () => {
		try {
			// リフレッシュトークンを使用して JWT を更新
			await executeRefreshTokenApi(`${API_URL}/api/auth/refresh`, 'GET');

			// 新しい JWT をクッキーから取得
			const newToken = getJWTFromCookie();

			if (!newToken) {
				// トークンがない場合、ログインページへリダイレクト
				router.push("/login");
				return;
			}

			// JWT から userId を取得して、ユーザー取得APIを実行。
			const userId = getSubjectFromJWT(newToken);
			await executeFindUserByIdApi(`${API_URL}/api/users/${userId}`, 'GET');
		} catch (err) {
			// リフレッシュトークンAPI失敗時
			console.log('リフレッシュトークンAPI - 失敗')
			console.log(err);
		}
	};

	const toMyAccountPage = () => {
		router.push('/account');
	};

	const logout = async () => {
		await executeLogoutApi(`${API_URL}/api/auth/logout`, 'POST');
		clearUserRoleCookie();
		router.push('/login');
	};

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			// メニューが存在している、かつ、メニューの外側を押したとき
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside);
		} else {
			document.removeEventListener('mousedown', handleClickOutside);
		}

		// クリーンアップ
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [isOpen]);

	useEffect(() => {
		// API結果を待ってから画面遷移を行う。
		if (responseOfFindUserByIdApi) {
			responseOfFindUserByIdApi.json()?.then((response: UserDto) => {
				setUserRoleCookie(response.userRole);
				if (response.userRole === '管理者') {
					router.push('/admin/users');
				} else {
					router.push('/courses');
				}
			})
		}
	}, [responseOfFindUserByIdApi, router]);

	return (
		<header className="fixed top-0 left-0 w-full z-50 bg-white/70 backdrop-blur-2xl border-b border-sky-100">
			{/* ヘッダー下端のスカイラインで存在感を出す */}
			<div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-400/70 to-transparent" />

			<div className="flex justify-between items-center h-[60px] px-4 md:px-6">
				{/* 左側：ロゴマーク＋ブランド */}
				<button
					onClick={toTopPage}
					className="group flex items-center gap-3 hover:cursor-pointer focus:outline-none min-w-0"
				>
					<span className="btn-aurora relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
						<Sparkles size={18} className="text-white" />
					</span>
					<span className="flex flex-col items-start min-w-0">
						<span className="text-sm md:text-base font-extrabold tracking-wide text-aurora truncate group-hover:opacity-80 transition-opacity">
							Javaエンジニア養成講座
						</span>
						<span className="hidden md:block text-[10px] font-semibold uppercase tracking-[0.28em] text-sky-400">
							Video Learning Platform
						</span>
					</span>
				</button>

				{/* 右側：アカウントメニュー */}
				<div className="relative shrink-0" ref={menuRef}>
					<button
						onClick={() => setIsOpen(!isOpen)}
						className={`flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 transition-all hover:cursor-pointer focus:outline-none ${
							isOpen
								? 'border-sky-400/70 bg-sky-100/70'
								: 'border-sky-200 bg-white/60 hover:border-sky-300 hover:bg-sky-50'
						}`}
					>
						<span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-400 shadow-[0_0_14px_rgba(56,189,248,0.5)]">
							<UserRound size={15} className="text-white" />
						</span>
						<ChevronDown
							size={14}
							className={`text-sky-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
						/>
					</button>

					{isOpen && (
						<div className="glass-solid absolute right-0 mt-3 w-52 rounded-2xl overflow-hidden text-slate-700">
							<div className="px-4 pt-3 pb-2 border-b border-sky-100">
								<p className="text-[10px] font-semibold uppercase tracking-widest text-sky-400">Account</p>
							</div>
							<ul className="py-1.5">
								<li
									onClick={toMyAccountPage}
									className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium hover:bg-sky-50 hover:text-sky-700 cursor-pointer transition-colors"
								>
									<UserRound size={15} className="text-sky-500" />
									マイアカウント
								</li>
								<li
									onClick={logout}
									className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium hover:bg-sky-50 hover:text-sky-700 cursor-pointer transition-colors"
								>
									<LogOut size={15} className="text-sky-500" />
									ログアウト
								</li>
							</ul>
						</div>
					)}
				</div>
			</div>
		</header>
	);
};

export default Header;