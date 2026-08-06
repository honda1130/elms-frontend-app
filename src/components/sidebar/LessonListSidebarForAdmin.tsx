"use client";
import { API_URL } from '@/lib/apiUrl';
import { useState, useEffect, useMemo, useRef } from "react";
import { ChevronDown, ChevronUp, Trash2, Plus, GripVertical } from "lucide-react";
import { useParams } from 'next/navigation';
import { useApiRequest } from "@/hooks/useApiRequest";
import { useApiQuery } from "@/hooks/useApiQuery";
import { swrKeys } from "@/lib/swrKeys";
import { CourseLessonsDto, LessonGroupDto } from "@/features/lesson/types";
import { buildLessonOrderUpdateBody, reorderLessons } from "@/features/lesson/lessonNavigation";
import { GRADIENT_PRIMARY } from "@/lib/gradients";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import { X } from "lucide-react";

export default function LessonListSidebarForAdmin({
	setDeleteTarget,
	setShowDeleteModal,
	onLessonSelect,
	selectedLessonId,
	isEditPage = false,
	onClose,
}: {
	setDeleteTarget: React.Dispatch<React.SetStateAction<any>>;
	setShowDeleteModal: React.Dispatch<React.SetStateAction<boolean>>;
	onLessonSelect?: (lessonId: string | null) => void;
	selectedLessonId?: string | null;
	isEditPage?: boolean;
	onClose?: () => void;
}) {
	const params = useParams();
	const courseId = params.courseId as string;
	const lessonId = params.lessonId ? (params.lessonId as string) : null;
	const router = useRouter();

	const touchStartX = useRef<number>(0);
	const dragGhostRef = useRef<HTMLElement | null>(null);

	// レッスン一覧はSWRで取得する。作成・更新・削除の後は同じキーを無効化すれば自動で最新化される。
	const {
		data: courseLessonsDto,
		error: fetchError,
		isLoading,
		mutate: mutateLessons,
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

	const [openGroups, setOpenGroups] = useState<string[]>([]);

	const [isCreatingGroup, setIsCreatingGroup] = useState(false);
	const [newGroupTitle, setNewGroupTitle] = useState("");
	const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
	const [editingGroupTitle, setEditingGroupTitle] = useState("");
	const [draggedLesson, setDraggedLesson] = useState<{
		groupId: string;
		lessonId: string;
		fromIndex: number;
		title: string;
	} | null>(null);
	const [dropInsertIndex, setDropInsertIndex] = useState<number | null>(null);
	const [isReordering, setIsReordering] = useState(false);

	// レッスングループ新規作成API
	const {
		executeApi: executeCreateLessonGroupApi,
	} = useApiRequest();

	// レッスングループ更新API
	const {
		executeApi: executeUpdateLessonGroupApi,
	} = useApiRequest();

	// レッスン並び順更新API
	const {
		executeApi: executeUpdateLessonOrderApi,
	} = useApiRequest();

	// 取得したグループはすべて開いた状態にする
	useEffect(() => {
		setOpenGroups(lessonGroups.map((group) => group.id));
	}, [lessonGroups]);

	// URLのlessonIdに合致するレッスンを選択する
	useEffect(() => {
		if (!onLessonSelect) return;
		if (lessonId) {
			onLessonSelect(lessonId);
		} else if (!isEditPage) {
			// 新規作成ページの場合は選択を解除
			onLessonSelect(null);
		}
	}, [lessonId, isEditPage, onLessonSelect]);

	const toggleGroup = (groupId: string) => {
		setOpenGroups((prev) =>
			prev.includes(groupId)
				? prev.filter((id) => id !== groupId)
				: [...prev, groupId]
		);
	};

	const handleDeleteGroup = (groupId: string) => {
		const group = lessonGroups.find((g) => g.id === groupId);
		setDeleteTarget({
			type: "group",
			groupId,
			groupTitle: group?.name ?? "",
		});
		setShowDeleteModal(true);
	};

	const handleDeleteLesson = (groupId: string, lessonId: string) => {
		const group = lessonGroups.find((g) => g.id === groupId);
		const lesson = group?.lessons.find((l) => l.id === lessonId);
		setDeleteTarget({
			type: "lesson",
			groupId,
			groupTitle: group?.name ?? "",
			lessonId,
			lessonTitle: lesson?.title ?? "",
		});
		setShowDeleteModal(true);
	};

	const handleCreateGroup = async () => {
		if (newGroupTitle.trim() === "") return;

		const response = await executeCreateLessonGroupApi(
			`${API_URL}/api/courses/${courseId}/lesson-groups`,
			'POST',
			{
				title: newGroupTitle.trim(),
			}
		);

		if (response && response.ok) {
			alert("レッスングループを作成しました");
			// キャッシュを無効化して最新の一覧を取り直す
			await mutateLessons();
			setNewGroupTitle("");
			setIsCreatingGroup(false);
		} else {
			alert("レッスングループの作成に失敗しました");
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			handleCreateGroup();
		} else if (e.key === "Escape") {
			setIsCreatingGroup(false);
			setNewGroupTitle("");
		}
	};

	const startEditingGroup = (groupId: string, currentName: string) => {
		setEditingGroupId(groupId);
		setEditingGroupTitle(currentName);
	};

	const cancelEditingGroup = () => {
		setEditingGroupId(null);
		setEditingGroupTitle("");
	};

	const handleUpdateGroup = async (groupId: string) => {
		const title = editingGroupTitle.trim();
		if (title === "") {
			alert("グループ名を入力してください");
			return;
		}

		const group = lessonGroups.find((g) => g.id === groupId);
		if (group?.name === title) {
			cancelEditingGroup();
			return;
		}

		const response = await executeUpdateLessonGroupApi(
			`${API_URL}/api/courses/${courseId}/lesson-groups/${groupId}`,
			'PUT',
			{ title }
		);

		if (response && response.ok) {
			await mutateLessons();
			cancelEditingGroup();
		} else {
			alert("レッスングループの更新に失敗しました");
		}
	};

	const handleEditGroupKeyDown = (
		e: React.KeyboardEvent<HTMLInputElement>,
		groupId: string
	) => {
		if (e.key === "Enter") {
			e.preventDefault();
			handleUpdateGroup(groupId);
		} else if (e.key === "Escape") {
			cancelEditingGroup();
		}
	};

	const handleEditGroupBlur = () => {
		setTimeout(() => cancelEditingGroup(), 150);
	};

	const handleLessonDragStart = (
		e: React.DragEvent,
		groupId: string,
		lessonId: string,
		fromIndex: number,
		title: string
	) => {
		if (isReordering) {
			e.preventDefault();
			return;
		}

		setDraggedLesson({ groupId, lessonId, fromIndex, title });
		e.dataTransfer.effectAllowed = "move";
		e.dataTransfer.setData("text/plain", String(lessonId));

		const sourceRow = e.currentTarget.closest("li");
		if (sourceRow) {
			const ghost = sourceRow.cloneNode(true) as HTMLElement;
			ghost.style.position = "fixed";
			ghost.style.top = "-1000px";
			ghost.style.left = "-1000px";
			ghost.style.width = `${sourceRow.getBoundingClientRect().width}px`;
			ghost.style.opacity = "0.95";
			ghost.style.background = "rgb(240 249 255)";
			ghost.style.boxShadow = "0 12px 28px rgba(7, 89, 133, 0.25), 0 0 18px rgba(56, 189, 248, 0.35)";
			ghost.style.borderRadius = "8px";
			ghost.style.border = "1px solid rgba(56, 189, 248, 0.6)";
			ghost.style.pointerEvents = "none";
			document.body.appendChild(ghost);
			dragGhostRef.current = ghost;

			const rect = e.currentTarget.getBoundingClientRect();
			e.dataTransfer.setDragImage(
				ghost,
				e.clientX - rect.left + 8,
				e.clientY - rect.top + 8
			);
		}
	};

	const handleLessonDragEnd = () => {
		if (dragGhostRef.current) {
			document.body.removeChild(dragGhostRef.current);
			dragGhostRef.current = null;
		}
		setDraggedLesson(null);
		setDropInsertIndex(null);
	};

	const handleLessonDragOver = (
		e: React.DragEvent,
		groupId: string,
		lessonIndex: number
	) => {
		if (!draggedLesson || draggedLesson.groupId !== groupId) {
			return;
		}

		e.preventDefault();
		e.stopPropagation();
		e.dataTransfer.dropEffect = "move";

		const rect = e.currentTarget.getBoundingClientRect();
		const insertAfter = e.clientY > rect.top + rect.height / 2;
		const insertIndex = insertAfter ? lessonIndex + 1 : lessonIndex;

		if (dropInsertIndex !== insertIndex) {
			setDropInsertIndex(insertIndex);
		}
	};

	const handleLessonDragLeave = (e: React.DragEvent) => {
		if (!e.currentTarget.contains(e.relatedTarget as Node)) {
			setDropInsertIndex(null);
		}
	};

	const handleLessonListDragLeave = (e: React.DragEvent) => {
		if (!e.currentTarget.contains(e.relatedTarget as Node)) {
			setDropInsertIndex(null);
		}
	};

	const handleLessonDrop = async (
		e: React.DragEvent,
		groupId: string,
		toIndex: number
	) => {
		e.preventDefault();
		e.stopPropagation();
		setDropInsertIndex(null);

		if (!draggedLesson || draggedLesson.groupId !== groupId) {
			return;
		}

		const { lessonId, fromIndex } = draggedLesson;
		const targetIndex = dropInsertIndex ?? toIndex;
		const normalizedToIndex =
			fromIndex < targetIndex ? targetIndex - 1 : targetIndex;

		if (fromIndex === normalizedToIndex) {
			setDraggedLesson(null);
			return;
		}

		const group = lessonGroups.find((g) => g.id === groupId);
		if (!group) {
			setDraggedLesson(null);
			return;
		}

		const reorderedLessons = reorderLessons(group.lessons, fromIndex, normalizedToIndex);
		const orderUpdateBody = buildLessonOrderUpdateBody(reorderedLessons, lessonId);

		// ドラッグ操作の見た目を即座に反映させるための楽観的なキャッシュ
		const optimisticDto: CourseLessonsDto | undefined = courseLessonsDto && {
			...courseLessonsDto,
			lessonGroups: courseLessonsDto.lessonGroups.map((g) =>
				g.id === groupId ? { ...g, lessons: reorderedLessons } : g
			),
		};

		setDraggedLesson(null);
		setIsReordering(true);

		try {
			// 楽観的に表示を差し替えたうえでAPIを呼び、成功後に正しい並び順を取り直す。
			// 失敗時はSWRが自動でロールバックする。
			await mutateLessons(
				async () => {
					const response = await executeUpdateLessonOrderApi(
						`${API_URL}/api/courses/${courseId}/lesson-groups/${groupId}/lessons/${lessonId}/order`,
						'PUT',
						orderUpdateBody
					);
					if (!response?.ok) {
						throw new Error("並び順の更新に失敗しました");
					}
					return undefined;
				},
				{ optimisticData: optimisticDto, revalidate: true, rollbackOnError: true }
			);
		} catch (error) {
			console.error("レッスン並び順更新エラー:", error);
			alert("並び順の更新に失敗しました");
		} finally {
			setIsReordering(false);
		}
	};

	const handleCreateLesson = (lessonGroupId: string) => {
		if (onLessonSelect) {
			onLessonSelect(null);
		}
		onClose?.();
		router.push(`/admin/courses/${courseId}/lesson-groups/${lessonGroupId}/lessons/new`);
	};

	const handleEditLesson = (lessonGroupId: string, lessonId: string) => {
		if (isEditPage) {
			if (onLessonSelect) {
				onLessonSelect(lessonId);
			}
			router.push(`/admin/courses/${courseId}/lesson-groups/${lessonGroupId}/lessons/${lessonId}/edit`);
		} else {
			router.push(`/admin/courses/${courseId}/lesson-groups/${lessonGroupId}/lessons/${lessonId}/edit`);
		}
		onClose?.();
	};

	if (isLoading) {
		return (
			<div className="w-full h-full bg-white/75 backdrop-blur-xl p-4 overflow-y-auto">
				<h2 className="text-sm font-bold text-slate-700 mb-4">レッスン一覧</h2>
				<LoadingSpinner size="sm" />
			</div>
		);
	}

	if (fetchError) {
		return (
			<div className="w-full h-full bg-white/75 backdrop-blur-xl p-4 overflow-y-auto">
				<h2 className="text-sm font-bold text-slate-700 mb-4">レッスン一覧</h2>
				<div className="text-center py-8 text-sm text-rose-500">
					エラーが発生しました: {fetchError.message}
				</div>
			</div>
		);
	}

	return (
		<div
			className="w-full h-full bg-white/75 backdrop-blur-xl overflow-y-auto"
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
							<div className={`flex justify-between items-center gap-2 text-sm font-semibold text-white px-3 py-2.5 cursor-pointer bg-gradient-to-r ${GRADIENT_PRIMARY} shadow-[0_2px_14px_rgba(14,165,233,0.35)]`}>
								{editingGroupId === group.id ? (
									<div className="flex-1 min-w-0">
										<input
											type="text"
											className="glass-input w-full rounded-lg px-3 py-1 text-sm"
											value={editingGroupTitle}
											onChange={(e) => setEditingGroupTitle(e.target.value)}
											onKeyDown={(e) => handleEditGroupKeyDown(e, group.id)}
											onBlur={handleEditGroupBlur}
											onClick={(e) => e.stopPropagation()}
											autoFocus
										/>
									</div>
								) : (
									<span
										onClick={() => toggleGroup(group.id)}
										onDoubleClick={(e) => {
											e.stopPropagation();
											startEditingGroup(group.id, group.name);
										}}
										className="flex-1"
										title="ダブルクリックで編集"
									>
										{group.name}
									</span>
								)}
								<div className="flex shrink-0 items-center gap-2">
									{editingGroupId !== group.id && (
										<button
											onClick={(e) => {
												e.stopPropagation();
												handleDeleteGroup(group.id);
											}}
											className="cursor-pointer rounded p-0.5 text-white/90 hover:bg-rose-500/25 hover:text-rose-300 transition-colors"
											title="グループ削除"
										>
											<Trash2 size={14} />
										</button>
									)}
									{isOpen ? (
										<ChevronUp size={14} className="text-white/70" />
									) : (
										<ChevronDown size={14} className="text-white/70" />
									)}
								</div>
							</div>

							{isOpen && (
								<ul
									className="bg-white/50"
									onDragLeave={handleLessonListDragLeave}
								>
									{group.lessons?.map((lesson, lessonIndex) => {
										const isDragging = draggedLesson?.lessonId === lesson.id;
										const showInsertLineBefore =
											draggedLesson?.groupId === group.id &&
											dropInsertIndex === lessonIndex &&
											!isDragging;
										const showInsertLineAfter =
											draggedLesson?.groupId === group.id &&
											dropInsertIndex === lessonIndex + 1 &&
											!isDragging &&
											lessonIndex === group.lessons.length - 1;

										return (
											<li
												key={lesson.id}
												className={`relative flex justify-between items-center gap-2 text-sm px-4 py-2.5 border-b border-sky-50 last:border-b-0 ${
													selectedLessonId === lesson.id && !isDragging
														? 'bg-sky-100/80 text-sky-800 font-semibold border-l-2 border-sky-500'
														: isDragging
															? 'bg-sky-50 text-slate-400 opacity-35'
															: 'text-slate-600 hover:bg-sky-50 hover:text-sky-700'
												}`}
												onDragOver={(e) =>
													handleLessonDragOver(e, group.id, lessonIndex)
												}
												onDragLeave={handleLessonDragLeave}
												onDrop={(e) => handleLessonDrop(e, group.id, lessonIndex)}
											>
												{showInsertLineBefore && (
													<div className="absolute inset-x-0 top-0 h-0.5 bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.9)] pointer-events-none" />
												)}
												{showInsertLineAfter && (
													<div className="absolute inset-x-0 bottom-0 h-0.5 bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.9)] pointer-events-none" />
												)}
												{isDragging && (
													<div className="absolute inset-0 border border-dashed border-sky-300 rounded pointer-events-none" />
												)}
												<button
													type="button"
													draggable={!isReordering}
													onDragStart={(e) =>
														handleLessonDragStart(
															e,
															group.id,
															lesson.id,
															lessonIndex,
															lesson.title
														)
													}
													onDragEnd={handleLessonDragEnd}
													onClick={(e) => e.stopPropagation()}
													className="text-slate-400 hover:text-sky-600 cursor-grab active:cursor-grabbing shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
													title="ドラッグして並び替え"
													disabled={isReordering}
												>
													<GripVertical size={14} />
												</button>
												<span
													className={`flex-1 cursor-pointer ${isDragging ? 'opacity-0' : ''}`}
													onClick={() => handleEditLesson(group.id, lesson.id)}
												>
													{lesson.title}
												</span>
												<button
													onClick={(e) => {
														e.stopPropagation();
														handleDeleteLesson(group.id, lesson.id);
													}}
													className={`cursor-pointer rounded p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors shrink-0 disabled:cursor-not-allowed disabled:opacity-50 ${isDragging ? 'opacity-0' : ''}`}
													title="レッスン削除"
													disabled={isReordering || isDragging}
												>
													<Trash2 size={14} />
												</button>
											</li>
										);
									})}
									<li
										className="text-sky-600 text-sm font-medium px-4 py-2.5 hover:bg-sky-50 cursor-pointer transition-colors flex items-center gap-1"
										onClick={() => handleCreateLesson(group.id)}
									>
										<Plus size={14} />
										レッスンを作成
									</li>
								</ul>
							)}
						</div>
					);
				})}

				{/* グループ追加のエリア */}
				{isCreatingGroup ? (
					<li className="p-2">
						<input
							type="text"
							className="glass-input w-full p-2.5 rounded-xl text-sm"
							placeholder="グループ名を入力してEnter"
							value={newGroupTitle}
							onChange={(e) => setNewGroupTitle(e.target.value)}
							onKeyDown={handleKeyDown}
							autoFocus
						/>
					</li>
				) : (
					<li
						className="text-sky-600 text-sm font-medium px-4 py-2.5 hover:bg-sky-50 cursor-pointer border border-dashed border-sky-300 rounded-xl text-center transition-colors flex items-center justify-center gap-1"
						onClick={() => setIsCreatingGroup(true)}
					>
						<Plus size={14} />
						レッスングループを作成
					</li>
				)}
			</ul>
		</div>
	);
}
