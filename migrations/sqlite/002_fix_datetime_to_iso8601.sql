UPDATE
  migrations
SET
  applied_at = strftime('%Y-%m-%dT%H:%M:%SZ', applied_at);

UPDATE
  vrchat_worlds
SET
  created_at = strftime('%Y-%m-%dT%H:%M:%SZ', created_at),
  updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', updated_at),
  deleted_at = CASE
    WHEN deleted_at IS NOT NULL THEN strftime('%Y-%m-%dT%H:%M:%SZ', deleted_at)
    ELSE NULL
  END;

UPDATE
  bookmarks
SET
  created_at = strftime('%Y-%m-%dT%H:%M:%SZ', created_at),
  updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', updated_at);
