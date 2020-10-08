import MaterialMapType from "./MaterialMapType.js";
import {Shader, Vec3} from "../../../src/index.js";

export default class MaterialMapTypeWebGlRenderer extends MaterialMapType{

	static uiName = "WebGL Renderer";
	static typeUuid = "392a2a4e-c895-4245-9c6d-d6259b8e5267";

	constructor(treeView){
		super(treeView);

		this.guiStructure = {
			vertexShader: {
				type: Shader,
			},
			fragmentShader: {
				type: Shader,
			},
		};

		this.shadersTreeView = this.treeView.addCollapsable("Shaders");
		this.shadersTreeView.generateFromSerializableStructure(this.guiStructure);

		this.mapListTreeView = this.generateMapListUi({
			items: [
				{name: "idk", type: Number},
				{name: "v3", type: Vec3},
			],
		});
		this.treeView.addChild(this.mapListTreeView);
	}
}
