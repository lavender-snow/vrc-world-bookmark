import {
  getWorldId,
  debounce,
  checkTag,
  shuffleArray,
} from './util';

describe('getWorldId', () => {
  it('ワールドID自体からワールドIDを抽出出来ることのテスト', () => {
    const id = 'wrld_15fe33f1-937e-4e93-8a40-902fb9552a11';
    expect(getWorldId(id)).toBe(id);
  });

  it('ワールドURLからワールドIDを抽出出来ることのテスト', () => {
    const url = 'https://vrchat.com/home/world/wrld_15fe33f1-937e-4e93-8a40-902fb9552a11/info';
    expect(getWorldId(url)).toBe('wrld_15fe33f1-937e-4e93-8a40-902fb9552a11');
  });

  it('インスタンスURLからワールドIDを抽出出来ることのテスト', () => {
    const url = 'https://vrchat.com/home/launch?worldId=wrld_15fe33f1-937e-4e93-8a40-902fb9552a11&instanceId=00000';
    expect(getWorldId(url)).toBe('wrld_15fe33f1-937e-4e93-8a40-902fb9552a11');
  });

  it('無関係のURLからワールドIDが抽出出来ないことのテスト', () => {
    expect(getWorldId('https://t.co/yy6NORT1SL')).toBeNull();
  });

  it('欠落しているワールドIDがワールドIDとして抽出されないことのテスト', () => {
    expect(getWorldId('wrld_15fe33f1-937e-4e93-8a40-902fb9552a1')).toBeNull();
  });
});

describe('debounce', () => {
  jest.useFakeTimers();

  it('発火が抑制されることをテスト', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced('a');
    debounced('b');
    debounced('c');

    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('c');
  });
});

describe('checkTag', () => {
  it('チルタグが判定できることをテスト', () => {
    expect(checkTag('author_tag_chill').isChill).toBe(true);
    expect(checkTag('AUTHOR_TAG_CHILL').isChill).toBe(true);
  });

  it('ホラータグが判定できることをテスト', () => {
    expect(checkTag('author_tag_horror').isHorror).toBe(true);
  });

  it('ゲームタグが判定できることをテスト', () => {
    expect(checkTag('author_tag_game').isGame).toBe(true);
    expect(checkTag('author_tag_riddle').isGame).toBe(true);
  });

  it('管理者タグが判定できることをテスト', () => {
    expect(checkTag('admin_foo').isAdmin).toBe(true);
    expect(checkTag('user_foo').isAdmin).toBe(false);
  });

  it('無関係のタグがfalseになることをテスト', () => {
    const check = checkTag('other');

    expect(check.isChill).toBe(false);
    expect(check.isHorror).toBe(false);
    expect(check.isGame).toBe(false);
    expect(check.isAdmin).toBe(false);
  });
});

describe('shuffleArray', () => {
  it('順序は一致せずとも元の配列と同じ要素を持つことをテスト', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(arr);

    expect(shuffled.sort()).toEqual(arr.sort());
    expect(shuffled).not.toBe(arr);
  });

  it('空配列は空配列を返すことをテスト', () => {
    expect(shuffleArray([])).toEqual([]);
  });

  it('1要素配列はそのまま返すことをテスト', () => {
    expect(shuffleArray([42])).toEqual([42]);
  });

  it('シャッフルされることを10回試行しテスト', () => {
    const arr = [1, 2, 3, 4, 5];
    let different = false;
    for (let i = 0; i < 10; i++) {
      if (shuffleArray(arr).join() !== arr.join()) {
        different = true;
        break;
      }
    }
    expect(different).toBe(true);
  });
});
