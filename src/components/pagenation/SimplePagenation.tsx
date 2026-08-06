type PagenationProps = {
    handlePrevPage: () => void;
    pageNum: number;
    totalPageNum: number;
    handleNextPage: () => void;
};

export default function SimplePagenation({ handlePrevPage, pageNum, totalPageNum, handleNextPage }: PagenationProps) {
    return (
        <div className="flex items-center justify-center mt-6 gap-3">
            <button
                onClick={handlePrevPage}
                disabled={pageNum == 1}
                className="btn-ghost px-4 py-1.5 text-sm font-medium rounded-xl enabled:cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
                前へ
            </button>
            <span className="text-sm font-medium text-slate-600">
                {pageNum} / {totalPageNum} ページ
            </span>
            <button
                onClick={handleNextPage}
                disabled={pageNum === totalPageNum}
                className="btn-ghost px-4 py-1.5 text-sm font-medium rounded-xl enabled:cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
                次へ
            </button>
        </div>
    );
}
