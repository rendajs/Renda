import ProjectAssetType from "./ProjectAssetType.js";
import editor from "../../editorInstance.js";
import {ShaderSource, WebGpuVertexState, Mesh} from "../../../../src/index.js";

export default class ProjectAssetTypeVertexState extends ProjectAssetType{

	static type = "JJ:vertexState";
	static typeUuid = "07dcd52e-03a5-4823-b343-16a142c304f6";
	static newFileName = "New Vertex State";

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
								attributeType: {
									type: Array.from(Object.keys(Mesh.AttributeTypes)),
								},
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

	static expectedLiveAssetConstructor = WebGpuVertexState;

	async getLiveAssetData(fileData){
		const descriptor = {};
		const attributeTypeMap = [];
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

				const bufferAttributeTypeMap = [];
				attributeTypeMap.push(bufferAttributeTypeMap);

				buffer.arrayStride = bufferFromFile.arrayStride;
				if(bufferFromFile.stepMode) buffer.stepMode = bufferFromFile.stepMode;
				buffer.attributes = [];
				if(bufferFromFile.attributes){
					for(const attributeFromFile of bufferFromFile.attributes){
						const attribute = {};
						buffer.attributes.push(attribute);
						const attributeType = Mesh.AttributeTypes[attributeFromFile.attributeType] || attributeFromFile.attributeType;
						bufferAttributeTypeMap.push(attributeType);
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
		const liveAsset = new WebGpuVertexState(descriptor, attributeTypeMap);
		return {liveAsset};
	}

	async fileChangedExternally(){
		this.liveAssetNeedsReplacement();
	}
}
