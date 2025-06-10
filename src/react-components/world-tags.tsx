import classNames from 'classnames';

import style from './world-tags.scss';

export function WorldTags({ tags }: { tags: string[] }) {
  return (
    <div className={style.worldTags}>
      {tags.map((tag) => {
        const lowerTag = tag.toLowerCase();
        const isChill = lowerTag === 'author_tag_chill';
        const isHorror = lowerTag === 'author_tag_horror';
        const isGame = ['author_tag_game', 'author_tag_riddle'].includes(lowerTag);
        const isAdmin = lowerTag.startsWith('admin_');

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
