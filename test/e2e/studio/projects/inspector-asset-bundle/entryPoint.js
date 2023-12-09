import {initializeServices} from "renda:services";
import {Entity, InspectorAssetBundle, InspectorManager} from "renda";

const {assetLoader} = initializeServices();
const inspector = new InspectorManager();
assetLoader.addBundle(new InspectorAssetBundle(inspector));
const entity = await assetLoader.getAsset("9b690ffe-9a82-43a6-af3c-dfd0bc8fa3ca", {
	assertionOptions: {
		assertInstanceType: Entity,
	},
});

document.body.append("Successfully loaded entity: " + entity.name);
