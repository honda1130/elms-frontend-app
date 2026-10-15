"use client";
import { API_URL } from '@/lib/apiUrl';

import { useRouter } from "next/navigation";
import { NewsDto, NewsPageDto } from "@/features/news/types";
import { convertDateString } from "@/lib/dateUtil";
import { useApiRequest } from "@/hooks/useApiRequest";
import { useEffect, useState, useCallback } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { pageContainer } from "@/lib/pageLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import SimplePagenation from "@/components/pagenation/SimplePagenation";

export default function NewsList() {
	const router = useRouter();

	// 検索フィルターの開閉
	const [isOpen, setIsOpen] = useState(false);

	// 検索フィルター：タイトル
	const [title, setTitle] = useState("");

	// 検索フィルター：作成日 From
	const [createdDateFrom, setCreatedDateFrom] = useState("");

	// 検索フィルター：作成日 To
	const [createdDateTo, setCreatedDateTo] = useState("");

	// 検索フィルター作成日に関するエラーメッセージ
	const [createdDateErrorMessage, setCreatedDateErrorMessage] = useState<string | null>(null);

	// ページング情報：1ページで表示する件数
	const [pageSize, setPageSize] = useState(10);

	// ページング情報：ページ番号
	const [pageNum, setPageNum] = useState(1);

	// ページング情報：合計ページ数
	const [totalPageNum, setTotalPageNum] = useState(1);

	// お知らせリスト
	const [newsDtos, setNewsDtos] = useState<NewsDto[]>([]);

	// お知らせ一覧取得API
	const {
		executeApi: executeFindNewsApi,
		isLoading: isLoadingFindNewsApi,
		isError: isErrorFindNewsApi
	} = useApiRequest();

	// お知らせ削除API
	const { executeApi: executeDeleteNewsApi } = useApiRequest();

	// お知らせCSV出力API
	const {
		executeApi: executeExportNewsCsvApi,
		isLoading: isLoadingExportNewsCsvApi,
		isError: isErrorExportNewsCsvApi,
	} = useApiRequest();

	// お知らせ詳細画面に遷移する
	const toNewsDetailPage = (newsId: string) => {
		router.push(`/admin/news/${newsId}/edit`);
	};

	// お知らせを削除し、最新のお知らせ一覧を取得する
	const deleteAndFetchNews = async (e: React.MouseEvent, newsId: string) => {
		e.stopPropagation();
		const res = await executeDeleteNewsApi(
			`${API_URL}/api/news/${newsId}`,
			"DELETE"
		);
		if (!res?.ok) {
			alert("削除に失敗しました");
			return;
		}

		if (pageNum === 1) {
			fetchNews(1, pageSize);
		} else {
			// pageNumが1以外から1に変更されたらuseEffectにより、fetchNewsが実行される。
			setPageNum(1);
		}
	};

	// お知らせCSV出力ボタン押下時に呼ばれるハンドラー
	const handleExportNewsCsv = async () => {
		try {
			const response = await executeExportNewsCsvApi(`${API_URL}/api/news/export`, "GET");
			if (!response) return;
			// 500等はuseApiRequestでエラー扱いにならないため、エラー内容をCSVとして保存しないようここで弾く
			if (!response.ok) {
				alert("CSV出力に失敗しました");
				return;
			}
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "news.csv";
			a.click();
			window.URL.revokeObjectURL(url);
		} catch (error) {
			console.error("NewsCsv出力エラー:", error);
		}
	};

	// 該当ページのお知らせを検索する
	const fetchNews = useCallback(async (pageNum: number, pageSize: number) => {
		if (createdDateFrom && createdDateTo && createdDateFrom > createdDateTo) {
			setCreatedDateErrorMessage("作成日Fromは作成日Toより前の日付を入力してください。");
			return;
		}
		setCreatedDateErrorMessage("");

		// クエリパラメータ
		const queryParams = new URLSearchParams({
			title,
			createdDateFrom,
			createdDateTo,
			pageNum: pageNum.toString(),
			pageSize: pageSize.toString(),
		});
		const findNewsApiResponse = await executeFindNewsApi(
			`${API_URL}/api/news?${queryParams.toString()}`,
			"GET"
		);
		findNewsApiResponse?.json()?.then((newsPageDto: NewsPageDto) => {
			setNewsDtos(newsPageDto.newsDtos);
			setTotalPageNum(Math.ceil(newsPageDto.totalSize / newsPageDto.pageSize));
		});
	}, [title, createdDateFrom, createdDateTo]);

	// セレクトボックスの変更時に呼ばれるハンドラー
	const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const newPageSize = Number(e.target.value);
		const newPageNum = 1;
		setPageSize(newPageSize);
		setPageNum(newPageNum);
	};

	// 1ページあたりの件数セレクトボックス変更時や、ページング時にお知らせ一覧取得を実行する。
	useEffect(() => {
		fetchNews(pageNum, pageSize);
	}, [pageNum, pageSize]);

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

	if (isErrorFindNewsApi) return <ErrorMessage />;
	if (isLoadingFindNewsApi) return <LoadingSpinner />;

	return (
		<div className="min-h-screen">
			<div className={`${pageContainer.adminNarrow} py-8`}>
				{/* ページヘッダー */}
				<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
					<div>
						<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-500/80 mb-1.5">
							Announcements
						</p>
						<h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-aurora">お知らせ一覧</h1>
					</div>
					<div className="flex flex-wrap gap-2 self-start md:self-auto">
						<button
							onClick={handleExportNewsCsv}
							className="btn-ghost px-4 py-2.5 rounded-xl whitespace-nowrap cursor-pointer text-sm font-medium disabled:opacity-50"
							disabled={isLoadingExportNewsCsvApi}
						>
							{isLoadingExportNewsCsvApi ? "出力中..." : "CSV出力"}
						</button>
						{isErrorExportNewsCsvApi && (
							<p className="text-rose-500 text-sm self-center">CSV出力に失敗しました</p>
						)}
						<button
							onClick={() => router.push("/admin/news/new")}
							className="btn-aurora px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap cursor-pointer"
						>
							＋ お知らせを新規作成
						</button>
					</div>
				</div>

				{/* 検索バー */}
				<div className="mb-8">
					<div className="glass-panel flex items-center gap-2 rounded-full px-2 py-2">
						<Search size={16} className="ml-3 text-slate-500 shrink-0" />
						<input
							type="text"
							placeholder="タイトルで検索..."
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							onKeyDown={(e) => { if (e.key === "Enter") fetchNews(1, pageSize); }}
							className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none min-w-0"
						/>
						<button
							onClick={() => setIsOpen(!isOpen)}
							className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
								isOpen ? "bg-sky-100 text-sky-700" : "text-slate-500 hover:bg-sky-50 hover:text-sky-700"
							}`}
						>
							<SlidersHorizontal size={13} />
							期間
						</button>
						<button
							onClick={() => fetchNews(1, pageSize)}
							className="btn-aurora shrink-0 rounded-full px-5 py-2 text-sm font-semibold cursor-pointer"
						>
							検索
						</button>
					</div>

					{isOpen && (
						<div className="glass-panel mt-3 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-xs font-medium text-slate-500 mb-1.5">作成日 From</label>
								<input
									type="date"
									value={createdDateFrom}
									onChange={(e) => setCreatedDateFrom(e.target.value)}
									className="glass-input w-full rounded-xl px-4 py-2.5 text-sm"
								/>
							</div>
							<div>
								<label className="block text-xs font-medium text-slate-500 mb-1.5">作成日 To</label>
								<input
									type="date"
									value={createdDateTo}
									onChange={(e) => setCreatedDateTo(e.target.value)}
									className="glass-input w-full rounded-xl px-4 py-2.5 text-sm"
								/>
							</div>
							{createdDateErrorMessage && (
								<p className="md:col-span-2 text-rose-500 text-sm">{createdDateErrorMessage}</p>
							)}
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

				{/* お知らせ一覧 */}
				<div className="space-y-3">
					{newsDtos.map((newsDto) => (
						<div
							key={newsDto.id}
							className="glass-panel group rounded-2xl px-5 pt-4 pb-5 flex items-center gap-4 hover:border-sky-300 hover:-translate-y-0.5 hover:shadow-[0_10px_32px_rgba(56,189,248,0.3)] transition-all duration-200 cursor-pointer"
							onClick={() => toNewsDetailPage(`${newsDto.id}`)}
						>
							<div className="flex-1 min-w-0">
								<time className="text-[11px] font-semibold uppercase tracking-widest text-sky-500/80">
									{convertDateString(newsDto.createdAt)}
								</time>
								<p className="mt-1.5 text-sm font-bold text-slate-800 leading-snug group-hover:text-sky-700 transition-colors truncate">
									{newsDto.title}
								</p>
							</div>
							<button
								onClick={(e) => deleteAndFetchNews(e, newsDto.id)}
								className="shrink-0 rounded-full border border-rose-300 bg-rose-50 text-rose-500 px-4 py-1.5 hover:bg-rose-100 hover:text-rose-600 transition-colors cursor-pointer text-xs font-medium leading-none"
							>
								削除
							</button>
						</div>
					))}
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
		</div>
	);
}
