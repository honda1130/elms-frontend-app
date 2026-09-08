"use client";

import { KeyboardEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useApiQuery } from "@/hooks/useApiQuery";
import { swrKeys } from "@/lib/swrKeys";
import LoadingSpinner from "@/components/LoadingSpinner";
import SimplePagenation from "@/components/pagenation/SimplePagenation";
import TagList from "./TagList";
import { LessonTagSearchResultDto } from "../types";

/** バックエンドの LessonTagSearchRequest に合わせた上限 */
const MAX_TAG_NAME_LENGTH = 255;

const PAGE_SIZE_OPTIONS = [10, 20, 30];

const TABLE_HEADERS = ["コース", "レッスングループ", "レッスン", "タグ"];

/**
 * タグに紐づくレッスンを全コース横断で検索する。
 *
 * <p>受講中コースのレッスンだけレッスン視聴画面へ遷移できる。
 * 未受講コースのレッスンは検索結果には出るが、遷移先で参照できないため行を押せないようにする。
 *
 * @param enrolledCourseIds 受講中コースのID一覧
 */
export default function LessonTagSearch({ enrolledCourseIds }: { enrolledCourseIds: string[] }) {
	const router = useRouter();

	// 入力途中の値で再取得しないよう、入力欄の値(tagInput)と検索へ適用済みの値(appliedTag)を分けて持つ
	const [tagInput, setTagInput] = useState("");
	const [appliedTag, setAppliedTag] = useState("");
	const [inputError, setInputError] = useState("");

	// ページ番号
	const [pageNum, setPageNum] = useState(1);

	// 1ページで表示する件数
	const [pageSize, setPageSize] = useState(10);

	// タグ検索（条件・ページがキーに含まれるため、変わると自動で再取得される）
	const searchQuery = new URLSearchParams({
		tag: appliedTag,
		pageNum: pageNum.toString(),
		pageSize: pageSize.toString(),
	}).toString();
	const {
		data: searchResult,
		error: searchError,
		isLoading: isLoadingSearch,
	} = useApiQuery<LessonTagSearchResultDto>(appliedTag ? swrKeys.lessonSearch(searchQuery) : null);

	// コース→レッスングループ→レッスンの階層を、1行=1レッスンのテーブル行に展開する。
	// 並び順はAPIが course_order / lesson_group_order / lesson_order で整列済みのため、ここでは並び替えない
	const rows = (searchResult?.courses ?? []).flatMap((course) =>
		course.lessonGroups.flatMap((lessonGroup) =>
			lessonGroup.lessons.map((lesson) => ({ course, lessonGroup, lesson }))
		)
	);

	// ページングの単位はレッスン件数（totalSizeは一致したレッスンの総件数）
	const totalPageNum = searchResult ? Math.ceil(searchResult.totalSize / searchResult.pageSize) : 1;

	const enrolledCourseIdSet = new Set(enrolledCourseIds);

	// 検索条件を適用する。実際の取得はSWRがキーの変化を検知して行う
	const applySearch = () => {
		const tagName = tagInput.trim();
		if (tagName.length === 0) {
			setInputError("タグを入力してください");
			return;
		}
		setInputError("");
		setAppliedTag(tagName);
		setPageNum(1);
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		// 日本語入力の変換確定でもEnterが飛ぶため、変換中は確定として扱わない
		if (e.nativeEvent.isComposing || e.key !== "Enter") {
			return;
		}
		e.preventDefault();
		applySearch();
	};

	// セレクトボックスの変更時に呼ばれるハンドラー
	const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setPageSize(Number(e.target.value));
		setPageNum(1);
	};

	// ページネーション：前ページ遷移時の挙動
	const handlePrevPage = () => {
		setPageNum(pageNum - 1);
	};

	// ページネーション：次ページ遷移時の挙動
	const handleNextPage = () => {
		setPageNum(pageNum + 1);
	};

	// レッスン視聴画面に遷移する関数
	const toLessonView = (courseId: string, lessonGroupId: string, lessonId: string) => {
		router.push(`/courses/${courseId}/lesson-groups/${lessonGroupId}/lessons/${lessonId}`);
	};

	return (
		<div className="mt-5 glass-panel rounded-2xl overflow-hidden">
			<div className="px-5 py-3 border-b border-sky-100 flex items-center gap-2.5">
				<span className="aurora-bar block w-1 h-4 rounded-full shrink-0" />
				<h2 className="text-sm font-bold text-slate-800">タグでレッスンを探す</h2>
			</div>

			<div className="px-5 py-4">
				{/* 検索条件 */}
				<div className="flex flex-col gap-2 sm:flex-row sm:items-start">
					<div className="flex-1">
						<input
							type="text"
							value={tagInput}
							onChange={(e) => {
								setTagInput(e.target.value);
								setInputError("");
							}}
							onKeyDown={handleKeyDown}
							maxLength={MAX_TAG_NAME_LENGTH}
							placeholder="タグ名を入力（例: Java）"
							className="glass-input w-full rounded-xl px-4 py-2.5 text-sm"
						/>
						{inputError && <p className="mt-1.5 text-xs text-rose-500">{inputError}</p>}
					</div>
					<button
						onClick={applySearch}
						className="btn-aurora px-6 py-2.5 rounded-xl cursor-pointer text-sm font-semibold whitespace-nowrap"
					>
						検索
					</button>
				</div>

				{/* 検索結果。ホーム画面の一部品のため、失敗しても他のブロックを消さずこの中だけで表示する */}
				{appliedTag && (
					<div className="mt-4">
						{isLoadingSearch ? (
							<LoadingSpinner size="sm" />
						) : searchError ? (
							<p className="text-sm text-rose-500">検索に失敗しました</p>
						) : rows.length === 0 ? (
							<p className="text-sm text-slate-400">該当するレッスンはありません</p>
						) : (
							<>
								{/* 件数・表示件数 */}
								<div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs text-slate-500">
									<p>
										「{searchResult?.tag}」の検索結果 {searchResult?.totalSize} 件
									</p>
									<div className="flex items-center">
										<label className="mr-2">1ページあたり</label>
										<select
											value={pageSize}
											onChange={handlePageSizeChange}
											className="glass-input rounded-lg px-2.5 py-1.5 text-xs"
										>
											{PAGE_SIZE_OPTIONS.map((option) => (
												<option key={option} value={option}>
													{option}件
												</option>
											))}
										</select>
									</div>
								</div>

								{/* テーブル */}
								<div className="rounded-2xl border border-sky-100 overflow-hidden">
									<div className="overflow-x-auto">
										<table className="min-w-full divide-y divide-sky-100">
											<thead className="bg-sky-50/80">
												<tr>
													{TABLE_HEADERS.map((header) => (
														<th
															key={header}
															className="px-4 py-3 text-left text-[11px] font-semibold text-sky-600/80 uppercase tracking-wider whitespace-nowrap"
														>
															{header}
														</th>
													))}
												</tr>
											</thead>
											<tbody className="divide-y divide-sky-50">
												{rows.map(({ course, lessonGroup, lesson }) => {
													const isEnrolled = enrolledCourseIdSet.has(course.courseId);
													return (
														<tr
															key={lesson.lessonId}
															onClick={
																isEnrolled
																	? () =>
																			toLessonView(
																				course.courseId,
																				lessonGroup.lessonGroupId,
																				lesson.lessonId
																			)
																	: undefined
															}
															className={`transition-colors ${
																isEnrolled ? "hover:bg-sky-50/80 cursor-pointer" : ""
															}`}
														>
															<td className="px-4 py-3">
																<div className="flex items-center gap-2">
																	<span className="text-sm text-slate-700">{course.courseTitle}</span>
																	{!isEnrolled && (
																		<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap border bg-slate-100 border-slate-200 text-slate-500">
																			未受講
																		</span>
																	)}
																</div>
															</td>
															<td className="px-4 py-3 text-sm text-slate-500">
																{lessonGroup.lessonGroupTitle}
															</td>
															<td className="px-4 py-3 text-sm font-semibold text-slate-800">
																{lesson.title}
															</td>
															<td className="px-4 py-3">
																<TagList tags={lesson.tags} />
															</td>
														</tr>
													);
												})}
											</tbody>
										</table>
									</div>
								</div>

								{/* ページネーション */}
								<SimplePagenation
									handlePrevPage={handlePrevPage}
									pageNum={pageNum}
									totalPageNum={totalPageNum}
									handleNextPage={handleNextPage}
								/>
							</>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
