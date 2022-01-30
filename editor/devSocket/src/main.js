#!/usr/bin/env -S deno run --unstable --allow-net --allow-read --allow-write --allow-run --import-map=importmap.json

import {init} from "./mainInstance.js";
init();
