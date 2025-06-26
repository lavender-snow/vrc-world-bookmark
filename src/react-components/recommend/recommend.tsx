import classNames from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';

import styles from './recommend.scss';

import { Button } from 'commonComponents/button';
import { InputText } from 'commonComponents/input-text';
import { WorldCard } from 'commonComponents/world-card';
import { RECOMMEND_TYPE } from 'src/consts/const';
import { useRecommendState } from 'src/contexts/recommend-provider';

export function Recommend() {
  const { vrchatWorldInfo, getRecommendWorld, recommendType, setRecommendType } = useRecommendState();

  const onGetWorldClick = async () => {
    getRecommendWorld();
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
                  disabled={'conversation' === type.id}
                />
                <span>{type.label}</span>
              </label>
            ))}
          </div>


          {currentType && (
            <span>{currentType.description}</span>
          )}
          {currentType && currentType.id === 'conversation' && (
            <InputText value={''} onChange={() => {}} placeholder='ワールドの希望条件を入力(オプション)'/>
          )}
          <Button onClick={onGetWorldClick} className={classNames(styles.fetchButton)}>
            ワールド取得
          </Button>
        </div>
        <div>
          {vrchatWorldInfo && (
            <WorldCard worldInfo={vrchatWorldInfo} />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
