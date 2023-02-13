import {assertEquals} from "std/testing/asserts.ts";
import {handleDuplicateFileName} from "../../../../../studio/src/util/util.js";

Deno.test("No existing", () => {
	const result = handleDuplicateFileName([], "existingFile", ".txt");

	assertEquals(result, "existingFile.txt");
});

Deno.test("One existing", () => {
	const existingFiles = ["existingFile.txt"];

	const result = handleDuplicateFileName(existingFiles, "existingFile", ".txt");

	assertEquals(result, "existingFile 1.txt");
});

Deno.test("Multiple existing", () => {
	const existingFiles = [
		"existingFile.txt",
		"existingFile 1.txt",
		"existingFile 2.txt",
		// 3 is missing
		"existingFile 4.txt",
	];

	const result = handleDuplicateFileName(existingFiles, "existingFile", ".txt");

	assertEquals(result, "existingFile 3.txt");
});

Deno.test("Custom numberPrefix", () => {
	const existingFiles = ["existingFile.txt"];
	const numberPrefix = "-";

	const result = handleDuplicateFileName(existingFiles, "existingFile", ".txt", numberPrefix);

	assertEquals(result, "existingFile-1.txt");
});

Deno.test("Using EditorFileSystemReadDirResult", () => {
	/** @type {import("../../../../../studio/src/util/fileSystems/EditorFileSystem.js").EditorFileSystemReadDirResult} */
	const readDirResult = {
		directories: [],
		files: ["existingFile.txt"],
	};

	const result = handleDuplicateFileName(readDirResult, "existingFile", ".txt");

	assertEquals(result, "existingFile 1.txt");
});
