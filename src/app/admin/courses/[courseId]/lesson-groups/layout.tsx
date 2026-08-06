'use client';
import { API_URL } from '@/lib/apiUrl';

import { useState } from "react";
import { useParams, useRouter } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { useApiRequest } from "@/hooks/useApiRequest";
import { useRevalidate } from "@/hooks/useApiQuery";
import { swrKeys } from "@/lib/swrKeys";
import Header from "@/components/Header";
import LessonListSidebarForAdmin from "@/components/sidebar/LessonListSidebarForAdmin";
import { CourseLessonsDto } from "@/features/lesson/types";
import { findFirstLessonEditPath } from "@/features/lesson/lessonNavigation";

export default function LessonGroupsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const params = useParams();
	const router = useRouter();
	const courseId = params.courseId as string;
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<{
		type: "group" | "lesson";
		groupId: string;
		lessonId?: string;
		groupTitle?: string;
		lessonTitle?: string;
	} | null>(null);
	const [isSidebarOpen, setIsSidebarOpen] = useState(true);
	const revalidate = useRevalidate();

	// レッスングループ削除API
	const {
		executeApi: executeDeleteLessonGroupApi,
	} = useApiRequest();

	// レッスン削除API
	const {
		executeApi: executeDeleteLessonApi,
	} = useApiRequest();

	// レッスン一覧取得API（削除後の遷移先判定用）
	const {
		executeApi: executeFindLessonsByCourseIdApi,
	} = useApiRequest();

	// 選択されたレッスンIDの状態管理
	const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

	// レッスン選択時のハンドラー
	const handleLessonSelect = (lessonId: string | null) => {
		setSelectedLessonId(lessonId);
	};

	const confirmDelete = async () => {
		if (!deleteTarget) return;

		if (deleteTarget.type === "group") {
			const response = await executeDeleteLessonGroupApi(
				`${API_URL}/api/courses/${courseId}/lesson-groups/${deleteTarget.groupId}`,
				'DELETE'
			);
			if (!response?.ok) {
				alert("削除に失敗しました");
				return;
			}
		} else if (deleteTarget.type === "lesson" && deleteTarget.lessonId !== undefined) {
			const response = await executeDeleteLessonApi(
				`${API_URL}/api/courses/${courseId}/lesson-groups/${deleteTarget.groupId}/lessons/${deleteTarget.lessonId}`,
				'DELETE'
			);
			if (!response?.ok) {
				alert("削除に失敗しました");
				return;
			}

			const currentLessonId = params.lessonId
				? (params.lessonId as string)
				: null;
			if (currentLessonId === deleteTarget.lessonId) {
				const listResponse = await executeFindLessonsByCourseIdApi(
					swrKeys.courseLessons(courseId),
					'GET'
				);
				if (listResponse?.ok) {
					const courseLessonsDto: CourseLessonsDto = await listResponse.json();
					const nextPath = findFirstLessonEditPath(courseId, courseLessonsDto.lessonGroups);
					router.push(nextPath ?? `/admin/courses/${courseId}/lesson-groups`);
				} else {
					router.push(`/admin/courses/${courseId}/lesson-groups`);
				}
			} else if (selectedLessonId === deleteTarget.lessonId) {
				handleLessonSelect(null);
			}
		}

		// 削除したデータを表示している画面（サイドバー等）を最新化する
		await revalidate(swrKeys.courseLessons(courseId));
		setShowDeleteModal(false);
		setDeleteTarget(null);
	};

	const cancelDelete = () => {
		setShowDeleteModal(false);
		setDeleteTarget(null);
	};

	return (
		<div>
			<Header />
			<div className="flex mt-[60px]">
				{/* Mobile backdrop */}
				{isSidebarOpen && (
					<div
						className="fixed inset-0 bg-sky-900/30 z-20 md:hidden"
						onClick={() => setIsSidebarOpen(false)}
					/>
				)}

				{/* Lesson sidebar */}
				<div
					className={`fixed top-[60px] left-0 bottom-0 z-30
						w-full md:w-120
						transition-transform duration-300 ease-in-out
						md:translate-x-0
						${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
				>
					<LessonListSidebarForAdmin
						setDeleteTarget={setDeleteTarget}
						setShowDeleteModal={setShowDeleteModal}
						onLessonSelect={handleLessonSelect}
						selectedLessonId={selectedLessonId}
						isEditPage={true}
						onClose={() => setIsSidebarOpen(false)}
					/>
				</div>

				{/* Main content */}
				<div className="flex-1 w-full md:ml-[30rem] min-w-0">
					{children}
				</div>
			</div>

			{/* Mobile FAB to toggle sidebar */}
			<button
				className="btn-aurora fixed bottom-6 right-6 z-20 md:hidden pl-4 pr-5 py-3 rounded-full flex items-center gap-2 text-sm font-semibold"
				onClick={() => setIsSidebarOpen(true)}
			>
				<BookOpen size={18} />
				レッスン一覧
			</button>

			{/* Delete confirmation modal */}
			{showDeleteModal && (
				<div className="fixed inset-0 flex items-center justify-center z-50">
					<div className="absolute inset-0 bg-sky-900/30 backdrop-blur-sm z-40" onClick={cancelDelete}></div>
					<div className="glass-solid relative p-7 rounded-3xl w-[calc(100%-2rem)] max-w-sm z-50">
						<h3 className="text-base font-bold text-slate-800 mb-2">削除の確認</h3>
						<p className="text-sm text-slate-600 mb-5">
							本当に削除してもいいですか？<br />
							{deleteTarget?.type === "group" && deleteTarget.groupTitle && (
								<span className="font-medium text-slate-800">・レッスングループ「{deleteTarget.groupTitle}」</span>
							)}
							{deleteTarget?.type === "lesson" && deleteTarget.lessonTitle && (
								<span className="font-medium text-slate-800">・レッスン「{deleteTarget.lessonTitle}」</span>
							)}
						</p>
						<div className="flex justify-end gap-3">
							<button
								onClick={cancelDelete}
								className="btn-ghost px-5 py-2.5 text-sm font-medium rounded-xl cursor-pointer"
							>
								キャンセル
							</button>
							<button
								onClick={confirmDelete}
								className="px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-rose-500 to-red-500 text-white rounded-xl hover:from-rose-400 hover:to-red-400 cursor-pointer transition-colors shadow-[0_4px_20px_rgba(244,63,94,0.4)]"
							>
								削除する
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
