import { Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { VaultService } from './vault.service';

describe('VaultService', () => {
  const originalEnv = { ...process.env };
  const mockFetch = jest.fn();
  const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

  const createService = async (): Promise<{ service: VaultService; moduleRef: TestingModule }> => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true })],
      providers: [VaultService],
    }).compile();

    return { service: module.get<VaultService>(VaultService), moduleRef: module };
  };

  beforeAll(() => {
    (global as any).fetch = mockFetch;
  });

  beforeEach(() => {
    process.env = { ...originalEnv };
    mockFetch.mockReset();
    logSpy.mockClear();
  });

  afterAll(() => {
    process.env = originalEnv;
    jest.resetAllMocks();
  });

  it('reports not configured when address or token is missing', async () => {
    delete process.env.VAULT_ADDR;
    delete process.env.VAULT_TOKEN;

    const { service } = await createService();
    expect(service.isConfigured()).toBe(false);
    await expect(service.logVaultResponse()).rejects.toThrow('Vault not configured');
  });

  it('calls vault endpoint with token and logs response', async () => {
    process.env.VAULT_ADDR = 'https://vault.example/v1/kv/data/my-secret';
    process.env.VAULT_TOKEN = 'root-token';

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: jest.fn().mockResolvedValue(JSON.stringify({ data: { foo: 'bar' } })),
    });

    const { service, moduleRef } = await createService();
    const configService = moduleRef.get(ConfigService);
    const result = await service.logVaultResponse();

    expect(mockFetch).toHaveBeenCalledWith('https://vault.example/v1/kv/data/my-secret', {
      headers: { 'X-Vault-Token': 'root-token', accept: 'application/json' },
    });
    expect(result).toEqual({ data: { foo: 'bar' } });
    expect(logSpy).toHaveBeenCalled();
    expect(process.env.foo).toBe('bar');
    expect(configService.get('foo')).toBe('bar');
  });

  it('throws when the vault call fails', async () => {
    process.env.VAULT_ADDR = 'https://vault.example/v1/kv/data/my-secret';
    process.env.VAULT_TOKEN = 'root-token';

    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: jest.fn().mockResolvedValue(''),
    });

    const { service } = await createService();
    await expect(service.logVaultResponse()).rejects.toThrow('Vault request failed: 404 Not Found');
  });
});
