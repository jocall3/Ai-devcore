import { ensureGapiClient } from './googleApiService.ts';
import { logError, measurePerformance } from './telemetryService.ts';

declare var gapi: any;

/**
 * Tests a set of permissions against a specified GCP resource.
 * @param resource The full resource name of the GCP resource (e.g., '//cloudresourcemanager.googleapis.com/projects/my-project').
 * @param permissions An array of permission strings to test (e.g., ['storage.objects.create', 'storage.objects.get']).
 * @returns A promise that resolves with the API response, containing the set of permissions the caller is allowed.
 */
export const testIamPermissions = async (resource: string, permissions: string[]): Promise<{ permissions: string[] }> => {
    return measurePerformance('gcp.testIamPermissions', async () => {
        try {
            const isReady = await ensureGapiClient();
            if (!isReady) throw new Error("Google API client not ready.");

            // The resource name for IAM API is slightly different
            const iamResourcePath = resource.startsWith('//') ? resource.substring(2) : resource;

            const response = await gapi.client.iam.permissions.testIamPermissions({
                resource: iamResourcePath,
                resource_body: { permissions }
            });

            return response.result;
        } catch (error) {
            logError(error as Error, {
                service: 'gcpService',
                function: 'testIamPermissions',
                resource
            });
            // Re-throw a more user-friendly error
            const gapiError = error as any;
            if (gapiError.result?.error?.message) {
                 throw new Error(`GCP API Error: ${gapiError.result.error.message}`);
            }
            throw error;
        }
    });
};