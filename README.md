<p align="center">
	<a href="https://rendajs.org/"><img src="https://rendajs.org/static/renda-circle.svg" width="100" /></a>
</p>

<h1 align="center">Renda</h1>

Renda is a modern rendering engine built with the web in mind. You can use it to
create games, interactive experiences, or anything that requires 3d graphics. It
is lightweight, has zero dependencies, and its download size scales with how
many features you use.
alsjkdf

Renda comes with an online editor called [Renda Studio](https://renda.studio)
where you can easily build your scenes and adjust parameters to your liking.

For more information, visit [rendajs.org](https://rendajs.org/).

## Usage

It is recommended to start out with the editor over at https://renda.studio.
Check out the
[getting started guide](https://rendajs.org/manual/getting-started) for more
info.

But if you prefer to use Renda as a library, without using Renda Studio, you can
import it using the jsDelivr cdn:

```js
<script type="module">
	import {Vec3} from "https://cdn.jsdelivr.net/npm/renda@latest/dist/renda.js";

	console.log(new Vec3(1,2,3).magnitude);
</script>;
```

Or if you have a build step, you can also use the official
[npm package](https://npmjs.com/package/renda):

```
npm i renda
```

And finally, Renda is also available on
[deno.land/x](https://deno.land/x/renda).

If you wish to use Renda as library, you can find a
[getting started guide here](https://www.npmjs.com/package/renda).
