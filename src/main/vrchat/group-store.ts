import fs from 'node:fs';
import path from 'node:path';

import { VRChatApiError } from './errors';

import type { FriendGroup } from 'src/types/vrchat-groups';

export const isUserId = (value: unknown): value is string => typeof value === 'string' && /^usr_[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
export interface GroupStore {
  load(accountId: string): FriendGroup[];
  save(accountId: string, groups: FriendGroup[]): void;
}

export class FileGroupStore implements GroupStore {
  constructor(private readonly directory: string) {}

  private file(accountId: string) {
    if (!isUserId(accountId)) throw new VRChatApiError('invalidInput');
    return path.join(this.directory, `${accountId}.json`);
  }

  load(accountId: string): FriendGroup[] {
    const file = this.file(accountId);
    try {
      if (!fs.existsSync(file)) return [];
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (data.version !== 1 || !Array.isArray(data.groups) || data.groups.length > 100) throw new Error();
      const ids = new Set<string>();
      for (const group of data.groups) {
        if (!group || typeof group.id !== 'string' || !group.id || ids.has(group.id) ||
          typeof group.name !== 'string' || !group.name.trim() || group.name.length > 80 ||
          !Array.isArray(group.members) || group.members.length > 100) throw new Error();
        ids.add(group.id);
        const members = new Set<string>();
        for (const member of group.members) {
          if (!member || !isUserId(member.id) || members.has(member.id) || typeof member.displayName !== 'string' || !member.displayName.trim()) throw new Error();
          members.add(member.id);
        }
      }
      return data.groups.map((group: FriendGroup) => ({ id: group.id, name: group.name, members: group.members.map(member => ({ id: member.id, displayName: member.displayName })) }));
    } catch { throw new VRChatApiError('storage'); }
  }

  save(accountId: string, groups: FriendGroup[]): void {
    const file = this.file(accountId);
    const temporary = `${file}.tmp`;
    try {
      fs.mkdirSync(this.directory, { recursive: true });
      fs.writeFileSync(temporary, JSON.stringify({ version: 1, groups }), { mode: 0o600 });
      fs.renameSync(temporary, file);
    } catch { throw new VRChatApiError('storage'); }
    finally { try { fs.rmSync(temporary, { force: true }); } catch { /* Preserve the previous file on failure. */ } }
  }
}
