import {ProjectAssetType} from "./ProjectAssetType.js";
import {PropertiesAssetContentMaterialMap} from "../../PropertiesWindowContent/PropertiesAssetContent/PropertiesAssetContentMaterialMap/PropertiesAssetContentMaterialMap.js";

export class ProjectAssetTypeMaterialMap extends ProjectAssetType {
	static type = "JJ:materialMap";
	static typeUuid = "dd28f2f7-254c-4447-b041-1770ae451ba9";
	static newFileName = "New Material Map";
	static propertiesAssetContentConstructor = PropertiesAssetContentMaterialMap;
}
