export default class Material{
	constructor(shader){
		this.shader = shader;
	}

	compileShader(gl){
		this.shader.compile(gl);
	}
}
