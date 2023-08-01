# Studio Connections

Multiple Studio tabs and built/running applications can communicate which each other via various ways.
This allows us to do mainly do two things:

- One Studio tab can connect to another, allowing it to modify project files.
- A running application can connect to a studio instance, allowing the studio to inspect and modify the assets of a running game.

The [StudioConnectionsManager](./StudioConnectionsManager.js) lists available connections and provides a way to initialize them.
There are two types of connections:

- Internal connections make it possible to communicate between two tabs in the same browser.
This is mainly useful for inspectors, since applications that the user wishes to inspect are usually running in the same browser.
- Remote connections use WebRTC to connect two clients from different devices with each other.

The logic for these two connection types can be found in [MessageHandlerInternal.js](./messageHandlers/MessageHandlerInternal.js) and [MessageHandlerWebRtc.js](./messageHandlers/MessageHandlerWebRtc.js) respectively.

## Preferences

There are two preferences, one for allowing remote connections, and another for internal connections.
By default both are disabled, since the user might not be aware of this functionality.
Inspector connections, however, are always allowed. Since they are always initiated from studio.

When these preferences are disabled, no one can initialize a connection from another studio.
But when they are enabled, connections are automatically accepted.
In addition to this, project metadata is broadcast to other clients even before the connection is made.
This way a user will be able to more easily find the client they wish to connect to.

If internal connections are disabled, a client will still broadcast its existance to other internal clients,
but project metadata is unavailable.

## Inspector connections

Inspector connections can be initiated from both the connections window in studio, or by an application itself.
When the 'internal connections' preference is disabled, we will still list existing inspectors,
and allow the user to connect to an application from studio.
But applications cannot connect to a studio instance unless its 'internal connections' preference is enabled.

One exception to this is pages that were created from studio it self (via the build view).
The user expects inspectors to automatically connect when clicking the play button,
so making the user explicitly click connect somewhere would cause too much friction.

To make this work, an InternalDiscoveryManager requests a token from the parent window.
This token can then be used to make the connection like usual via the discovery worker.
Only if a valid token is provided, or the 'internal connections' preference is enabled and the origin allowlisted,
will the connection be made.

These tokens and allowlist are managed from within the studio client, i.e. the `StudioConnectionsManager` class.
This is to ensure security, should a different/compromised iframe or shared worker be used,
the studio tab will always guarantee that specific connections are allowed.

TODO: #750
TODO: #751

## Protocol

Once a connection is established, several message types are available to be sent.
The protocol that is used is defined by the [ProtocolManager](./ProtocolManager.js).
Request handlers can be registered on the ProtocolManager, which contain the logic for how to deal with each message.
Many of these handlers are defined in the protocolRequestHandlers directory.
