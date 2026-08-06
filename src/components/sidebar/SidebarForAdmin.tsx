"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, LayoutGrid, Users, Megaphone } from "lucide-react";
import { useRef } from "react";
import { adminHeaderHeight } from "@/lib/pageLayout";

export default function SidebarForAdmin({ onClose }: { onClose?: () => void }) {
	const touchStartX = useRef<number>(0);
	const pathname = usePathname();

	const sections = [
		{ id: "courses", label: "コース一覧", href: "/admin/courses", icon: LayoutGrid },
		{ id: "users", label: "ユーザー一覧", href: "/admin/users", icon: Users },
		{ id: "news", label: "お知らせ一覧", href: "/admin/news", icon: Megaphone },
	];

	return (
		<div
			className="w-full h-full bg-white/75 backdrop-blur-xl border-r border-sky-100 text-slate-700 flex flex-col"
			onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
			onTouchEnd={(e) => {
				const deltaX = e.changedTouches[0].clientX - touchStartX.current;
				if (deltaX < -60) onClose?.();
			}}
		>
			<div
				className={`px-5 ${adminHeaderHeight} border-b border-sky-100 flex items-center justify-between shrink-0`}
			>
				<div>
					<p className="text-xs font-semibold text-sky-500/80 uppercase tracking-widest mb-1">Admin Console</p>
					<h2 className="text-base font-bold text-aurora">管理者メニュー</h2>
				</div>
				{onClose && (
					<button
						onClick={onClose}
						className="md:hidden text-slate-400 hover:text-sky-600 p-1 transition-colors"
					>
						<X size={20} />
					</button>
				)}
			</div>
			<ul className="flex-1 py-4 px-3 space-y-1.5">
				{sections.map((section) => {
					const isActive = pathname?.startsWith(section.href);
					const Icon = section.icon;
					return (
						<li key={section.id}>
							<Link
								href={section.href}
								onClick={onClose}
								className={`relative flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-2xl transition-all ${
									isActive
										? "bg-gradient-to-r from-sky-100 to-cyan-50 text-sky-800 border border-sky-300/70 shadow-[0_0_20px_rgba(56,189,248,0.25)]"
										: "text-slate-500 border border-transparent hover:bg-sky-50 hover:text-sky-700"
								}`}
							>
								{/* アクティブ時の左グローバー */}
								{isActive && (
									<span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-gradient-to-b from-sky-400 to-cyan-300 shadow-[0_0_10px_rgba(56,189,248,0.8)]" />
								)}
								<Icon size={17} className={isActive ? "text-sky-500" : "text-slate-400"} />
								{section.label}
							</Link>
						</li>
					);
				})}
			</ul>

			<div className="px-5 py-4 border-t border-sky-100">
				<p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-sky-300">
					Java Learning Platform
				</p>
			</div>
		</div>
	);
}
