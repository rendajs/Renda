#!/usr/bin/env -S deno run --unstable --no-check --allow-net --allow-read --allow-write --allow-run

import {Application} from "./Application.js";

const app = new Application({
	port: 8081,
});
app.init();
