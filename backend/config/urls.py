from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView
from social.views import (
    RegisterView, LoginView, LogoutView, MeView,
    PostListCreateView, PostDetailView, HomeFeedView,
    LikeView, HealthView, ReplyListCreateView,
    BookmarkView, BookmarkListView, FollowView,
    UserSearchView, UserProfileView, UserPostsView,
    NotificationListView, NotificationReadView, RepostView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/health/", HealthView.as_view(), name="health"),

    # Auth
    path("api/v1/auth/register/", RegisterView.as_view(), name="register"),
    path("api/v1/auth/login/", LoginView.as_view(), name="login"),
    path("api/v1/auth/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    # Change #3/#8 — logout endpoint
    path("api/v1/auth/logout/", LogoutView.as_view(), name="logout"),

    # Users — specific patterns MUST come before generic <username> catch-alls
    path("api/v1/users/me/", MeView.as_view(), name="me"),
    path("api/v1/users/search/", UserSearchView.as_view(), name="user-search"),
    path("api/v1/users/<str:username>/posts/", UserPostsView.as_view(), name="user-posts"),
    path("api/v1/users/<str:username>/follow/", FollowView.as_view(), name="user-follow"),
    # Change #11 — user profile endpoint (last among users/<username>/ patterns)
    path("api/v1/users/<str:username>/", UserProfileView.as_view(), name="user-profile"),

    # Posts
    path("api/v1/posts/", PostListCreateView.as_view(), name="posts"),
    path("api/v1/posts/<uuid:pk>/", PostDetailView.as_view(), name="post-detail"),
    path("api/v1/posts/<uuid:pk>/like/", LikeView.as_view(), name="post-like"),
    path("api/v1/posts/<uuid:pk>/repost/", RepostView.as_view(), name="post-repost"),
    path("api/v1/posts/<uuid:pk>/replies/", ReplyListCreateView.as_view(), name="post-replies"),
    path("api/v1/posts/<uuid:pk>/bookmark/", BookmarkView.as_view(), name="post-bookmark"),

    # Feed & Bookmarks
    path("api/v1/feed/home/", HomeFeedView.as_view(), name="home-feed"),
    path("api/v1/bookmarks/", BookmarkListView.as_view(), name="bookmarks"),

    # Notifications
    path("api/v1/notifications/", NotificationListView.as_view(), name="notifications"),
    path("api/v1/notifications/read/", NotificationReadView.as_view(), name="notifications-read"),
]
