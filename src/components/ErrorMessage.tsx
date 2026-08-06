import { AlertCircle } from "lucide-react";

type Props = {
	message?: string;
};

export default function ErrorMessage({ message }: Props) {
	return (
		<div className="min-h-[calc(100vh-60px)] flex flex-col items-center justify-center gap-3">
			<div className="glass-panel flex flex-col items-center gap-3 rounded-2xl px-10 py-8">
				<AlertCircle className="text-rose-500 drop-shadow-[0_0_10px_rgba(251,113,133,0.4)]" size={36} />
				<p className="text-sm font-semibold text-slate-700">エラーが発生しました</p>
				{message && <p className="text-xs text-slate-500">{message}</p>}
			</div>
		</div>
	);
}
