import {spy} from "std/testing/mock.ts";

/**
 * @param {import("../../../../../../studio/src/util/fileSystems/EditorFileSystem.js").EditorFileSystem} fs
 */
export function registerOnChangeSpy(fs) {
	/** @type {import("../../../../../../studio/src/util/fileSystems/EditorFileSystem.js").FileSystemChangeCallback} */
	const cb = () => {};
	const onChangeSpy = spy(cb);
	fs.onChange(onChangeSpy);
	return onChangeSpy;
}
