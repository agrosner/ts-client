import { first } from 'rxjs/operators';

import { PlaceOS } from '../../../placeos';
import { HashMap } from '../../../utilities/types.utilities';
import { EngineResource } from '../resources/resource.class';
import { EngineSettings } from '../settings/settings.class';
import { EncryptionLevel } from '../settings/settings.interfaces';
import { EngineTrigger } from '../triggers/trigger.class';
import { EngineZonesService } from './zones.service';

export const ZONE_MUTABLE_FIELDS = ['name', 'description', 'triggers', 'tags'] as const;
type ZoneMutableTuple = typeof ZONE_MUTABLE_FIELDS;
export type ZoneMutableFields = ZoneMutableTuple[number];

export class EngineZone extends EngineResource<EngineZonesService> {
    /** Tuple of user settings of differring encryption levels for the zone */
    public readonly settings: [
        EngineSettings | null,
        EngineSettings | null,
        EngineSettings | null,
        EngineSettings | null
    ] = [null, null, null, null];
    /** Description of the zone's purpose */
    public readonly description: string;
    /** List of triggers associated with the zone */
    public readonly triggers: readonly string[];
    /** List of tags associated with the zone */
    public readonly tags: string;
    /** List of modules associated with the system. Only available from the show method with the `complete` query parameter */
    public trigger_list: readonly EngineTrigger[] = [];

    constructor(protected _service: EngineZonesService, raw_data: HashMap) {
        super(_service, raw_data);
        this.description = raw_data.description || '';
        this.tags = raw_data.tags || '';
        this.triggers = raw_data.triggers || [];
        this.settings = raw_data.settings || [null, null, null, null];
        PlaceOS.initialised.pipe(first(has_inited => has_inited)).subscribe(() => {
            if (typeof this.settings !== 'object') {
                (this as any).settings = [null, null, null, null];
            }
            for (const level in EncryptionLevel) {
                if (!isNaN(Number(level)) && !this.settings[level]) {
                    this.settings[level] = new EngineSettings(PlaceOS.settings, {
                        encryption_level: level
                    });
                }
            }
            if (raw_data.trigger_data && raw_data.trigger_data instanceof Array) {
                this.trigger_list = raw_data.trigger_data.map(
                    trigger => new EngineTrigger(PlaceOS.triggers, trigger)
                );
            }
        });
    }

    public storePendingChange(key: ZoneMutableFields, value: EngineZone[ZoneMutableFields]): this {
        return super.storePendingChange(key as any, value);
    }
}
