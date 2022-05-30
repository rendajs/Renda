import {parseGltf} from "../../../../src/util/gltf/gltfParsing.js";
import {getNameAndExtension} from "../../util/fileSystems/pathUtil.js";
import {EntityEditorContentWindow} from "../../windowManagement/contentWindows/EntityEditorContentWindow.js";
import {MaterialProjectAssetType} from "./MaterialProjectAssetType.js";
import {ProjectAssetType} from "./ProjectAssetType.js";

/**
 * @extends {ProjectAssetType<import("../../../../src/core/Entity.js").Entity?, null, "binary">}
 */
export class GltfProjectAssetType extends ProjectAssetType {
	static type = "JJ:gltf";
	static typeUuid = "5d946212-d6f8-412a-8bf1-ee7f4811f038";
	static matchExtensions = ["gltf", "glb"];
	static storeInProjectAsJson = false;
	static storeInProjectAsText = false;

	/**
	 * @override
	 * @param {import("../../windowManagement/WindowManager.js").WindowManager} windowManager
	 */
	async open(windowManager) {
		const entityEditor = windowManager.getMostSuitableContentWindowByConstructor(EntityEditorContentWindow);
		if (entityEditor) {
			await entityEditor.loadEntityAsset(this.projectAsset.uuid);
		}
	}

	/**
	 * @override
	 * @param {Blob?} blob
	 */
	async getLiveAssetData(blob) {
		if (!blob) {
			return {
				liveAsset: null,
				editorData: null,
			};
		}
		const arrayBuffer = await blob.arrayBuffer();
		const defaultMaterial = await this.assetManager.getLiveAsset("542fb96a-d3f8-4150-9963-9f1bf803da67", {
			assertAssetType: MaterialProjectAssetType,
		});
		const fileName = this.projectAsset.path.at(-1);
		if (!fileName) {
			throw new Error("Assertion failed, asset has no file name");
		}
		const {extension} = getNameAndExtension(fileName);
		if (extension != "glb" && extension != "gltf") {
			throw new Error("Assertion failed, file extension is not glb or gltf");
		}
		const {entity} = await parseGltf(arrayBuffer, {
			defaultMaterial,
			fileExtension: extension,
		});
		return {
			liveAsset: entity,
			editorData: null,
		};
	}
}
