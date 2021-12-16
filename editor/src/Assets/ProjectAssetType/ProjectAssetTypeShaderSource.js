import {ProjectAssetType} from "./ProjectAssetType.js";
import {ShaderSource} from "../../../../src/index.js";

export class ProjectAssetTypeShaderSource extends ProjectAssetType {
	static type = "JJ:shaderSource";
	static typeUuid = "e7253ad6-8459-431f-ac16-609150538a24";
	static newFileName = "New Shader";
	static newFileExtension = "shader";
	static storeInProjectAsJson = false;
	static storeInProjectAsText = true;
	static matchExtensions = ["glsl", "wgsl"];

	/**
	 * @param  {ConstructorParameters<typeof ProjectAssetType>} args
	 */
	constructor(...args) {
		super(...args);

		this.includedUuids = [];
		this.boundOnShaderInvalidated = null;
	}

	static expectedLiveAssetConstructor = ShaderSource;

	async getLiveAssetData(source) {
		const {shaderCode, includedUuids} = await this.editorInstance.webGpuShaderBuilder.buildShader(source);
		this.includedUuids = includedUuids;
		if (!this.boundOnShaderInvalidated) {
			this.boundOnShaderInvalidated = this.onShaderInvalidated.bind(this);
			this.editorInstance.webGpuShaderBuilder.onShaderInvalidated(this.boundOnShaderInvalidated);
		}
		const liveAsset = new ShaderSource(shaderCode);
		return {liveAsset};
	}

	destroyLiveAssetData(liveAsset) {
		super.destroyLiveAssetData(liveAsset);
		if (this.boundOnShaderInvalidated) {
			this.editorInstance.webGpuShaderBuilder.removeShaderInvalidated(this.boundOnShaderInvalidated);
			this.boundOnShaderInvalidated = null;
		}
	}

	onShaderInvalidated(uuid) {
		if (this.includedUuids.includes(uuid)) {
			this.liveAssetNeedsReplacement();
		}
	}

	async *getReferencedAssetUuids() {
		const source = await this.projectAsset.readAssetData();
		const {includedUuids} = await this.editorInstance.webGpuShaderBuilder.buildShader(source);
		for (const uuid of includedUuids) {
			yield uuid;
		}
	}
}
