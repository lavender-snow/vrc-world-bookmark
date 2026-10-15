import { useEffect, useId, useRef, useState } from 'react';

import type { InstanceState } from 'src/types/vrchat-instance';
import type { FriendSummary } from 'src/types/vrchat-invite';

export function InviteControls({ state, busy, onSend }: {
  state: InstanceState; busy: boolean; onSend: (receiverId: string, resend: boolean) => void;
}) {
  const [receiver, setReceiver] = useState('self');
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [offline, setOffline] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const sequence = useRef(0);
  const mounted = useRef(true);
  const id = useId();
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; sequence.current++; };
  }, []);

  async function load(nextOffline: boolean, nextOffset: number) {
    const request = ++sequence.current;
    setExpanded(true); setLoading(true); setLoadError(false); setReceiver('self'); setAcknowledged(false);
    try {
      const result = await window.vrchatInvites.listFriends({ offline: nextOffline, offset: nextOffset });
      if (!mounted.current || request !== sequence.current) return;
      if (result.ok === false) { setLoadError(true); return; }
      setFriends(result.friends); setHasMore(result.hasMore); setOffset(nextOffset); setOffline(nextOffline); setSearch('');
    } catch { if (mounted.current && request === sequence.current) setLoadError(true); }
    finally { if (mounted.current && request === sequence.current) setLoading(false); }
  }

  const invite = state.invites?.[receiver];
  const unavailable = ['closing', 'closed', 'unknown'].includes(state.closeStatus);
  const sending = busy || Object.values(state.invites ?? {}).some(value => value.status === 'sending');
  const selected = friends.find(friend => friend.id === receiver);
  const name = receiver === 'self' ? '自分' : selected?.displayName;
  const visible = friends.filter(friend => friend.displayName.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return <section aria-label="インスタンスへの招待">
    <h3>インスタンスへ招待</h3>
    <p>招待先: <strong>{name ?? '選択してください'}</strong></p>
    <button type="button" disabled={sending || loading} onClick={() => { void load(offline, offset); }}>{expanded ? 'フレンド一覧を更新' : 'フレンドを表示'}</button>
    {expanded && <>
      <label htmlFor={`${id}-online`}>フレンドの状態</label>
      <select id={`${id}-online`} value={offline ? 'offline' : 'online'} disabled={sending || loading} onChange={event => { void load(event.target.value === 'offline', 0); }}>
        <option value="online">オンライン</option><option value="offline">オフライン</option>
      </select>
      <label htmlFor={`${id}-search`}>表示中のフレンドを検索</label>
      <input id={`${id}-search`} type="search" value={search} onChange={event => setSearch(event.target.value)} />
      <label htmlFor={`${id}-receiver`}>招待するユーザー</label>
      <select id={`${id}-receiver`} value={receiver} disabled={sending || loading || loadError} onChange={event => { setReceiver(event.target.value); setAcknowledged(false); }}>
        <option value="self">自分</option>
        {friends.filter(friend => visible.includes(friend) || friend.id === receiver).map(friend => <option key={friend.id} value={friend.id}>{friend.displayName}</option>)}
      </select>
      {!loading && !loadError && visible.length === 0 && <p>表示できるフレンドがいません。</p>}
      <div>
        <button type="button" disabled={sending || loading || offset === 0} onClick={() => { void load(offline, Math.max(0, offset - 100)); }}>前へ</button>
        <button type="button" disabled={sending || loading || !hasMore} onClick={() => { void load(offline, offset + 100); }}>次へ</button>
      </div>
    </>}
    {loading && <p role="status">フレンドを読み込んでいます…</p>}
    {loadError && <p role="alert">フレンドを取得できませんでした。接続やログイン状態を確認して、一覧を更新してください。</p>}
    {invite?.status === 'sent' && <p role="status">{invite.receiverName}に招待を送信しました。</p>}
    {invite?.status === 'failed' && <p role="alert">{
      invite.error?.code === 'rateLimited' ? 'アクセスが集中しています。時間を置いて再送してください。' :
        invite.error?.code === 'notFound' ? 'インスタンスが見つからないか、参加できません。' :
          invite.error?.code === 'forbidden' ? '招待が許可されませんでした。フレンド関係と公開範囲を確認してください。' : '招待を送信できませんでした。インスタンスの作成結果は保持されています。'
    }</p>}
    {invite?.status === 'unknown' && <>
      <p role="alert">招待の送信結果が不明です。すでに届いている可能性があります。</p>
      <label><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} />重複して届く可能性を確認して再送する</label>
    </>}
    {unavailable && <p>閉鎖中・閉鎖済み、または閉鎖結果が不明なインスタンスには招待を送信できません。</p>}
    <button type="button" disabled={unavailable || sending || !name || (invite?.status === 'unknown' && !acknowledged)} onClick={() => {
      if (unavailable || sending || !name) return;
      onSend(receiver, invite?.status === 'sent' || invite?.status === 'unknown'); setAcknowledged(false);
    }}>{sending ? '招待を送信中…' : invite?.status === 'sent' || invite?.status === 'unknown' || invite?.status === 'failed' ? '招待を再送する' : '招待を送信する'}</button>
  </section>;
}
