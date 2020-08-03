
import * as SERVICE from '../../../../src/http/services/broker/brokers.service';
import * as Resources from '../../../../src/http/services/resources/resources.service';

import { PlaceMQTTBroker } from '../../../../src/http/services/broker/broker.class';

describe('MQTT Broker API', () => {

    it('should allow querying brokers', async () => {
        const spy = jest.spyOn(Resources, 'query');
        spy.mockImplementation(async (_, process: any, __) => [process({})]);
        const list = await SERVICE.queryBrokers();
        expect(list).toBeTruthy();
        expect(list.length).toBe(1);
        expect(list[0]).toBeInstanceOf(PlaceMQTTBroker);
    });

    it('should allow showing broker details', async () => {
        const spy = jest.spyOn(Resources, 'show');
        spy.mockImplementation(async (_, _1, process: any, _2) => process({}) as any);
        const item = await SERVICE.showBroker('1');
        expect(item).toBeInstanceOf(PlaceMQTTBroker);
    });

    it('should allow creating new brokers', async () => {
        const spy = jest.spyOn(Resources, 'create');
        spy.mockImplementation(async (_, _1, process: any, _2) => process({}) as any);
        const item = await SERVICE.addBroker({});
        expect(item).toBeInstanceOf(PlaceMQTTBroker);
    });

    it('should allow updating broker details', async () => {
        const spy = jest.spyOn(Resources, 'update');
        spy.mockImplementation(async (_, _0, _1, _2, process: any, _3) => process({}) as any);
        const item = await SERVICE.updateBroker('1', {});
        expect(item).toBeInstanceOf(PlaceMQTTBroker);
    });

    it('should allow removing brokers', async () => {
        const spy = jest.spyOn(Resources, 'remove');
        spy.mockImplementation(async () => undefined);
        const item = await SERVICE.removeBroker('1', {});
        expect(item).toBeFalsy();
    });
});
