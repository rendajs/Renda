export class GPUBuffer {
	#label;
	constructor({label = ""}) {
		this.#label = label;
	}

	get label() {
		return this.#label;
	}
}
