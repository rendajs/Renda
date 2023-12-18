import {runE2eTest} from "../../../shared/runE2eTest.js";
import {loadE2eProject, openRemoteProject, waitForProjectOpen} from "../../shared/project.js";
import {getPage} from "../../../shared/browser.js";
import {waitForStudioLoad} from "../../shared/studio.js";
import {acceptFirstIncomingConnection, clickSingleAvailableConnectButton} from "../../shared/contentWindows/connections.js";
import {openContentWindow} from "../../shared/windowManagement.js";
import {waitForAssetExists} from "../../shared/contentWindows/project.js";

await runE2eTest({
	name: "Assets are loaded via the InspectorAssetBundle",
	forceRunCount: 100,
	async fn() {
		const {page: page1, createPage} = await getPage();

		const page2 = await createPage();
		await waitForStudioLoad(page2);

		// The second page is created with the same context (cookies) as the first,
		// so we need to wait with opening the project in the first page until the second page is done loading.
		// Otherwise the same project would get opened on page load.
		await loadE2eProject(page1, "remote-project-with-internal-connection");
		await openContentWindow(page1, "Connections");

		await openRemoteProject(page2);
		const project2OpenPromise = waitForProjectOpen(page2, false);

		await clickSingleAvailableConnectButton(page2);
		await acceptFirstIncomingConnection(page1);

		await project2OpenPromise;
		await waitForAssetExists(page2, true, ["Entity.json"]);
	},
});
