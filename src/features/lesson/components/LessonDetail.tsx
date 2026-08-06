"use client";
import { API_URL } from '@/lib/apiUrl';
import { useEffect, useState } from "react";
import { useParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { useApiRequest } from "@/hooks/useApiRequest";
import LoadingSpinner from "@/components/LoadingSpinner";
import { UserLessonDetailDto } from "../types";
import { useRevalidate } from "@/hooks/useApiQuery";
import { swrKeys } from "@/lib/swrKeys";
import { getSubjectFromJWT } from "@/lib/jwtUtil";
import { ensureValidJwt } from "@/lib/authUtil";
import ReactMarkdown from "react-markdown";
import TagList from "./TagList";
import remarkGfm from "remark-gfm";

export default function LessonDetail({
	onLessonSelect,
	selectedLessonId,
}: {
	onLessonSelect?: (lessonId: string) => void;
	selectedLessonId?: string | null;
}) {
	const params = useParams();
	const courseId = params.courseId as string;
	const lessonGroupId = params.lessonGroupId as string;
	const paramLessonId = params.lessonId as string;
	
	// レッスンの状態管理
	const [lesson, setLesson] = useState<UserLessonDetailDto | null>(null);
	const [isLessonCompleted, setIsLessonCompleted] = useState(false);

	// 完了状態を変更した後にサイドバーを最新化するための関数
	const revalidate = useRevalidate();
	const [isUpdatingCompletion, setIsUpdatingCompletion] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [completionError, setCompletionError] = useState<string | null>(null);

	// 認証状態の管理（localStorageを使用してレッスン間で共有）
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [showManualAuthDialog, setShowManualAuthDialog] = useState(false);
	
	// 認証状態をlocalStorageから読み込み
	useEffect(() => {
		const savedAuthState = localStorage.getItem(`auth_${courseId}`);
		if (savedAuthState === 'true') {
			setIsAuthenticated(true);
		}
	}, [courseId]);
	
	// 認証状態をlocalStorageに保存
	const updateAuthState = (authState: boolean) => {
		setIsAuthenticated(authState);
		localStorage.setItem(`auth_${courseId}`, authState.toString());
	};

	// レッスン取得API
	const {
		executeApi: executeFindLessonByIdApi,
		isLoading: isLoadingApi,
		isError: isErrorApi
	} = useApiRequest();

	// レッスン完了状態更新API
	const {
		executeApi: executeUpdateUserLessonCompletionApi,
	} = useApiRequest();

	// JWT 再発行（アクセストークン短命のため、更新前にヘッダー用トークンを最新化する）
	const {
		executeApi: executeRefreshTokenApi,
	} = useApiRequest();

	// レッスンデータを取得
	const fetchLesson = async (lessonId: string) => {
		try {
			setIsLoading(true);
			setError(null);
			setCompletionError(null);

			// JWT は短命なため、切れていれば RefreshToken で再発行してから取得する
			const token = await ensureValidJwt();
			if (!token) {
				setError('ユーザー情報の取得に失敗しました');
				return;
			}
			const userId = getSubjectFromJWT(token);
			if (!userId) {
				setError('ユーザー情報の取得に失敗しました');
				return;
			}
			
			const response = await executeFindLessonByIdApi(
				`${API_URL}/api/users/${userId}/courses/${courseId}/lesson-groups/${lessonGroupId}/lessons/${lessonId}`,
				'GET'
			);

			if (response && response.ok) {
				const lessonDto: UserLessonDetailDto = await response.json();
				setLesson(lessonDto);
				setIsLessonCompleted(lessonDto.isLessonCompleted);
			} else {
				setError('レッスンの取得に失敗しました');
			}
		} catch (err) {
			console.error('レッスン取得エラー:', err);
			setError('レッスンの取得中にエラーが発生しました');
		} finally {
			setIsLoading(false);
		}
	};

	const handleLessonCompletionChange = async (checked: boolean) => {
		if (!lesson || isUpdatingCompletion) {
			return;
		}

		const previousValue = isLessonCompleted;
		setIsLessonCompleted(checked);
		setIsUpdatingCompletion(true);
		setCompletionError(null);

		try {
			// バックエンドの JwtFilter がリフレッシュしてクッキーを更新する。続く PUT では最新 JWT をヘッダーに載せる。
			await executeRefreshTokenApi(`${API_URL}/api/auth/refresh`, 'GET');

			const token = await ensureValidJwt();
			if (!token) {
				throw new Error('JWT not found');
			}
			const userId = getSubjectFromJWT(token);
			if (!userId) {
				throw new Error('invalid user id');
			}

			const response = await executeUpdateUserLessonCompletionApi(
				`${API_URL}/api/users/${userId}/courses/${courseId}/lesson-groups/${lessonGroupId}/lessons/${lesson.id}/completion`,
				'PUT',
				{ isLessonCompleted: checked }
			);

			if (!response || !response.ok) {
				throw new Error('status update failed');
			}

			// サイドバーのチェックマークを最新化する
			await revalidate(swrKeys.userCourseLessons(userId, courseId));
		} catch (err) {
			console.error('レッスン完了状態更新エラー:', err);
			setIsLessonCompleted(previousValue);
			setCompletionError('レッスン完了状態の更新に失敗しました。再度お試しください。');
		} finally {
			setIsUpdatingCompletion(false);
		}
	};

	// Google DriveのURLからファイルIDを正規表現で抽出する
	const extractFileId = (url: string): string | null => {
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
		if (!lesson?.videoUrl) return;

		try {
			const fileId = extractFileId(lesson.videoUrl);
			if (!fileId) {
				setError("有効なGoogle DriveのファイルIDが見つかりません");
				return;
			}

			// 新しいタブでGoogle Driveを開く
			const driveUrl = `https://drive.google.com/file/d/${fileId}/view`;
			window.open(driveUrl, '_blank');
			
			// 認証確認ダイアログを表示
			setShowManualAuthDialog(true);
		} catch (error) {
			console.error('認証エラー:', error);
			setError("認証中にエラーが発生しました");
		}
	};

	// 手動認証確認
	const confirmManualAuth = () => {
		updateAuthState(true);
		setShowManualAuthDialog(false);
	};

	// 認証解除
	const revokeAuth = () => {
		updateAuthState(false);
	};

	// URLパラメータからレッスンIDがある場合の初期読み込み
	useEffect(() => {
		if (paramLessonId && lessonGroupId) {
			fetchLesson(paramLessonId);
		}
	}, [paramLessonId, courseId, lessonGroupId]);

	// サイドバーから選択されたレッスンのデータを取得
	useEffect(() => {
		if (selectedLessonId && lessonGroupId) {
			fetchLesson(selectedLessonId);
		}
	}, [selectedLessonId, courseId, lessonGroupId]);

	if (isLoading || isLoadingApi) {
		return (
			<div className="flex-1 pt-6 px-4 md:px-10 overflow-y-auto">
				<LoadingSpinner size="sm" />
			</div>
		);
	}

	if (error || isErrorApi) {
		return (
			<div className="flex-1 pt-6 px-4 md:px-10 overflow-y-auto">
				<div className="text-center py-8 text-sm text-rose-500">
					エラーが発生しました: {error || 'データの取得に失敗しました'}
				</div>
			</div>
		);
	}

	if (!lesson) {
		return (
			<div className="flex-1 pt-6 px-4 md:px-10 overflow-y-auto">
				<div className="text-center py-8 text-sm text-slate-500">
					レッスンを選択してください
				</div>
			</div>
		);
	}

	const lessonDescription = lesson.content ?? "";

	return (
		<div className="flex-1 pt-8 px-4 md:px-10 pb-20 overflow-y-auto">
			<div className="max-w-4xl mx-auto">
			{/* レッスンヘッダー：タイトル＋完了トグルピル */}
			<div className="mb-6 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
				<div className="min-w-0">
					<p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-500/80 mb-2">
						Lesson
					</p>
					<h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-aurora leading-snug drop-shadow-[0_2px_16px_rgba(125,211,252,0.45)]">
						{lesson.title}
					</h1>
					{lesson.tags && lesson.tags.length > 0 && (
						<div className="mt-3">
							<TagList tags={lesson.tags} />
						</div>
					)}
				</div>

				{/* 完了トグルピル */}
				<button
					onClick={() => handleLessonCompletionChange(!isLessonCompleted)}
					disabled={isUpdatingCompletion}
					className={`shrink-0 self-start inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
						isLessonCompleted
							? "bg-emerald-50 border-emerald-300 text-emerald-600 shadow-[0_0_20px_rgba(52,211,153,0.25)]"
							: "bg-white/70 border-sky-200 text-slate-600 hover:border-sky-400 hover:text-sky-600"
					}`}
				>
					<CheckCircle2
						size={17}
						className={isLessonCompleted ? "text-emerald-500" : "text-slate-400"}
					/>
					{isLessonCompleted ? "完了済み" : "完了にする"}
				</button>
			</div>
			{completionError && (
				<p className="mb-4 text-sm text-rose-500">{completionError}</p>
			)}

			{/* 認証済み表示（PC専用・動画ありのレッスンのみ） */}
			{lesson.videoUrl && isAuthenticated && (
				<div className="mb-4 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full hidden md:flex items-center text-xs">
					<span className="text-emerald-500 mr-2">✓</span>
					<span className="text-emerald-600 font-medium">Google Drive認証済み</span>
					<button
						onClick={revokeAuth}
						className="ml-auto text-emerald-600 hover:text-emerald-500 underline cursor-pointer transition-colors"
					>
						認証を解除
					</button>
				</div>
			)}

			{/* シネマ枠：動画 */}
			{lesson.videoUrl && (
			<div className="relative mb-8">
				{/* 画面奥のグロー */}
				<div className="pointer-events-none absolute -inset-3 rounded-[1.75rem] bg-gradient-to-r from-sky-400/40 via-cyan-300/30 to-blue-300/35 blur-2xl" />
				<div className="relative rounded-2xl overflow-hidden border border-white/60 shadow-[0_20px_60px_rgba(7,89,133,0.35)]">
				{/* スマホ: Googleドライブで開くボタン */}
				<div className="md:hidden bg-sky-950 px-6 py-10 flex flex-col items-center gap-4">
					<p className="text-sky-200/80 text-sm text-center">
						スマホでの視聴はGoogleドライブアプリで開いてください
					</p>
					<a
						href={lesson.videoUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="btn-aurora px-6 py-3.5 rounded-xl font-semibold text-sm w-full text-center"
					>
						▶ Googleドライブで動画を開く
					</a>
				</div>
				{/* PC: iframeで埋め込み */}
				<div className="hidden md:block bg-black aspect-video">
					{isAuthenticated ? (
						<iframe
							className="w-full h-full"
							src={convertGoogleDriveUrl(lesson.videoUrl)}
							title="レッスン動画"
							allowFullScreen
						/>
					) : (
						<div className="w-full h-full bg-sky-950 flex flex-col items-center justify-center">
							<div className="text-center mb-6 px-8">
								<h3 className="text-lg font-semibold text-white mb-2">動画を視聴するには認証が必要です</h3>
								<p className="text-sky-200/80 text-sm mb-6">
									Google Driveの動画にアクセスするために認証を行ってください。
								</p>
								<button
									onClick={authenticateWithGoogleDrive}
									className="btn-aurora px-6 py-2.5 rounded-xl cursor-pointer font-medium"
								>
									Google Driveで認証する
								</button>
							</div>
						</div>
					)}
				</div>
				</div>
			</div>
			)}

			<div className="text-base">
				{lessonDescription ? (
					<div className="lesson-content glass-panel rounded-2xl px-6 py-5 md:px-8 md:py-7">
						<ReactMarkdown
							remarkPlugins={[remarkGfm]}
							components={{
								a: ({ children, href }) => (
									<a href={href} target="_blank" rel="noopener noreferrer">
										{children}
									</a>
								),
							}}
						>
							{lessonDescription}
						</ReactMarkdown>
					</div>
				) : (
					<p className="text-slate-500">説明が設定されていません</p>
				)}
			</div>



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
			</div>
		</div>
	);
}