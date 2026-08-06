"use client";
import { API_URL } from '@/lib/apiUrl';

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from 'next/navigation';
import Thumbnail from "@/components/Thumbnail";
import { useApiRequest } from "@/hooks/useApiRequest";
import { useApiQuery } from "@/hooks/useApiQuery";
import { swrKeys } from "@/lib/swrKeys";
import { CourseDto } from "@/features/course/types";
import { CourseLessonsDto } from "@/features/lesson/types";
import { findFirstLessonEditPath } from "@/features/lesson/lessonNavigation";
import { pageContainer } from "@/lib/pageLayout";

export default function CourseDetail() {
	const router = useRouter();

	const paramCourseId = useParams().courseId;
	const pathname = usePathname();
	const isNewCourse = pathname === '/admin/courses/new';

	// フォーム
	const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
	const [thumbnailUrl, setThumbnailUrl] = useState<string>("");
	const [title, setTitle] = useState("");
	const [courseOrder, setCourseOrder] = useState(0);
	const [description, setDescription] = useState("");

	// 認証にまつわるState
	const [courseId, setCourseId] = useState<string | null>(null);

	// ファイルアップロードAPI
	const {
		executeApi: executeUploadFileApi
	} = useApiRequest();

	// コース新規作成API
	const {
		executeApi: executeCreateCourseApi
	} = useApiRequest();

	// コース更新API
	const {
		executeApi: executeUpdateCourseApi
	} = useApiRequest();

	// コース取得API

	// レッスン一覧取得API（先頭レッスンへの遷移用）
	const {
		executeApi: executeFindLessonsByCourseIdApi
	} = useApiRequest();

	// レッスン編集画面に遷移する
	const toLessonEditPage = async () => {
		if (courseId === null) return;
		const response = await executeFindLessonsByCourseIdApi(`${API_URL}/api/courses/${courseId}/lessons`, 'GET');
		if (response?.ok) {
			const courseLessonsDto: CourseLessonsDto = await response.json();
			const firstLessonPath = findFirstLessonEditPath(courseId, courseLessonsDto.lessonGroups);
			router.push(firstLessonPath ?? `/admin/courses/${courseId}/lesson-groups`);
		}
	};

	// サムネイル画像変更時の関数
	const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			const file = e.target.files[0];
			setThumbnailFile(file); // ファイル
			setThumbnailUrl(URL.createObjectURL(file)); // ファイルのURL
		}
	};

	// フォーム送信時の処理
	const handleSave = async () => {
		try {
			let uploadedThumbnailPath = thumbnailUrl;

			// もし新しいサムネイルが選ばれてたらアップロードする
			if (thumbnailFile) {
				const formData = new FormData();
				formData.append("file", thumbnailFile);

				// 画像アップロードAPIを呼び出し
				const uploadFileApiResponse = await executeUploadFileApi(`${API_URL}/api/files/upload`, 'POST', formData);

				if (!uploadFileApiResponse?.ok) {
					throw new Error('サムネイルアップロード失敗');
				}

				// アップロードしたファイルのパスを取得
				uploadedThumbnailPath = await uploadFileApiResponse.text();
			}

			if (isNewCourse) {
				// コース情報を新規作成する
				const createCourseApiResponse = await executeCreateCourseApi(
					`${API_URL}/api/courses`,
					'POST',
					{
						title,
						description,
						thumbnailUrl: uploadedThumbnailPath,
					}
				);

				if (!createCourseApiResponse?.ok) {
					throw new Error('コース新規作成 - 失敗');
				}
			} else {
				// コース情報を更新する
				const updateCourseApiResponse = await executeUpdateCourseApi(
					`${API_URL}/api/courses/${courseId}`,
					'PUT',
					{
						courseId,
						title,
						courseOrder,
						description,
						thumbnailUrl: uploadedThumbnailPath,
					}
				);

				if (!updateCourseApiResponse?.ok) {
					throw new Error('コース更新 - 失敗');
				}
			}

			alert('保存しました！');
			router.push('/admin/courses');
		} catch (error) {
			console.error(error);
			alert('保存に失敗しました');
		}
	};

	useEffect(() => {
		if (paramCourseId) {
			// コース編集画面の場合
			setCourseId(Array.isArray(paramCourseId) ? paramCourseId[0] : paramCourseId);
		} else {
			// コース新規画面の場合
			setCourseId(null)
			setTitle("");
			setDescription("");
			setThumbnailUrl("");
		}
	}, [paramCourseId, router]);

	// 編集画面のときだけコース情報を取得する
	const { data: courseDto } = useApiQuery<CourseDto>(
		courseId && !isNewCourse ? swrKeys.course(courseId) : null
	);

	// 取得したコース情報でフォームを初期化する
	useEffect(() => {
		if (!courseDto) return;
		setTitle(courseDto.title);
		setCourseOrder(courseDto.courseOrder);
		setDescription(courseDto.description);
		setThumbnailUrl(courseDto.thumbnailUrl);
	}, [courseDto]);

	return (
		<div className="min-h-screen">
			<div className={`${pageContainer.adminNarrow} py-8`}>
				{/* タイトル行 */}
				<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
					<div>
						<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-500/80 mb-1.5">
							Course Management
						</p>
						<h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-aurora">{isNewCourse ? "コース新規作成" : "コース編集"}</h1>
					</div>
					{!isNewCourse && (
						<button
							type="button"
							onClick={toLessonEditPage}
							className="btn-aurora px-5 py-2.5 rounded-xl text-sm font-semibold hover:cursor-pointer whitespace-nowrap self-start md:self-auto"
						>
							レッスン編集
						</button>
					)}
				</div>

				{/* フォーム */}
				<div className="glass-panel rounded-2xl p-8">
					<form onSubmit={handleSave} className="space-y-6">
						{/* サムネイル画像 */}
						<div>
							<label className="block text-sm font-semibold text-slate-600 mb-2">サムネイル画像</label>
							<input
								type="file"
								accept="image/*"
								onChange={handleThumbnailChange}
								className="glass-input px-4 py-2.5 rounded-xl w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-sky-100 file:px-3 file:py-1 file:text-xs file:text-sky-700 file:cursor-pointer"
							/>
							{thumbnailUrl && (
								<div className="mt-4">
									<Thumbnail
										thumbnailUrl={thumbnailUrl}
										alt="サムネイル画像プレビュー"
										className="max-w-[280px] max-h-[180px] object-cover rounded-xl border border-sky-200 shadow-[0_8px_24px_rgba(7,89,133,0.2)]"
									/>
								</div>
							)}
						</div>

						{/* コースタイトル */}
						<div>
							<label className="block text-sm font-semibold text-slate-600 mb-2">コースタイトル</label>
							<input
								type="text"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="コースのタイトルを入力"
								required
								className="glass-input px-4 py-2.5 rounded-xl w-full text-sm"
							/>
						</div>

						{/* コース概要 */}
						<div>
							<label className="block text-sm font-semibold text-slate-600 mb-2">コース概要</label>
							<textarea
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="コースの概要を入力"
								required
								rows={4}
								className="glass-input px-4 py-2.5 rounded-xl w-full text-sm resize-none"
							/>
						</div>

						{/* 登録ボタン */}
						<div className="flex justify-end pt-2">
							<button
								type="submit"
								className="btn-aurora px-8 py-2.5 rounded-xl text-sm font-semibold hover:cursor-pointer"
							>
								{isNewCourse ? "登録" : "更新"}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
