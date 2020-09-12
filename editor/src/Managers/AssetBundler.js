import {uuidToBinary} from "../Util/Util.js";
import editor from "../editorInstance.js";

export default class AssetBundler{
	constructor(){}

	async bundle(bundleProjectAsset){
		const bundleData = await bundleProjectAsset.readAssetData();
		let assetCount = 0;
		for(const assetUuid of bundleData.assets){
			if(assetUuid) assetCount++;
		}

		const bundleFileStream = await editor.projectManager.currentProjectFileSystem.writeFileStream(bundleData.outputLocation.split("/"));
		if(bundleFileStream.locked){
			throw new Error("Failed to write bundle, file is locked.");
		}

		const assetHeaderByteLength = 20; //16 bytes for the uuid + 4 bytes for the asset length
		const headerByteLength = 4 + assetCount * assetHeaderByteLength; //4 bytes for the asset count + the asset headers
		const header = new ArrayBuffer(headerByteLength);
		const headerIntView = new Uint8Array(header);
		const headerView = new DataView(header);

		let headerCursor = 0;
		headerView.setUint32(headerCursor, assetCount, true);
		headerCursor += 4;
		await bundleFileStream.write({type: "seek", position: headerByteLength});
		for(const assetUuid of bundleData.assets){
			if(!assetUuid) continue;
			const binaryUuid = uuidToBinary(assetUuid);
			headerIntView.set(new Uint8Array(binaryUuid), headerCursor);
			headerCursor += 16; //a uuid should always be 16 bytes

			const asset = await editor.projectManager.assetManager.getProjectAsset(assetUuid);
			const assetData = await asset.getBundledAssetData();
			let dataSizeBytes = 0;
			if(assetData instanceof Blob){
				dataSizeBytes = assetData.size;
			}
			headerView.setUint32(headerCursor, dataSizeBytes, true);
			headerCursor += 4;
			//todo add padding after written data?
			await bundleFileStream.write(assetData);
		}

		await bundleFileStream.write({type: "write", position: 0, data: header});
		await bundleFileStream.close();
	}
}
