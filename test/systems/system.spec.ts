import { PlaceSystem } from '../../src/systems/system';

describe('PlaceSystem', () => {
    let system: PlaceSystem;
    const features: string[] = ['test', 'device', 'here'];
    const modules: string[] = ['test', 'device', 'here'];
    const zones: string[] = ['test', 'device', 'here'];

    beforeEach(() => {
        system = new PlaceSystem({
            id: 'sys-test',
            description: 'A description',
            email: 'system@placeos.com',
            capacity: 10,
            features,
            bookable: true,
            installed_ui_devices: 4,
            support_url: '/support/test',
            modules,
            zones,
            module_data: [{ id: 'mod-001', name: 'A Module' } as any],
            settings: { settings_string: '{ test: 1 }' } as any,
        });
    });

    it('should have module data', done => {
        setTimeout(() => {
            expect(system.module_list).toBeTruthy();
            expect(system.module_list.length).toBe(1);
            done();
        }, 1);
    });

    it('should create instance', () => {
        expect(system).toBeTruthy();
        expect(system).toBeInstanceOf(PlaceSystem);
    });

    it('should expose description', () => {
        expect(system.description).toBe('A description');
    });

    it('should expose email', () => {
        expect(system.email).toBe('system@placeos.com');
    });

    it('should expose capacity', () => {
        expect(system.capacity).toBe(10);
    });

    it('should expose features', () => {
        expect(system.features).toBe(features);
    });

    it('should expose bookable', () => {
        expect(system.bookable).toBe(true);
    });

    it('should expose installed_ui_devices', () => {
        expect(system.installed_ui_devices).toBe(4);
    });

    it('should expose support_url', () => {
        expect(system.support_url).toBe('/support/test');
    });

    it('should expose module list', () => {
        expect(system.modules).toEqual(modules);
    });

    it('should expose zone list', () => {
        expect(system.zones).toEqual(zones);
    });

    it('should expose settings', () => {
        expect(system.settings).toBeInstanceOf(Object);
    });
});
