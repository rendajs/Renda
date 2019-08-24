export default class Shader{
	constructor(vertSource, fragSource){
		this.vertSource = vertSource;
		this.fragSource = fragSource;

		this.program = null;
		this.gl = null;
	}

	compile(gl){
		const vertShader = this.loadShader(gl, gl.VERTEX_SHADER, this.vertSource);
		if(!vertShader) return false;
		const fragShader = this.loadShader(gl, gl.FRAGMENT_SHADER, this.fragSource);
		if(!fragShader){
			gl.deleteShader(vertShader);
			return false;
		}

		this.program = gl.createProgram();
		gl.attachShader(this.program, vertShader);
		gl.attachShader(this.program, fragShader);
		gl.linkProgram(this.program);

		if(!gl.getProgramParameter(this.program, gl.LINK_STATUS)){
			gl.deleteProgram(this.program);
			this.program = null;
			gl.deleteShader(vertShader);
			gl.deleteShader(fragShader);
			return false;
		}

		//todo delete shaders?
		this.gl = gl;

		return true;
	}

	loadShader(gl, type, source){
		const shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
			gl.deleteShader(shader);
		}
		return shader;
	}

	use(){
		this.gl.useProgram(this.program);
	}

	getAttribLocation(name){
		//todo: cache these values
		if(!this.program) return null;
		return this.gl.getAttribLocation(this.program, name);
	}

	getUniformLocation(name){
		//todo: cache these values
		if(!this.program) return null;
		return this.gl.getUniformLocation(this.program, name);
	}

	uniformMatrix4fv(name, matrix){
		this.use();
		this.gl.uniformMatrix4fv(this.getUniformLocation(name), false, matrix.glValue);
	}
}
