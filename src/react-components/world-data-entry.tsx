import { useState } from 'react';
import { Button } from './common/button';

export function WorldDataEntry() {
  const [worldIdOrUrl, setWorldIdOrUrl] = useState<string>('');

  function onChangeWorldIdOrUrl(e: React.ChangeEvent<HTMLInputElement>) {
    setWorldIdOrUrl(e.target.value);
  }

  function onClickGetWorldInfo() {
    console.log(worldIdOrUrl);
  }

  return (
    <>
      <p>追加したいワールドのIDまたはURLを入力してください</p>

      <input onChange={onChangeWorldIdOrUrl} type="text" placeholder="World ID or World URL" />
      <Button onClick={onClickGetWorldInfo}>
        ワールド情報取得
      </Button>
    </>
  );
}
