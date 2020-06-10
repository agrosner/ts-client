# TypeScript PlaceOS Library

This library is a Typescript interface to PlaceOS

## Compilation

You can build the library from source after installing the dependencies with the command

`npm run build`

## Usage

API docs can be found [here](https://placeos.github.io/ts-client)

You can install the PlaceOS Typescript client with the npm command

`npm install --save-dev @placeos/ts-client`

After the package is installed you can import `PlaceOS` into your application

```typescript
import { PlaceOS } from '@placeos/ts-client'
```

Before using PlaceOS it will need to be intialised.

```typescript
PlaceOS.init(config);
```

The init method takes a `config` object with the following properties

|Property|Description|Optional|Type|Example|
|--------|-----------|--------|----|-------|
|`host`|Host name and port of the PlaceOS server|Yes|`string`|`"dev.placeos.com:8080"`|
|`mock`|Whether to initialise PlaceOS with mock services|Yes|`boolean`|`true`|
|`auth_uri`|URI for authorising users session|No|`string`|`"/auth/oauth/authorize"`|
|`token_uri`|URI for generating new auth tokens|No|`string`|`"/auth/token"`|
|`redirect_uri`|URI to redirect user to after authorising session|No|`string`|`"/oauth-resp.html"`|
|`scope`|Scope of the user permissions needed by the application|No|`string`|`"admin"`|
|`storage`|Browser storage to use for storing user credentials|Yes|`"local" \| "session"`| |
|`handle_login`|Whether PlaceOS should handle user login|Yes|`boolean`|`true`|

Once initialised the `PlaceOS` object will expose interfaces to PlaceOS's websocket and http APIs

### Websocket API

`PlaceOS` exposes a websocket API through the `bindings` service.

The `bindings` service is used to provide real-time interaction with modules running on PlaceOS. It provides an interface to build efficient, responsive user interfaces, monitoring systems and other extensions which require live, two-way or asynchronous interaction.

Once PlaceOS has initialised you can listen to values on modules

```typescript
const my_mod = PlaceOS.bindings.module('sys-death-star', 'TestModule', 3);
const my_variable = my_mod.binding('power');
const unbind = my_variable.bind();
const sub = my_variable.listen((value) => doSomething(value));
```

This binds to the `power` status variable on the 3rd `TestModule` in the system `sys-death-star`.
Any changes to the value of `power` on PlaceOS will then be emitted to the function passed to `listen`.

Other than listening to changes of values you can also remotely execute methods on modules.

```typescript
const my_mod = PlaceOS.bindings.module('sys-death-star', 'DemoModule', 2);
my_mod.exec('power_off').then(
    (resp) => handleSuccess(resp)
    (err) => handleError(err)
);
```

This will execute the method `power_off` on the 2nd `DemoModule` in the system `sys-death-star`.
If the method doesn't exist or the system is turned off it will return an error.
The response from PlaceOS can be handled using the promise returned by the `exec` method.


### HTTP API

For the HTTP API, `PlaceOS` provides a service for each of the root endpoints available on PlaceOS's RESTful API.

Docs for the API can be found here https://docs.placeos.com/api/control

Services are provided for `drivers`, `modules`, `systems`, `users`, and `zones`

Each service except for `users` provides CRUD methods. `users` provides _RUD.

```typescript
// Drivers CRUD
PlaceOS.drivers.add(driver_data).then((new_driver) => doSomething(new_driver));
PlaceOS.drivers.show(driver_id).then((driver) => doSomething(driver));
PlaceOS.drivers.update(driver_id, driver_data).then((updated_driver) => doSomething(updated_driver));
PlaceOS.drivers.delete(driver_id).then(() => doSomething());

// Modules CRUD
PlaceOS.modules.add(module_data).then((new_module) => doSomething(new_module));
PlaceOS.modules.show(module_id).then((mod) => doSomething(mod));
PlaceOS.modules.update(module_id, module_data).then((updated_module) => doSomething(updated_module));
PlaceOS.modules.delete(module_id).then(() => doSomething());

// Systems CRUD
PlaceOS.systems.add(system_data).then((new_system) => doSomething(new_system));
PlaceOS.systems.show(system_id).then((system) => doSomething(system));
PlaceOS.systems.update(system_id, system_data).then((updated_system) => doSomething(updated_system));
PlaceOS.systems.delete(system_id).then(() => doSomething());

// Users CRUD
PlaceOS.users.add(user_data).then((new_user) => doSomething(new_user)); // This will error
PlaceOS.users.show(user_id).then((user) => doSomething(user));
PlaceOS.users.update(user_id, user_data).then((updated_user) => doSomething(updated_user));
PlaceOS.users.delete(user_id).then(() => doSomething());

// Zones CRUD
PlaceOS.zones.add(zone_data).then((new_zone) => doSomething(new_zone));
PlaceOS.zones.show(zone_id).then((zone) => doSomething(zone));
PlaceOS.zones.update(zone_id, zone_data).then((updated_zone) => doSomething(updated_zone));
PlaceOS.zones.delete(zone_id).then(() => doSomething());
```

The services also provide methods for the various item action endpoints

```typescript
// Driver Actions
PlaceOS.drivers.reload(driver_id);

// Module Actions
PlaceOS.module.start(module_id);
PlaceOS.module.stop(module_id);
PlaceOS.module.ping(module_id);
PlaceOS.module.lookup(module_id, lookup);
PlaceOS.module.internalState(module_id);

// System Actions
PlaceOS.system.remove(system_id, module_name);
PlaceOS.system.start(system_id);
PlaceOS.system.stop(system_id);
PlaceOS.system.execute(system_id, module_name, index, args);
PlaceOS.system.state(system_id, module_name, index, lookup);
PlaceOS.system.functionList(system_id, module_name, index);
PlaceOS.system.types(system_id, module_name);
PlaceOS.system.count(system_id);

// User Actions
PlaceOS.users.current();
```

Objects returned by `show` and `query` methods are immutable,
though when reassigning value it will be saved under the `changes` property of that object.
These changes can be saved using the `save` method which will return a promise for the new object.

```typescript
PlaceOS.zones.show(zone_id).then((zone) => {
    console.log(zone.description); // Prints the current description
    zone.description = 'New description';
    console.log(zone.description); // Same a previous print
    cosnole.log(zone.changes.description) // New description
    zone.save().then((updated_zone) => {
        cosnole.log(updated_zone.description) // New description
    });
});
```

You can find more details about endpoint action on the API docs

https://app.swaggerhub.com/apis/ACAprojects/PlaceOS/3.5.0#/

## Writing mocks

If you don't have access to an PlaceOS server you can also write mocks so that you can still develop interfaces for PlaceOS.

To use the mock services you can pass `mock: true` into the initialisation object.

### Websockets

To write mocks for the the realtime(websocket) API you'll need to register your systems in `PlaceSystemsMock` before initialising PlaceOS.

```typescript
PlaceSystemsMock.register('my-system', {
    "MyModule": [
        {
            power: true,
            $power_on: function () { this.power = true },
            $power_off: function () { this.power = false }
        }
    ]
});
```

Note that executable methods on mock systems are namespaced with `$` as real systems in engine allow for methods to have the same name as variables.

Once initialised interactions with a system are performed in the same manner as the live system.

```typescript
const my_mod = PlaceOS.bindings.module('my-system', 'MyModule', 1);
const my_variable = my_mod.binding('power');
const unbind = my_variable.bind();
const sub = my_variable.listen((value) => doSomething(value)); // Emits true
my_mod.exec('power_off'); // The listen callback will now emit false
```

Some methods may need access to other modules within the system, for this a property is appended on runtime called `_system` which allows for access to the parent system

```typescript
PlaceSystemsMock.register('my-system', {
    "MyModule": [
        {
            $lights_off: function () { this._system.MyOtherModule[0].lights = false; }
        }
    ]
    "MyOtherModule": [
        {
            lights: true,
        }
    ]
});
```

### HTTP Requests

HTTP API Requests can be mocked in a similar way to the realtime API by registering handlers with `PlaceHttpMock`

```typescript
PlaceHttpMock.register({
    path: '/api/engine/v2/systems',
    metadata: {},
    method: 'GET',
    callback: (request) => my_mock_systems
});
```

Paths allow for route parameters and will pass the value in the callback input.

```typescript
PlaceHttpMock.register({
    path: '/api/engine/v2/systems/:system_id',
    ...
    callback: (request) =>
        my_mock_systems.find(sys => sys.id === request.route_params.system_id)
});
```

Query parameters are also available on the callback input.

`GET`, `POST`, `PUT`, `PATCH` and `DELETE` requests can be mocked out.

If a request is made and there are no handlers it will attempt to make the live request.
