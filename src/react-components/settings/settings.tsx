
import style from './settings.scss';
import { WorldUpdateProgress } from './world-update-progress';

function SettingItem({
  title, children,
} : {
  title: string, children: React.ReactNode
}) {
  return (
    <div>
      <h2>{title}</h2>
      <div className={style.settingItemContent}>
        {children}
      </div>
    </div>
  );
}

export function Settings() {
  return (
    <div className={style.settings}>
      <h1>設定</h1>

      <SettingItem
        title="ワールドデータ更新"
      >
        <span>
          24時間以上前に取得したワールドデータを対象に最新情報へ更新します。VRChatサーバーへの負荷軽減のため1件ごとに1秒待機します。
        </span>
        <WorldUpdateProgress />
      </SettingItem>
    </div>
  );
}
