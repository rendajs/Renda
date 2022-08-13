import {ProjectAssetType} from "./ProjectAssetType.js";
import {ShaderSource} from "../../../../src/mod.js";

/**
 * @extends {ProjectAssetType<ShaderSource, null, string>}
 */
export class ProjectAssetTypeShaderSource extends ProjectAssetType {
	static type = "renda:shaderSource";
	static typeUuid = "e7253ad6-8459-431f-ac16-609150538a24";
	static newFileName = "New Shader";
	static newFileExtension = "shader";
	static storeInProjectAsJson = false;
	static storeInProjectAsText = true;
	static matchExtensions = ["glsl", "wgsl"];

	/**
	 * @param {import("./ProjectAssetType.js").ProjectAssetTypeConstructorParametersAny} args
	 */
	constructor(...args) {
		super(...args);

		/** @type {import("../../../../src/mod.js").UuidString[]} */
		this.includedUuids = [];
		this.boundOnShaderInvalidated = null;
	}

	static expectedLiveAssetConstructor = ShaderSource;

	/** @type {import("../../tasks/task/TaskGenerateServices.js").AssetLoaderTypeImportConfig} */
	static assetLoaderTypeImportConfig = {
		identifier: "AssetLoaderTypeClusteredLightsConfig",
		instanceIdentifier: "shaderLoader",
		extra(ctx) {
			ctx.addImport("ShaderBuilder", "renda");
			return `const shaderBuilder = new ShaderBuilder();
shaderLoader.setBuilder(shaderBuilder);`;
		},
	};

	/**
	 * @override
	 * @param {string} source
	 * @returns {Promise<import("./ProjectAssetType.js").LiveAssetData<ShaderSource, null>>}
	 */
	async getLiveAssetData(source) {
		const {shaderCode, includedUuids} = await this.editorInstance.webGpuShaderBuilder.buildShader(source);
		this.includedUuids = includedUuids;
		if (!this.boundOnShaderInvalidated) {
			this.boundOnShaderInvalidated = this.onShaderInvalidated.bind(this);
			this.editorInstance.webGpuShaderBuilder.onShaderInvalidated(this.boundOnShaderInvalidated);
		}
		const liveAsset = new ShaderSource(shaderCode);
		return {liveAsset, editorData: null};
	}

	/**
	 * @override
	 * @param {ShaderSource} liveAsset
	 */
	destroyLiveAssetData(liveAsset) {
		super.destroyLiveAssetData(liveAsset);
		if (this.boundOnShaderInvalidated) {
			this.editorInstance.webGpuShaderBuilder.removeShaderInvalidated(this.boundOnShaderInvalidated);
			this.boundOnShaderInvalidated = null;
		}
	}

	/**
	 * @param {import("../../../../src/mod.js").UuidString} uuid
	 */
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
