"use client";
import { API_URL } from '@/lib/apiUrl';
import CourseCard from "./CourseCard";
import { useApiRequest } from "@/hooks/useApiRequest";
import { useApiQuery } from "@/hooks/useApiQuery";
import { swrKeys } from "@/lib/swrKeys";
import { downloadBlob } from "@/lib/downloadUtil";
import { CourseDto, CoursePageDto } from "@/features/course/types";
import Link from "next/link";
import { useState } from "react";
import SimplePagenation from "@/components/pagenation/SimplePagenation";
import { pageContainer } from "@/lib/pageLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";

export default function CourseListForAdmin() {
	// 1ページで表示する件数
	const [pageSize, setPageSize] = useState(10);

	// ページ番号
	const [pageNum, setPageNum] = useState(1);

	// コース一覧取得（検索条件がキーに含まれるため、ページを変えると自動で再取得される）
	const coursesQuery = new URLSearchParams({
		pageSize: pageSize.toString(),
		pageNum: pageNum.toString(),
	}).toString();
	const {
		data: coursePageDto,
		error: fetchError,
		isLoading: isLoadingFindCoursesApi,
		mutate: mutateCourses,
	} = useApiQuery<CoursePageDto>(swrKeys.courses(coursesQuery));

	const courseDtos: CourseDto[] = coursePageDto?.courseDtos ?? [];
	const totalPageNum = coursePageDto
		? Math.ceil(coursePageDto.totalSize / coursePageDto.pageSize)
		: 1;

	// コース削除API
	const {
		executeApi: executeDeleteCourseApi,
	} = useApiRequest();

	// 全レッスンCSV出力API
	const {
		executeApi: executeExportAllLessonsCsvApi,
		isLoading: isLoadingExportAllLessonsCsvApi,
		isError: isErrorExportAllLessonsCsvApi,
	} = useApiRequest();

	const deleteCourse = async (courseId: string) => {
		await executeDeleteCourseApi(`${API_URL}/api/courses/${courseId}`, 'DELETE');
		// 削除後に一覧を取り直す
		await mutateCourses();
	};

	const handleExportAllLessonsCsv = async () => {
		try {
			const response = await executeExportAllLessonsCsvApi(`${API_URL}/api/courses/lessons/export`, "GET");
			if (!response) return;
			downloadBlob(await response.blob(), "lessons.csv");
		} catch (error) {
			console.error("LessonsCsv出力エラー:", error);
		}
	};

	if (fetchError) return <ErrorMessage />;
	if (isLoadingFindCoursesApi) return <LoadingSpinner />;

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

	return (
		<div className="min-h-screen">
			<div className={`${pageContainer.wide} py-8`}>
				<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
					<div>
						<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-500/80 mb-1.5">
							Course Management
						</p>
						<h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-aurora">コース一覧</h1>
					</div>
					<div className="flex flex-wrap gap-2 self-start md:self-auto">
						<button
							onClick={handleExportAllLessonsCsv}
							className="btn-ghost px-4 py-2.5 rounded-xl whitespace-nowrap hover:cursor-pointer text-sm font-medium disabled:opacity-50"
							disabled={isLoadingExportAllLessonsCsvApi}
						>
							{isLoadingExportAllLessonsCsvApi ? "出力中..." : "CSV出力"}
						</button>
						{isErrorExportAllLessonsCsvApi && (
							<p className="text-rose-500 text-sm self-center">CSV出力に失敗しました</p>
						)}
						<Link
							href="/admin/courses/new"
							className="btn-aurora px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap"
						>
							＋ コースを新規作成
						</Link>
					</div>
				</div>

				{/* コースカード一覧 */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
					{courseDtos.map((course) => (
						<CourseCard
							key={course.id}
							courseId={course.id}
							imageUrl={course.thumbnailUrl}
							title={course.title}
							description={course.description}
							progress={65}
							isAdmin={true}
							onDelete={deleteCourse}
						/>
					))}
				</div>

				{/* ページネーション */}
				<SimplePagenation handlePrevPage={handlePrevPage} pageNum={pageNum} totalPageNum={totalPageNum} handleNextPage={handleNextPage} />
			</div>
		</div>
	);
}
