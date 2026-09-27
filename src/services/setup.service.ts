import { invoke } from '@tauri-apps/api/core';

export interface SetupStatus {
  completed: boolean;
}

class SetupService {
  async getStatus(): Promise<SetupStatus> {
    return invoke<SetupStatus>('get_setup_status');
  }

  async completeSetup(): Promise<void> {
    return invoke<void>('complete_setup');
  }
}

export const setupService = new SetupService();