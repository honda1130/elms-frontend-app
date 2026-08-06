export type TagDto = {
	id: string;
	name: string;
};

export type LessonDto = {
	id: string;
	lessonGroupId: string;
	courseId: string;
	lessonOrder: number;
	title: string;
	content: string;
	videoUrl: string;
	tags: TagDto[];
	createdAt: string;
	updatedAt: string;
};

export type UserLessonDetailDto = {
	id: string;
	lessonGroupId: string;
	courseId: string;
	lessonOrder: number;
	title: string;
	content: string;
	videoUrl: string;
	tags: TagDto[];
	createdAt: string;
	updatedAt: string;
	isLessonCompleted: boolean;
};

export type LessonPageDto = {
	lessonDtos: LessonDto[];
	pageNum: number;
	pageSize: number;
	totalSize: number;
};

export type LessonGroupDto = {
	id: string;
	courseId: string;
	lessonGroupOrder: number;
	name: string;
	createdAt: string;
	updatedAt: string;
	lessons: LessonDto[];
};

export type CourseLessonsDto = {
	courseId: string;
	lessonGroups: LessonGroupDto[];
};

export type UserLessonDto = {
	lesson: LessonDto;
	isLessonCompleted: boolean;
};

export type UserLessonGroupDto = {
	id: string;
	courseId: string;
	lessonGroupOrder: number;
	name: string;
	createdAt: string;
	updatedAt: string;
	userLessons: UserLessonDto[];
};
