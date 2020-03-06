import { of } from 'rxjs';

import { EngineOAuthSource } from '../../../../src/http/services/oauth-sources/oauth-source.class';
import { EngineOAuthSourcesService } from '../../../../src/http/services/oauth-sources/oauth-sources.service';

describe('EngineDomainsService', () => {
    let service: EngineOAuthSourcesService;
    let http: any;

    beforeEach(() => {
        http = {
            responseHeaders: jest.fn(() => ({})),
            get: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            delete: jest.fn(),
            api_endpoint: '/api/engine/v2'
        };
        service = new EngineOAuthSourcesService(http);
    });

    it('should create instance', () => {
        expect(service).toBeTruthy();
        expect(service).toBeInstanceOf(EngineOAuthSourcesService);
    });

    it('allow querying systems index', async () => {
        http.get.mockReturnValueOnce(of({ results: [{ id: 'test' }], total: 10 }));
        const result = await service.query();
        expect(http.get).toBeCalledWith('/api/engine/v2/oauth_auths');
        expect(result).toBeInstanceOf(Array);
        expect(result[0]).toBeInstanceOf(EngineOAuthSource);
    });

    it('allow querying systems show', async () => {
        http.get.mockReturnValueOnce(of({ id: 'test' }));
        const result = await service.show('test');
        expect(http.get).toBeCalledWith('/api/engine/v2/oauth_auths/test');
        expect(result).toBeInstanceOf(EngineOAuthSource);
    });
});
