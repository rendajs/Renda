import BinaryComposer from "../../../src/Util/BinaryComposer.js";
import editor from "../editorInstance.js";

export default class AssetBundler{
	constructor(){}

	async bundle(bundleProjectAsset){
		const bundleData = await bundleProjectAsset.readAssetData();
		const assetUuids = await this.getAllAssetUuids(bundleData.assets, bundleData.excludeAssets, bundleData.excludeAssetsRecursive);

		const bundleFileStream = await editor.projectManager.currentProjectFileSystem.writeFileStream(bundleData.outputLocation.split("/"));
		if(bundleFileStream.locked){
			throw new Error("Failed to write bundle, file is locked.");
		}

		const assetHeaderByteLength = 16 + 16 + 4; //16 bytes for the uuid + 16 bytes for the asset type uuid + 4 bytes for the asset length
		const headerByteLength = 4 + assetUuids.length * assetHeaderByteLength; //4 bytes for the asset count + the asset headers
		const header = new ArrayBuffer(headerByteLength);
		const headerIntView = new Uint8Array(header);
		const headerView = new DataView(header);

		let headerCursor = 0;
		headerView.setUint32(headerCursor, assetUuids.length, true);
		headerCursor += 4;

		//fill header with zeros
		await bundleFileStream.write(header);

		for(const assetUuid of assetUuids){
			const binaryUuid = BinaryComposer.uuidToBinary(assetUuid);
			headerIntView.set(new Uint8Array(binaryUuid), headerCursor);
			headerCursor += 16;

			const asset = await editor.projectManager.assetManager.getProjectAsset(assetUuid);

			const assetTypeUuid = await asset.getAssetTypeUuid();
			const binaryAssetTypeUuid = BinaryComposer.uuidToBinary(assetTypeUuid);
			headerIntView.set(new Uint8Array(binaryAssetTypeUuid), headerCursor);
			headerCursor += 16;

			const assetData = await asset.getBundledAssetData();
			let dataSizeBytes = 0;
			if(assetData instanceof Blob){
				dataSizeBytes = assetData.size;
			}else if(assetData instanceof ArrayBuffer){
				dataSizeBytes = assetData.byteLength;
			}
			headerView.setUint32(headerCursor, dataSizeBytes, true);
			headerCursor += 4;

			await bundleFileStream.write(assetData);
		}

		await bundleFileStream.write({type: "write", position: 0, data: header});
		await bundleFileStream.close();
	}

	async getAllAssetUuids(assetsList){
		const assetUuids = [];
		for(const assetData of assetsList){
			if(assetData.includeChildren){
				for await (const uuid of this.collectAllReferences(assetData.asset, assetUuids)){
					assetUuids.push(uuid);
				}
			}else{
				assetUuids.push(assetData.asset);
			}
		}
		return assetUuids;
	}

	async *collectAllReferences(assetUuid){
		const projectAsset = await editor.projectManager.assetManager.getProjectAsset(assetUuid);
		if(projectAsset){
			yield assetUuid;
			for await(const referenceUuid of projectAsset.getReferencedAssetUuids()){
				for await(const subReferenceUuid of this.collectAllReferences(referenceUuid)){
					yield subReferenceUuid;
				}
			}
		}
	}
}
