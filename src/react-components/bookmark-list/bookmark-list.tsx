import { AnimatePresence, motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';

import { BookmarkListDetail } from './bookmark-list-detail';
import styles from './bookmark-list.scss';
import { ViewTypeArea } from './view-type-area';
import { WorldListItem } from './world-list-item';

import { ReactComponent as FilterIcon } from 'assets/images/MaterialSymbolsFilterAltOutline.svg';
import { Accordion } from 'commonComponents/accordion';
import { CheckboxGroup } from 'commonComponents/checkbox-group';
import { DropDownList } from 'commonComponents/drop-down-list';
import { InputText } from 'commonComponents/input-text';
import { WorldCard } from 'commonComponents/world-card';
import { ORDERABLE_COLUMNS, RESULT_PER_PAGE_OPTIONS, OrderableColumnKey, SORT_ORDERS, SortOrder, LOGIC_MODES, VIEW_TYPES, GenreType } from 'src/consts/const';
import { useAppData } from 'src/contexts/app-data-provider';
import { useBookmarkListState } from 'src/contexts/bookmark-list-provider';
import type { BookmarkListOptions, VRChatWorldInfo, LogicMode, orderByColumn } from 'src/types/renderer';
import { debounce } from 'src/utils/util';

export function BookmarkList() {
  const [bookmarkList, setBookmarkList] = useState<VRChatWorldInfo[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const {
    page, setPage,
    limit, setLimit,
    selectedGenres, setSelectedGenres,
    genreFilterMode, setGenreFilterMode,
    selectedVisitStatuses, setSelectedVisitStatuses,
    searchTerm, setSearchTerm,
    debouncedTerm, setDebouncedTerm,
    orderBy, setOrderBy,
    sortOrder, setSortOrder,
    filterVisible, setFilterVisible,
    viewType,
    listViewSelectedWorld, setListViewSelectedWorld,
  } = useBookmarkListState();
  const { genres, visitStatuses } = useAppData();

  const orderByColumns: orderByColumn[] = [{
    name: orderBy,
    sortOrder: sortOrder,
  }];

  async function getBookmarkList() {
    const options: BookmarkListOptions = {
      page,
      limit,
      selectedGenres,
      genreFilterMode,
      selectedVisitStatuses,
      searchTerm: debouncedTerm,
      orderByColumns,
    };

    const result = await window.dbAPI.getBookmarkList(options);
    setBookmarkList(result.bookmarkList);
    setTotalCount(result.totalCount);
  }

  useEffect(() => {
    getBookmarkList();
  }, [page, limit, selectedGenres, genreFilterMode, selectedVisitStatuses, debouncedTerm, orderBy, sortOrder]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [page]);

  function onFilterModeChange(e: React.ChangeEvent<HTMLInputElement>) {
    setGenreFilterMode(e.target.value as LogicMode);
    setPage(1);
  }

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
          className={i === page ? styles.activePage : styles.pageButton}
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
    <AnimatePresence mode='wait'>
      { listViewSelectedWorld ? (
        <motion.div
          key="detail"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ duration: 0.3 }}
        >
          <BookmarkListDetail worldInfo={listViewSelectedWorld}/>
        </motion.div>
      ) : (
        <motion.div
          key="list"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
        >
          <div className={styles.filterAreaWrapper}>
            <ViewTypeArea />
            <Accordion icon={FilterIcon} title={'フィルター'} defaultOpen={filterVisible} onToggle={(isOpen) => setFilterVisible(isOpen)}>
              <div className={styles.filterArea}>
                <div className={styles.filterItems}>
                  <div className={styles.filterItemRow}>
                    <div className={styles.filterItem}>
                      <strong>ジャンル</strong>
                      <CheckboxGroup
                        options={genres}
                        selected={selectedGenres}
                        onChange={values => {
                          setSelectedGenres(values.map(Number) as GenreType[]);
                          setPage(1);
                        }}
                        allOption={false}
                      />
                      <label>
                        <input
                          type="radio"
                          name="filterMode"
                          value={LOGIC_MODES.and}
                          checked={genreFilterMode === LOGIC_MODES.and}
                          onChange={onFilterModeChange}
                        />
                        AND検索
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="filterMode"
                          value={LOGIC_MODES.or}
                          checked={genreFilterMode === LOGIC_MODES.or}
                          onChange={onFilterModeChange}
                        />
                        OR検索
                      </label>
                    </div>
                  </div>
                  <div className={styles.filterItemRow}>
                    <div className={styles.filterItem}>
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
                  <div className={styles.filterItemRow}>
                    <div className={styles.filterItem}>
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
                    <div className={styles.filterItem}>
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
                    <div className={styles.filterItem}>
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
                  <div className={styles.filterItemRow}>
                    <div className={styles.filterItem}>
                      <strong>キーワード</strong>
                      <InputText value={searchTerm} onChange={e => onKeywordSearchChange(e)} placeholder="ワールド名など" className={styles.keywordSearch} />
                    </div>
                  </div>
                </div>
              </div>
            </Accordion>
          </div>
          {viewType === VIEW_TYPES.list && (
            <div className={styles.worldList}>
              {bookmarkList && bookmarkList.map((worldInfo) => (
                <WorldListItem key={worldInfo.id} worldInfo={worldInfo} setWorldInfo={setListViewSelectedWorld}/>
              ))}
            </div>
          )}
          {viewType === VIEW_TYPES.grid && (
            <div className={styles.worldCardList}>
              {bookmarkList && bookmarkList.map((worldInfo) => (
                <WorldCard key={worldInfo.id} worldInfo={worldInfo} />
              ))}
            </div>
          )}
          <div className={styles.paginationArea}>
            <div className={styles.paginationButtons}>
              <button
                className={styles.pageButton}
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                前へ
              </button>
              {PageNumbers()}
              <button
                className={styles.pageButton}
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                次へ
              </button>
            </div>
            <div className={styles.pageInfo}>
              ページ {page} / {totalPages}（全{totalCount}件）
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
