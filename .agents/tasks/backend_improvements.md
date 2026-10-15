# BharatConnect Backend Improvements — Implementation Report

## Summary

All 20 backend improvements have been implemented across 5 source files and 1 new migration.

---

## Changes by Number

| # | Title | File(s) Changed | Status |
|---|-------|-----------------|--------|
| 1 | N+1 fix: annotate liked_by_me / bookmarked_by_me / reposted_by_me | views.py, serializers.py | DONE |
| 2 | UserSerializer N+1 on follower/following counts | views.py, serializers.py | DONE |
| 3 | LogoutView — blacklists refresh token | views.py, urls.py | DONE |
| 4 | PostDetailView.delete explicit IsAuthenticated | views.py | DONE |
| 5 | Reserved username guard (me, search, admin, …) | serializers.py | DONE |
| 6 | reposted_by_me field in PostSerializer | serializers.py | DONE |
| 7 | is_following field in UserSerializer | serializers.py, views.py | DONE |
| 8 | POST /api/v1/auth/logout/ endpoint | views.py, urls.py | DONE (same as #3) |
| 9 | HomeFeedView ?feed=following support | views.py | DONE |
| 10 | Hashtag auto-extraction on post save | views.py | DONE |
| 11 | GET /api/v1/users/<username>/ profile endpoint | views.py, urls.py | DONE |
| 12 | GET /api/v1/users/<username>/posts/ endpoint | views.py, urls.py | DONE |
| 13 | Notification event_type choices enum | models.py | DONE |
| 14 | BookmarkListView serializer context + visible_posts_for | views.py | DONE |
| 15 | ReplyListCreateView serializer context | views.py | DONE |
| 16 | Early return for anon in visible_posts_for | views.py | DONE (was already correct; confirmed + comment added) |
| 17 | DB connection pooling (CONN_MAX_AGE / CONN_HEALTH_CHECKS) | settings.py | DONE |
| 18 | Race condition guards with IntegrityError | views.py | DONE |
| 19 | STATIC_ROOT + whitenoise | settings.py, requirements.txt | DONE |
| 20 | Structured logging (LOGGING config) | settings.py | DONE |

---

## Detailed Change Notes

### #1 — N+1: liked_by_me / bookmarked_by_me / reposted_by_me
`visible_posts_for()` now uses `Exists(Like/Bookmark/Repost.objects.filter(..., post=OuterRef('pk')))` when the user is authenticated, and `Value(False, BooleanField())` for anonymous users. This resolves the 40-query-per-20-post feed problem in a single annotated SQL query.

`PostSerializer.get_liked_by_me`, `get_bookmarked_by_me`, and `get_reposted_by_me` check `hasattr(obj, 'field')` first, falling back to a DB hit only when the queryset was built without the annotation (e.g. a single-post detail fetch).

### #2 — UserSerializer N+1 on follower/following counts
`MeView.get_object` annotates the single user object with `Count('follower_edges')` / `Count('following_edges')`.
`UserSearchView.get_queryset` annotates all results in one query.
`UserSerializer.get_followers_count` / `get_following_count` use the annotation if present, otherwise fall back to `.count()`.

### #3 & #8 — LogoutView
`POST /api/v1/auth/logout/` accepts `{"refresh": "<token>"}`, calls `RefreshToken(...).blacklist()`, and returns 200. Invalid / already-blacklisted tokens return 400.

### #4 — PostDetailView.delete explicit auth
`PostDetailView.get_permissions()` returns `[IsAuthenticated()]` for DELETE and `[AllowAny()]` for GET. The `AttributeError` risk on anonymous delete is now impossible.

### #5 — Reserved username guard
`RegisterSerializer.validate_username` rejects the set `{'me', 'search', 'admin', 'api', 'feed', 'posts', 'notifications', 'bookmarks', 'health'}`.

### #6 — reposted_by_me in PostSerializer
Added `reposted_by_me = SerializerMethodField()` with annotation-first logic.

### #7 — is_following in UserSerializer
Added `is_following = SerializerMethodField()` that queries `Follow.objects.filter(follower=request.user, followed=obj)`. Returns `False` for anonymous requests.

### #9 — Following feed
`HomeFeedView` checks `?feed=following` and filters the queryset to posts from followed users via a `followed_id__in` subquery.

### #10 — Hashtag auto-extraction
`extract_and_link_hashtags(post)` uses `re.findall(r'#[\w\u0900-\u097F]+', post.text)` to support both ASCII and Devanagari hashtags. `PostListCreateView.perform_create` calls it after save.

### #11 — UserProfileView
`GET /api/v1/users/<username>/` — `RetrieveAPIView` with `lookup_field='username'`, annotated queryset, passes request context.

### #12 — UserPostsView
`GET /api/v1/users/<username>/posts/` — `ListAPIView` that delegates to `visible_posts_for()` filtered by author.

### #13 — Notification.EventType choices
Added nested `EventType(TextChoices)` inside `Notification`. Migration `0002_alter_notification_event_type` was generated and applied.

### #14 — BookmarkListView context + visible_posts_for
`get_queryset` now uses `visible_posts_for(self.request.user).filter(bookmark_edges__user=...)` so liked_by_me / bookmarked_by_me annotations are correct. `get_serializer_context` passes `request`.

### #15 — ReplyListCreateView context
Added `get_serializer_context` passing `request` so liked_by_me / bookmarked_by_me are accurate for replies.

### #16 — Anon early return in visible_posts_for
The block exclusion is already guarded by `if user and user.is_authenticated:`. Comment added to make intent explicit.

### #17 — DB connection pooling
Both DATABASES branches now include `"CONN_MAX_AGE": int(os.getenv("CONN_MAX_AGE", "60"))` and `"CONN_HEALTH_CHECKS": True`.

### #18 — IntegrityError guards
`LikeView.put`, `BookmarkView.put`, `FollowView.put`, and `RepostView.put` now wrap `get_or_create` in `try/except IntegrityError` to handle concurrent duplicate inserts gracefully.

### #19 — STATIC_ROOT + whitenoise
- `whitenoise>=6.8,<7` added to `requirements.txt` (installed: 6.12.0).
- `STATIC_ROOT = BASE_DIR / "staticfiles"` added to settings.
- `STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"` added.
- `WhiteNoiseMiddleware` inserted as second item in `MIDDLEWARE` (after `SecurityMiddleware`).

### #20 — Structured logging
`LOGGING` dict added at end of `settings.py` with a `verbose` formatter, console handler, root logger at `INFO`, `django` logger at `WARNING`, and `social` logger at `DEBUG`. Levels are overridable via `LOG_LEVEL` / `DJANGO_LOG_LEVEL` env vars.

---

## URL Order (final)

```
api/v1/users/me/
api/v1/users/search/
api/v1/users/<str:username>/posts/
api/v1/users/<str:username>/follow/
api/v1/users/<str:username>/
```

This ensures `me` and `search` are never captured as a username.

---

## Verification Command Outputs

### 1. `pip install -r requirements.txt`
```
Successfully installed whitenoise-6.12.0
```
(All other packages were already satisfied.)

### 2. `python manage.py check`
```
System check identified no issues (0 silenced).
```

### 3. `python manage.py makemigrations --check --dry-run`
```
Migrations for 'social':
  social\migrations\0002_alter_notification_event_type.py
    ~ Alter field event_type on notification
```
Migration detected (expected — Change #13 adds `choices` to `event_type`).

### 4. `python manage.py makemigrations social`
```
Migrations for 'social':
  social\migrations\0002_alter_notification_event_type.py
    ~ Alter field event_type on notification
```

### 5. `python manage.py migrate`
```
Applying social.0002_alter_notification_event_type... OK
```

---

## Issues Encountered

None. All 20 changes applied cleanly. The only migration change was the expected one for `Notification.event_type` gaining a `choices` constraint — this is a metadata-only change and fully backward compatible with existing data.
