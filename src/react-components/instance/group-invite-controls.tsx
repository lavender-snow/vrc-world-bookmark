import { useEffect, useId, useRef, useState } from 'react';

import type { FriendGroup } from 'src/types/vrchat-groups';
import type { InstanceState } from 'src/types/vrchat-instance';

const statuses = { sending: '送信中', sent: '送信済み', failed: '失敗', unknown: '結果不明' };

export function GroupInviteControls({ state, busy, onSend, onCancel }: {
  state: InstanceState; busy: boolean;
  onSend: (groupId: string, retryUnknown: boolean) => void; onCancel: () => void;
}) {
  const [groups, setGroups] = useState<FriendGroup[]>([]);
  const [selected, setSelected] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryUnknown, setRetryUnknown] = useState(false);
  const mounted = useRef(false);
  const sequence = useRef(0);
  const id = useId();
  useEffect(() => {
    mounted.current = true;
    void load();
    return () => { mounted.current = false; sequence.current++; };
  }, []);

  async function load() {
    const request = ++sequence.current;
    setLoading(true); setError(false);
    try {
      const result = await window.vrchatGroups.list();
      if (!mounted.current || request !== sequence.current) return;
      if (result.ok === false) { setError(true); setGroups([]); return; }
      setGroups(result.groups); setSelected(result.groups.length === 1 ? result.groups[0].id : ''); setRetryUnknown(false); setLoaded(true);
    } catch { if (mounted.current && request === sequence.current) { setError(true); setGroups([]); } }
    finally { if (mounted.current && request === sequence.current) setLoading(false); }
  }

  const group = groups.find(item => item.id === selected);
  const progress = state.groupInvite;
  const sending = progress?.status === 'sending';
  const disabled = busy || sending || Object.values(state.invites ?? {}).some(invite => invite.status === 'sending') || ['closing', 'closed', 'unknown'].includes(state.closeStatus);
  const unknown = group?.members.some(member => state.invites?.[member.id]?.status === 'unknown');
  const candidates = group?.members.filter(member => {
    const status = state.invites?.[member.id]?.status;
    return status !== 'sent' && (status !== 'unknown' || retryUnknown);
  }) ?? [];
  return <section aria-label="グループへの招待">
    <h3>グループをまとめて招待</h3>
    {loading && <p role="status">グループを読み込んでいます…</p>}
    {error && <>
      <p role="alert">グループを取得できませんでした。</p>
      <button type="button" disabled={disabled || loading} onClick={() => { void load(); }}>グループの読み込みを再試行</button>
    </>}
    {loaded && !error && groups.length === 0 && <p>「マイインスタンス → フレンドグループ」でグループを作成してください。</p>}
    {groups.length > 0 && <>
      <label htmlFor={`${id}-group`}>招待するグループ</label>
      <select id={`${id}-group`} value={selected} disabled={disabled || loading} onChange={event => { setSelected(event.target.value); setRetryUnknown(false); }}>
        <option value="">選択してください</option>
        {groups.map(item => <option key={item.id} value={item.id}>{item.name}（{item.members.length}人）</option>)}
      </select>
    </>}
    {group && <>
      <p>招待先: <strong>{state.options?.worldName ?? state.options?.worldId}</strong> ／ {group.name}（{group.members.length}人）</p>
      <ul>{group.members.map(member => <li key={member.id}>{member.displayName} — {statuses[state.invites?.[member.id]?.status] ?? '未送信'}</li>)}</ul>
      <p>メンバーへ順番に招待します。このインスタンスへの送信済みメンバーは除きます。</p>
      {unknown && <label><input type="checkbox" checked={retryUnknown} disabled={disabled} onChange={event => setRetryUnknown(event.target.checked)} />重複して届く可能性を確認し、結果不明のメンバーにも再送する</label>}
      <button type="button" disabled={disabled || loading || candidates.length === 0} onClick={() => {
        if (!disabled && candidates.length) { onSend(group.id, retryUnknown); setRetryUnknown(false); }
      }}>{candidates.length}人にまとめて招待</button>
    </>}
    {progress && <>
      <p role="status">{progress.groupName}: {sending ? '招待を送信中' : progress.status === 'stopped' ? '送信を停止しました' : '送信処理が完了しました'}（送信済み {progress.members.filter(member => state.invites?.[member.id]?.status === 'sent').length} / {progress.members.length}人）</p>
      <ul>{progress.members.map(member => <li key={member.id}>{member.displayName} — {statuses[state.invites?.[member.id]?.status] ?? (sending ? '待機中' : '未送信')}</li>)}</ul>
      {progress.error && <p role="alert">{progress.error.code === 'rateLimited' ? 'アクセスが集中したため停止しました。時間を置いて再試行してください。' : '通信または招待先の状態を確認できないため停止しました。送信結果を確認してください。'}</p>}
      {sending && <button type="button" disabled={busy || progress.cancelRequested} onClick={onCancel}>{progress.cancelRequested ? '送信中の招待が終わり次第停止します' : '残りの招待を停止'}</button>}
      {!sending && <p>失敗・未送信のメンバーには、グループを選んでもう一度送信できます。結果不明の再送には確認が必要です。</p>}
    </>}
  </section>;
}
