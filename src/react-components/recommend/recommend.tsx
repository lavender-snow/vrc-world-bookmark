import classNames from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';

import styles from './recommend.scss';

import { ReactComponent as UpdateIcon } from 'assets/images/MynauiRefresh.svg';
import { Button } from 'commonComponents/button';
import { InputText } from 'commonComponents/input-text';
import { WorldCard } from 'commonComponents/world-card';
import { RECOMMEND_TYPE } from 'src/consts/const';
import { useAppData } from 'src/contexts/app-data-provider';
import { useRecommendState } from 'src/contexts/recommend-provider';

export function Recommend() {
  const { vrchatWorldInfo, setVRChatWorldInfo, getRecommendWorld, getLLMRecommendWorld, recommendType, setRecommendType, requestMessage, setRequestMessage, loading, reason } = useRecommendState();
  const { llmEnabled } = useAppData();

  const onGetWorldClick = async () => {
    if (loading) return;

    if (recommendType === 'conversation') {
      getLLMRecommendWorld();
    } else {
      getRecommendWorld();
    }
  };

  const currentType = RECOMMEND_TYPE.find(type => type.id === recommendType);

  return (
    <AnimatePresence mode='wait'>
      <motion.div
        className={styles.recommendContainer}
        key="recommend"
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ duration: 0.3 }}
      >
        <div className={styles.recommendOptionsWrapper}>
          <div className={styles.recommendTypeSelector}>
            <div className={styles.recommendTypeRadioGroup}>
              {RECOMMEND_TYPE.map((type) => (
                <label key={type.id}>
                  <input
                    type="radio"
                    name="recommendType"
                    value={type.id}
                    checked={recommendType === type.id}
                    onChange={() => setRecommendType(type.id)}
                    disabled={loading}
                  />
                  <strong>{type.label}</strong>
                </label>
              ))}
            </div>


            {currentType && (
              <span>{currentType.description}</span>
            )}
            {currentType && currentType.id === 'conversation' && (
              <InputText value={requestMessage} onChange={(e) => setRequestMessage(e.target.value)} placeholder='ワールドの希望条件を入力(オプション)' disabled={loading} />
            )}
            <Button onClick={onGetWorldClick} className={classNames(styles.fetchButton)} disabled={loading || (currentType.id === 'conversation' && !llmEnabled)}>
              { loading ? (
                <>
                  <UpdateIcon className={styles.rotateIcon}/>
                  <span>取得中...</span>
                </>
              ) : (
                <>
                  <span>ワールド取得</span>
                </>
              )}
            </Button>
            {currentType.id === 'conversation' && !llmEnabled && (
              <div className={styles.llmDisabledNotice}>
                <span>LLMが有効ではありません。設定から認証情報を登録してください。</span>
              </div>
            )}
          </div>
          {reason && (
            <div className={styles.recommendReasonBox}>
              <strong>選定理由</strong><br />
              <span>{reason}</span>
            </div>
          )}
        </div>
        <div>
          {vrchatWorldInfo && (
            <WorldCard worldInfo={vrchatWorldInfo} setVRChatWorldInfo={setVRChatWorldInfo} />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
