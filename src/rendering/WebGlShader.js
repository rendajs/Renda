export class WebGlShader {
	/**
	 * @param {import("./renderers/WebGlRenderer.js").WebGlRenderer} renderer
	 * @param {string} vertSource
	 * @param {string} fragSource
	 */
	constructor(renderer, vertSource, fragSource) {
		this.renderer = renderer;
		if (!renderer.gl) {
			throw new Error("Assertion failed: no WebGL context");
		}
		this.gl = renderer.gl;
		this.vertSource = vertSource;
		this.fragSource = fragSource;

		this.destructed = false;
		this.program = null;
		this.vertShader = null;
		this.fragShader = null;
	}

	destructor() {
		if (this.destructed) return;
		this.destructed = true;
		if (this.program) this.gl.deleteProgram(this.program);
		if (this.vertShader) this.gl.deleteShader(this.vertShader);
		if (this.fragShader) this.gl.deleteShader(this.fragShader);
		this.renderer.disposeShader(this);
	}

	compile() {
		if (this.program) {
			// todo, delete previous program
		}
		this.vertShader = this.loadShader(this.gl, this.gl.VERTEX_SHADER, this.vertSource);
		if (!this.vertShader) return false;
		this.fragShader = this.loadShader(this.gl, this.gl.FRAGMENT_SHADER, this.fragSource);
		if (!this.fragShader) {
			this.gl.deleteShader(this.vertShader);
			return false;
		}

		this.program = this.gl.createProgram();
		if (!this.program) {
			throw new Error("Failed to create WebGL program");
		}
		this.gl.attachShader(this.program, this.vertShader);
		this.gl.attachShader(this.program, this.fragShader);
		this.gl.linkProgram(this.program);

		if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
			this.gl.deleteProgram(this.program);
			this.program = null;
			this.gl.deleteShader(this.vertShader);
			this.gl.deleteShader(this.fragShader);
			return false;
		}

		return true;
	}

	/**
	 * @param {WebGLRenderingContext} gl
	 * @param {number} type
	 * @param {string} source
	 */
	loadShader(gl, type, source) {
		const shader = gl.createShader(type);
		if (!shader) {
			throw new Error("Failed to create WebGL shader");
		}
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			gl.deleteShader(shader);
			return null;
		}
		return shader;
	}

	use() {
		this.gl.useProgram(this.program);
	}

	/**
	 * @param {string} name
	 */
	getAttribLocation(name) {
		// todo: cache these values
		if (!this.program) return null;
		return this.gl.getAttribLocation(this.program, name);
	}

	/**
	 * @param {string} name
	 */
	getUniformLocation(name) {
		// todo: cache these values
		if (!this.program) return null;
		return this.gl.getUniformLocation(this.program, name);
	}
}
