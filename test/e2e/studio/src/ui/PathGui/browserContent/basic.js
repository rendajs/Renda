import { injectMockStudioInstance } from "../../../../../../../studio/src/studioInstance.js";
import { PathGui } from "../../../../../../../studio/src/ui/PathGui.js";

const mockStudio = /** @type {import("../../../../../../../studio/src/Studio.js").Studio} */ ({
	colorizerFilterManager: {
		applyFilter(el, color) {},
	},
});
injectMockStudioInstance(mockStudio);

const gui = new PathGui();
document.body.appendChild(gui.el);

// Cast in order to prevent TypeScript from thinking this is available from every script:
/** @type {any} */
const g = globalThis;
g.gui = gui;
