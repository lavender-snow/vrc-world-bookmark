import classNames from "classnames";
import { useState } from "react";
import type { VRChatWorld } from "../types/vrchat";
import style from "./world-card.scss";
import { ReactComponent as StarOutlineIcon } from "../../assets/images/MaterialSymbolsKidStarOutline.svg";
import { ReactComponent as MailSendIcon } from "../../assets/images/IconoirSendMail.svg";
import { Button } from "./common/button";

function WorldProperty({ name, value }: { name: string, value: string | number }) {
  return (
    <div className={classNames(style.worldProperty)}>
      <div className={classNames(style.worldPropertyName)}>{name}</div>
      <div className={style.worldPropertyValue}>{value}</div>
    </div>
  )
}

function WorldTags({ tags }: { tags: string[] }) {
  return (
    <div className={style.worldTags}>
      {tags.map((tag) => (
        <div key={tag} className={classNames(
          style.worldTag,
          tag.toLowerCase() === "chill" && style.chillWorldTag,
          tag.toLowerCase() === "horror" && style.horrorWorldTag,
        )}>
          {tag}
        </div>
      ))}
    </div>
  )
}

export function WorldCard({ world }: { world: VRChatWorld }) {
  const genres = [
    { value: "other", label: "その他" },
    { value: "high-quality", label: "高品質" },
    { value: "game", label: "ゲーム" },
    { value: "horror", label: "ホラー" }
  ]

  const [selectedGenre, setSelectedGenre] = useState<string>("other");

  return (
    <div className={classNames(style.worldCard)}>
      <div className={style.worldTitle}>
        <h2>
          <a href={`https://vrchat.com/home/world/${world.id}`} target="_blank" rel="noopener noreferrer">{world.name}</a> <small>by {world.authorName}</small>
        </h2>
      </div>
      <div className={style.worldInfoArea}>
        <div className={classNames(style.thumbnailArea)}>
          <img src={world.thumbnailImageUrl} alt={world.name} />
        </div>

        <div className={classNames(style.infoArea)}>
          <div className={classNames(style.worldProperties)}>
            <WorldProperty name="お気に入り" value={world.favorites} />
            <WorldProperty name="訪問" value={world.visits} />
            <WorldProperty name="定員" value={world.capacity} />
            <WorldProperty name="作成日" value={new Date(world.created_at).toLocaleDateString()} />
            <WorldProperty name="更新日" value={new Date(world.updated_at).toLocaleDateString()} />
            <WorldProperty name="説明" value={world.description} />
          </div>
          <WorldTags tags={world.tags} />
        </div>
      </div>
      <div className={style.bookmarkArea}>
        {genres.map((genre) => (
          <label key={genre.value} >
            <input
              type="radio"
              name="genre"
              value={genre.value}
              checked={selectedGenre === genre.value}
              onChange={() => setSelectedGenre(genre.value)}
            />
            {genre.label}
          </label>
        ))}
        <Button className={style.bookmarkButton} onClick={() => { }}><StarOutlineIcon width={16} height={16} />ブックマークに追加</Button>
        <Button className={style.inviteButton} onClick={() => { }}><MailSendIcon width={20} height={20} />Invite</Button>
      </div>
    </div >
  );
}
