import {BinaryComposer} from "../../../src/util/BinaryComposer.js";
import {getEditorInstance} from "../editorInstance.js";

export class AssetBundler {
	/**
	 * @param {import("../Assets/ProjectAsset.js").ProjectAsset<import("../Assets/ProjectAssetType/ProjectAssetTypeAssetBundle.js").ProjectAssetTypeAssetBundle>} bundleProjectAsset
	 */
	async bundle(bundleProjectAsset) {
		const bundleData = await bundleProjectAsset.readAssetData();
		const assetUuids = await this.getAllAssetUuids(bundleData.assets, new Set(bundleData.excludeAssets), new Set(bundleData.excludeAssetsRecursive));

		const bundleFileStream = await getEditorInstance().projectManager.currentProjectFileSystem.writeFileStream(bundleData.outputLocation.split("/"));
		if (bundleFileStream.locked) {
			throw new Error("Failed to write bundle, file is locked.");
		}

		const assetHeaderByteLength = 16 + 16 + 4; // 16 bytes for the uuid + 16 bytes for the asset type uuid + 4 bytes for the asset length
		const headerByteLength = 4 + assetUuids.size * assetHeaderByteLength; // 4 bytes for the asset count + the asset headers
		const header = new ArrayBuffer(headerByteLength);
		const headerIntView = new Uint8Array(header);
		const headerView = new DataView(header);

		let headerCursor = 0;
		headerView.setUint32(headerCursor, assetUuids.size, true);
		headerCursor += 4;

		// fill header with zeros
		await bundleFileStream.write(header);

		for (const assetUuid of assetUuids) {
			const binaryUuid = BinaryComposer.uuidToBinary(assetUuid);
			headerIntView.set(new Uint8Array(binaryUuid), headerCursor);
			headerCursor += 16;

			const asset = await getEditorInstance().projectManager.assetManager.getProjectAsset(assetUuid);

			const assetTypeUuid = await asset.getAssetTypeUuid();
			if (!assetTypeUuid) continue;
			const binaryAssetTypeUuid = BinaryComposer.uuidToBinary(assetTypeUuid);
			headerIntView.set(new Uint8Array(binaryAssetTypeUuid), headerCursor);
			headerCursor += 16;

			const assetData = await asset.getBundledAssetData();
			let dataSizeBytes = 0;
			if (assetData instanceof Blob) {
				dataSizeBytes = assetData.size;
			} else if (assetData instanceof ArrayBuffer) {
				dataSizeBytes = assetData.byteLength;
			}
			headerView.setUint32(headerCursor, dataSizeBytes, true);
			headerCursor += 4;

			await bundleFileStream.write(assetData);
		}

		await bundleFileStream.write({type: "write", position: 0, data: header});
		await bundleFileStream.close();
	}

	/**
	 * @param {import("../Assets/ProjectAssetType/ProjectAssetTypeAssetBundle.js").AssetBundleDiskDataAsset[]} assetsList
	 * @param {Set<import("../../../src/util/mod.js").UuidString>} excludeUuids
	 * @param {Set<import("../../../src/util/mod.js").UuidString>} excludeUuidsRecursive
	 */
	async getAllAssetUuids(assetsList, excludeUuids, excludeUuidsRecursive) {
		/** @type {Set<import("../../../src/util/mod.js").UuidString>} */
		const foundUuids = new Set();
		for (const assetData of assetsList) {
			if (assetData.includeChildren) {
				for await (const uuid of this.collectAllReferences(assetData.asset, foundUuids, excludeUuids, excludeUuidsRecursive)) {
					foundUuids.add(uuid);
				}
			} else {
				foundUuids.add(assetData.asset);
			}
		}
		return foundUuids;
	}

	/**
	 * @param {import("../../../src/util/mod.js").UuidString} assetUuid
	 * @param {Set<import("../../../src/util/mod.js").UuidString>} foundUuids
	 * @param {Set<import("../../../src/util/mod.js").UuidString>} excludeUuids
	 * @param {Set<import("../../../src/util/mod.js").UuidString>} excludeUuidsRecursive
	 * @returns {AsyncGenerator<import("../../../src/util/mod.js").UuidString>}
	 */
	async *collectAllReferences(assetUuid, foundUuids, excludeUuids, excludeUuidsRecursive) {
		const projectAsset = await getEditorInstance().projectManager.assetManager.getProjectAsset(assetUuid);
		if (projectAsset) {
			if (foundUuids.has(assetUuid) || excludeUuidsRecursive.has(assetUuid)) return;
			if (!excludeUuids.has(assetUuid)) yield assetUuid;
			for await (const referenceUuid of projectAsset.getReferencedAssetUuids()) {
				for await (const subReferenceUuid of this.collectAllReferences(referenceUuid, foundUuids, excludeUuids, excludeUuidsRecursive)) {
					yield getEditorInstance().projectManager.assetManager.resolveDefaultAssetLinkUuid(subReferenceUuid);
				}
			}
		}
	}
}
