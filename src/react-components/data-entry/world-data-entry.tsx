import classNames from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';

import styles from './world-data-entry.scss';

import { Button } from 'commonComponents/button';
import { InputText } from 'commonComponents/input-text';
import { WorldCard } from 'commonComponents/world-card';
import { NoticeType, UPSERT_RESULT } from 'src/consts/const';
import { useToast } from 'src/contexts/toast-provider';
import { useWorldDataEntryState } from 'src/contexts/world-data-entry-provider';
import { debounce, getWorldId } from 'src/utils/util';

export function WorldDataEntry() {
  const { addToast } = useToast();
  const { worldIdOrUrl, setWorldIdOrUrl, vrchatWorldInfo, setVRChatWorldInfo }= useWorldDataEntryState();
  const [isWorldIdOrUrl, setIsWorldIdOrUrl] = useState<boolean | null>(null);
  const [pending, setPending] = useState<'manual' | 'current' | null>(null);
  const running = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const debouncedSetIsWorldIdOrUrl = useCallback(
    debounce((value: string) => {
      if (!mounted.current) return;
      if (value.length === 0) {
        setIsWorldIdOrUrl(null);
        return;
      }

      setIsWorldIdOrUrl(getWorldId(value) !== null);
    }, 500),
    [],
  );

  function onChangeWorldIdOrUrl(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value;
    setWorldIdOrUrl(newValue);
    debouncedSetIsWorldIdOrUrl(newValue);
  }

  function onKeyDownInputText(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      onClickGetWorldInfo();
    }
  }

  async function onClickGetWorldInfo() {
    const worldId = getWorldId(worldIdOrUrl);
    if (worldId) {
      await registerWorld('manual', worldId);
    } else {
      addToast('ワールドIDまたはURLが無効です。正しい形式で入力してください。', NoticeType.error);
    }
  }

  async function registerWorld(source: 'manual' | 'current', worldId?: string) {
    if (running.current) return;
    running.current = true;
    setPending(source);
    try {
      if (source === 'current') {
        const current = await window.vrchatAPI.getCurrentWorld();
        if (!mounted.current) return;
        if (current.ok === false) {
          const messages: Partial<Record<typeof current.error.code, string>> = {
            unauthorized: '設定の「VRChat」で、ゲームと同じアカウントにログインしてください。',
            notInWorld: '現在いるワールドを取得できません。VRChatでワールドに入ってから再試行してください。移動中は到着後にお試しください。',
            rateLimited: 'アクセスが集中しています。時間を置いて再試行してください。',
            busy: 'ログイン処理中です。完了してから再試行してください。',
            cancelled: 'ログイン状態が変更されました。再試行してください。',
          };
          addToast(messages[current.error.code] ?? '現在いるワールドを取得できませんでした。接続を確認して再試行してください。', NoticeType.error);
          return;
        }
        worldId = current.worldId;
        setWorldIdOrUrl(worldId);
        debouncedSetIsWorldIdOrUrl(worldId);
        setIsWorldIdOrUrl(true);
      }
      const response = await window.dbAPI.addOrUpdateWorldInfo(worldId);
      if (!mounted.current) return;
      if (response.error) {
        addToast(`ワールド情報の取得に失敗しました。エラー: ${response.error}`, NoticeType.error);
      } else if (response.data && response.upsertResult) {
        if (response.upsertResult === UPSERT_RESULT.insert) {
          addToast('新しいワールド情報を登録しました。', NoticeType.success);
        } else if (response.upsertResult === UPSERT_RESULT.update) {
          addToast('既存のワールド情報を更新しました。', NoticeType.info);
        }
        setVRChatWorldInfo(response.data);
      } else {
        addToast('予期せぬエラーが発生しました。', NoticeType.error);
      }
    } catch {
      if (mounted.current) addToast('ワールドの登録に失敗しました。接続を確認して再試行してください。', NoticeType.error);
    } finally {
      running.current = false;
      if (mounted.current) setPending(null);
    }
  }

  const validInput = worldIdOrUrl.length > 0 && isWorldIdOrUrl === true;
  const invalidInput = worldIdOrUrl.length > 0 && isWorldIdOrUrl === false;

  return (
    <AnimatePresence mode='wait'>
      <motion.div
        className={classNames(styles.worldDataEntry)}
        key="list"
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ duration: 0.3 }}
      >
        <div className={classNames(styles.searchArea)}>
          <div className={styles.currentWorld}>
            <Button disabled={pending !== null} onClick={() => { void registerWorld('current'); }} className={styles.searchButton}>
              {pending === 'current' ? '現在のワールドを登録中…' : '今いるワールドを登録'}
            </Button>
            <p>設定の「VRChat」でゲームと同じアカウントにログインしてください。</p>
          </div>
          <div className={classNames(styles.searchInput)}>
            <InputText
              value={worldIdOrUrl}
              disabled={pending !== null}
              onChange={onChangeWorldIdOrUrl}
              onKeyDown={onKeyDownInputText}
              onBlur={() => setIsWorldIdOrUrl(getWorldId(worldIdOrUrl) !== null)}
              placeholder='World ID or World URL'
              className={classNames([
                styles.searchInputText,
                validInput && styles.validInput,
                invalidInput && styles.invalidInput,
              ])}
            />
            <Button disabled={pending !== null || worldIdOrUrl.length === 0 || invalidInput} onClick={onClickGetWorldInfo} className={classNames(styles.searchButton)}>
              {pending === 'manual' ? '登録中…' : 'ワールド情報登録'}
            </Button>
          </div>
          <div className={styles.searchInputMessage}>
            {invalidInput ? (
              <span className={styles.invalidMessage}>
                無効なワールドIDまたはURLです。正しい形式で入力してください。
              </span>
            ) : validInput ? (
              <span className={styles.validMessage}>
                正しいワールドIDまたはURLです。
              </span>
            ) : (
              <span className={styles.defaultMessage}>
                ワールドIDまたはURLを入力してください。
              </span>
            )}
          </div>
        </div>
        <div className={classNames(styles.searchResult)}>
          {vrchatWorldInfo && (
            <WorldCard worldInfo={vrchatWorldInfo} setVRChatWorldInfo={setVRChatWorldInfo}/>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
