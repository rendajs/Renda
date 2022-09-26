import {spy} from "std/testing/mock.ts";

/**
 * @param {import("../../../../../../editor/src/util/fileSystems/EditorFileSystem.js").EditorFileSystem} fs
 */
export function registerOnChangeSpy(fs) {
	/** @type {import("../../../../../../editor/src/util/fileSystems/EditorFileSystem.js").FileSystemChangeCallback} */
	const cb = () => {};
	const onChangeSpy = spy(cb);
	fs.onChange(onChangeSpy);
	return onChangeSpy;
}
