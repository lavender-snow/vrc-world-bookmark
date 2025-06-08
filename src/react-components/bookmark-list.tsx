import { useState, useEffect, useCallback } from 'react';


import style from './bookmark-list.scss';
import { Accordion } from './common/accordion';
import { CheckboxGroup } from './common/checkbox-group';
import { DropDownList } from './common/drop-down-list';
import { InputText } from './common/input-text';
import { WorldCard } from './world-card';

import { ReactComponent as FilterIcon } from 'assets/images/MaterialSymbolsFilterAltOutline.svg';
import { ORDERABLE_COLUMNS, RESULT_PER_PAGE_OPTIONS, OrderableColumnKey, SORT_ORDERS, SortOrder } from 'src/consts/const';
import { useAppData } from 'src/contexts/app-data-provider';
import { useBookmarkListState } from 'src/contexts/bookmark-list-provider';
import type { BookmarkListOptions, VRChatWorldInfo } from 'src/types/renderer';
import { debounce } from 'src/utils/util';

export function BookmarkList() {
  const [bookmarkList, setBookmarkList] = useState<VRChatWorldInfo[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const {
    page, setPage,
    limit, setLimit,
    selectedGenres, setSelectedGenres,
    selectedVisitStatuses, setSelectedVisitStatuses,
    searchTerm, setSearchTerm,
    debouncedTerm, setDebouncedTerm,
    orderBy, setOrderBy,
    sortOrder, setSortOrder,
    filterVisible, setFilterVisible,
  } = useBookmarkListState();
  const { genres, visitStatuses } = useAppData();

  async function getBookmarkList() {
    const options: BookmarkListOptions = {
      page,
      limit,
      selectedGenres,
      selectedVisitStatuses,
      searchTerm: debouncedTerm,
      orderBy,
      sortOrder,
    };

    const result = await window.dbAPI.getBookmarkList(options);
    setBookmarkList(result.bookmarkList);
    setTotalCount(result.totalCount);
  }

  useEffect(() => {
    getBookmarkList();
  }, [page, limit, selectedGenres, selectedVisitStatuses, debouncedTerm, orderBy, sortOrder]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [page]);

  const debouncedSearch = useCallback(
    debounce((term: string) => {
      setDebouncedTerm(term);
      setPage(1);
    }, 500),
    [],
  );

  function onKeywordSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const term = e.target.value.trim();
    setSearchTerm(term);
    debouncedSearch(term);
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  function PageNumbers() {
    const pages = [];
    const maxDisplay = 5;
    let start = Math.max(1, page - Math.floor(maxDisplay / 2));
    const end = Math.min(totalPages, start + maxDisplay - 1);
    if (end - start < maxDisplay - 1) {
      start = Math.max(1, end - maxDisplay + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(
        <button
          key={i}
          className={i === page ? style.activePage : style.pageButton}
          onClick={() => setPage(i)}
          disabled={i === page}
        >
          {i}
        </button>,
      );
    }
    return pages;
  }

  return (
    <>
      <div className={style.filterAreaWrapper}>
        <Accordion icon={FilterIcon} title={'フィルター'} defaultOpen={filterVisible} onToggle={(isOpen) => setFilterVisible(isOpen)}>
          <div className={style.filterArea}>
            <div className={style.filterItems}>
              <div className={style.filterItemRow}>
                <div className={style.filterItem}>
                  <strong>ジャンル</strong>
                  <CheckboxGroup
                    options={genres}
                    selected={selectedGenres}
                    onChange={values => {
                      setSelectedGenres(values.map(Number));
                      setPage(1);
                    }}
                    allOption={true}
                  />
                </div>
              </div>
              <div className={style.filterItemRow}>
                <div className={style.filterItem}>
                  <strong>訪問状況</strong>
                  <CheckboxGroup
                    options={visitStatuses}
                    selected={selectedVisitStatuses}
                    onChange={values => {
                      setSelectedVisitStatuses(values.map(Number));
                      setPage(1);
                    }}
                    allOption={true}
                  />
                </div>
              </div>
              <div className={style.filterItemRow}>
                <div className={style.filterItem}>
                  <strong>ソート項目</strong>
                  <DropDownList
                    options={
                      ORDERABLE_COLUMNS.map(
                        (column) => ({ id: column.id, name: column.value }),
                      )
                    }
                    currentValue={orderBy}
                    onChange={(e) => {
                      setOrderBy(e.target.value as OrderableColumnKey);
                      setPage(1);
                    }}
                  />
                </div>
                <div className={style.filterItem}>
                  <strong>並び順</strong>
                  <DropDownList
                    options={
                      SORT_ORDERS.map(
                        (order) => ({ id: order.id, name: order.value }),
                      )
                    }
                    currentValue={sortOrder}
                    onChange={(e) => {
                      setSortOrder(e.target.value as SortOrder);
                      setPage(1);
                    }}
                  ></DropDownList>
                </div>
                <div className={style.filterItem}>
                  <strong>表示件数</strong>
                  <DropDownList
                    options={RESULT_PER_PAGE_OPTIONS.map(
                      (num) => ({ id: num.toString(), name: `${num}件` }),
                    )}
                    currentValue={limit.toString()}
                    onChange={(e) => {
                      setLimit(parseInt(e.target.value, 10));
                      setPage(1);
                    }}
                  />
                </div>
              </div>
              <div className={style.filterItemRow}>
                <div className={style.filterItem}>
                  <strong>キーワード</strong>
                  <InputText value={searchTerm} onChange={e => onKeywordSearchChange(e)} placeholder="ワールド名など" className={style.keywordSearch} />
                </div>
              </div>
            </div>
          </div>
        </Accordion>
      </div>
      <div className={style.worldCardList}>
        {bookmarkList && bookmarkList.map((worldInfo) => (
          <WorldCard key={worldInfo.id} worldInfo={worldInfo} />
        ))}
      </div>
      <div className={style.paginationArea}>
        <div className={style.paginationButtons}>
          <button
            className={style.pageButton}
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            前へ
          </button>
          {PageNumbers()}
          <button
            className={style.pageButton}
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            次へ
          </button>
        </div>
        <div className={style.pageInfo}>
          ページ {page} / {totalPages}（全{totalCount}件）
        </div>
      </div>
    </>
  );
}
