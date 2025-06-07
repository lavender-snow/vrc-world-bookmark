import { useState, useEffect, useCallback } from "react";
import type { BookmarkListOptions, VRChatWorldInfo } from "../types/renderer";
import { WorldCard } from "./world-card";
import style from "./bookmark-list.scss";
import { useAppData } from "../contexts/AppDataProvider";
import { DropDownList } from "./common/drop-down-list";
import { ORDERABLE_COLUMNS, RESULT_PER_PAGE_OPTIONS, OrderableColumnKey, SORT_ORDERS, SortOrder } from "../consts/const";
import { InputText } from "./common/input-text";
import { Accordion } from "./common/accordion";
import { ReactComponent as FilterIcon } from "../../assets/images/MaterialSymbolsFilterAltOutline.svg";
import { debounce } from "../utils/util";
import { useBookmarkListState } from "../contexts/BookmarkListProvider";

export function BookmarkList() {
  const [bookmarkList, setBookmarkList] = useState<VRChatWorldInfo[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const {
    page, setPage,
    limit, setLimit,
    genreId, setGenreId,
    visitStatusId, setVisitStatusId,
    searchTerm, setSearchTerm,
    debouncedTerm, setDebouncedTerm,
    orderBy, setOrderBy,
    sortOrder, setSortOrder,
    filterVisible, setFilterVisible
  } = useBookmarkListState();
  const { genres, visitStatuses } = useAppData();

  async function getBookmarkList() {
    const options: BookmarkListOptions = {
      page,
      limit,
      genreId,
      visitStatusId,
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
  }, [page, limit, genreId, visitStatusId, debouncedTerm, orderBy, sortOrder]);

  const debouncedSearch = useCallback(
    debounce((term: string) => {
      setDebouncedTerm(term);
      setPage(1);
    }, 500),
    []
  );

  function onKeywordSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const term = e.target.value.trim();
    setSearchTerm(term);
    debouncedSearch(term);
  }

  return (
    <>
      <div className={style.filterAreaWrapper}>
        <Accordion icon={FilterIcon} title={"フィルター"} defaultOpen={filterVisible} onToggle={(isOpen) => setFilterVisible(isOpen)}>
          <div className={style.filterArea}>
            <div className={style.filterItems}>
              <div className={style.filterItem}>
                <strong>ジャンル</strong>
                <DropDownList
                  options={[
                    { id: "", name: "すべて" },
                    ...genres.map(
                      (genre) => ({ id: genre.id.toString(), name: genre.name_jp })
                    )
                  ]}
                  currentValue={genreId?.toString() ?? ""}
                  onChange={(e) => {
                    setGenreId(e.target.value === "" ? undefined : parseInt(e.target.value, 10));
                  }}
                />
              </div>
              <div className={style.filterItem}>
                <strong>訪問状況</strong>
                <DropDownList
                  options={[
                    { id: "", name: "すべて" },
                    ...visitStatuses.map(
                      (visitStatus) => ({ id: visitStatus.id.toString(), name: visitStatus.name_jp })
                    )
                  ]}
                  currentValue={visitStatusId?.toString() ?? ""}
                  onChange={(e) => {
                    setVisitStatusId(e.target.value === "" ? undefined : parseInt(e.target.value, 10));
                    setPage(1);
                  }}
                />
              </div>
              <div className={style.filterItem}>
                <strong>ソート項目</strong>
                <DropDownList
                  options={
                    ORDERABLE_COLUMNS.map(
                      (column) => ({ id: column.id, name: column.value })
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
                      (order) => ({ id: order.id, name: order.value })
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
                    (num) => ({ id: num.toString(), name: `${num}件` })
                  )}
                  currentValue={limit.toString()}
                  onChange={(e) => {
                    setLimit(parseInt(e.target.value, 10));
                    setPage(1);
                  }}
                />
              </div>
              <div className={style.filterItem}>
                <strong>キーワード</strong>
                <InputText value={searchTerm} onChange={e => onKeywordSearchChange(e)} placeholder="ワールド名など" className={style.keywordSearch} />
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
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>前へ</button>
        <span>ページ {page}</span>
        <button disabled={(page) * limit > totalCount} onClick={() => setPage(page + 1)}>次へ</button>
      </div>
    </>
  );
}
