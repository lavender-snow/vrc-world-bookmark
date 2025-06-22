import classNames from 'classnames';

import styles from './world-tags.scss';

import { checkTag } from 'src/utils/util';

export function WorldTags({ tags }: { tags: string[] }) {
  return (
    <div className={styles.worldTags}>
      {tags.map((tag) => {
        const {isChill, isHorror, isGame, isAdmin} = checkTag(tag);

        return (
          <div key={tag} className={classNames(
            styles.worldTag,
            isChill && styles.chillWorldTag,
            isHorror && styles.horrorWorldTag,
            isGame && styles.gameWorldTag,
            isAdmin && styles.adminWorldTag,
          )}>
            {tag}
          </div>
        );
      })}
    </div>
  );
}
