# Preferences management

The `PreferencesManager` is responsible for, well, managing user preferences.
There exists only a single instance of it on the global `studio` object.

Preferences can have multiple values stored at different locations, each location having a different priority.
These locations allow users to adjust their preferences for specific situations,
without sacrificing the values for other situations.
For example, a preference can be stored on the project level,
so that a preference has the desired value when a specific project is open.
At the same time a preference can be set globally, so that all other projects use a different value for that preference.

A `PreferenceLocation` contains all the logic for storing preferences for each specific location.
Locations are added via `PreferencesManager.addLocation()`
and the PreferencesManager will use the value from the location with the highest priority that has a value set.

`PreferenceLocations` can be extended in order to add the custom logic required to save and load values.
