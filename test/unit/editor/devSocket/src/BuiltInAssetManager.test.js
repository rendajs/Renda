import {assert, assertEquals, assertExists} from "asserts";
import {BuiltInAssetManager} from "../../../../../editor/devSocket/src/BuiltInAssetManager.js";
import {waitForMicrotasks} from "../../../shared/waitForMicroTasks.js";

const originalDenoWatchFs = Deno.watchFs;
const originalDenoStat = Deno.stat;
const orignalDenoReadFile = Deno.readFile;
const originalDenoReadTextFile = Deno.readTextFile;
const originalDenoWriteFile = Deno.writeFile;
const originalDenoWriteTextFile = Deno.writeTextFile;
const originalDenoReadDir = Deno.readDir;

/**
 * @param {Object} options
 * @param {(path: string | URL) => Deno.FileInfo} [options.statCb]
 * @param {(path: string | URL, options?: Deno.ReadFileOptions) => Uint8Array} [options.readFileCb]
 * @param {(path: string | URL, options?: Deno.ReadFileOptions) => string} [options.readTextFileCb]
 * @param {(path: string | URL, data: Uint8Array, options?: Deno.WriteFileOptions) => void} [options.writeFileCb]
 * @param {(path: string | URL, data: string, options?: Deno.WriteFileOptions) => void} [options.writeTextFileCb]
 * @param {(path: string | URL) => Deno.DirEntry[]} [options.readDirCb]
 */
function installMockDenoCalls({
	statCb,
	readFileCb,
	readTextFileCb,
	writeFileCb,
	writeTextFileCb,
	readDirCb,
} = {}) {
	/** @type {((event: Deno.FsEvent | undefined, done: boolean) => void)?} */
	let currentlyWaitingNextCallback = null;
	Deno.watchFs = function(path) {
		return {
			async next() {
				const event = await new Promise(r => {
					currentlyWaitingNextCallback = r;
				});
				return {
					value: event,
					done: false,
				};
			},
			rid: 0,
			close() {
				if (currentlyWaitingNextCallback) {
					currentlyWaitingNextCallback(undefined, true);
				}
			},
			[Symbol.asyncIterator]() {
				return /** @type {any} */ (this);
			},
		};
	};

	Deno.stat = async function(path) {
		if (!statCb) {
			throw new Error("Deno.stat has not been mocked");
		}
		return statCb(path);
	};

	Deno.readFile = async function(path, options) {
		if (!readFileCb) {
			throw new Error("Deno.readFile has not been mocked");
		}
		return readFileCb(path, options);
	};

	Deno.readTextFile = async function(path, options) {
		if (!readTextFileCb) {
			throw new Error("Deno.readTextFile has not been mocked");
		}
		return readTextFileCb(path, options);
	};

	Deno.writeFile = async function(path, data, options) {
		if (!writeFileCb) {
			throw new Error("Deno.writeFile has not been mocked");
		}
		return writeFileCb(path, data, options);
	};

	Deno.writeTextFile = async function(path, data, options) {
		if (!writeTextFileCb) {
			throw new Error("Deno.writeTextFile has not been mocked");
		}
		return writeTextFileCb(path, data, options);
	};

	Deno.readDir = async function *(path) {
		if (!readDirCb) {
			throw new Error("Deno.readDir has not been mocked");
		}
		for (const file of readDirCb(path)) {
			yield file;
		}
	};

	return {
		/**
		 * @param {Deno.FsEvent} event
		 */
		triggerWatchEvent(event) {
			if (currentlyWaitingNextCallback) {
				currentlyWaitingNextCallback(event, false);
			}
		},
	};
}

function uninstallMockDenoCalls() {
	Deno.watchFs = originalDenoWatchFs;
	Deno.stat = originalDenoStat;
	Deno.readFile = orignalDenoReadFile;
	Deno.readTextFile = originalDenoReadTextFile;
	Deno.writeFile = originalDenoWriteFile;
	Deno.writeTextFile = originalDenoWriteTextFile;
	Deno.readDir = originalDenoReadDir;
}

async function basicSetup() {
	/** @type {Map<string, Uint8Array | string>} */
	const files = new Map();
	files.set("/assets/assetSettings.json", JSON.stringify({assets: []}));
	/** @type {{path: string, text: string}[]} */
	const writeTextFileCalls = [];
	const {triggerWatchEvent} = installMockDenoCalls({
		statCb(path) {
			if (path instanceof URL) {
				path = path.href;
			}
			if (files.has(path)) {
				return /** @type {Deno.FileInfo} */ ({
					isDirectory: false,
				});
			}
			let dirPath = path;
			if (!dirPath.endsWith("/")) {
				dirPath += "/";
			}
			for (const filePath of files.keys()) {
				if (filePath.startsWith(dirPath)) {
					return /** @type {Deno.FileInfo} */ ({
						isDirectory: true,
					});
				}
			}

			throw new Error(`File ${path} not found`);
		},
		readFileCb(path) {
			if (path instanceof URL) {
				path = path.href;
			}
			const file = files.get(path);
			if (typeof file == "string") {
				throw new Error(`File ${path} is a text file.`);
			} else if (file instanceof Uint8Array) {
				return file;
			} else {
				throw new Error(`File ${path} not found`);
			}
		},
		readTextFileCb(path) {
			if (path instanceof URL) {
				path = path.href;
			}
			const file = files.get(path);
			if (typeof file == "string") {
				return file;
			} else if (file instanceof Uint8Array) {
				throw new Error(`File ${path} is not a string`);
			} else {
				throw new Error(`File ${path} not found`);
			}
		},
		writeTextFileCb(path, text) {
			if (path instanceof URL) {
				path = path.href;
			}
			writeTextFileCalls.push({path, text});
		},
	});

	const manager = new BuiltInAssetManager({
		builtInAssetsPath: "/assets",
	});
	await manager.loadAssetSettings();
	manager.watch();

	return {
		uninstall() {
			uninstallMockDenoCalls();
		},
		triggerWatchEvent,
		files,
		writeTextFileCalls,
	};
}

Deno.test({
	name: "It has the correct asset paths when invoked with builtInAssetsPath set to null",
	fn() {
		const manager = new BuiltInAssetManager({
			builtInAssetsPath: null,
		});

		assert(manager.builtInAssetsPath.endsWith("editor/builtInAssets"));
		assert(manager.assetSettingsPath.endsWith("editor/builtInAssets/assetSettings.json"));
	},
});

Deno.test({
	name: "It has the correct asset paths when invoked with builtInAssetsPath set to a string",
	fn() {
		const manager = new BuiltInAssetManager({
			builtInAssetsPath: "/some/path",
		});

		assertEquals(manager.builtInAssetsPath, "/some/path");
		assertEquals(manager.assetSettingsPath, "/some/path/assetSettings.json");
	},
});

Deno.test({
	name: "Reloads asset settings when watching and assetSettings file changes",
	async fn() {
		const {triggerWatchEvent} = installMockDenoCalls();

		const manager = new BuiltInAssetManager({
			builtInAssetsPath: "/assests",
		});
		let loadAssetSettingsCallCount = 0;
		manager.loadAssetSettings = async () => {
			loadAssetSettingsCallCount++;
		};

		manager.watch();

		triggerWatchEvent({
			kind: "modify",
			paths: ["/assests/assetSettings.json"],
		});

		await waitForMicrotasks();

		assertEquals(loadAssetSettingsCallCount, 1);

		uninstallMockDenoCalls();
	},
});

Deno.test({
	name: "loadAssetSettings()",
	async fn() {
		installMockDenoCalls({
			readTextFileCb() {
				return `{
					"assets": {
						"aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee": {
							"path": ["path","to","file.dat"]
						}
					}
				}`;
			},
			readFileCb() {
				return new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
			},
		});

		const manager = new BuiltInAssetManager({
			builtInAssetsPath: "/assets",
		});
		await manager.loadAssetSettings();

		assertEquals(Array.from(manager.assetSettings), [
			[
				"aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
				{
					path: ["path", "to", "file.dat"],
				},
			],
		]);
		assertEquals(Array.from(manager.fileHashes), [
			[
				"1f825aa2f0020ef7cf91dfa30da4668d791c5d4824fc8e41354b89ec05795ab3",
				"aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
			],
		]);

		uninstallMockDenoCalls();
	},
});

Deno.test({
	name: "a created file is added to assetSettings.json",
	async fn() {
		const {uninstall, triggerWatchEvent, files, writeTextFileCalls} = await basicSetup();

		files.set("/assets/newFile.dat", new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
		triggerWatchEvent({
			kind: "create",
			paths: ["/assets/newFile.dat"],
		});

		await waitForMicrotasks();

		assertEquals(writeTextFileCalls.length, 1);
		assertEquals(writeTextFileCalls[0].path, "/assets/assetSettings.json");
		const assetSettings = JSON.parse(writeTextFileCalls[0].text);
		assertExists(assetSettings.assets);
		assertEquals(Object.entries(assetSettings.assets).length, 1);
		assertEquals(Object.values(assetSettings.assets)[0], {path: ["newFile.dat"]});

		uninstall();
	},
});
