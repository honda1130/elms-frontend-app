'use client';
import { useMemo } from "react";
import { useParams } from 'next/navigation';
import { useApiQuery } from "@/hooks/useApiQuery";
import { swrKeys } from "@/lib/swrKeys";
import { CourseLessonsDto, LessonGroupDto } from "@/features/lesson/types";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function LessonGroupsPage() {
	const params = useParams();
	const courseId = params.courseId as string;

	const {
		data: courseLessonsDto,
		error: fetchError,
		isLoading,
	} = useApiQuery<CourseLessonsDto>(courseId ? swrKeys.courseLessons(courseId) : null);

	// レッスングループとレッスンを表示順に整列する
	const lessonGroups = useMemo<LessonGroupDto[]>(
		() =>
			[...(courseLessonsDto?.lessonGroups ?? [])]
				.sort((a, b) => a.lessonGroupOrder - b.lessonGroupOrder)
				.map((group) => ({
					...group,
					lessons: [...group.lessons].sort((a, b) => a.lessonOrder - b.lessonOrder),
				})),
		[courseLessonsDto]
	);

	if (isLoading) {
		return <LoadingSpinner />;
	}

	if (fetchError) {
		return (
			<div className="px-4 py-12">
				<div className="text-center text-red-600">
					エラーが発生しました: {fetchError.message}
				</div>
			</div>
		);
	}

	const hasLessons = lessonGroups.some((group) => group.lessons.length > 0);

	let message: string;
	if (lessonGroups.length === 0) {
		message = "まだ一つもレッスングループが作成されていません";
	} else if (!hasLessons) {
		message = "左のサイドバーからレッスンを作成してください";
	} else {
		message = "左のサイドバーからレッスンを選択してください";
	}

	return (
		<div className="px-4 py-12">
			<div className="text-center">
				<p className="text-gray-500 text-lg">{message}</p>
			</div>
		</div>
	);
}
