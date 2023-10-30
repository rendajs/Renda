# Studio Connections

Studio connections allow us to link multiple studio instances together and have them communicate with each other.
Additionally, inspector connections can be made to running applications,
allowing you to inspect or modify scenes at runtime.

Since a lot of functionality needs to also be bundled with applications,
a large portion of the documentation (and code) can be found [here](../../../../src/network/studioConnections/readme.md).

## Preferences

There are two preferences, one for allowing remote connections, and another for internal connections.
By default, both are disabled, since the user might not be aware of this functionality.
Inspector connections, however, are always allowed. Since they are always initiated from studio.

When these preferences are disabled, no one can initialize a connection from another studio.
But when they are enabled, connections are automatically accepted.
In addition to this, project metadata is broadcast to other clients even before the connection is made.
This way a user will be able to more easily find the client they wish to connect to.

If internal connections are disabled, a client will still broadcast its existence to other internal clients,
but project metadata is unavailable.
