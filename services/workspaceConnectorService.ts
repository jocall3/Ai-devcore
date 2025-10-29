/**
 * @file Manages the registration and execution of actions for third-party workspace connectors like Jira, Slack, etc.
 * @version 2.0.0
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as vaultService from './vaultService.ts';
import { logError, logEvent } from './telemetryService.ts';

/**
 * Custom error thrown when an action requires authentication but the vault is locked.
 * UI components can catch this specific error to trigger an unlock flow.
 * @class
 * @extends {Error}
 */
export class VaultLockedError extends Error {
  /**
   * Creates an instance of VaultLockedError.
   * @param {string} message - The error message.
   * @example
   * if (!vaultService.isUnlocked()) {
   *   throw new VaultLockedError("Vault must be unlocked.");
   * }
   */
  constructor(message: string) {
    super(message);
    this.name = 'VaultLockedError';
  }
}

/**
 * @interface WorkspaceAction
 * @description Defines the contract for any executable action within the workspace connector service.
 */
export interface WorkspaceAction {
  /** A unique identifier for the action, e.g., 'jira_create_ticket'. */
  id: string;
  /** The service this action belongs to, e.g., 'Jira'. */
  service: 'Jira' | 'Slack' | 'GitHub';
  /** A user-friendly description of what the action does. */
  description: string;
  /** Specifies if the action requires credentials from the vault. Defaults to false. */
  requiresAuth?: boolean;
  /** A function that returns a definition of the parameters the action requires. */
  getParameters: () => { [key: string]: { type: 'string' | 'number'; required: boolean; default?: string } };
  /** The function that contains the logic to execute the action. */
  execute: (params: any) => Promise<any>;
}

/**
 * @description A central registry for all available workspace actions.
 * @type {Map<string, WorkspaceAction>}
 */
export const ACTION_REGISTRY: Map<string, WorkspaceAction> = new Map();

// --- JIRA ACTIONS ---
ACTION_REGISTRY.set('jira_create_ticket', {
  id: 'jira_create_ticket',
  service: 'Jira',
  description: 'Creates a new issue in a Jira project.',
  requiresAuth: true,
  getParameters: () => ({
    projectKey: { type: 'string', required: true },
    summary: { type: 'string', required: true },
    description: { type: 'string', required: false },
    issueType: { type: 'string', required: true, default: 'Task' }
  }),
  execute: async (params) => {
    const domain = await vaultService.getDecryptedCredential('jira_domain');
    const token = await vaultService.getDecryptedCredential('jira_pat');
    const email = await vaultService.getDecryptedCredential('jira_email');

    if (!domain || !token || !email) {
        throw new Error("Jira credentials not found in vault. Please connect Jira in the Workspace Connector Hub.");
    }
    
    const descriptionDoc = {
      type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ text: params.description || '', type: 'text' }] }]
    };

    const response = await fetch(`https://${domain}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${email}:${token}`)}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
           project: { key: params.projectKey },
           summary: params.summary,
           description: descriptionDoc,
           issuetype: { name: params.issueType || 'Task' }
        }
      })
    });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Jira API Error (${response.status}): ${errorBody}`);
    }
    return response.json();
  }
});

// --- SLACK ACTIONS ---
ACTION_REGISTRY.set('slack_post_message', {
  id: 'slack_post_message',
  service: 'Slack',
  description: 'Posts a message to a Slack channel.',
  requiresAuth: true,
  getParameters: () => ({
    channel: { type: 'string', required: true, default: '#general' },
    text: { type: 'string', required: true }
  }),
  execute: async (params) => {
    const token = await vaultService.getDecryptedCredential('slack_bot_token');
    if (!token) {
        throw new Error("Slack credentials not found in vault. Please connect Slack in the Workspace Connector Hub.");
    }
    const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({
            channel: params.channel,
            text: params.text
        })
    });
     if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`Slack API Error: ${errorBody.error}`);
    }
    return response.json();
  }
});


/**
 * The central execution function for all workspace actions. It checks for vault status
 * before executing actions that require authentication.
 * @param {string} actionId - The ID of the action to execute.
 * @param {any} params - The parameters for the action.
 * @returns {Promise<any>} The result of the action's execute function.
 * @throws {Error} if the action is not found.
 * @throws {VaultLockedError} if the action requires authentication and the vault is locked.
 * @example
 * try {
 *   const result = await executeWorkspaceAction('jira_create_ticket', { projectKey: 'PROJ', summary: 'New ticket' });
 *   console.log('Ticket created:', result);
 * } catch (e) {
 *   if (e instanceof VaultLockedError) {
 *     // prompt user to unlock vault
 *   } else {
 *     console.error('Action failed:', e);
 *   }
 * }
 */
export async function executeWorkspaceAction(actionId: string, params: any): Promise<any> {
    const action = ACTION_REGISTRY.get(actionId);
    if (!action) {
        throw new Error(`Action "${actionId}" not found.`);
    }

    // FIX: Check if the action requires an unlocked vault before proceeding.
    // This allows the UI to catch a specific 'VaultLockedError' and prompt the user.
    if (action.requiresAuth && !vaultService.isUnlocked()) {
      logEvent('workspace_action_blocked', { actionId, reason: 'vault_locked' });
      throw new VaultLockedError('Vault is locked. Unlock the vault to execute this action.');
    }

    logEvent('workspace_action_execute', { actionId });
    try {
        const result = await action.execute(params);
        logEvent('workspace_action_success', { actionId });
        return result;
    } catch (error) {
        logError(error as Error, { context: 'executeWorkspaceAction', actionId });
        throw error;
    }
}
