import { Tag as TagIcon } from "lucide-react";
import { TagDto } from "../types";

/**
 * 閲覧専用のタグ表示。
 *
 * タグが1つもない場合は何も表示しない。
 */
export default function TagList({ tags }: { tags: TagDto[] }) {
	if (tags.length === 0) {
		return null;
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			<TagIcon size={14} className="text-sky-500/80 shrink-0" aria-hidden="true" />
			{tags.map((tag) => (
				<span
					key={tag.id}
					className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap border bg-sky-100 border-sky-300 text-sky-700"
				>
					{tag.name}
				</span>
			))}
		</div>
	);
}
