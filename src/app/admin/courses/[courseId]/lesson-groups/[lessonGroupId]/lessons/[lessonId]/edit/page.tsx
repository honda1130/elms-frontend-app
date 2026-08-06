'use client';

import { useState } from "react";
import LessonDetailForAdmin from "@/features/lesson/components/LessonDetailForAdmin";

export default function EditLessonPage() {
	// 選択されたレッスンIDの状態管理
	const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
	
	// レッスン選択時のハンドラー
	const handleLessonSelect = (lessonId: string) => {
		console.log('Selected lesson:', lessonId);
		setSelectedLessonId(lessonId);
	};

	return (
		<LessonDetailForAdmin 
			onLessonSelect={handleLessonSelect}
			selectedLessonId={selectedLessonId}
			isEditPage={true}
		/>
	);
}


