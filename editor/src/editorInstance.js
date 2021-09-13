import Editor from "./Editor.js";

import * as Util from "./Util/Util.js";
window["Util"] = Util;

const editor = new Editor();
export default editor;

editor.init();
