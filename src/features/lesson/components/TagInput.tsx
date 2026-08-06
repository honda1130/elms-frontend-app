"use client";

import { KeyboardEvent, useState } from "react";
import { X } from "lucide-react";

/** バックエンドの LessonCreateRequest / LessonUpdateRequest に合わせた上限 */
const MAX_TAG_COUNT = 50;
const MAX_TAG_NAME_LENGTH = 255;

/**
 * タグの入力欄。
 *
 * 入力中の文字を Enter で確定するとラベルになり、ラベルのバツボタンで削除できる。
 * タグ名は前後の空白を取り除いたうえで保持し、重複と空文字は追加しない。
 */
export default function TagInput({
	tagNames,
	onChange,
	disabled = false,
}: {
	tagNames: string[];
	onChange: (tagNames: string[]) => void;
	disabled?: boolean;
}) {
	const [inputValue, setInputValue] = useState("");
	const [errorMessage, setErrorMessage] = useState("");

	const addTag = () => {
		const name = inputValue.trim();

		if (name.length === 0) {
			return;
		}
		if (name.length > MAX_TAG_NAME_LENGTH) {
			setErrorMessage(`タグ名は${MAX_TAG_NAME_LENGTH}文字以内で入力してください`);
			return;
		}
		if (tagNames.includes(name)) {
			// 同じタグは1つだけ持たせるため、追加せず入力欄だけ空にする
			setInputValue("");
			return;
		}
		if (tagNames.length >= MAX_TAG_COUNT) {
			setErrorMessage(`登録できるタグの数は${MAX_TAG_COUNT}個以内です`);
			return;
		}

		onChange([...tagNames, name]);
		setInputValue("");
		setErrorMessage("");
	};

	const removeTag = (targetName: string) => {
		onChange(tagNames.filter((name) => name !== targetName));
		setErrorMessage("");
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		// 日本語入力の変換確定でも Enter が飛ぶため、変換中は確定として扱わない
		if (e.nativeEvent.isComposing) {
			return;
		}

		if (e.key === "Enter") {
			// フォーム全体の送信を抑止し、タグの確定だけを行う
			e.preventDefault();
			addTag();
			return;
		}

		// 入力欄が空のときの Backspace で直前のタグを削除する
		if (e.key === "Backspace" && inputValue.length === 0 && tagNames.length > 0) {
			removeTag(tagNames[tagNames.length - 1]);
		}
	};

	return (
		<div>
			<div className="glass-input w-full rounded-xl px-3 py-2 flex flex-wrap items-center gap-2">
				{tagNames.map((name) => (
					<span
						key={name}
						className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap border bg-sky-100 border-sky-300 text-sky-700"
					>
						{name}
						<button
							type="button"
							onClick={() => removeTag(name)}
							disabled={disabled}
							aria-label={`タグ「${name}」を削除`}
							className="text-sky-500 hover:text-sky-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
						>
							<X size={13} />
						</button>
					</span>
				))}
				<input
					type="text"
					value={inputValue}
					onChange={(e) => {
						setInputValue(e.target.value);
						setErrorMessage("");
					}}
					onKeyDown={handleKeyDown}
					// 入力途中の文字が捨てられないよう、フォーカスが外れた時点で確定する
					onBlur={addTag}
					disabled={disabled}
					maxLength={MAX_TAG_NAME_LENGTH}
					className="flex-1 min-w-[10rem] bg-transparent border-none outline-none py-0.5 text-sm text-[#16405f] placeholder:text-[rgba(100,145,180,0.65)] disabled:cursor-not-allowed"
					placeholder={
						tagNames.length === 0 ? "タグを入力して Enter キーで追加してください" : "タグを追加"
					}
				/>
			</div>
			<p className="mt-1.5 text-xs text-slate-500">
				Enter キーでタグを追加し、バツボタンで削除できます（{tagNames.length} / {MAX_TAG_COUNT}）
			</p>
			{errorMessage && <p className="mt-1 text-xs text-rose-500">{errorMessage}</p>}
		</div>
	);
}
