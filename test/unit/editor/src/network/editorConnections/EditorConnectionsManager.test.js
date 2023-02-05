import {Importer} from "fake-imports";
import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";
import {assertEquals} from "std/testing/asserts.ts";

const importer = new Importer(import.meta.url);
importer.makeReal("../../../../../../src/mod.js");
importer.makeReal("../../../../../../editor/src/editorInstance.js");
importer.fakeModule("../../../../../../src/inspector/InternalDiscoveryManager.js", `
export class InternalDiscoveryManager {
	constructor(...args) {
		this.constructorArgs = args;
	}
	onConnectionCreated(cb) {}
	onAvailableClientUpdated(cb) {}
	registerClient() {}
	sendProjectMetaData() {}
	destructor() {}
}
`);

/** @type {import("../../../../../../editor/src/network/editorConnections/EditorConnectionsManager.js")} */
const EditorConnectionsManagerMod = await importer.import("../../../../../../editor/src/network/editorConnections/EditorConnectionsManager.js");
const {EditorConnectionsManager} = EditorConnectionsManagerMod;

/**
 * @typedef EditorConnectionsManagerTestContext
 * @property {import("../../../../../../editor/src/network/editorConnections/EditorConnectionsManager.js").EditorConnectionsManager} manager
 */

/**
 * @param {object} options
 * @param {(ctx: EditorConnectionsManagerTestContext) => void} options.fn
 */
function basicTest({fn}) {
	const oldLocation = window.location;
	try {
		window.location = /** @type {Location} */ ({
			href: "https://renda.studio/",
		});

		const manager = new EditorConnectionsManager();

		fn({manager});
	} finally {
		window.location = oldLocation;
	}
}

Deno.test({
	name: "Creates InternalDiscoveryManager with the correct url",
	fn() {
		basicTest({
			fn({manager}) {
				const castManager = /** @type {{constructorArgs: ConstructorParameters<typeof import("../../../../../../src/inspector/InternalDiscoveryManager.js").InternalDiscoveryManager>}} */ (/** @type {unknown} */ (manager.internalDiscovery));
				assertEquals(castManager.constructorArgs, [
					{
						fallbackDiscoveryUrl: "https://renda.studio/internalDiscovery.html",
					},
				]);
			},
		});
	},
});

Deno.test({
	name: "Internal connections metadata is updated",
	fn() {
		basicTest({
			fn({manager}) {
				const sendSpy = spy(manager.internalDiscovery, "sendProjectMetaData");
				let spyCallCount = 0;

				// no metadata gets sent when it hasn't been set yet
				manager.setAllowInternalIncoming(true);
				assertSpyCalls(sendSpy, spyCallCount);

				// Send the first metadata
				manager.setProjectMetaData({
					uuid: "uuid",
					name: "name",
					fileSystemHasWritePermissions: false,
				});
				assertSpyCalls(sendSpy, ++spyCallCount);
				assertSpyCall(sendSpy, spyCallCount - 1, {
					args: [
						{
							uuid: "uuid",
							name: "name",
							fileSystemHasWritePermissions: false,
						},
					],
				});

				// Disabling incoming connections sets metadata to null
				manager.setAllowInternalIncoming(false);
				assertSpyCalls(sendSpy, ++spyCallCount);
				assertSpyCall(sendSpy, spyCallCount - 1, {
					args: [null],
				});
				manager.setAllowInternalIncoming(true);
				assertSpyCalls(sendSpy, ++spyCallCount);
				assertSpyCall(sendSpy, spyCallCount - 1, {
					args: [
						{
							uuid: "uuid",
							name: "name",
							fileSystemHasWritePermissions: false,
						},
					],
				});

				// Not changing metadata doesn't send an unnecessary update
				manager.setProjectMetaData({
					uuid: "uuid",
					name: "name",
					fileSystemHasWritePermissions: false,
				});
				assertSpyCalls(sendSpy, spyCallCount);
			},
		});
	},
});
