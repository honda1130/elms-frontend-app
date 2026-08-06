"use client";
import { useApiQuery } from '@/hooks/useApiQuery';
import { useLoginUserId } from '@/hooks/useLoginUserId';
import { swrKeys } from '@/lib/swrKeys';
import { useRouter } from 'next/navigation';
import { pageContainer } from "@/lib/pageLayout";
import CourseCard from '@/features/course/components/CourseCard';
import Header from "@/components/Header";
import Link from "next/link";
import { convertDateString } from '@/lib/dateUtil';
import { useEffect } from 'react';
import { NewsDto, NewsPageDto } from '@/features/news/types';
import { UserCourseDto } from '@/features/course/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';

export default function Home() {
	const router = useRouter();

	const toNewsDetailPage = (event: React.MouseEvent<HTMLDivElement>) => {
		const newsId = event.currentTarget.id;
		router.push("/news/" + newsId);
	};

	// ユーザーIDを含むURLをキーにするため、解決できるまで取得しない
	const { userId, isResolving } = useLoginUserId();

	const {
		data: userCourseDtos,
		error: userCoursesError,
		isLoading: isLoadingUserCourses,
	} = useApiQuery<UserCourseDto[]>(userId ? swrKeys.userCourses(userId) : null);

	const {
		data: newsPageDto,
		error: newsError,
		isLoading: isLoadingNews,
	} = useApiQuery<NewsPageDto>(swrKeys.newsList());

	const newsDtos = newsPageDto?.newsDtos ?? [];

	// 未認証ならログイン画面へ送る
	useEffect(() => {
		if (!isResolving && !userId) {
			router.push('/login');
		}
	}, [isResolving, userId, router]);

	if (isResolving || isLoadingUserCourses || isLoadingNews) return <LoadingSpinner />;
	if (userCoursesError || newsError) return <ErrorMessage />;

	// 学習サマリー
	const courseCount = userCourseDtos.length;
	const completedCount = userCourseDtos.filter((c) => Math.round(c.courseProgress) >= 100).length;
	const overallProgress = courseCount
		? Math.round(userCourseDtos.reduce((sum, c) => sum + c.courseProgress, 0) / courseCount)
		: 0;

	return (
		<>
			<Header />

			<div className="mt-[60px] relative overflow-hidden border-b border-sky-100">
				<div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-sky-100/28 via-sky-50/6 to-transparent" />
				<div className="pointer-events-none absolute -top-32 left-[5%] h-64 w-64 rounded-full bg-sky-200/38 blur-3xl" />
				<div className="pointer-events-none absolute -top-20 right-[7%] h-56 w-56 rounded-full bg-cyan-200/36 blur-3xl" />

				<div className={`${pageContainer.wide} relative py-6 md:py-8`}>
					{/* タイトル */}
					<p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-sky-500/80">
						Dashboard
					</p>
					<h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-aurora">
						今日も、学習をつづけよう
					</h1>

					{/* 説明文（デスクトップは1行、モバイルは折り返し可） */}
					<p className="mt-2 text-sm md:text-base text-slate-500 md:whitespace-nowrap">
						Javaエンジニア養成講座へようこそ。受講中のコースから学習を再開できます。
					</p>

					{/* 統計 */}
					<div className="mt-5 grid grid-cols-3 gap-3 md:gap-4 max-w-lg">
						{[
							{ label: "受講コース", value: courseCount, unit: "件" },
							{ label: "修了コース", value: completedCount, unit: "件" },
							{ label: "全体進捗", value: overallProgress, unit: "%" },
						].map((stat) => (
							<div key={stat.label} className="glass-panel rounded-2xl px-4 py-3.5">
								<p className="text-[11px] font-medium text-slate-500 mb-1">{stat.label}</p>
								<p className="text-2xl font-extrabold text-aurora leading-none">
									{stat.value}
									<span className="ml-1 text-xs font-semibold text-slate-500">{stat.unit}</span>
								</p>
							</div>
						))}
					</div>

					{/* お知らせ（コンパクト・横並び） */}
					<div className="mt-5 glass-panel rounded-2xl overflow-hidden">
						<div className="px-5 py-3 border-b border-sky-100 flex items-center justify-between">
							<div className="flex items-center gap-2.5">
								<span className="aurora-bar block w-1 h-4 rounded-full shrink-0" />
								<h2 className="text-sm font-bold text-slate-800">お知らせ</h2>
							</div>
							<Link
								href="/news"
								className="text-xs font-medium text-sky-600 hover:text-sky-500 transition-colors"
							>
								すべて見る →
							</Link>
						</div>
						<div className="px-5 py-3">
							{newsDtos.length === 0 ? (
								<p className="text-sm text-slate-400">お知らせはまだありません</p>
							) : (
								<ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
									{newsDtos.slice(0, 3).map((news) => (
										<li
											key={news.id}
											id={news.id}
											onClick={toNewsDetailPage}
											className="group cursor-pointer rounded-xl border border-sky-100 bg-white/50 px-3.5 py-2.5 hover:border-sky-200 hover:bg-sky-50/60 transition-colors"
										>
											<p className="text-[11px] font-medium text-slate-400 mb-0.5">
												{convertDateString(news.createdAt)}
											</p>
											<p className="text-sm font-medium text-slate-700 leading-snug line-clamp-1 group-hover:text-sky-600 transition-colors">
												{news.title}
											</p>
										</li>
									))}
								</ul>
							)}
						</div>
					</div>

					{/* マイコース */}
					<div className="mt-6 pb-8">
						<div className="flex items-center gap-3 mb-4">
							<span className="aurora-bar block w-1 h-6 rounded-full shrink-0" />
							<h2 className="text-lg font-bold text-slate-800">マイコース</h2>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
							{userCourseDtos.map((course) => (
								<CourseCard
									key={course.id}
									courseId={course.id}
									imageUrl={course.thumbnailUrl ?? ''}
									title={course.title}
									description={course.description}
									progress={Math.round(course.courseProgress)}
									isAdmin={false}
								/>
							))}
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
