import {Importer} from "fake-imports";
import {assertSpyCall, assertSpyCalls, spy, stub} from "std/testing/mock.ts";
import {assertEquals} from "std/testing/asserts.ts";

const importer = new Importer(import.meta.url);
importer.makeReal("../../../../../../src/mod.js");
importer.makeReal("../../../../../../studio/src/studioInstance.js");
importer.redirectModule("../../../../../../src/inspector/InternalDiscoveryManager.js", "./MockInternalDiscoveryManager.js");

/** @type {import("../../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js")} */
const StudioConnectionsManagerMod = await importer.import("../../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js");
const {StudioConnectionsManager} = StudioConnectionsManagerMod;

/**
 * @typedef StudioConnectionsManagerTestContext
 * @property {import("../../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js").StudioConnectionsManager} manager
 * @property {import("./MockInternalDiscoveryManager.js").MockInternalDiscoveryManager} internalDiscovery
 */

const OTHER_CLIENT_ID = "other_client_id";

/**
 * @param {object} options
 * @param {(ctx: StudioConnectionsManagerTestContext) => void} options.fn
 * @param {boolean} [options.addInspectorClient] When true, fires the availableClientUpdate event once with an inspector event.
 */
function basicTest({
	fn,
	addInspectorClient = false,
}) {
	let randomUuid = 0;
	const mockUuid = stub(crypto, "randomUUID", () => {
		randomUuid++;
		return "random_uuid_" + randomUuid;
	});
	const oldLocation = window.location;
	try {
		window.location = /** @type {Location} */ ({
			href: "https://renda.studio/",
		});

		const manager = new StudioConnectionsManager();
		const internalDiscovery = /** @type {import("./MockInternalDiscoveryManager.js").MockInternalDiscoveryManager} */ (/** @type {unknown} */ (manager.internalDiscovery));

		if (addInspectorClient) {
			internalDiscovery.fireOnAvailableClientUpdated({
				clientId: OTHER_CLIENT_ID,
				clientType: "inspector",
			});
		}

		fn({manager, internalDiscovery});
	} finally {
		window.location = oldLocation;
		mockUuid.restore();
	}
}

Deno.test({
	name: "Creates InternalDiscoveryManager with the correct url",
	fn() {
		basicTest({
			fn({internalDiscovery}) {
				assertEquals(internalDiscovery.constructorArgs, [
					{
						fallbackDiscoveryUrl: "https://renda.studio/internalDiscovery",
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

/**
 * Creates a fake MessagePort on which it can be asserted that `close()` has been called.
 */
function createSpyMessagePort() {
	let closeCalled = false;
	let startCalled = false;
	const messagePort = /** @type {MessagePort} */ ({
		close() {
			closeCalled = true;
		},
		start() {
			startCalled = true;
		},
		/** @param {Parameters<MessagePort["addEventListener"]>} args */
		addEventListener(...args) {},
	});

	return {
		messagePort,
		/**
		 * @param {boolean} expectClosed
		 */
		assertCloseCalled(expectClosed) {
			if (expectClosed) {
				assertEquals(closeCalled, true, "Expected MessagePort.close() to be called");
			} else {
				assertEquals(closeCalled, false, "Expected MessagePort.close() not to be called.");
				assertEquals(startCalled, true, "Expected MessagePort.start() to be called");
			}
		},
	};
}

Deno.test({
	name: "Internal connections are ignored when allowInternalIncoming is false",
	fn() {
		basicTest({
			addInspectorClient: true,
			fn({internalDiscovery}) {
				const {messagePort, assertCloseCalled} = createSpyMessagePort();
				internalDiscovery.fireConnectionCreated(OTHER_CLIENT_ID, messagePort, {});
				assertCloseCalled(true);
			},
		});
	},
});

Deno.test({
	name: "Internal connections are allowed when allowInternalIncoming is true",
	fn() {
		basicTest({
			addInspectorClient: true,
			fn({manager, internalDiscovery}) {
				manager.setAllowInternalIncoming(true);
				const {messagePort, assertCloseCalled} = createSpyMessagePort();
				internalDiscovery.fireConnectionCreated(OTHER_CLIENT_ID, messagePort, {});
				assertCloseCalled(false);
			},
		});
	},
});

Deno.test({
	name: "Internal connections are allowed when a valid token is passed",
	fn() {
		basicTest({
			addInspectorClient: true,
			fn({manager, internalDiscovery}) {
				const {messagePort, assertCloseCalled} = createSpyMessagePort();
				const token = manager.createInternalConnectionToken();
				internalDiscovery.fireConnectionCreated(OTHER_CLIENT_ID, messagePort, {token});
				assertCloseCalled(false);
			},
		});
	},
});

Deno.test({
	name: "Internal connections are no longer allowed when a token is deleted",
	fn() {
		basicTest({
			addInspectorClient: true,
			fn({manager, internalDiscovery}) {
				const {messagePort, assertCloseCalled} = createSpyMessagePort();
				const token = manager.createInternalConnectionToken();
				manager.deleteConnectionToken(token);
				internalDiscovery.fireConnectionCreated(OTHER_CLIENT_ID, messagePort, {token});
				assertCloseCalled(true);
			},
		});
	},
});
