// Blobを指定したファイル名でダウンロードする
export function downloadBlob(blob: Blob, fileName: string) {
	const url = window.URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = fileName;
	a.click();
	window.URL.revokeObjectURL(url);
}
