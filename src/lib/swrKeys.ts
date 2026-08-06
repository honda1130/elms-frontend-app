import { API_URL } from '@/lib/apiUrl';

/**
 * SWRのキャッシュキー（＝リクエストURL）を組み立てる。
 *
 * データ取得側と、更新後に無効化する側で同じ文字列を作る必要がある。
 * 各所で文字列を組み立てるとタイプミスで無効化が効かなくなるため、ここに集約する。
 */
export const swrKeys = {
	/** コース一覧（検索条件つき） */
	courses: (query?: string) =>
		query ? `${API_URL}/api/courses?${query}` : `${API_URL}/api/courses`,

	/** ユーザー一覧（検索条件つき） */
	users: (query?: string) =>
		query ? `${API_URL}/api/users?${query}` : `${API_URL}/api/users`,

	/** お知らせ一覧（検索条件つき） */
	newsList: (query?: string) =>
		query ? `${API_URL}/api/news?${query}` : `${API_URL}/api/news`,

	/** コース詳細 */
	course: (courseId: string) => `${API_URL}/api/courses/${courseId}`,

	/** コース内のレッスン一覧（レッスングループ単位・管理者向け） */
	courseLessons: (courseId: string) => `${API_URL}/api/courses/${courseId}/lessons`,

	/** レッスン詳細（管理者向け） */
	lesson: (courseId: string, lessonGroupId: string, lessonId: string) =>
		`${API_URL}/api/courses/${courseId}/lesson-groups/${lessonGroupId}/lessons/${lessonId}`,

	/** 受講中コース一覧 */
	userCourses: (userId: string) => `${API_URL}/api/users/${userId}/courses`,

	/** 受講中コースのレッスン一覧（完了状態つき） */
	userCourseLessons: (userId: string, courseId: string) =>
		`${API_URL}/api/users/${userId}/courses/${courseId}/lessons`,

	/** 受講中レッスンの詳細（完了状態つき） */
	userLesson: (userId: string, courseId: string, lessonGroupId: string, lessonId: string) =>
		`${API_URL}/api/users/${userId}/courses/${courseId}/lesson-groups/${lessonGroupId}/lessons/${lessonId}`,

	/** ユーザー詳細 */
	user: (userId: string) => `${API_URL}/api/users/${userId}`,

	/** お知らせ詳細 */
	news: (newsId: string) => `${API_URL}/api/news/${newsId}`,
} as const;
