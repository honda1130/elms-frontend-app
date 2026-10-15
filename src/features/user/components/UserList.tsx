"use client";
import { API_URL } from '@/lib/apiUrl';

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { UserDto, UserImportResponseDto, UserPageDto } from "@/features/user/types";
import { convertDateTimeString } from "@/lib/dateUtil";
import Thumbnail from "@/components/Thumbnail";
import { useApiRequest } from "@/hooks/useApiRequest";
import { useApiQuery } from "@/hooks/useApiQuery";
import { swrKeys } from "@/lib/swrKeys";
import { downloadBlob } from "@/lib/downloadUtil";
import { pageContainer } from "@/lib/pageLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import SimplePagenation from "@/components/pagenation/SimplePagenation";

export type UserSearchCondition = {
	userId?: string;
	userRole?: "ADMIN" | "GENERAL" | "";
	realName?: string;
	userName?: string;
	emailAddress?: string;
	createdDateFrom?: string; // yyyy-MM-dd
	createdDateTo?: string;
};

export default function UserList() {
	const router = useRouter();
	const csvFileInputRef = useRef<HTMLInputElement>(null);

	const [isOpen, setIsOpen] = useState(false);
	const [showImportConfirmDialog, setShowImportConfirmDialog] = useState(false);

	// 検索条件
	const [cond, setCond] = useState<UserSearchCondition>({});
	const [dateError, setDateError] = useState<string | null>(null);

	const userRoleOptions = [
		{ value: "", label: "全て" },
		{ value: "ADMIN", label: "管理者" },
		{ value: "GENERAL", label: "一般" },
	];


	// ユーザー削除API
	const {
		executeApi: executeDeleteUserApi,
	} = useApiRequest();

	// ユーザー情報CSV出力API
	const {
		executeApi: executeExportUsersCsvApi,
		isLoading: isLoadingExportUsersCsvApi,
		isError: isErrorExportUsersCsvApi,
	} = useApiRequest();

	// ユーザー情報CSV取込API
	const {
		executeApi: executeImportUsersCsvApi,
		isLoading: isLoadingImportUsersCsvApi,
		isError: isErrorImportUsersCsvApi,
	} = useApiRequest();

	// 1ページで表示する件数
	const [pageSize, setPageSize] = useState(10);

	// ページ番号
	const [pageNum, setPageNum] = useState(1);

	// 実際に検索へ適用済みの条件。入力途中の値で再取得しないよう、フォームの状態(cond)とは分けて持つ
	const [appliedCond, setAppliedCond] = useState<UserSearchCondition>({});

	// ユーザー一覧取得（条件・ページがキーに含まれるため、変わると自動で再取得される）
	const usersQuery = new URLSearchParams({
		userId: appliedCond.userId ?? "",
		userRole: appliedCond.userRole ?? "",
		realName: appliedCond.realName ?? "",
		userName: appliedCond.userName ?? "",
		emailAddress: appliedCond.emailAddress ?? "",
		createdDateFrom: appliedCond.createdDateFrom ?? "",
		createdDateTo: appliedCond.createdDateTo ?? "",
		pageNum: pageNum.toString(),
		pageSize: pageSize.toString(),
	}).toString();
	const {
		data: userPageDto,
		error: fetchError,
		isLoading: isLoadingFindUsersApi,
		mutate: mutateUsers,
	} = useApiQuery<UserPageDto>(swrKeys.users(usersQuery));

	const userDtos = userPageDto?.userDtos ?? [];
	const totalPageNum = userPageDto
		? Math.ceil(userPageDto.totalSize / userPageDto.pageSize)
		: 1;

	// ユーザー詳細画面に遷移する関数
	const toUserDetailView = (id: string) => {
		router.push(`/admin/users/${id}/edit`);
	};

	// ユーザーを削除し、最新のユーザー一覧を取得する
	const deleteAndFetchUsers = async (e: React.MouseEvent, userId: string) => {
		e.stopPropagation();
		const res = await executeDeleteUserApi(
			`${API_URL}/api/users/${userId}`,
			"DELETE"
		);
		if (!res?.ok) {
			alert("削除に失敗しました");
			return;
		}

		if (pageNum === 1) {
			await mutateUsers();
		} else {
			// pageNumを1に戻すとキーが変わり、SWRが自動で取り直す。
			setPageNum(1);
		}
	};

	// 検索フィルターの内容を更新する
	const update = <K extends keyof UserSearchCondition>(
		key: K,
		value: UserSearchCondition[K]
	) => setCond((prev) => ({ ...prev, [key]: value }));

	// 該当ページのユーザーを検索する
	// 検索条件を適用する。実際の取得はSWRがキーの変化を検知して行う
	const applySearch = useCallback(() => {
		if (cond.createdDateFrom && cond.createdDateTo && cond.createdDateFrom > cond.createdDateTo) {
			setDateError("作成日Fromは作成日Toより前の日付を入力してください。");
			return;
		}
		setDateError("");
		setAppliedCond(cond);
		setPageNum(1);
	}, [cond]);

	// ユーザー情報CSV出力ボタン押下時に呼ばれるハンドラー
	const handleExportUsersCsv = async () => {
		try{
			const response = await executeExportUsersCsvApi(`${API_URL}/api/users/export`, "GET");
			if(!response) return;
			downloadBlob(await response.blob(), "users.csv");
		} catch(error){
			console.error("UsersCsv出力エラー:", error);
		}
	}

	const handleImportButtonClick = () => {
		setShowImportConfirmDialog(true);
	};

	const handleImportConfirm = () => {
		setShowImportConfirmDialog(false);
		csvFileInputRef.current?.click();
	};

	const handleImportCancel = () => {
		setShowImportConfirmDialog(false);
	};

	const handleCsvFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const formData = new FormData();
		formData.append("file", file);

		try {
			const response = await executeImportUsersCsvApi(
				`${API_URL}/api/users/import`,
				"POST",
				formData
			);

			if (!response?.ok) {
				alert("CSV取込に失敗しました");
				return;
			}

			const result: UserImportResponseDto = await response.json();
			alert(`${result.importedCount}件のユーザーを取り込みました`);

			if (pageNum === 1) {
				await mutateUsers();
			} else {
				setPageNum(1);
			}
		} catch (error) {
			console.error("CSV取込エラー:", error);
			alert("CSV取込中にエラーが発生しました");
		} finally {
			e.target.value = "";
		}
	};

	// セレクトボックスの変更時に呼ばれるハンドラー
	const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const newPageSize = Number(e.target.value);
		const newPageNum = 1;
		setPageSize(newPageSize);
		setPageNum(newPageNum);
	};

	// ページネーション：前ページ遷移時の挙動
	const handlePrevPage = () => {
		const prevPage: number = pageNum - 1;
		setPageNum(prevPage);
	};

	// ページネーション：次ページ遷移時の挙動
	const handleNextPage = () => {
		const nextPage: number = pageNum + 1;
		setPageNum(nextPage);
	};

	if (fetchError) return <ErrorMessage />;
	if (isLoadingFindUsersApi) return <LoadingSpinner />;

	return (
		<div className="min-h-screen">
			<div className={`${pageContainer.adminWide} py-8`}>
				{/* ページヘッダー：タイトル＋ツールバー */}
				<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
					<div>
						<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-500/80 mb-1.5">
							User Management
						</p>
						<h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-aurora">ユーザー一覧</h1>
					</div>
					<div className="flex flex-wrap gap-2">
						<input
							ref={csvFileInputRef}
							type="file"
							accept=".csv,text/csv"
							className="hidden"
							onChange={handleCsvFileSelected}
						/>
						<button
							onClick={handleExportUsersCsv}
							className="btn-ghost px-4 py-2.5 rounded-xl whitespace-nowrap hover:cursor-pointer text-sm font-medium disabled:opacity-50"
							disabled={isLoadingExportUsersCsvApi}
						>
							{isLoadingExportUsersCsvApi ? "出力中..." : "CSV出力"}
						</button>
						{isErrorExportUsersCsvApi && (
							<p className="text-rose-500 text-sm self-center">CSV出力に失敗しました</p>
						)}
						<button
							onClick={handleImportButtonClick}
							className="btn-ghost px-4 py-2.5 rounded-xl whitespace-nowrap hover:cursor-pointer text-sm font-medium disabled:opacity-50"
							disabled={isLoadingImportUsersCsvApi}
						>
							{isLoadingImportUsersCsvApi ? "取込中..." : "CSV取込"}
						</button>
						{isErrorImportUsersCsvApi && (
							<p className="text-rose-500 text-sm self-center">CSV取込に失敗しました</p>
						)}
						<button
							onClick={() => router.push("/admin/users/new")}
							className="btn-aurora px-5 py-2.5 rounded-xl whitespace-nowrap hover:cursor-pointer text-sm font-semibold"
						>
							＋ ユーザー登録
						</button>
					</div>
				</div>

				{/* 検索フィルター */}
				<div className="glass-panel mb-6 rounded-2xl overflow-hidden">
					<button
						onClick={() => setIsOpen(!isOpen)}
						className="w-full text-left px-5 py-3.5 flex justify-between items-center hover:bg-sky-50/70 transition-colors hover:cursor-pointer"
					>
						<span className="text-sm font-semibold text-slate-700">検索条件</span>
						<span className={`text-sky-400 text-sm transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>▼</span>
					</button>
					{isOpen && (
						<div className="border-t border-sky-100 p-5 space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div>
									<label className="block text-xs font-medium text-slate-500 mb-1.5">ユーザーID</label>
									<input
										type="text"
										value={cond.userId ?? ""}
										onChange={(e) => update("userId", e.target.value ? e.target.value : undefined)}
										className="glass-input w-full rounded-xl px-4 py-2.5 text-sm"
									/>
								</div>
								<div>
									<label className="block text-xs font-medium text-slate-500 mb-1.5">権限</label>
									<select
										value={cond.userRole ?? ""}
										onChange={(e) => update("userRole", e.target.value as "ADMIN" | "GENERAL" | "")}
										className="glass-input w-full rounded-xl px-4 py-2.5 text-sm"
									>
										{userRoleOptions.map((o) => (
											<option key={o.value} value={o.value}>{o.label}</option>
										))}
									</select>
								</div>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								{[["氏名", "realName"], ["ユーザー名", "userName"], ["メールアドレス", "emailAddress"]].map(([label, key]) => (
									<div key={key}>
										<label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
										<input
											type="text"
											value={cond[key as keyof UserSearchCondition] ?? ""}
											onChange={(e) => update(key as keyof UserSearchCondition, e.target.value)}
											className="glass-input w-full rounded-xl px-4 py-2.5 text-sm"
										/>
									</div>
								))}
							</div>
							<div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
								{["From", "To"].map((suffix) => (
									<div key={suffix}>
										<label className="block text-xs font-medium text-slate-500 mb-1.5">作成日 {suffix}</label>
										<input
											type="date"
											value={suffix === "From" ? cond.createdDateFrom ?? "" : cond.createdDateTo ?? ""}
											onChange={(e) => update(suffix === "From" ? "createdDateFrom" : "createdDateTo", e.target.value)}
											className="glass-input w-full rounded-xl px-4 py-2.5 text-sm"
										/>
									</div>
								))}
								<button
									onClick={() => applySearch()}
									className="btn-aurora px-6 py-2.5 rounded-xl cursor-pointer text-sm font-semibold"
								>
									検索
								</button>
								{dateError && <div className="md:col-span-3 text-rose-500 text-sm">{dateError}</div>}
							</div>
						</div>
					)}
				</div>

				{/* 表示件数 */}
				<div className="flex items-center justify-end mb-3 text-xs text-slate-500">
					<label className="mr-2">1ページあたり</label>
					<select
						value={pageSize}
						onChange={handlePageSizeChange}
						className="glass-input rounded-lg px-2.5 py-1.5 text-xs"
					>
						<option value={10}>10件</option>
						<option value={20}>20件</option>
						<option value={30}>30件</option>
					</select>
				</div>

				{/* テーブル */}
				<div className="glass-panel rounded-2xl overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-sky-100">
							<thead className="bg-sky-50/80">
								<tr>
									{["ID", "ユーザー", "権限", "メールアドレス", "作成日時", "最終ログイン", "進捗", ""].map((h) => (
										<th key={h} className="px-4 py-3.5 text-left text-[11px] font-semibold text-sky-600/80 uppercase tracking-wider whitespace-nowrap">{h}</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-sky-50">
								{userDtos.map((user) => (
									<tr
										key={user.id}
										className="hover:bg-sky-50/80 cursor-pointer transition-colors whitespace-nowrap"
										onClick={() => toUserDetailView(user.id)}
									>
										<td className="px-4 py-3 text-sm text-slate-500">{user.id}</td>
										<td className="px-4 py-3">
											{/* アバター＋氏名／ユーザー名をまとめて表示 */}
											<div className="flex items-center gap-3">
												<div className="w-9 h-9 rounded-full overflow-hidden border border-sky-200 shrink-0 shadow-[0_0_10px_rgba(56,189,248,0.3)]">
													{user.thumbnailUrl
														? <Thumbnail thumbnailUrl={user.thumbnailUrl} alt="サムネイル" className="w-full h-full object-cover" />
														: <div className="w-full h-full bg-gradient-to-br from-sky-300 to-cyan-200" />}
												</div>
												<div className="min-w-0">
													<p className="text-sm font-semibold text-slate-800 truncate">{user.realName}</p>
													<p className="text-xs text-slate-400 truncate">@{user.userName}</p>
												</div>
											</div>
										</td>
										<td className="px-4 py-3">
											<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap border ${user.userRole === '管理者' ? 'bg-sky-100 border-sky-300 text-sky-700' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
												{user.userRole}
											</span>
										</td>
										<td className="px-4 py-3 text-sm text-slate-500">{user.emailAddress}</td>
										<td className="px-4 py-3 text-sm text-slate-500">{convertDateTimeString(user.createdAt)}</td>
										<td className="px-4 py-3 text-sm text-slate-500">
											{user.lastLoginAt ? convertDateTimeString(user.lastLoginAt) : <span className="text-slate-600">ログイン履歴なし</span>}
										</td>
										<td className="px-4 py-3">
											{/* 進捗ミニバー */}
											<div className="flex items-center gap-2.5">
												<div className="h-1.5 w-16 rounded-full bg-sky-100 overflow-hidden">
													<div
														className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300"
														style={{ width: `${user.progressRate}%` }}
													/>
												</div>
												<span className="text-xs font-semibold text-sky-600">{user.progressRate}%</span>
											</div>
										</td>
										<td className="px-4 py-3">
											<button
												className="rounded-full border border-rose-300 bg-rose-50 text-rose-500 px-3.5 py-1.5 hover:bg-rose-100 hover:text-rose-600 hover:cursor-pointer text-xs font-medium transition-colors whitespace-nowrap"
												onClick={(e) => deleteAndFetchUsers(e, user.id)}
											>
												削除
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>

				{/* ページネーション */}
				<div className="pb-6">
					<SimplePagenation
						handlePrevPage={handlePrevPage}
						pageNum={pageNum}
						totalPageNum={totalPageNum}
						handleNextPage={handleNextPage}
					/>
				</div>
			</div>

			{showImportConfirmDialog && (
				<div className="fixed inset-0 flex items-center justify-center z-50">
					<div className="absolute inset-0 bg-sky-900/30 backdrop-blur-sm z-40" onClick={handleImportCancel}></div>
					<div className="glass-solid relative p-7 rounded-3xl w-[calc(100%-2rem)] max-w-sm z-50">
						<h3 className="text-base font-bold text-slate-800 mb-2">CSV取込の確認</h3>
						<p className="text-sm text-slate-600 mb-5">
							CSV取込を実施すると、現在存在するユーザーが全て削除されます。よろしいですか？
						</p>
						<div className="flex justify-end gap-3">
							<button
								onClick={handleImportCancel}
								className="btn-ghost px-5 py-2.5 text-sm font-medium rounded-xl cursor-pointer"
							>
								いいえ
							</button>
							<button
								onClick={handleImportConfirm}
								className="px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-rose-500 to-red-500 text-white rounded-xl hover:from-rose-400 hover:to-red-400 cursor-pointer transition-colors shadow-[0_4px_20px_rgba(244,63,94,0.4)]"
							>
								はい
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
