import { useEffect, useId, useRef, useState } from 'react';

import styles from './friend-groups.scss';

import type { FriendGroup, GroupList, GroupMember } from 'src/types/vrchat-groups';
import type { FriendSummary } from 'src/types/vrchat-invite';

export function FriendGroups() {
  const [list, setList] = useState<GroupList | null>(null);
  const [editingId, setEditingId] = useState<string>();
  const [name, setName] = useState('');
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [offline, setOffline] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string>();
  const owner = useRef<string | null>(null);
  const mounted = useRef(false);
  const running = useRef(false);
  const sequence = useRef(0);
  const revision = useRef(0);
  const id = useId();

  function edit(group?: FriendGroup) {
    setEditingId(group?.id); setName(group?.name ?? ''); setMembers(group?.members ?? []);
    setDeleteId(undefined); setMessage(''); setError('');
  }

  function receive(next: GroupList) {
    if (next.ok && next.accountId !== owner.current) {
      owner.current = next.accountId;
      sequence.current++;
      edit(); setFriends([]); setLoading(false); setOffset(0); setHasMore(false); setSearch('');
    }
    setList(next);
  }

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    mounted.current = true;
    async function refresh() {
      if (!running.current) {
        const requestRevision = revision.current;
        try {
          const next = await window.vrchatGroups.list();
          if (!cancelled && !running.current && requestRevision === revision.current) receive(next);
        } catch { if (!cancelled && !running.current && requestRevision === revision.current) setList({ ok: false, error: { code: 'unexpected' } }); }
      }
      if (!cancelled) timer = setTimeout(refresh, 1500);
    }
    void refresh();
    return () => { cancelled = true; mounted.current = false; sequence.current++; clearTimeout(timer); };
  }, []);

  async function loadFriends(nextOffline: boolean, nextOffset: number) {
    const request = ++sequence.current;
    setLoading(true); setError('');
    try {
      const next = await window.vrchatInvites.listFriends({ offline: nextOffline, offset: nextOffset });
      if (!mounted.current || request !== sequence.current) return;
      if (next.ok === false) { setError('フレンドを取得できませんでした。時間を置いて更新してください。'); return; }
      setFriends(next.friends); setOffline(nextOffline); setOffset(nextOffset); setHasMore(next.hasMore); setSearch('');
    } catch { if (mounted.current && request === sequence.current) setError('フレンドを取得できませんでした。'); }
    finally { if (mounted.current && request === sequence.current) setLoading(false); }
  }

  async function mutate(operation: () => Promise<GroupList>, deleted = false) {
    if (running.current) return;
    revision.current++;
    running.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const next = await operation();
      if (!mounted.current) return;
      if (next.ok === false) {
        setError(next.error.code === 'storage' ? '保存できませんでした。既存のグループは変更されていません。' :
          next.error.code === 'cancelled' || next.error.code === 'unauthorized' ? 'ログイン状態が変わりました。一覧を確認してください。' : '保存できませんでした。名前・人数・フレンド一覧を確認してください。');
        return;
      }
      receive(next); edit(); setMessage(deleted ? 'グループを削除しました。' : 'グループを保存しました。');
    } catch { if (mounted.current) setError('操作結果を確認できませんでした。一覧を確認してください。'); }
    finally { running.current = false; if (mounted.current) setBusy(false); }
  }

  const ready = list?.ok === true && !!list.accountId;
  const visible = friends.filter(friend => friend.displayName.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return <section className={styles.groups} aria-label="フレンドグループ">
    <h2>フレンドグループ</h2>
    <p>一緒に移動するフレンドをまとめておきましょう。グループはこのアプリにアカウントごとに保存され、再起動後も使えます。</p>
    <p>保存したグループは、作成済みインスタンスの招待画面で選べます。</p>
    {!list && <p role="status">グループを読み込んでいます…</p>}
    {list?.ok === false && <p role="alert">グループを読み込めませんでした。保存データやログイン状態を確認してください。</p>}
    {list?.ok === true && !list.accountId && <p>「設定 → VRChat」でログインしてください。</p>}
    {ready && <>
      <div className={styles.saved}>
        <button type="button" disabled={busy} onClick={() => edit()}>新しいグループ</button>
        {list.ok && list.groups.length === 0 && <p>まだグループがありません。</p>}
        {list.ok && list.groups.map(group => <article key={group.id}>
          <strong>{group.name}</strong><span>{group.members.length}人</span>
          <button type="button" disabled={busy} onClick={() => edit(group)}>「{group.name}」を編集</button>
          <button type="button" disabled={busy} onClick={() => setDeleteId(group.id)}>「{group.name}」を削除</button>
          {deleteId === group.id && <div role="group" aria-label="グループ削除の確認">
            <p>「{group.name}」を削除しますか？</p>
            <button type="button" disabled={busy} onClick={() => { void mutate(() => window.vrchatGroups.remove({ accountId: list.accountId, id: group.id }), true); }}>削除を実行する</button>
            <button type="button" disabled={busy} onClick={() => setDeleteId(undefined)}>キャンセル</button>
          </div>}
        </article>)}
      </div>
      <form onSubmit={event => {
        event.preventDefault();
        if (!ready || busy || loading || !name.trim()) return;
        void mutate(() => window.vrchatGroups.save({ accountId: list.ok ? list.accountId : '', id: editingId, name, memberIds: members.map(member => member.id) }));
      }}>
        <h3>{editingId ? 'グループを編集' : 'グループを作成'}</h3>
        <fieldset disabled={busy || loading}>
          <label htmlFor={`${id}-name`}>グループ名</label>
          <input id={`${id}-name`} value={name} maxLength={80} required onChange={event => setName(event.target.value)} />
          <h4>選択中のメンバー（{members.length} / 100人）</h4>
          {members.length === 0 && <p>フレンド一覧からメンバーを選んでください。</p>}
          <ul className={styles.members}>{members.map(member => <li key={member.id}>
            <span>{member.displayName}</span>
            <button type="button" aria-label={`${member.displayName}を外す`} onClick={() => setMembers(previous => previous.filter(item => item.id !== member.id))}>外す</button>
          </li>)}</ul>
          <button type="button" onClick={() => { void loadFriends(offline, offset); }}>フレンド一覧を更新</button>
          <label htmlFor={`${id}-state`}>フレンドの状態</label>
          <select id={`${id}-state`} value={offline ? 'offline' : 'online'} onChange={event => { void loadFriends(event.target.value === 'offline', 0); }}>
            <option value="online">オンライン</option><option value="offline">オフライン</option>
          </select>
          <label htmlFor={`${id}-search`}>表示中のフレンドを検索</label>
          <input id={`${id}-search`} type="search" value={search} onChange={event => setSearch(event.target.value)} />
          <div className={styles.choices}>{visible.map(friend => {
            const selected = members.some(member => member.id === friend.id);
            return <label key={friend.id}><input type="checkbox" checked={selected} disabled={!selected && members.length >= 100} onChange={event => {
              setMembers(previous => event.target.checked ? [...previous, { id: friend.id, displayName: friend.displayName }] : previous.filter(member => member.id !== friend.id));
            }} />{friend.displayName}</label>;
          })}</div>
          {!loading && visible.length === 0 && <p>表示できるフレンドがいません。一覧を更新するか、状態を切り替えてください。</p>}
          <div className={styles.actions}>
            <button type="button" disabled={offset === 0} onClick={() => { void loadFriends(offline, Math.max(0, offset - 100)); }}>前へ</button>
            <span>{offset + 1}件目から</span>
            <button type="button" disabled={!hasMore} onClick={() => { void loadFriends(offline, offset + 100); }}>次へ</button>
          </div>
          <button type="submit" disabled={!name.trim()}>グループを保存</button>
        </fieldset>
      </form>
    </>}
    {loading && <p role="status">フレンドを読み込んでいます…</p>}
    {message && <p role="status">{message}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
