export function createSpinner() {
	const el = document.createElement("div");
	el.classList.add("spinner");

	const full = document.createElement("div");
	full.classList.add("full");
	el.append(full);

	const partial = document.createElement("div");
	partial.classList.add("partial");
	el.append(partial);

	return el;
}
