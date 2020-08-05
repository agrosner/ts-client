
import { of } from 'rxjs';
import { PlaceZone } from '../../../../src/http/services/zones/zone.class';

import * as Resources from '../../../../src/http/services/resources/resources.service';
import * as SERVICE from '../../../../src/http/services/zones/zones.service';

describe('Zones API', () => {

    it('should allow querying zones', async () => {
        const spy = jest.spyOn(Resources, 'query');
        spy.mockImplementation((_, process: any, __) => of([process({})]));
        let list = await SERVICE.queryZones().toPromise();
        expect(list).toBeTruthy();
        expect(list.length).toBe(1);
        expect(list[0]).toBeInstanceOf(PlaceZone);
        list = await SERVICE.queryZones({}).toPromise();
    });

    it('should allow showing zone details', async () => {
        const spy = jest.spyOn(Resources, 'show');
        spy.mockImplementation((_, _1, process: any, _2) => of(process({}) as any));
        let item = await SERVICE.showZone('1').toPromise();
        expect(item).toBeInstanceOf(PlaceZone);
        item = await SERVICE.showZone('1', {}).toPromise();
    });

    it('should allow creating new zones', async () => {
        const spy = jest.spyOn(Resources, 'create');
        spy.mockImplementation((_, _1, process: any, _2) => of(process({}) as any));
        let item = await SERVICE.addZone({}).toPromise();
        expect(item).toBeInstanceOf(PlaceZone);
        item = await SERVICE.addZone({}, {}).toPromise();
    });

    it('should allow updating zone details', async () => {
        const spy = jest.spyOn(Resources, 'update');
        spy.mockImplementation((_, _0, _1, _2, process: any, _3) => of(process({}) as any));
        let item = await SERVICE.updateZone('1', {}).toPromise();
        expect(item).toBeInstanceOf(PlaceZone);
        item = await SERVICE.updateZone('1', {}, {}, 'patch').toPromise();
    });

    it('should allow removing zones', async () => {
        const spy = jest.spyOn(Resources, 'remove');
        spy.mockImplementation( () => of());
        let item = await SERVICE.removeZone('1').toPromise();
        expect(item).toBeFalsy();
        item = await SERVICE.removeZone('1', {}).toPromise();
    });
});
