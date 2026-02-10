import { AirtableMachine } from './types';

export async function fetchAirtableMachines(): Promise<AirtableMachine[]> {
  const response = await fetch('/api/airtable-machines');

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.machines;
}
