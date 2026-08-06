"use client";
import { API_URL } from '@/lib/apiUrl';
import { useEffect, useState } from "react";
import { useParams, useRouter } from 'next/navigation';
import { useApiRequest } from "@/hooks/useApiRequest";
import { useRevalidate } from "@/hooks/useApiQuery";
import { swrKeys } from "@/lib/swrKeys";
import { LessonDto } from "../types";
import RichTextEditor from "./RichTextEditor";
import TagInput from "./TagInput";

export default function LessonDetailForAdmin({
	onLessonSelect,
	selectedLessonId,
	isEditPage = false,
}: {
	onLessonSelect?: (lessonId: string) => void;
	selectedLessonId?: string | null;
	isEditPage?: boolean;
}) {
	const router = useRouter();
	const params = useParams();
	const courseId = params.courseId as string;
	const lessonGroupId = params.lessonGroupId ? (params.lessonGroupId as string) : undefined;
	const paramLessonId = params.lessonId ? (params.lessonId as string) : undefined;
	
	// 新規作成モードかどうかを判定
	const isNewLesson = !paramLessonId && lessonGroupId;
	
	// 選択されたレッスンの状態管理
	const [selectedLesson, setSelectedLesson] = useState<LessonDto | null>(null);
	const [isEditing, setIsEditing] = useState(false);
	
	const [videoUrl, setVideoUrl] = useState("");
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [tagNames, setTagNames] = useState<string[]>([]);
	const [isAuthenticated, setIsAuthenticated] = useState(false); // 認証状態
	const [isLoading, setIsLoading] = useState(false);             // ローディング状態
	const [errorMessage, setErrorMessage] = useState("");          // エラーメッセージ
	const [showManualAuthDialog, setShowManualAuthDialog] = useState(false); // 認証ダイアログ表示

	// 更新後にレッスン一覧のキャッシュを無効化するための関数
	const revalidate = useRevalidate();

	// レッスン取得API
	const {
		executeApi: executeFindLessonByIdApi
	} = useApiRequest();

	// レッスン作成API
	const {
		executeApi: executeCreateLessonApi
	} = useApiRequest();

	// レッスン更新API
	const {
		executeApi: executeUpdateLessonApi
	} = useApiRequest();

	// Google DriveのURLからファイルIDを正規表現で抽出する
	const extractFileId = (url: string | null | undefined): string | null => {
		if (!url) return null;
		const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
		return fileIdMatch ? fileIdMatch[1] : null;
	};

	// 認証済みの場合のみ、埋め込み用のGoogle DriveのURLを生成する
	const convertGoogleDriveUrl = (url: string): string => {
		if (!url) return "";

		const fileId = extractFileId(url);
		if (fileId && isAuthenticated) {
			// /view → /preview に変換してiframeで表示可能にする
			return `https://drive.google.com/file/d/${fileId}/preview`;
		}

		return "";
	};

	// Google Drive認証（手動確認）
	const authenticateWithGoogleDrive = () => {
		setIsLoading(true);
		setErrorMessage("");

		try {
			const fileId = extractFileId(videoUrl);
			if (!fileId) {
				throw new Error("有効なGoogle DriveのファイルIDが見つかりません");
			}

			// 新しいタブでGoogle Driveを開く
			const driveUrl = `https://drive.google.com/file/d/${fileId}/view`;
			window.open(driveUrl, '_blank');

			setShowManualAuthDialog(true);

		} catch (error) {
			console.error('Google Drive認証エラー:', error);
			setErrorMessage("認証中にエラーが発生しました。");
		} finally {
			setIsLoading(false);
		}
	};

	// 手動認証確認
	const confirmManualAuth = () => {
		setIsAuthenticated(true);
		setShowManualAuthDialog(false);
		localStorage.setItem('googleDriveManualAuth', 'true');
	};

	// 認証解除
	const revokeAuth = () => {
		localStorage.removeItem('googleDriveManualAuth');
		setIsAuthenticated(false);
	};

	// 保存された認証状態を確認
	useEffect(() => {
		const savedAuth = localStorage.getItem('googleDriveManualAuth');
		if (savedAuth === 'true') {
			setIsAuthenticated(true);
		}
	}, []);
	
	// レッスン選択時のハンドラー（内部用）
	const handleLessonSelectInternal = async (lessonId: string) => {
		try {
			console.log('内部handleLessonSelectが呼ばれました:', lessonId);
		const response = await executeFindLessonByIdApi(
			`${API_URL}/api/courses/${courseId}/lesson-groups/${lessonGroupId}/lessons/${lessonId}`,
			'GET'
		);
			
			if (response && response.ok) {
				const lessonDto: LessonDto = await response.json();
				console.log('取得したレッスンデータ:', lessonDto);
				setSelectedLesson(lessonDto);
				setVideoUrl(lessonDto.videoUrl ?? "");
				setTitle(lessonDto.title);
				setContent(lessonDto.content);
				setTagNames((lessonDto.tags ?? []).map((tag) => tag.name));
				setIsEditing(true);
			} else {
				console.error('レッスンの取得に失敗しました');
			}
		} catch (error) {
			console.error('レッスン選択エラー:', error);
		}
	};

	// APIはタグ名をオブジェクトの配列で受け取るため、その形に変換する
	const toTagRequests = (names: string[]) => names.map((name) => ({ name }));

	const handleSave = async () => {
		if (!lessonGroupId) {
			alert("レッスングループが指定されていません");
			return;
		}
		
		if (isNewLesson || !isEditing) {
			// 新規作成
			try {
				const response = await executeCreateLessonApi(
					`${API_URL}/api/courses/${courseId}/lesson-groups/${lessonGroupId}/lessons`,
					'POST',
					{
						title: title,
						content: content,
						videoUrl: videoUrl,
						tags: toTagRequests(tagNames)
					}
				);

				if (response && response.ok) {
					const createdLesson = await response.json();
					alert("レッスンを作成しました");
					// レッスン一覧のキャッシュを無効化して、サイドバーに新規レッスンを反映させる
					await revalidate(swrKeys.courseLessons(courseId));
					// 作成後に選択状態にする
					await handleLessonSelectInternal(createdLesson.id);
				} else {
					alert("レッスンの作成に失敗しました");
				}
			} catch (error) {
				console.error('レッスン作成エラー:', error);
				alert("レッスンの作成中にエラーが発生しました");
			}
		} else {
			// 更新
			try {
				const response = await executeUpdateLessonApi(
					`${API_URL}/api/courses/${courseId}/lesson-groups/${lessonGroupId}/lessons/${paramLessonId}`,
					'PUT',
					{
						title: title,
						content: content,
						videoUrl: videoUrl,
						tags: toTagRequests(tagNames)
					}
				);

				if (response && response.ok) {
					const updatedLesson = await response.json();
					alert("レッスンを更新しました");
					// タイトル変更がサイドバーにも反映されるようキャッシュを無効化する
					await revalidate(swrKeys.courseLessons(courseId));
					// 更新後に選択状態にする
					await handleLessonSelectInternal(updatedLesson.id);
				} else {
					alert("レッスンの更新に失敗しました");
				}
			} catch (error) {
				console.error('レッスン更新エラー:', error);
				alert("レッスンの更新中にエラーが発生しました");
			}
		}
	};

	// 既存レッスンの場合のみデータを取得
	useEffect(() => {
		if (!isNewLesson && paramLessonId) {
			const fetchData = async () => {
				const findLessonByIdApiResponse = await executeFindLessonByIdApi(
					`${API_URL}/api/courses/${courseId}/lesson-groups/${lessonGroupId}/lessons/${paramLessonId}`,
					'GET'
				);
				findLessonByIdApiResponse?.json()?.then((lessonDto: LessonDto) => {
					setVideoUrl(lessonDto.videoUrl ?? "");
					setTitle(lessonDto.title);
					setContent(lessonDto.content);
					setTagNames((lessonDto.tags ?? []).map((tag) => tag.name));
					setIsEditing(true);
				})
			}
			fetchData();
		}
	}, [paramLessonId, executeFindLessonByIdApi, isNewLesson, courseId])
	
	// サイドバーから選択されたレッスンのデータを取得
	useEffect(() => {
		if (selectedLessonId) {
			console.log('サイドバーからレッスンが選択されました:', selectedLessonId);
			handleLessonSelectInternal(selectedLessonId);
		}
	}, [selectedLessonId, courseId]);


	const convertedVideoUrl = convertGoogleDriveUrl(videoUrl);
	const fileId = extractFileId(videoUrl);
	const hasVideoUrl = videoUrl.trim().length > 0;

	return (
		<div className="flex-1 pt-8 px-4 md:px-8 pb-20 overflow-y-auto">

			{/* 動画URL */}
			<div className="mb-4">
				<label className="block text-sm font-semibold text-slate-600 mb-1.5">動画URL</label>
				<input
					type="text"
					value={videoUrl}
					onChange={(e) => setVideoUrl(e.target.value)}
					className="glass-input w-full rounded-xl px-4 py-2.5 text-sm"
					placeholder="Google Driveの動画URLを入力してください"
				/>
			</div>

			{/* Google Drive要認証セクション（PC専用） */}
			{hasVideoUrl && fileId && !isAuthenticated && (
				<div className="mb-4 px-5 py-4 bg-amber-50 border border-amber-300 rounded-xl hidden md:flex items-center justify-between">
					<div>
						<h3 className="text-sm font-semibold text-amber-700 mb-1">Google Drive認証が必要です</h3>
						<p className="text-amber-600/80 text-xs">
							この動画は制限されたアクセス権限が設定されています。
						</p>
					</div>
					<button
						onClick={authenticateWithGoogleDrive}
						disabled={isLoading}
						className="btn-aurora px-4 py-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm font-medium ml-4 shrink-0"
					>
						{isLoading ? "処理中..." : "Google Driveで確認"}
					</button>
					{errorMessage && <p className="text-rose-500 text-xs mt-2">{errorMessage}</p>}
				</div>
			)}

			{/* 手動認証確認ダイアログ */}
			{showManualAuthDialog && (
				<div className="fixed inset-0 bg-sky-900/30 backdrop-blur-sm flex items-center justify-center z-50">
					<div className="glass-solid p-7 rounded-3xl max-w-md mx-4">
						<h3 className="text-base font-bold text-slate-800 mb-3">Google Driveアクセス確認</h3>
						<p className="text-sm text-slate-600 mb-6">
							新しいタブでGoogle Driveが開きました。動画にアクセスできることを確認してください。
						</p>
						<div className="flex gap-3">
							<button
								onClick={confirmManualAuth}
								className="btn-aurora px-5 py-2.5 rounded-xl cursor-pointer text-sm font-medium"
							>
								アクセス可能です
							</button>
							<button
								onClick={() => setShowManualAuthDialog(false)}
								className="btn-ghost px-5 py-2.5 rounded-xl cursor-pointer text-sm font-medium"
							>
								キャンセル
							</button>
						</div>
					</div>
				</div>
			)}

			{/* 認証済み表示（PC専用） */}
			{hasVideoUrl && isAuthenticated && (
				<div className="mb-4 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl hidden md:flex items-center">
					<span className="text-emerald-500 mr-2 text-sm">✓</span>
					<span className="text-emerald-600 text-sm font-medium">Google Drive認証済み</span>
					<button
						onClick={revokeAuth}
						className="ml-auto text-emerald-600 hover:text-emerald-500 text-sm underline cursor-pointer transition-colors"
					>
						認証を解除
					</button>
				</div>
			)}

			{/* 動画プレビュー */}
			{hasVideoUrl && (
			<div className="rounded-2xl overflow-hidden border border-white/60 shadow-[0_12px_40px_rgba(7,89,133,0.3)] mb-6">
					<>
						{/* スマホ: Googleドライブで開くボタン */}
						<div className="md:hidden bg-sky-950 px-6 py-10 flex flex-col items-center gap-4">
							<p className="text-sky-200/80 text-sm text-center">
								スマホでの確認はGoogleドライブアプリで開いてください
							</p>
							<a
								href={fileId ? `https://drive.google.com/file/d/${fileId}/view` : videoUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="btn-aurora px-6 py-3.5 rounded-xl font-semibold text-sm w-full text-center"
							>
								▶ Googleドライブで動画を開く
							</a>
						</div>
						{/* PC: iframeで埋め込み */}
						<div className="hidden md:block bg-black aspect-video">
							{convertedVideoUrl && isAuthenticated ? (
								<iframe
									className="w-full h-full"
									src={convertedVideoUrl}
									title="動画"
									allowFullScreen
									allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
								/>
							) : fileId && !isAuthenticated ? (
								<div className="w-full h-full flex flex-col items-center justify-center text-center bg-sky-950">
									<div className="text-amber-400 text-2xl mb-3">🔒</div>
									<div className="text-sky-100 text-sm mb-4">認証が必要です</div>
									<button
										onClick={authenticateWithGoogleDrive}
										disabled={isLoading}
										className="btn-aurora px-5 py-2.5 rounded-xl disabled:opacity-50 cursor-pointer text-sm font-medium"
									>
										{isLoading ? "処理中..." : "Google Driveで確認"}
									</button>
								</div>
							) : !fileId ? (
								<div className="w-full h-full flex flex-col items-center justify-center text-center bg-sky-950">
									<div className="text-rose-400 text-2xl mb-3">⚠️</div>
									<div className="text-sky-100 text-sm mb-1">無効なURLです</div>
									<div className="text-sky-300/70 text-xs">
										例: https://drive.google.com/file/d/[ファイルID]/view
									</div>
								</div>
							) : (
								<div className="w-full h-full flex items-center justify-center bg-sky-950">
									<p className="text-sky-200/80 text-sm">動画URLを入力するとプレビューが表示されます</p>
								</div>
							)}
						</div>
					</>
			</div>
			)}

			{/* フォームエリア */}
			<div className="glass-panel rounded-2xl p-6 space-y-5">
				{/* レッスンタイトル */}
				<div>
					<label className="block text-sm font-semibold text-slate-600 mb-1.5">レッスンタイトル</label>
					<input
						type="text"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						className="glass-input w-full rounded-xl px-4 py-2.5 text-base font-semibold"
						placeholder={isNewLesson ? "レッスンタイトルを入力してください" : ""}
					/>
				</div>

				{/* レッスン説明 */}
				<div>
					<label className="block text-sm font-semibold text-slate-600 mb-1.5">レッスン説明</label>
					<RichTextEditor
						value={content}
						onChange={setContent}
						placeholder={isNewLesson ? "レッスンの説明を入力してください（Markdown対応）" : "コンテンツを入力してください..."}
					/>
				</div>

				{/* タグ */}
				<div>
					<label className="block text-sm font-semibold text-slate-600 mb-1.5">タグ</label>
					<TagInput tagNames={tagNames} onChange={setTagNames} />
				</div>

				{/* 保存ボタン */}
				<div className="flex justify-end pt-2">
					<button
						onClick={handleSave}
						className="btn-aurora px-8 py-2.5 rounded-xl cursor-pointer text-sm font-semibold"
					>
						{isNewLesson ? "新規作成" : "更新"}
					</button>
				</div>
			</div>
		</div>
	);
}
