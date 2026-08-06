import { API_URL } from '@/lib/apiUrl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Thumbnail from '@/components/Thumbnail';
import { useApiRequest } from '@/hooks/useApiRequest';
import { CourseLessonsDto } from '@/features/lesson/types';
import { findFirstLessonPath } from '@/features/lesson/lessonNavigation';
import { GRADIENT_ACCENT } from '@/lib/gradients';

type CourseCardProps = {
	courseId: string;
	imageUrl: string;
	title: string;
	progress: number; // 0〜100
	description: string;
	isAdmin: boolean;
	onDelete?: (courseId: string) => void;
};

export default function CourseCard({ courseId, imageUrl, title, progress, description, isAdmin, onDelete }: CourseCardProps) {
	const router = useRouter();
	const [isNavigating, setIsNavigating] = useState(false);

	const {
		executeApi: executeFindLessonsByCourseIdApi
	} = useApiRequest();

	const toLessonPage = async () => {
		if (isAdmin) {
			router.push(`/admin/courses/${courseId}/edit`);
		} else {
			try {
				setIsNavigating(true);

				const lessonsResponse = await executeFindLessonsByCourseIdApi(
					`${API_URL}/api/courses/${courseId}/lessons`,
					'GET'
				);

				if (lessonsResponse && lessonsResponse.ok) {
					const courseLessonsDto: CourseLessonsDto = await lessonsResponse.json();
					const firstLessonPath = findFirstLessonPath(courseId, courseLessonsDto.lessonGroups);

					if (firstLessonPath) {
						router.push(firstLessonPath);
					} else {
						alert('このコースにはまだレッスンが登録されていません');
					}
				} else {
					alert('レッスン情報の取得に失敗しました');
				}
			} catch (error) {
				console.error('レッスン取得エラー:', error);
				alert('レッスンの取得中にエラーが発生しました');
			} finally {
				setIsNavigating(false);
			}
		}
	};

	const handleDelete = async (e: React.MouseEvent) => {
		e.stopPropagation(); // 親カードクリックを無効化
		if (onDelete) {
			onDelete(courseId);
		}
	};

	return (
		<div
			onClick={toLessonPage}
			className={`glass-panel relative w-full rounded-3xl overflow-hidden flex flex-col group hover:border-sky-300 hover:shadow-[0_16px_48px_rgba(56,189,248,0.35)] hover:-translate-y-1.5 transition-all duration-300 ${
				isNavigating ? 'opacity-50 cursor-wait' : 'hover:cursor-pointer'
			}`}
		>
			{/* サムネイル画像 */}
			<div className="relative aspect-[16/9] overflow-hidden">
				<Thumbnail thumbnailUrl={imageUrl} alt={title} className="w-full h-full object-cover transition-transform transform duration-500 group-hover:scale-110" />

				{/* サムネイル下部を暗くして情報を載せるグラデーション */}
				<div className="absolute inset-0 bg-gradient-to-t from-sky-950/85 via-sky-950/20 to-transparent" />

				{/* サムネイル上のタイトル */}
				<h2 className="absolute inset-x-0 bottom-0 z-10 px-5 pb-4 text-base font-bold text-white leading-snug line-clamp-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
					{title}
				</h2>

				{/* 削除ボタン（管理者のみ） */}
				{isAdmin && (
					<button
						onClick={handleDelete}
						className="absolute top-3 right-3 text-xs font-semibold bg-rose-500/90 text-white px-3 py-1.5 rounded-full hover:bg-rose-400 hover:cursor-pointer z-20 transition-colors backdrop-blur-md"
					>
						削除
					</button>
				)}
			</div>

			{/* 本文 */}
			<div className="p-5 flex flex-col justify-between flex-1 gap-4">
				<p className="text-sm text-slate-500 leading-relaxed line-clamp-3">{description}</p>

				{!isAdmin ? (
					<div>
						{/* 進捗バー */}
						<div className="h-2 bg-sky-100 rounded-full overflow-hidden">
							<div
								className={`h-full bg-gradient-to-r ${GRADIENT_ACCENT} rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(56,189,248,0.6)]`}
								style={{ width: `${progress}%` }}
							/>
						</div>
						<div className="mt-2.5 flex items-center justify-between">
							<p className="text-xs font-medium text-slate-400">進捗 {progress}%</p>
							<span className="text-xs font-semibold text-sky-600 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
								学習を続ける →
							</span>
						</div>
					</div>
				) : (
					<span className="text-xs font-semibold text-sky-600 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all self-end">
						コースを編集 →
					</span>
				)}
			</div>
		</div>
	);
}
