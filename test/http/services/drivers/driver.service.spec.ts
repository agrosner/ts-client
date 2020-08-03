import { PlaceDriver } from '../../../../src/http/services/drivers/driver.class';

import * as SERVICE from '../../../../src/http/services/drivers/drivers.service';
import * as Resources from '../../../../src/http/services/resources/resources.service';

describe('Drivers API', () => {

    it('should allow querying drivers', async () => {
        const spy = jest.spyOn(Resources, 'query');
        spy.mockImplementation(async (_, process: any, __) => [process({})]);
        const list = await SERVICE.queryDrivers();
        expect(list).toBeTruthy();
        expect(list.length).toBe(1);
        expect(list[0]).toBeInstanceOf(PlaceDriver);
    });

    it('should allow showing driver details', async () => {
        const spy = jest.spyOn(Resources, 'show');
        spy.mockImplementation(async (_, _1, process: any, _2) => process({}) as any);
        const item = await SERVICE.showDriver('1');
        expect(item).toBeInstanceOf(PlaceDriver);
    });

    it('should allow creating new drivers', async () => {
        const spy = jest.spyOn(Resources, 'create');
        spy.mockImplementation(async (_, _1, process: any, _2) => process({}) as any);
        const item = await SERVICE.addDriver({});
        expect(item).toBeInstanceOf(PlaceDriver);
    });

    it('should allow updating driver details', async () => {
        const spy = jest.spyOn(Resources, 'update');
        spy.mockImplementation(async (_, _0, _1, _2, process: any, _3) => process({}) as any);
        const item = await SERVICE.updateDriver('1', {});
        expect(item).toBeInstanceOf(PlaceDriver);
    });

    it('should allow removing drivers', async () => {
        const spy = jest.spyOn(Resources, 'remove');
        spy.mockImplementation(async () => undefined);
        const item = await SERVICE.removeDriver('1', {});
        expect(item).toBeFalsy();
    });
});
