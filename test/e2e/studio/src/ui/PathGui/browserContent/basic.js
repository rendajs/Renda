import { PathGui } from "../../../../../../../studio/src/ui/PathGui.js";

const gui = new PathGui();
document.body.appendChild(gui.el);

// Cast in order to prevent TypeScript from thinking this is available from every script:
/** @type {any} */
const g = globalThis;
g.gui = gui;
