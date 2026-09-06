import { useCallback, useEffect, useRef, useState } from 'react';

import styles from './vrchat-settings.scss';

import { ReactComponent as GameIcon } from 'assets/images/IonGameControllerOutline.svg';
import { SettingsHeader } from 'src/react-components/settings/settings-header';
import type { AuthError, AuthErrorCode, AuthResult, AuthState, TwoFactorInput } from 'src/types/vrchat-auth';

const errorMessages: Record<AuthErrorCode, string> = {
  invalidInput: '入力内容を確認してください。',
  busy: '別の認証処理が進行中です。少し待ってから操作してください。',
  cancelled: '認証処理がキャンセルされました。',
  unauthorized: '認証できませんでした。ログイン情報または確認コードを確認してください。',
  forbidden: 'このアカウントでは操作が許可されていません。',
  notFound: '認証に必要な情報が見つかりませんでした。',
  rateLimited: 'アクセスが集中しています。時間を置いて再試行してください。',
  server: 'VRChatで一時的な問題が発生しています。時間を置いて再試行してください。',
  network: 'VRChatに接続できませんでした。接続を確認して再試行してください。',
  timeout: '通信がタイムアウトしました。時間を置いて再試行してください。',
  invalidResponse: '認証結果を確認できませんでした。時間を置いて再試行してください。',
  storage: 'ログイン情報の保存または読み込みに失敗しました。',
  unexpected: '認証処理に失敗しました。再試行してください。',
};

export function VRChatSettings() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [error, setError] = useState<AuthError | null>(null);
  const [pending, setPending] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [method, setMethod] = useState<TwoFactorInput['method']>('totp');
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const mounted = useRef(false);
  const sequence = useRef(0);
  const inFlight = useRef(false);

  const receive = useCallback((state: AuthState, failure?: AuthError) => {
    setAuth(state);
    const nextError = failure ?? state.error ?? null;
    setError(nextError);
    if (nextError?.code === 'rateLimited') {
      setNow(Date.now());
      setRetryAt(Date.now() + (nextError.retryAfterMs ?? 1000));
    }
  }, []);

  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    try {
      const state = await window.vrchatAuth.getAuthState();
      if (mounted.current && request === sequence.current) receive(state);
    } catch {
      if (mounted.current && request === sequence.current) setError({ code: 'unexpected' });
    }
  }, [receive]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => { mounted.current = false; sequence.current++; };
  }, [refresh]);

  // Startup restoration and operations started before opening this tab finish in main.
  useEffect(() => {
    if (pending || (error && error.code !== 'busy') || (auth?.status !== 'restoring' && auth?.status !== 'loggingIn')) return;
    const timer = setTimeout(() => { void refresh(); }, 750);
    return () => clearTimeout(timer);
  }, [auth, error, pending, refresh]);

  useEffect(() => {
    if (retryAt <= now) return;
    const timer = setTimeout(() => setNow(Date.now()), 1000);
    return () => clearTimeout(timer);
  }, [retryAt, now]);

  const methods = auth?.status === 'twoFactorRequired'
    ? auth.methods.filter((value): value is TwoFactorInput['method'] => value === 'totp' || value === 'emailOtp') : [];
  const selectedMethod = methods.includes(method) ? method : methods[0];
  const cooldown = Math.max(0, Math.ceil((retryAt - now) / 1000));
  const remoteBusy = auth?.status === 'restoring' || auth?.status === 'loggingIn';
  const disabled = pending || remoteBusy || cooldown > 0;

  async function execute(operation: () => Promise<AuthResult>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError(null);
    const request = ++sequence.current;
    try {
      const result = await operation();
      if (mounted.current && request === sequence.current) receive(result.state, result.ok === false ? result.error : undefined);
    } catch {
      if (mounted.current && request === sequence.current) setError({ code: 'unexpected' });
    } finally {
      inFlight.current = false;
      if (mounted.current && request === sequence.current) setPending(false);
    }
  }

  function login(event: React.FormEvent) {
    event.preventDefault();
    if (disabled || !username.trim() || !password) return;
    const input = { username, password };
    setPassword('');
    void execute(() => window.vrchatAuth.login(input));
  }

  function verify(event: React.FormEvent) {
    event.preventDefault();
    if (disabled || !selectedMethod || !/^\d{6}$/.test(code)) return;
    const input = { method: selectedMethod, code };
    setCode('');
    void execute(() => window.vrchatAuth.verifyTwoFactor(input));
  }

  const showLogin = auth && ['signedOut', 'expired', 'restoreFailed'].includes(auth.status);
  return (
    <section className={styles.settings} aria-label="VRChatアカウント">
      <SettingsHeader Icon={GameIcon} title="VRChat" />
      <p>VRChatアカウントでログインします。</p>
      <div role="status" aria-live="polite">
        {!auth && !error && 'ログイン状態を確認しています…'}
        {auth?.status === 'restoring' && '保存済みのログイン情報を確認しています…'}
        {auth?.status === 'loggingIn' && 'ログインしています…'}
        {auth?.status === 'signedOut' && '未ログイン'}
        {auth?.status === 'expired' && 'ログインの有効期限が切れました。もう一度ログインしてください。'}
        {auth?.status === 'restoreFailed' && '前回のログイン状態を復元できませんでした。'}
        {auth?.status === 'authenticated' && <><strong>{auth.user.displayName}</strong> としてログイン中</>}
        {pending && ' 処理中…'}
      </div>
      {error && <p role="alert" className={styles.error}>
        {error.code === 'storage' && auth?.status === 'authenticated'
          ? 'ログインできましたが、保存できませんでした。アプリを終了すると再ログインが必要です。'
          : errorMessages[error.code]}
        {cooldown > 0 && ` あと${cooldown}秒で再試行できます。`}
      </p>}
      {error && (!auth || remoteBusy) && <button className={styles.action} disabled={pending} onClick={() => { void refresh(); }}>状態を再確認</button>}
      {auth?.status === 'restoreFailed' && <button className={styles.action} disabled={disabled} onClick={() => { void execute(() => window.vrchatAuth.restoreSession()); }}>ログイン状態を復元</button>}
      {showLogin && <form onSubmit={login}>
        <fieldset disabled={disabled} className={styles.form}>
          <legend>ログイン</legend>
          <label htmlFor="vrchat-username">ユーザー名</label>
          <input id="vrchat-username" autoComplete="username" value={username} maxLength={1024} required onChange={event => setUsername(event.target.value)} />
          <label htmlFor="vrchat-password">パスワード</label>
          <input id="vrchat-password" type="password" autoComplete="current-password" value={password} maxLength={4096} required onChange={event => setPassword(event.target.value)} />
          <p className={styles.hint}>パスワードと確認コードは保存しません。ログイン状態は暗号化して保存します。</p>
          <button type="submit" className={styles.action} disabled={disabled || !username.trim() || !password}>ログイン</button>
        </fieldset>
      </form>}
      {auth?.status === 'twoFactorRequired' && <>
        {selectedMethod ? <form onSubmit={verify}>
          <fieldset disabled={disabled} className={styles.form}>
            <legend>本人確認</legend>
            {methods.length > 1 && <><label htmlFor="vrchat-method">確認方法</label>
              <select id="vrchat-method" value={selectedMethod} onChange={event => { setMethod(event.target.value as TwoFactorInput['method']); setCode(''); }}>
                {methods.map(value => <option key={value} value={value}>{value === 'totp' ? '認証アプリ' : 'メール'}</option>)}
              </select></>}
            <p>{selectedMethod === 'totp' ? '認証アプリに表示される6桁のコードを入力してください。' : 'VRChatからメールで届いた6桁のコードを入力してください。'}</p>
            <label htmlFor="vrchat-code">確認コード</label>
            <input id="vrchat-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} required onChange={event => setCode(event.target.value)} />
            <button type="submit" className={styles.action} disabled={disabled || !/^\d{6}$/.test(code)}>確認する</button>
          </fieldset>
        </form> : <p role="alert">このアカウントの確認方法にはまだ対応していません。ログインを中止してください。</p>}
        <button className={styles.action} disabled={pending} onClick={() => { setCode(''); void execute(() => window.vrchatAuth.logout()); }}>ログインを中止</button>
      </>}
      {auth?.status === 'authenticated' && <>
        <p className={styles.hint}>{auth.persistence === 'saved' ? '次回の起動時にログイン状態を復元します。' : 'この起動中のみログイン状態を保持します。'}</p>
        <button className={styles.action} disabled={pending} onClick={() => { setPassword(''); setCode(''); void execute(() => window.vrchatAuth.logout()); }}>ログアウト</button>
      </>}
    </section>
  );
}
