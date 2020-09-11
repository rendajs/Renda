export default class AssetBundler{
	constructor(){}

	async bundle(bundleProjectAsset){
		const bundleData = await bundleProjectAsset.readAssetData();
		console.log("bundle", bundleData);
	}
}
