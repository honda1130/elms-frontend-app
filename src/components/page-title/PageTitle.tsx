import { adminHeaderHeight } from '@/lib/pageLayout';

type PageTitleProps = {
	title: string;
	containerClassName?: string;
	/** AdminLayout 内など、ヘッダー分の mt を付けない場合に true */
	embedded?: boolean;
};

export default function PageTitle({
	title,
	containerClassName = "max-w-5xl mx-auto px-8",
	embedded = false,
}: PageTitleProps) {
	if (embedded) {
		return (
			<div className="w-full border-b border-sky-100 bg-white/50">
				<div className={`${containerClassName} ${adminHeaderHeight} flex items-center gap-3`}>
					<span className="aurora-bar block w-1 h-8 rounded-full shrink-0" />
					<h1 className="text-2xl font-bold text-aurora tracking-wide">{title}</h1>
				</div>
			</div>
		);
	}

	return (
		<div className="mt-[60px] w-full relative overflow-hidden border-b border-sky-100">
			{/* ヒーローバンドの光の装飾 */}
			<div className="pointer-events-none absolute -top-24 left-[8%] h-56 w-56 rounded-full bg-sky-300/40 blur-3xl" />
			<div className="pointer-events-none absolute -top-16 right-[12%] h-44 w-44 rounded-full bg-cyan-200/50 blur-3xl" />
			<div className="pointer-events-none absolute -bottom-24 left-[45%] h-48 w-48 rounded-full bg-blue-200/40 blur-3xl" />

			<div className={`${containerClassName} relative py-10 md:py-12`}>
				<p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-500/80">
					Learning Portal
				</p>
				<h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-aurora drop-shadow-[0_2px_16px_rgba(125,211,252,0.5)]">
					{title}
				</h1>
			</div>
		</div>
	);
}
