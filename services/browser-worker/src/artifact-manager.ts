/**
 * Artifact Manager
 *
 * Captures session artifacts (screenshots for M1) and uploads them to
 * S3-compatible storage (MinIO locally). Falls back to no-op with a warning if
 * storage is unreachable so a screenshot failure never breaks a task.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import type { Page } from 'playwright';

export interface ArtifactRef {
  type: 'screenshot' | 'har' | 'video' | 'csv' | 'json' | 'logs';
  s3Path: string;
  sizeBytes: number;
}

export interface ArtifactManagerConfig {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  usePathStyle: boolean;
}

export class ArtifactManager {
  private readonly s3: S3Client;
  private bucketReady = false;

  constructor(private readonly config: ArtifactManagerConfig) {
    this.s3 = new S3Client({
      endpoint: config.endpoint,
      region: 'us-east-1',
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
      forcePathStyle: config.usePathStyle,
    });
  }

  private async ensureBucket(): Promise<void> {
    if (this.bucketReady) return;
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.config.bucket }));
    } catch {
      await this.s3.send(new CreateBucketCommand({ Bucket: this.config.bucket }));
    }
    this.bucketReady = true;
  }

  /**
   * Capture a full-page screenshot and upload it. Returns the artifact ref, or
   * null if capture/upload failed (logged by caller).
   */
  async captureScreenshot(page: Page, sessionId: string): Promise<ArtifactRef | null> {
    try {
      await this.ensureBucket();
      const buffer = await page.screenshot({ type: 'png', fullPage: false });
      const key = `sessions/${sessionId}/screenshots/${Date.now()}.png`;
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
          Body: buffer,
          ContentType: 'image/png',
        })
      );
      return {
        type: 'screenshot',
        s3Path: `s3://${this.config.bucket}/${key}`,
        sizeBytes: buffer.length,
      };
    } catch (err) {
      console.warn(`[ArtifactManager] Screenshot failed for ${sessionId}: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Persist a fixed-identity profile's browser storage state (cookies,
   * localStorage) so it can be restored on a future session for the same
   * profile. Best-effort: a failure here should not break session close.
   */
  async saveProfileState(
    organizationId: string,
    profileName: string,
    state: unknown
  ): Promise<void> {
    try {
      await this.ensureBucket();
      const body = Buffer.from(JSON.stringify(state), 'utf-8');
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: this.profileStateKey(organizationId, profileName),
          Body: body,
          ContentType: 'application/json',
        })
      );
    } catch (err) {
      console.warn(
        `[ArtifactManager] Failed to save profile state for ${organizationId}/${profileName}: ${(err as Error).message}`
      );
    }
  }

  /**
   * Load a previously persisted profile storage state, or null if none
   * exists yet (e.g., first session for a brand-new fixed-identity profile).
   */
  async loadProfileState(organizationId: string, profileName: string): Promise<unknown> {
    try {
      await this.ensureBucket();
      const response = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: this.profileStateKey(organizationId, profileName),
        })
      );
      const text = await response.Body?.transformToString('utf-8');
      return text ? (JSON.parse(text) as unknown) : null;
    } catch {
      // Missing key (first run) or storage unreachable — start fresh.
      return null;
    }
  }

  private profileStateKey(organizationId: string, profileName: string): string {
    return `profiles/${organizationId}/${encodeURIComponent(profileName)}/storage-state.json`;
  }

  /**
   * Upload arbitrary JSON data (e.g., extraction output) as an artifact.
   */
  async uploadJson(sessionId: string, name: string, data: unknown): Promise<ArtifactRef | null> {
    try {
      await this.ensureBucket();
      const body = Buffer.from(JSON.stringify(data, null, 2), 'utf-8');
      const key = `sessions/${sessionId}/exports/${name}-${Date.now()}.json`;
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
          Body: body,
          ContentType: 'application/json',
        })
      );
      return {
        type: 'json',
        s3Path: `s3://${this.config.bucket}/${key}`,
        sizeBytes: body.length,
      };
    } catch (err) {
      console.warn(`[ArtifactManager] JSON upload failed for ${sessionId}: ${(err as Error).message}`);
      return null;
    }
  }
}
