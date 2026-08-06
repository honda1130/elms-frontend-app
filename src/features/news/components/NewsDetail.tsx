"use client";
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import PageTitle from "@/components/page-title/PageTitle";
import { pageContainer } from "@/lib/pageLayout";
import { NewsDto } from '@/features/news/types';
import { convertDateString } from '@/lib/dateUtil';
import { useApiQuery } from '@/hooks/useApiQuery';
import { swrKeys } from '@/lib/swrKeys';
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";

export default function NewsDetail() {
	const newsId = useParams().newsId as string | undefined;

	// お知らせ取得
	const {
		data: newsDto,
		error,
		isLoading,
	} = useApiQuery<NewsDto>(newsId ? swrKeys.news(newsId) : null);

	if (error) return <ErrorMessage />;
	if (isLoading) return <LoadingSpinner />;

	if (!newsDto) {
		return (
			<>
				<PageTitle title="お知らせ" containerClassName={pageContainer.narrow} />
				<div className={`${pageContainer.narrow} py-16`}>
					<div className="glass-panel rounded-3xl py-16 text-center">
						<p className="text-slate-500 text-sm">お知らせが見つかりませんでした。</p>
					</div>
				</div>
			</>
		);
	}

	return (
		<div className="mt-[60px]">
			<div className={`${pageContainer.narrow} py-10 pb-16`}>
				{/* 戻るリンク */}
				<Link
					href="/news"
					className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-sky-600 transition-colors mb-8"
				>
					<ArrowLeft size={15} />
					お知らせ一覧へ戻る
				</Link>

				{/* アーティクルヘッダー */}
				<header className="relative mb-8">
					<div className="pointer-events-none absolute -top-16 -left-10 h-44 w-44 rounded-full bg-sky-300/40 blur-3xl" />
					<time className="relative block text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-500/80 mb-3">
						{convertDateString(newsDto.createdAt)}
					</time>
					<h1 className="relative text-2xl md:text-3xl font-extrabold leading-snug tracking-tight text-aurora drop-shadow-[0_2px_16px_rgba(125,211,252,0.5)]">
						{newsDto.title}
					</h1>
					<div className="relative mt-6 h-px bg-gradient-to-r from-sky-400/70 via-cyan-300/40 to-transparent" />
				</header>

				{/* 本文 */}
				<article className="glass-panel rounded-3xl px-7 py-8 md:px-10 md:py-10">
					<p className="text-slate-600 leading-loose whitespace-pre-line text-[15px]">{newsDto.content}</p>
				</article>
			</div>
		</div>
	);
}
