import classNames from 'classnames';

import style from './world-tags.scss';

import { checkTag } from 'src/utils/util';

export function WorldTags({ tags }: { tags: string[] }) {
  return (
    <div className={style.worldTags}>
      {tags.map((tag) => {
        const {isChill, isHorror, isGame, isAdmin} = checkTag(tag);

        return (
          <div key={tag} className={classNames(
            style.worldTag,
            isChill && style.chillWorldTag,
            isHorror && style.horrorWorldTag,
            isGame && style.gameWorldTag,
            isAdmin && style.adminWorldTag,
          )}>
            {tag}
          </div>
        );
      })}
    </div>
  );
}
