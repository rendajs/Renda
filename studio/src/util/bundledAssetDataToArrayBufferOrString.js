/**
 * Turns the return value of `ProjectAsset.getBundledAssetData` into an ArrayBuffer or string.
 * This also slices the buffer if it is a view.
 * You can use this to directly pass the result as an argument when writing to a file.
 * @param {import("../assets/ProjectAsset.js").GetBundledAssetDataReturnType} bundledAssetData
 */
export async function bundledAssetDataToArrayBufferOrString(bundledAssetData) {
	if (!bundledAssetData) return "";

	if (bundledAssetData instanceof Blob) {
		return await bundledAssetData.arrayBuffer();
	} else if (ArrayBuffer.isView(bundledAssetData)) {
		return bundledAssetData.buffer.slice(bundledAssetData.byteOffset, bundledAssetData.byteOffset + bundledAssetData.byteLength);
	}
	return bundledAssetData;
}
