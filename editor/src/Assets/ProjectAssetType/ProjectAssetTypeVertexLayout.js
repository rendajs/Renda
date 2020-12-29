import ProjectAssetType from "./ProjectAssetType.js";
import editor from "../../editorInstance.js";
import {ShaderSource, WebGpuVertexLayout} from "../../../../src/index.js";

export default class ProjectAssetTypeVertexLayout extends ProjectAssetType{

	static type = "JJ:vertexLayout";
	static typeUuid = "07dcd52e-03a5-4823-b343-16a142c304f6";
	static newFileName = "New Vertex Layout";

	constructor(){
		super(...arguments);
	}

	static createNewFile(){
		return {};
	}

	static propertiesAssetContentStructure = {
		indexFormat: {
			type: ["none", "16-bit", "32-bit"],
		},
		vertexBuffers: {
			type: Array,
			arrayOpts: {
				type: {
					arrayStride: {
						guiOpts: {
							min: 0,
							step: 1,
						},
					},
					stepMode: {
						type: ["vertex", "instance"],
					},
					attributes: {
						type: Array,
						arrayOpts: {
							type: {
								format: {
									type: ["int8", "int16", "int32", "float16", "float32"],
								},
								components: {
									guiOpts: {
										min: 1,
										step: 1,
										max: 4,
									},
								},
								unsigned: {
									type: Boolean,
								},
								normalized: {
									type: Boolean,
								},
								shaderLocation: {
									guiOpts: {
										min: 0,
										step: 1,
									},
								},
							},
						},
					},
				},
			},
		},
	};

	static expectedLiveAssetConstructor = WebGpuVertexLayout;

	async getLiveAsset(fileData){
		const descriptor = {};
		if(fileData.indexFormat){
			if(fileData.indexFormat == "16-bit"){
				descriptor.indexFormat = "uint16";
			}else if(fileData.indexFormat == "32-bit"){
				descriptor.indexFormat = "uint32";
			}
		}
		if(fileData.vertexBuffers){
			descriptor.vertexBuffers = [];
			for(const bufferFromFile of fileData.vertexBuffers){
				const buffer = {};
				descriptor.vertexBuffers.push(buffer);
				buffer.arrayStride = bufferFromFile.arrayStride;
				if(bufferFromFile.stepMode) buffer.stepMode = bufferFromFile.stepMode;
				buffer.attributes = [];
				if(bufferFromFile.attributes){
					for(const attributeFromFile of bufferFromFile.attributes){
						const attribute = {};
						buffer.attributes.push(attribute);
						attribute.offset = attributeFromFile.offset || 0;
						attribute.shaderLocation = attributeFromFile.shaderLocation || 0;
						let format = "";
						if(attributeFromFile.unsigned) format += "u";
						switch(attributeFromFile.format){
							case "int8":
								format += "char";
								break;
							case "int16":
								format += "short";
								break;
							case "int32":
								format += "int";
								break;
							case "float16":
							default:
								format += "half";
								break;
							case "float32":
								format += "float";
								break;
						}
						if(attributeFromFile.components) format += attributeFromFile.components;
						if(attributeFromFile.normalized) format += "norm";
						attribute.format = format;
					}
				}
			}
		}
		return new WebGpuVertexLayout(descriptor);
	}

	async fileChangedExternally(){
		this.liveAssetNeedsReplacement();
	}
}
