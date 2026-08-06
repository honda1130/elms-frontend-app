'use client';
import { useRouter } from 'next/navigation';

export default function NotImplementedPage() {
	const router = useRouter();

	return (
		<div className="min-h-screen flex flex-col items-center justify-center px-4">
			<div className="glass-panel rounded-3xl p-10 max-w-md w-full text-center">
				<div className="btn-aurora inline-flex items-center justify-center w-16 h-16 rounded-full mb-6">
					<span className="text-white text-2xl font-bold">!</span>
				</div>
				<h1 className="text-xl font-bold text-slate-800 mb-3">APIが未実装です</h1>
				<p className="text-slate-500 text-sm mb-6">
					呼び出したAPIがバックエンドにまだ実装されていません。<br />
					バックエンドのコントローラーを確認してください。
				</p>
				<button
					onClick={() => router.back()}
					className="btn-aurora text-sm font-medium px-6 py-2 rounded-lg hover:cursor-pointer"
				>
					前のページに戻る
				</button>
			</div>
		</div>
	);
}
