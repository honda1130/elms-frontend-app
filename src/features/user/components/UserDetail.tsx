'use client';
import { API_URL } from '@/lib/apiUrl';

import { useEffect, useState } from "react";
import { useRouter, useParams, usePathname } from 'next/navigation';
import { Camera } from 'lucide-react';
import { UserDto } from "@/features/user/types";
import PasswordUpdateModal from "./PasswordUpdateModal";
import Thumbnail from "@/components/Thumbnail";
import { useApiRequest } from "@/hooks/useApiRequest";
import { useApiQuery } from "@/hooks/useApiQuery";
import { swrKeys } from "@/lib/swrKeys";
import { getJWTFromCookie, getSubjectFromJWT } from "@/lib/jwtUtil";
import { pageContainer } from "@/lib/pageLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";

export default function UserDetail() {
	const router = useRouter();

	const paramUserId = useParams().userId; // URL パラメータから userId を取得
	const pathname = usePathname();
	const isNewUser = pathname === '/admin/users/new';

	// 画面に表示するState
	const [realName, setRealName] = useState<string>("");
	const [userName, setUserName] = useState<string>("");
	const [emailAddress, setEmailAddress] = useState<string>("");
	const [thumbnailUrl, setThumbnailUrl] = useState<string>("")
	const [selectedThumbnailFile, setSelectedThumbnailFile] = useState<File | null>(null);
	const [userRole, setUserRole] = useState<string>("GENERAL")

	// パスワード関連のState
	const [password, setPassword] = useState<string>("");
	const [confirmPassword, setConfirmPassword] = useState<string>("");

	// モーダルのState
	const [isPasswordUpdateModalOpen, setIsPasswordUpdateModalOpen] = useState<boolean>(false);

	// 認証にまつわるState
	const [userId, setUserId] = useState<string | null>(null);

	// ファイルアップロードAPI
	const {
		executeApi: executeUploadFileApi,
		isLoading: isLoadingUploadFileApi,
		isError: isErrorUploadFileApi,
		response: responseOfUploadFileApi
	} = useApiRequest();

	// ユーザー新規作成API
	const {
		executeApi: executeCreateUserApi,
		isLoading: isLoadingCreateUserApi,
		isError: isErrorCreateUserApi,
		response: responseOfCreateUserApi
	} = useApiRequest();

	// ユーザー更新API
	const {
		executeApi: executeUpdateUserApi,
		isLoading: isLoadingUpdateUserApi,
		isError: isErrorUpdateUserApi,
		response: responseOfUpdateUserApi
	} = useApiRequest();

	// リフレッシュトークンAPI
	const {
		executeApi: executeRefreshTokenApi,
	} = useApiRequest();

	// ユーザー取得API
	const {
		executeApi: executeFindUserByIdApi,
		isLoading: isLoadingFindUserByIdApi,
		response: responseOfFindUserByIdApi,
		isError: isErrorFindUserByIdApi
	} = useApiRequest();

	// サムネイル画像を変更する関数
	const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setSelectedThumbnailFile(file); // ファイルを保存
			setThumbnailUrl(URL.createObjectURL(file)); // プレビュー表示だけ
		}
	};

	// ユーザー情報を保存する関数
	const handleSave = async () => {
		try {
			if (isNewUser && password != confirmPassword) {
				throw new Error('パスワードが一致しません。');
			}

			let uploadedThumbnailPath = thumbnailUrl;

			// もし新しいサムネイルが選ばれてたらアップロードする
			if (selectedThumbnailFile) {
				const formData = new FormData();
				formData.append("file", selectedThumbnailFile);

				// 画像アップロードAPIを呼び出し
				const uploadFileApiResponse = await executeUploadFileApi(`${API_URL}/api/files/upload`, 'POST', formData);

				if (!uploadFileApiResponse?.ok) {
					throw new Error('サムネイルアップロード失敗');
				}

				// アップロードしたファイルのパスを取得
				uploadedThumbnailPath = await uploadFileApiResponse.text(); // 新しいパスを取得
			}

			if (isNewUser) {
				// ユーザー情報を新規作成する
				const createUserApiResponse = await executeCreateUserApi(
					`${API_URL}/api/users`,
					'POST',
					{
						realName,
						userName,
						emailAddress,
						password,
						confirmPassword,
						thumbnailUrl: uploadedThumbnailPath,
						userRole,
					}
				);

				if (!createUserApiResponse?.ok) {
					throw new Error('ユーザー新規作成 - 失敗');
				}
			} else {
				// ユーザー情報を更新する
				const updateUserApiResponse = await executeUpdateUserApi(
					`${API_URL}/api/users/${userId}`,
					'PUT',
					{
						userId,
						realName,
						userName,
						emailAddress,
						thumbnailUrl: uploadedThumbnailPath,
					}
				);

				if (!updateUserApiResponse?.ok) {
					throw new Error('ユーザー更新 - 失敗');
				}
			}

			alert('保存しました！');
			router.push('/admin/users');
		} catch (error) {
			console.error(error);
			alert('保存に失敗しました');
		}
	};

	// JWT の有効期限が切れている場合にトークンをリフレッシュし、userId を取得
	useEffect(() => {
		const refreshAndSetToken = async () => {
			try {
				// リフレッシュトークンを使用して JWT を更新
				await executeRefreshTokenApi(`${API_URL}/api/auth/refresh`, 'GET');

				// 新しい JWT をクッキーから取得
				const newToken = getJWTFromCookie();

				if (!newToken) {
					alert("トークンがありません")
					return;
				}

				// JWT から userId を取得
				setUserId(getSubjectFromJWT(newToken));
			} catch (error) {
				console.error("トークンリフレッシュ失敗", error);
				// router.push("/login");
				alert("トークンリフレッシュ失敗")
			}
		};

		if (paramUserId) {
			// ユーザー編集画面の場合
			setUserId(Array.isArray(paramUserId) ? paramUserId[0] : paramUserId);
		} else if (isNewUser) {
			// ユーザー新規画面の場合
			setUserId(null)
			setRealName("");
			setUserName("");
			setEmailAddress("");
			setThumbnailUrl("");
		} else {
			// マイアカウント画面の場合
			refreshAndSetToken();
		}
	}, [executeRefreshTokenApi, isNewUser, paramUserId, router]);

	// 編集画面のときだけユーザー情報を取得する
	const { data: fetchedUserDto } = useApiQuery<UserDto>(
		userId && !isNewUser ? swrKeys.user(userId) : null
	);

	// 取得したユーザー情報でフォームを初期化する
	useEffect(() => {
		if (!fetchedUserDto) return;
		setUserName(fetchedUserDto.userName);
		setRealName(fetchedUserDto.realName);
		setEmailAddress(fetchedUserDto.emailAddress);
		if (fetchedUserDto.thumbnailUrl) {
			setThumbnailUrl(fetchedUserDto.thumbnailUrl);
		}
		setUserRole(fetchedUserDto.userRole == '管理者' ? 'ADMIN' : 'GENERAL');
	}, [fetchedUserDto, isPasswordUpdateModalOpen]);

	// 新規画面の場合、ユーザー取得処理は行わないので、新規画面以外かつユーザー取得レスポンスがまだ返ってきていない場合はロード画面とする。
	if (!isNewUser && (!userId || !fetchedUserDto)) {
		return <LoadingSpinner />;
	}

	if (isErrorFindUserByIdApi) {
		return <ErrorMessage />;
	}

	return (
		<div className="min-h-screen">
			<div className={`${pageContainer.medium} py-10`}>
				{/* プロフィールヘッダーカード */}
				<div className="glass-panel relative overflow-hidden rounded-3xl px-8 py-8 mb-6">
					{/* 背景の光 */}
					<div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-sky-300/40 blur-3xl" />
					<div className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-cyan-200/50 blur-3xl" />

					<div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
						{/* アバター＋変更ボタン */}
						<div className="relative shrink-0">
							<div className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-sky-400 via-cyan-300 to-blue-300 opacity-70 blur-sm" />
							<div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-white/80">
								{thumbnailUrl
									? <Thumbnail thumbnailUrl={thumbnailUrl} alt="サムネイル画像" className="w-full h-full object-cover" />
									: <div className="w-full h-full bg-gradient-to-br from-sky-300 to-cyan-200" />}
							</div>
							<label className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full btn-aurora cursor-pointer" title="画像を変更">
								<Camera size={15} className="text-white" />
								<input type="file" accept="image/*" onChange={handleThumbnailChange} className="hidden" />
							</label>
						</div>

						{/* 名前・権限 */}
						<div className="text-center sm:text-left sm:pt-2 min-w-0">
							<span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold border mb-3 ${
								userRole === 'ADMIN'
									? 'bg-sky-100 border-sky-300 text-sky-700'
									: 'bg-slate-100 border-slate-200 text-slate-600'
							}`}>
								{userRole === 'ADMIN' ? '管理者' : '一般ユーザー'}
							</span>
							<h2 className="text-2xl font-extrabold tracking-tight text-aurora truncate">
								{realName || (isNewUser ? "新規ユーザー" : "")}
							</h2>
							<p className="mt-1 flex min-w-0 items-center gap-3 text-sm text-slate-500">
								{userName && <span className="shrink-0">@{userName}</span>}
								{userName && emailAddress && <span className="shrink-0 text-slate-300">/</span>}
								{emailAddress && <span className="truncate">{emailAddress}</span>}
							</p>
						</div>
					</div>
				</div>

				{/* プロフィール編集フォーム */}
				<div className="glass-panel rounded-3xl p-8">
					<h3 className="text-sm font-bold text-slate-700 tracking-wide mb-6 flex items-center gap-2.5">
						<span className="aurora-bar block w-1 h-4.5 rounded-full shrink-0" />
						プロフィール情報
					</h3>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
						{isNewUser && (
							<div>
								<label className="block text-xs font-medium text-slate-500 mb-1.5">権限</label>
								<select
									value={userRole}
									onChange={(e) => setUserRole(e.target.value)}
									className="glass-input w-full rounded-xl px-4 py-2.5 text-sm"
								>
									<option value="GENERAL">一般</option>
									<option value="ADMIN">管理者</option>
								</select>
							</div>
						)}
						<div>
							<label className="block text-xs font-medium text-slate-500 mb-1.5">氏名</label>
							<input type="text" value={realName} onChange={(e) => setRealName(e.target.value)} autoComplete="off" className="glass-input w-full rounded-xl px-4 py-2.5 text-sm" />
						</div>
						<div>
							<label className="block text-xs font-medium text-slate-500 mb-1.5">ユーザー名</label>
							<input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} autoComplete="off" className="glass-input w-full rounded-xl px-4 py-2.5 text-sm" />
						</div>
						<div className={isNewUser ? "" : "md:col-span-2"}>
							<label className="block text-xs font-medium text-slate-500 mb-1.5">メールアドレス</label>
							<input type="email" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} autoComplete="off" className="glass-input w-full rounded-xl px-4 py-2.5 text-sm" />
						</div>
						{isNewUser && (
							<>
								<div>
									<label className="block text-xs font-medium text-slate-500 mb-1.5">パスワード</label>
									<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className="glass-input w-full rounded-xl px-4 py-2.5 text-sm" />
								</div>
								<div>
									<label className="block text-xs font-medium text-slate-500 mb-1.5">確認用パスワード</label>
									<input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" className="glass-input w-full rounded-xl px-4 py-2.5 text-sm" />
								</div>
							</>
						)}
					</div>
				</div>

				<div className="flex flex-col sm:flex-row justify-end py-6 gap-3">
					{!isNewUser && (
						<button
							className="btn-ghost px-6 py-2.5 rounded-xl hover:cursor-pointer text-sm font-medium"
							onClick={() => setIsPasswordUpdateModalOpen(true)}
						>
							パスワードを変更する
						</button>
					)}
					<button
						className="btn-aurora px-10 py-2.5 rounded-xl hover:cursor-pointer text-sm font-semibold"
						onClick={() => handleSave()}
					>
						保存
					</button>
				</div>

				{isPasswordUpdateModalOpen && (
					<PasswordUpdateModal setIsPasswordUpdateModalOpen={setIsPasswordUpdateModalOpen} />
				)}
			</div>
		</div>
	);
};