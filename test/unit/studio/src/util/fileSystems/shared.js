import { spy } from "std/testing/mock.ts";

/**
 * @param {import("../../../../../../studio/src/util/fileSystems/StudioFileSystem.js").StudioFileSystem} fs
 */
export function registerOnChangeSpy(fs) {
	/** @type {import("../../../../../../studio/src/util/fileSystems/StudioFileSystem.js").FileSystemChangeCallback} */
	const cb = () => {};
	const onChangeSpy = spy(cb);
	fs.onChange(onChangeSpy);
	return onChangeSpy;
}
