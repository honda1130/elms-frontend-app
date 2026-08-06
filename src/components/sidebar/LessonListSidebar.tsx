"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { ChevronDown, ChevronUp, Check, X } from "lucide-react";
import { useParams, useRouter } from 'next/navigation';
import { useApiQuery } from "@/hooks/useApiQuery";
import { useLoginUserId } from "@/hooks/useLoginUserId";
import { swrKeys } from "@/lib/swrKeys";
import { UserLessonGroupDto } from "@/features/lesson/types";
import { GRADIENT_PRIMARY } from "@/lib/gradients";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function LessonListSidebar({
	onLessonSelect,
	selectedLessonId,
	onClose,
}: {
	onLessonSelect?: (lessonId: string) => void;
	selectedLessonId?: string | null;
	onClose?: () => void;
}) {
	const params = useParams();
	const courseId = params.courseId as string;
	const lessonId = params.lessonId ? (params.lessonId as string) : null;
	const router = useRouter();

	const touchStartX = useRef<number>(0);

	// ユーザーIDを含むURLをキーにするため、解決できるまで取得しない
	const { userId, isResolving } = useLoginUserId();

	const {
		data: userLessonGroups,
		error: fetchError,
		isLoading: isFetching,
	} = useApiQuery<UserLessonGroupDto[]>(
		userId && courseId ? swrKeys.userCourseLessons(userId, courseId) : null
	);

	// レッスングループとレッスンを表示順に整列する
	const lessonGroups = useMemo<UserLessonGroupDto[]>(
		() =>
			[...(userLessonGroups ?? [])]
				.sort((a, b) => a.lessonGroupOrder - b.lessonGroupOrder)
				.map((group) => ({
					...group,
					userLessons: [...group.userLessons].sort(
						(a, b) => a.lesson.lessonOrder - b.lesson.lessonOrder
					),
				})),
		[userLessonGroups]
	);

	const [openGroups, setOpenGroups] = useState<string[]>([]);
	const isLoading = isResolving || isFetching;

	// 取得したグループはすべて開いた状態にする
	useEffect(() => {
		setOpenGroups(lessonGroups.map((group) => group.id));
	}, [lessonGroups]);

	// URLのlessonIdに合致するレッスンを選択する
	useEffect(() => {
		if (lessonId && onLessonSelect) {
			onLessonSelect(lessonId);
		}
	}, [lessonId, onLessonSelect]);

	const toggleGroup = (groupId: string) => {
		setOpenGroups((prev) =>
			prev.includes(groupId)
				? prev.filter((id) => id !== groupId)
				: [...prev, groupId]
		);
	};

	const handleLessonClick = (lessonGroupId: string, lessonId: string) => {
		if (onLessonSelect) {
			onLessonSelect(lessonId);
		}
		onClose?.();
		router.push(`/courses/${courseId}/lesson-groups/${lessonGroupId}/lessons/${lessonId}`);
	};

	if (isLoading) {
		return (
			<div className="w-full h-full bg-white/75 backdrop-blur-xl p-4 overflow-y-auto border-r border-sky-100">
				<h2 className="text-sm font-bold text-slate-700 mb-4">レッスン一覧</h2>
				<LoadingSpinner size="sm" />
			</div>
		);
	}

	if (fetchError) {
		return (
			<div className="w-full h-full bg-white/75 backdrop-blur-xl p-4 overflow-y-auto border-r border-sky-100">
				<h2 className="text-sm font-bold text-slate-700 mb-4">レッスン一覧</h2>
				<div className="text-center py-8 text-sm text-rose-500">
					エラーが発生しました: {fetchError.message}
				</div>
			</div>
		);
	}

	return (
		<div
			className="w-full h-full bg-white/75 backdrop-blur-xl overflow-y-auto border-r border-sky-100"
			onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
			onTouchEnd={(e) => {
				const deltaX = e.changedTouches[0].clientX - touchStartX.current;
				if (deltaX < -60) onClose?.();
			}}
		>
			<div className="px-4 py-4 border-b border-sky-100 flex items-center justify-between">
				<h2 className="text-sm font-bold text-slate-700">レッスン一覧</h2>
				{onClose && (
					<button onClick={onClose} className="md:hidden text-slate-400 hover:text-sky-600 p-1 transition-colors">
						<X size={18} />
					</button>
				)}
			</div>
			<ul className="p-3 mb-11">
				{lessonGroups.map((group) => {
					const isOpen = openGroups.includes(group.id);
					return (
						<div key={group.id} className="rounded-xl overflow-hidden mb-2 border border-sky-100">
							<div className={`flex justify-between items-center text-sm font-semibold text-white px-3 py-2.5 cursor-pointer bg-gradient-to-r ${GRADIENT_PRIMARY} shadow-[0_2px_14px_rgba(14,165,233,0.35)]`}>
								<span onClick={() => toggleGroup(group.id)} className="flex-1">
									{group.name}
								</span>
								<div className="flex items-center gap-2">
									{isOpen ? (
										<ChevronUp size={14} className="text-white/70" />
									) : (
										<ChevronDown size={14} className="text-white/70" />
									)}
								</div>
							</div>

							{isOpen && (
								<ul className="bg-white/50">
									{group.userLessons.map((userLesson) => (
										<li
											key={userLesson.lesson.id}
											className={`flex items-center justify-between gap-2 text-sm px-4 py-2.5 cursor-pointer border-b border-sky-50 last:border-b-0 transition-colors ${
												selectedLessonId === userLesson.lesson.id
													? 'bg-sky-100/80 text-sky-800 font-semibold border-l-2 border-sky-500'
													: 'text-slate-600 hover:bg-sky-50 hover:text-sky-700'
											}`}
											onClick={() => handleLessonClick(group.id, userLesson.lesson.id)}
										>
											<span className="flex-1">{userLesson.lesson.title}</span>
											{userLesson.isLessonCompleted && (
												<Check size={16} className="text-emerald-500 drop-shadow-[0_0_6px_rgba(52,211,153,0.5)] shrink-0" aria-label="完了" />
											)}
										</li>
									))}
								</ul>
							)}
						</div>
					);
				})}
			</ul>
		</div>
	);
}
