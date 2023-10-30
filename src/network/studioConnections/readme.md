# Studio Connections

Multiple Studio browser windows and built/running applications can communicate with each other in various ways.
This allows us to do mainly two things:

- One Studio browser window can connect to another, allowing it to modify project files and collaborate.
- A running application can connect to a studio instance, allowing the studio to inspect and modify the assets of a running game.

The [DiscoveryManager](./DiscoveryManager.js) lists available connections and provides a way to initialize them.
Multiple DiscoveryMethods can be added in order to list available connections.
There are two types of DiscoveryMethods:

- InternalDiscoveryMethod connections make it possible to communicate between two tabs in the same browser.
This is mainly useful for inspectors, since applications that the user wishes to inspect are usually running in the same browser.
- WebRtcDiscoveryMethod connections use WebRTC to connect two clients from different devices with each other.

## Client Types

There are three different client types. And whether new connections are accepted by another client
depends largely on the client type of the two connections.
The table below shows which client type is able to connect to which other type.

|                 | `studio-host` | `studio-client` | `inspector` |
|-----------------|:-------------:|:---------------:|:-----------:|
| `studio-host`   |      X        |        X        |     yes     |
| `studio-client` |     yes       |        X        |     yes     |
| `inspector`     |     yes       |       yes       |      X      |

As you can see, none of the client types are able to connect to a client of their own type.
Other than that, the table is fairly symmetrical. The only exception is the `studio-host` and `studio-client` pair: A `studio-client` is able to connect to a `studio-host`, but not the other way around.

This table is not the only thing that determines whether a connection is accepted though. There are other factors, such as whether a studio instance has a project open or not.

## Messages

The client type also sets expectations for what functionality is supported.
For instance, a `studio-host` can give information about the file system to `studio-client` connections, which allows it to read or write files.
But an `inspector` doesn't really have a file system, so these message types are not supported.

In fact, an `inspector` doesn't even really need access to the file system of another connection either. So which message types are available depends on the type of both clients.

You can take a look at [handlers.js](../../../studio/src/network/studioConnections/handlers.js) to see which handlers are supported for each combination of client types.

## Inspector Connections

Inspector connections can be initiated from both the connections window in studio, or by an application itself.
When the 'internal connections' preference is disabled, we will still list existing inspectors,
and allow the user to connect to an application from studio.
But applications cannot connect to a studio instance unless its 'internal connections' preference is enabled.

One exception to this is pages that were created from studio itself (via the build view).
The user expects inspectors to automatically connect when clicking the play button,
so making the user explicitly click connect somewhere would cause too much friction.

To make this work, an InternalDiscoveryManager requests a token from the parent window.
This token can then be used to make the connection like usual via the discovery worker.
Only if a valid token is provided, or the 'internal connections' preference is enabled and the origin allowlisted,
will the connection be made.

These tokens and allowlist are managed from within the studio client, i.e. the `StudioConnectionsManager` class.

TODO: #751
