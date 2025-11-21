import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VaultService {
  private readonly logger = new Logger(VaultService.name);

  constructor(private readonly configService: ConfigService) {}

  private get address(): string {
    return (
      this.configService.get<string>('VAULT_ADDR') ||
      this.configService.get<string>('VAULT_URL') ||
      ''
    );
  }

  private get token(): string {
    return this.configService.get<string>('VAULT_TOKEN') || '';
  }

  isConfigured(): boolean {
    return Boolean(this.address && this.token);
  }

  async logVaultResponse(): Promise<unknown> {
    if (!this.isConfigured()) {
      throw new Error('Vault not configured: set VAULT_ADDR and VAULT_TOKEN');
    }

    const response = await fetch(this.address, {
      headers: {
        'X-Vault-Token': this.token,
        accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Vault request failed: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      // non-JSON response, keep raw text
    }

    this.persistSecrets(body);
    return body;
  }

  private persistSecrets(body: unknown): void {
    if (!body || typeof body !== 'object') {
      return;
    }

    const maybeNestedData =
      'data' in body && body.data && typeof body.data === 'object' ? (body.data as any) : undefined;
    const secretsSource =
      maybeNestedData && 'data' in maybeNestedData && typeof maybeNestedData.data === 'object'
        ? maybeNestedData.data
        : maybeNestedData;

    if (!secretsSource || typeof secretsSource !== 'object') {
      return;
    }

    Object.entries(secretsSource).forEach(([key, value]) => {
      const stringValue = String(value);
      this.configService.set(key, stringValue);
      process.env[key] = stringValue;
    });
  }
}
