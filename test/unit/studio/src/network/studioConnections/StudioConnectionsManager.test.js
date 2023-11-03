import {Importer} from "fake-imports";
import {stub} from "std/testing/mock.ts";
import {createPreferencesManager} from "../../../shared/createPreferencesManager.js";

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
 */

// const OTHER_CLIENT_ID = "other_client_id";

/**
 * @param {object} options
 * @param {(ctx: StudioConnectionsManagerTestContext) => void} options.fn
 */
function basicTest({
	fn,
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

		const mockProjectManager = /** @type {import("../../../../../../studio/src/projectSelector/ProjectManager.js").ProjectManager} */ ({
			onProjectOpen(cb) {},
			onRootHasWritePermissionsChange(cb) {},
			onProjectOpenEntryChange(cb) {},
		});
		const {preferencesManager} = createPreferencesManager({
			"studioConnections.enableRemoteDiscovery": {
				type: "boolean",
			},
			"studioConnections.enableInternalDiscovery": {
				type: "boolean",
			},
		});

		const manager = new StudioConnectionsManager(mockProjectManager, preferencesManager);

		fn({manager});
	} finally {
		window.location = oldLocation;
		mockUuid.restore();
	}
}

Deno.test({
	name: "creates a discovery manager",
	fn() {
		basicTest({
			fn({manager}) {

			},
		});
	},
});
