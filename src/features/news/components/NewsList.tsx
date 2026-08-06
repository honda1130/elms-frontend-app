"use client";
import { API_URL } from '@/lib/apiUrl';

import { useRouter } from "next/navigation";
import { NewsDto, NewsPageDto } from "@/features/news/types";
import { convertDateString } from "@/lib/dateUtil";
import { useApiQuery } from "@/hooks/useApiQuery";
import { swrKeys } from "@/lib/swrKeys";
import { useEffect, useState, useCallback } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import PageTitle from "@/components/page-title/PageTitle";
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

	// 実際に検索へ適用済みの条件。入力途中の値で再取得しないよう、フォームの状態とは分けて持つ
	const [appliedFilters, setAppliedFilters] = useState({
		title: "",
		createdDateFrom: "",
		createdDateTo: "",
	});

	// お知らせ一覧取得（条件・ページがキーに含まれるため、変わると自動で再取得される）
	const newsQuery = new URLSearchParams({
		title: appliedFilters.title,
		createdDateFrom: appliedFilters.createdDateFrom,
		createdDateTo: appliedFilters.createdDateTo,
		pageNum: pageNum.toString(),
		pageSize: pageSize.toString(),
	}).toString();
	const {
		data: newsPageDto,
		error: fetchError,
		isLoading: isLoadingFindNewsApi,
	} = useApiQuery<NewsPageDto>(swrKeys.newsList(newsQuery));

	const newsDtos: NewsDto[] = newsPageDto?.newsDtos ?? [];
	const totalPageNum = newsPageDto
		? Math.ceil(newsPageDto.totalSize / newsPageDto.pageSize)
		: 1;

	// お知らせ詳細画面に遷移する
	const toNewsDetailPage = (newsId: string) => {
		router.push(`/news/${newsId}`);
	};

	// 検索条件を適用する。実際の取得はSWRがキーの変化を検知して行う
	const applySearch = useCallback(() => {
		if (createdDateFrom && createdDateTo && createdDateFrom > createdDateTo) {
			setCreatedDateErrorMessage("作成日Fromは作成日Toより前の日付を入力してください。");
			return;
		}
		setCreatedDateErrorMessage("");
		setAppliedFilters({ title, createdDateFrom, createdDateTo });
		setPageNum(1);
	}, [title, createdDateFrom, createdDateTo]);

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
	if (isLoadingFindNewsApi) return <LoadingSpinner />;

	return (
		<>
			<PageTitle title="お知らせ" containerClassName={pageContainer.narrow} />

			<div className={`${pageContainer.narrow} py-8 pb-14`}>
				{/* 検索バー：ピル型のタイトル検索＋詳細フィルタートグル */}
				<div className="mb-8">
					<div className="glass-panel flex items-center gap-2 rounded-full px-2 py-2">
						<Search size={16} className="ml-3 text-sky-400 shrink-0" />
						<input
							type="text"
							placeholder="お知らせをタイトルで検索..."
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							onKeyDown={(e) => { if (e.key === "Enter") applySearch(); }}
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
							onClick={() => applySearch()}
							className="btn-aurora shrink-0 rounded-full px-5 py-2 text-sm font-semibold cursor-pointer"
						>
							検索
						</button>
					</div>

					{/* 期間フィルター（展開時） */}
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
				<div className="flex items-center justify-end mb-5 text-xs text-slate-500/90">
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

				{/* お知らせタイムライン */}
				{newsDtos.length === 0 ? (
					<div className="glass-panel rounded-3xl py-16 text-center">
						<p className="text-sm text-slate-500">該当するお知らせが見つかりませんでした</p>
					</div>
				) : (
					<ol className="relative border-l border-sky-200 ml-3 space-y-4">
						{newsDtos.map((newsDto) => (
							<li key={newsDto.id} className="relative pl-8">
								{/* タイムラインの光点 */}
								<span className="absolute -left-[5.5px] top-5 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-sky-400 to-cyan-300 shadow-[0_0_10px_rgba(56,189,248,0.8)]" />
								<article
									onClick={() => toNewsDetailPage(`${newsDto.id}`)}
									className="glass-panel group rounded-2xl px-6 pt-4 pb-5 cursor-pointer hover:border-sky-300 hover:-translate-y-0.5 hover:shadow-[0_10px_32px_rgba(56,189,248,0.3)] transition-all duration-200"
								>
									<time className="text-[11px] font-semibold uppercase tracking-widest text-sky-500/80">
										{convertDateString(newsDto.createdAt)}
									</time>
									<div className="mt-1.5 flex items-start gap-3">
										<h3 className="flex-1 min-w-0 text-base font-bold text-slate-800 leading-snug group-hover:text-sky-700 transition-colors duration-200">
											{newsDto.title}
										</h3>
										<span
											aria-hidden
											className="shrink-0 w-14 pt-0.5 text-right text-xs font-semibold text-sky-600 whitespace-nowrap opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-[opacity,transform] duration-300 ease-out"
										>
											読む →
										</span>
									</div>
								</article>
							</li>
						))}
					</ol>
				)}

				{/* ページネーション */}
				<SimplePagenation
					handlePrevPage={handlePrevPage}
					pageNum={pageNum}
					totalPageNum={totalPageNum}
					handleNextPage={handleNextPage}
				/>
			</div>
		</>
	);
}
