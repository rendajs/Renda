export default class WebGlShader{
	constructor(renderer, vertSource, fragSource){
		this.renderer = renderer;
		this.gl = renderer.gl;
		this.vertSource = vertSource;
		this.fragSource = fragSource;

		this.destructed = false;
		this.program = null;
		this.vertShader = null;
		this.fragShader = null;
	}

	destructor(){
		if(this.destructed) return;
		this.destructed = true;
		if(this.program) this.gl.deleteProgram(this.program);
		if(this.vertShader) this.gl.deleteShader(this.vertShader);
		if(this.fragShader) this.gl.deleteShader(this.fragShader);
		this.renderer.disposeShader(this);
	}

	compile(){
		if(this.program){
			//todo, delete previous program
		}
		this.vertShader = this.loadShader(this.gl, this.gl.VERTEX_SHADER, this.vertSource);
		if(!this.vertShader) return false;
		this.fragShader = this.loadShader(this.gl, this.gl.FRAGMENT_SHADER, this.fragSource);
		if(!this.fragShader){
			this.gl.deleteShader(this.vertShader);
			return false;
		}

		this.program = this.gl.createProgram();
		this.gl.attachShader(this.program, this.vertShader);
		this.gl.attachShader(this.program, this.fragShader);
		this.gl.linkProgram(this.program);

		if(!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)){
			this.gl.deleteProgram(this.program);
			this.program = null;
			this.gl.deleteShader(this.vertShader);
			this.gl.deleteShader(this.fragShader);
			return false;
		}

		return true;
	}

	loadShader(gl, type, source){
		const shader = gl.createShader(type);
		gl.shaderSource(shader, source.source);
		gl.compileShader(shader);
		if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
			gl.deleteShader(shader);
			return null;
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
		this.gl.uniformMatrix4fv(this.getUniformLocation(name), false, matrix.getFlatArray());
	}
}
