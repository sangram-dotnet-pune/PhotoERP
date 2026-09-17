import { invoke } from '@tauri-apps/api/core';

import type {
  ClientListItem,
  ClientDetails,
  ClientInfo,
} from '../features/clients/types/client.types';

class ClientService {
  async getClients(): Promise<ClientListItem[]> {
    return invoke<ClientListItem[]>('get_clients');
  }

  async searchClients(query: string): Promise<ClientInfo[]> {
    return invoke<ClientInfo[]>('search_clients', { query });
  }

  async findClientByContact(
    phone: string,
    email: string,
  ): Promise<ClientInfo | null> {
    return invoke<ClientInfo | null>('find_client_by_contact', {
      phone,
      email,
    });
  }

  async getClientDetails(id: number): Promise<ClientDetails> {
    return invoke<ClientDetails>('get_client_details', { id });
  }

  async updateServiceStatus(
    serviceId: number,
    status: string,
  ): Promise<void> {
    return invoke('update_service_status', {
      serviceId,
      status,
    });
  }

  async updateClient(client: ClientInfo): Promise<void> {
    return invoke('update_client', { client });
  }

  async deleteClient(id: number): Promise<void> {
    return invoke('delete_client', { id });
  }
}

export const clientService = new ClientService();
