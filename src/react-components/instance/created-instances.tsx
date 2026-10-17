import { useEffect, useRef, useState } from 'react';

import styles from './created-instances.scss';
import { GroupInviteControls } from './group-invite-controls';
import { InviteControls } from './invite-controls';

import type { CreatedInstanceList, InstanceAccess, InstanceRegion } from 'src/types/vrchat-instance';

const accessNames: Record<InstanceAccess, string> = {
  public: 'Public', friendsPlus: 'Friends+', friends: 'Friends', invitePlus: 'Invite+', invite: 'Invite',
};
const regionNames: Record<InstanceRegion, string> = { jp: 'Japan', us: 'US West', use: 'US East', eu: 'Europe' };

function WorldThumbnail({ url, name }: { url?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return <div className={styles.thumbnail}>
    {url && !failed ? <img src={url} alt={`${name}のサムネイル`} loading="lazy" onError={() => setFailed(true)} /> : <span>画像なし</span>}
  </div>;
}

export function CreatedInstances() {
  const [list, setList] = useState<CreatedInstanceList | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmClose, setConfirmClose] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});
  const mounted = useRef(false);
  const running = useRef(false);
  const revision = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    mounted.current = true;
    async function refresh() {
      const requestRevision = revision.current;
      try {
        const next = await window.vrchatInstances.list();
        if (!cancelled && !running.current && requestRevision === revision.current) { setList(next); setError(false); }
      } catch {
        if (!cancelled && !running.current && requestRevision === revision.current) setError(true);
      }
      // Only read main's local history; do not poll VRChat.
      if (!cancelled) timer = setTimeout(refresh, 1500);
    }
    void refresh();
    return () => { cancelled = true; mounted.current = false; clearTimeout(timer); };
  }, []);

  async function perform(operation: () => Promise<CreatedInstanceList>) {
    if (running.current) return;
    running.current = true;
    revision.current++;
    setBusy(true);
    try {
      const next = await operation();
      if (mounted.current) { setList(next); setError(false); }
    } catch { if (mounted.current) setError(true); }
    finally { running.current = false; if (mounted.current) setBusy(false); }
  }

  return <section className={styles.list} aria-label="マイインスタンス">
    <h2>マイインスタンス</h2>
    <p>このアプリで作成したインスタンスです。ログアウト・アプリ終了で一覧はクリアされます。</p>
    {!list && !error && <p role="status">一覧を読み込んでいます…</p>}
    {error && <p role="alert">操作結果を確認できませんでした。一覧の状態を確認しています。</p>}
    {list && !list.loggedIn && <p>「設定 → VRChat」でログインしてください。</p>}
    {list?.loggedIn && list.instances.length === 0 && <p>作成済みのインスタンスはありません。ワールド一覧から作成できます。</p>}
    {list?.instances.map(instance => <article key={instance.instanceKey} className={styles.card} aria-label={instance.options.worldName ?? instance.options.worldId}>
      <header className={styles.cardHeader}>
        <WorldThumbnail key={instance.options.thumbnailImageUrl} url={instance.options.thumbnailImageUrl} name={instance.options.worldName ?? instance.options.worldId} />
        <div className={styles.worldDetails}>
          <h3>{instance.options.worldName ?? instance.options.worldId}</h3>
          <p>{accessNames[instance.options.access]} / {regionNames[instance.options.region]}</p>
          <p>作成日時: {new Date(instance.createdAt).toLocaleString('ja-JP')}</p>
        </div>
      </header>
      {instance.closeStatus === 'closing' && <p role="status">インスタンスを閉鎖しています…</p>}
      {instance.closeStatus === 'closed' && <p role="status">閉鎖済み</p>}
      {instance.closeStatus === 'failed' && <p role="alert">{
        instance.closeError?.code === 'forbidden' ? 'このインスタンスを閉鎖する権限がありません。' :
          instance.closeError?.code === 'rateLimited' ? 'アクセスが集中しています。時間を置いて再試行してください。' :
            instance.closeError?.code === 'notFound' ? 'インスタンスが見つかりません。' : 'インスタンスを閉鎖できませんでした。'
      }</p>}
      {instance.closeStatus === 'unknown' && <>
        <p role="alert">閉鎖結果が不明です。すでに閉じている可能性があります。</p>
        <label><input type="checkbox" checked={!!acknowledged[instance.instanceKey]} onChange={event => setAcknowledged(previous => ({ ...previous, [instance.instanceKey]: event.target.checked }))} />閉鎖を再実行することを確認しました</label>
      </>}
      {instance.closeStatus !== 'closed' && instance.canClose && (confirmClose === instance.instanceKey ? <div className={styles.confirm}>
        <p>このインスタンスへの新規参加を停止します。</p>
        <button type="button" disabled={busy || instance.groupInvite?.status === 'sending' || instance.closeStatus === 'closing' || Object.values(instance.invites ?? {}).some(invite => invite.status === 'sending') || (instance.closeStatus === 'unknown' && !acknowledged[instance.instanceKey])} onClick={() => {
          setConfirmClose(null);
          setAcknowledged(previous => ({ ...previous, [instance.instanceKey]: false }));
          void perform(() => window.vrchatInstances.close({ instanceKey: instance.instanceKey, retry: instance.closeStatus === 'unknown' }));
        }}>閉鎖を実行する</button>
        <button type="button" disabled={busy} onClick={() => setConfirmClose(null)}>キャンセル</button>
      </div> : <button type="button" className={styles.closeButton} disabled={busy || instance.groupInvite?.status === 'sending' || instance.closeStatus === 'closing' || Object.values(instance.invites ?? {}).some(invite => invite.status === 'sending') || (instance.closeStatus === 'unknown' && !acknowledged[instance.instanceKey])} onClick={() => setConfirmClose(instance.instanceKey)}>
        {instance.closeStatus === 'failed' || instance.closeStatus === 'unknown' ? '閉鎖を再試行する' : 'インスタンスを閉じる'}
      </button>)}
      {!instance.canClose && <p>所有者本人のインスタンスのみ閉鎖できます。</p>}
      {!['closing', 'closed', 'unknown'].includes(instance.closeStatus) && <details>
        <summary>このインスタンスへ招待</summary>
        <InviteControls state={instance} busy={busy} onSend={(receiverId, resend) => {
          void perform(async () => {
            await window.vrchatInvites.send({ worldId: instance.options.worldId, instanceKey: instance.instanceKey, receiverId, resend });
            return window.vrchatInstances.list();
          });
        }} />
        <GroupInviteControls state={instance} busy={busy} onSend={(groupId, retryUnknown) => {
          void perform(async () => {
            await window.vrchatGroups.send({ worldId: instance.options.worldId, instanceKey: instance.instanceKey, groupId, retryUnknown });
            return window.vrchatInstances.list();
          });
        }} onCancel={() => {
          void perform(async () => { await window.vrchatGroups.cancel(instance.instanceKey); return window.vrchatInstances.list(); });
        }} />
      </details>}
    </article>)}
  </section>;
}
