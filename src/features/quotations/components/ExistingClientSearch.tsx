import { useEffect, useRef, useState } from 'react';

import { Search, UserPlus, X } from 'lucide-react';

import Input from '../../../components/ui/Input';
import { clientService } from '../../../services/client.service';
import type { ClientInfo } from '../../clients/types/client.types';

interface ExistingClientSearchProps {
  selectedClientId?: number;
  selectedClientName?: string;
  onSelect: (client: ClientInfo) => void;
  onClear: () => void;
}

const ExistingClientSearch = ({
  selectedClientId,
  selectedClientName,
  onSelect,
  onClear,
}: ExistingClientSearchProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ClientInfo[]>([]);
  const [searching, setSearching] = useState(false);

  const latestQuery = useRef('');

  useEffect(() => {
    const term = query.trim();
    latestQuery.current = term;

    if (term.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);

    const timer = setTimeout(async () => {
      try {
        const found = await clientService.searchClients(term);

        if (latestQuery.current === term) {
          setResults(found);
        }
      } catch (error) {
        console.error(error);

        if (latestQuery.current === term) {
          setResults([]);
        }
      } finally {
        if (latestQuery.current === term) {
          setSearching(false);
        }
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (selectedClientId) {
    return (
      <div className="mb-5 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <div className="text-sm text-blue-900">
          Linked to existing client:{' '}
          <span className="font-semibold">
            {selectedClientName || 'Selected client'}
          </span>
        </div>

        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-900"
        >
          <X size={14} />
          Create new client
        </button>
      </div>
    );
  }

  return (
    <div className="mb-5">
      <div className="relative">
        <Input
          label="Search Existing Client"
          placeholder="Search by name, phone or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leftIcon={<Search size={16} />}
        />
      </div>

      {(searching || results.length > 0) && query.trim().length >= 2 && (
        <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          {searching && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-500">
              Searching...
            </div>
          )}

          {results.map((client) => (
            <button
              key={client.id}
              type="button"
              onClick={() => {
                onSelect(client);
                setQuery('');
                setResults([]);
              }}
              className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50"
            >
              <span>
                <span className="block text-sm font-medium text-slate-800">
                  {client.name}
                </span>
                <span className="block text-xs text-slate-500">
                  {client.phone}
                  {client.email ? ` · ${client.email}` : ''}
                  {client.address ? ` · ${client.address}` : ''}
                </span>
              </span>

              <span className="text-xs font-medium text-blue-600">
                Use
              </span>
            </button>
          ))}

          {!searching && results.length === 0 && (
            <div className="flex items-center justify-between px-4 py-3 text-sm text-slate-500">
              No matching client found.
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setResults([]);
                }}
                className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-800"
              >
                <UserPlus size={14} />
                Enter new client
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExistingClientSearch;
