import { useEffect, useId, useRef, useState } from 'react';

import styles from './instance-creator.scss';

import type { InstanceAccess, InstanceRegion, InstanceState } from 'src/types/vrchat-instance';

const accessNames: Record<InstanceAccess, string> = {
  public: 'Public', friendsPlus: 'Friends+', friends: 'Friends', invitePlus: 'Invite+', invite: 'Invite',
};
const regionNames: Record<InstanceRegion, string> = { jp: 'Japan', us: 'US West', use: 'US East', eu: 'Europe' };

export function InstanceCreator({ worldId, worldName }: { worldId: string; worldName: string }) {
  const [opened, setOpened] = useState(false);
  return <section className={styles.creator}>
    <button type="button" aria-haspopup="dialog" aria-expanded={opened} onClick={() => setOpened(true)}>インスタンスを作成</button>
    {opened && <CreationModal key={worldId} worldId={worldId} worldName={worldName} onClose={() => setOpened(false)} />}
  </section>;
}

function CreationModal({ worldId, worldName, onClose }: { worldId: string; worldName: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previousFocus = document.activeElement;
    const element = dialog.current;
    // Native modal dialogs make the background inert and contain keyboard focus.
    element.showModal();
    return () => {
      element.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);
  return <dialog ref={dialog} className={styles.modal} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className={styles.modalHeader}>
      <h2 id={titleId}>インスタンスを作成</h2>
      <button type="button" onClick={onClose} aria-label="作成モーダルを閉じる">閉じる</button>
    </header>
    <CreationPanel worldId={worldId} worldName={worldName} />
  </dialog>;
}

function CreationPanel({ worldId, worldName }: { worldId: string; worldName: string }) {
  const [state, setState] = useState<InstanceState | null>(null);
  const [access, setAccess] = useState<InstanceAccess>('invitePlus');
  const [region, setRegion] = useState<InstanceRegion>('jp');
  const [busy, setBusy] = useState(false);
  const [communicationError, setCommunicationError] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const mounted = useRef(false);
  const running = useRef(false);
  const revision = useRef(0);
  const id = useId();

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    mounted.current = true;
    async function refresh() {
      const requestRevision = revision.current;
      try {
        const next = await window.vrchatInstances.getState(worldId);
        if (cancelled) return;
        if (!running.current && requestRevision === revision.current) { setState(next); setCommunicationError(false); }
      } catch { if (!cancelled && !running.current && requestRevision === revision.current) setCommunicationError(true); }
      // Read main's cached state only; this does not poll the remote API.
      if (!cancelled) timer = setTimeout(refresh, 1500);
    }
    void refresh();
    return () => { cancelled = true; mounted.current = false; clearTimeout(timer); };
  }, [worldId]);

  async function perform(operation: () => Promise<InstanceState>) {
    if (running.current) return;
    running.current = true;
    revision.current++;
    setBusy(true);
    setCommunicationError(false);
    try {
      const next = await operation();
      if (mounted.current) setState(next);
    } catch {
      // Do not retry a create call after an IPC failure; recover the main state instead.
      if (mounted.current) setCommunicationError(true);
    } finally {
      running.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  const creating = busy || state?.status === 'creating';
  const needsReset = state?.status === 'created' || state?.status === 'unknown';
  return <div className={styles.panel} aria-label="インスタンス作成">
    <h3>{worldName} のインスタンス</h3>
    {!state && !communicationError && <p role="status">ログイン状態を確認しています…</p>}
    {communicationError && <p role="alert">操作結果を確認できませんでした。作成を再送せず、状態を確認しています。</p>}
    {state && !state.loggedIn && <p>作成するには「設定 → VRChat」でログインしてください。</p>}
    {state?.loggedIn && <>
      {state.status === 'created' && <div role="status">
        <p>インスタンスを作成しました。</p>
        <p>{accessNames[state.options.access]} / {regionNames[state.options.region]}</p>
        <p>作成日時: {new Date(state.createdAt).toLocaleString('ja-JP')}</p>
      </div>}
      {state.status === 'unknown' && <p role="alert">作成結果が不明です。インスタンスが作成されている可能性があります。再作成すると重複する場合があります。</p>}
      {state.status === 'failed' && <p role="alert">{
        state.error?.code === 'rateLimited' ? 'アクセスが集中しています。時間を置いて再試行してください。' :
          state.error?.code === 'forbidden' ? 'このワールドのインスタンスを作成する権限がありません。' :
            state.error?.code === 'notFound' ? 'ワールドが見つからないか、アクセスできません。' :
              state.error?.code === 'busy' ? '認証処理が進行中です。完了してから再試行してください。' : '作成できませんでした。入力内容とログイン状態を確認してください。'
      }</p>}
      {needsReset ? <>
        {state.status === 'unknown' && <label><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} />重複して作成される可能性を確認しました</label>}
        <button type="button" disabled={creating || (state.status === 'unknown' && !acknowledged)} onClick={() => {
          setAcknowledged(false);
          void perform(() => window.vrchatInstances.reset(worldId));
        }}>別のインスタンスの作成に進む</button>
      </> : <form onSubmit={event => {
        event.preventDefault();
        if (creating || communicationError) return;
        void perform(() => window.vrchatInstances.create({ worldId, access, region }));
      }}>
        <fieldset disabled={creating || communicationError}>
          <label htmlFor={`${id}-access`}>公開範囲</label>
          <select id={`${id}-access`} value={access} onChange={event => setAccess(event.target.value as InstanceAccess)}>
            {Object.entries(accessNames).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
          </select>
          <label htmlFor={`${id}-region`}>リージョン</label>
          <select id={`${id}-region`} value={region} onChange={event => setRegion(event.target.value as InstanceRegion)}>
            {Object.entries(regionNames).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
          </select>
          <button type="submit" disabled={creating || communicationError}>{creating ? '作成中…' : 'この設定で作成'}</button>
        </fieldset>
      </form>}
    </>}
  </div>;
}
