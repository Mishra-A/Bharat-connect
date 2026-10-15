import re

from django.contrib.auth import authenticate, get_user_model
from django.db import IntegrityError
from django.db.models import BooleanField, Count, Exists, OuterRef, Q, Value
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Post, Like, Follow, Block, Bookmark, Repost
from .serializers import RegisterSerializer, UserSerializer, PostSerializer

User = get_user_model()


# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------

def extract_and_link_hashtags(post):
    """Extract #hashtags from post.text and create Hashtag / PostHashtag rows."""
    from .models import Hashtag, PostHashtag
    from django.utils.text import slugify
    tags = set(
        t.lower().lstrip('#')
        for t in re.findall(r'#[\w\u0900-\u097F]+', post.text)
    )
    for tag_name in tags:
        if not tag_name:
            continue
        hashtag, _ = Hashtag.objects.get_or_create(
            name=tag_name,
            defaults={'slug': slugify(tag_name) or tag_name}
        )
        PostHashtag.objects.get_or_create(post=post, hashtag=hashtag)


def visible_posts_for(user):
    """
    Return a queryset of publicly-visible top-level posts, annotated with
    aggregate counts and per-user like/bookmark/repost flags.

    Block exclusion is skipped for anonymous users — no DB hit needed.
    """
    qs = Post.objects.filter(
        is_deleted=False,
        visibility=Post.Visibility.PUBLIC,
        reply_to__isnull=True,
    )
    # Block exclusion already skipped for anonymous users — no change needed.
    if user and user.is_authenticated:
        blocked_ids = Block.objects.filter(blocker=user).values('blocked_id')
        blocker_ids = Block.objects.filter(blocked=user).values('blocker_id')
        qs = qs.exclude(author_id__in=blocked_ids).exclude(author_id__in=blocker_ids)

    qs = qs.select_related('author').annotate(
        likes_count=Count('like_edges', distinct=True),
        replies_count=Count('replies', filter=Q(replies__is_deleted=False), distinct=True),
        reposts_count=Count('repost_edges', distinct=True),
    )

    # Change #1: annotate per-user flags in SQL — eliminates N+1
    if user and user.is_authenticated:
        qs = qs.annotate(
            liked_by_me=Exists(Like.objects.filter(user=user, post=OuterRef('pk'))),
            bookmarked_by_me=Exists(Bookmark.objects.filter(user=user, post=OuterRef('pk'))),
            reposted_by_me=Exists(Repost.objects.filter(user=user, post=OuterRef('pk'))),
        )
    else:
        qs = qs.annotate(
            liked_by_me=Value(False, output_field=BooleanField()),
            bookmarked_by_me=Value(False, output_field=BooleanField()),
            reposted_by_me=Value(False, output_field=BooleanField()),
        )

    return qs.order_by('-created_at', '-id')


# ---------------------------------------------------------------------------
# Auth views
# ---------------------------------------------------------------------------

class HealthView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({"status": "ok", "service": "bharatconnect-api"})


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            "user": UserSerializer(user).data,
            "tokens": {"access": str(refresh.access_token), "refresh": str(refresh)},
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        identity = (request.data.get("username") or request.data.get("email") or "").strip()
        password = request.data.get("password") or ""
        user_obj = User.objects.filter(Q(username__iexact=identity) | Q(email__iexact=identity)).first()
        user = authenticate(request, username=user_obj.username, password=password) if user_obj else None
        if not user:
            return Response({"detail": "Invalid username/email or password."}, status=status.HTTP_401_UNAUTHORIZED)
        if not user.is_active:
            return Response({"detail": "This account is disabled."}, status=status.HTTP_403_FORBIDDEN)
        refresh = RefreshToken.for_user(user)
        return Response({
            "user": UserSerializer(user).data,
            "tokens": {"access": str(refresh.access_token), "refresh": str(refresh)},
        })


# Change #3 & #8 — Logout endpoint that blacklists the refresh token
class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'detail': 'Refresh token required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            return Response(
                {'detail': 'Token is invalid or already blacklisted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({'detail': 'Successfully logged out.'}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# User views
# ---------------------------------------------------------------------------

class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    http_method_names = ["get", "patch", "head", "options"]

    # Change #2 — annotate follower/following counts to avoid N+1
    def get_object(self):
        return User.objects.annotate(
            followers_count=Count('follower_edges', distinct=True),
            following_count=Count('following_edges', distinct=True),
        ).get(pk=self.request.user.pk)


# Change #11 — GET /api/v1/users/<username>/ profile endpoint
class UserProfileView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'username'

    def get_queryset(self):
        return User.objects.filter(is_active=True).annotate(
            followers_count=Count('follower_edges', distinct=True),
            following_count=Count('following_edges', distinct=True),
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


# Change #7 — UserSearchView with annotation + is_following context
class UserSearchView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    # Change #2 — annotate counts in queryset to avoid N+1
    def get_queryset(self):
        q = self.request.query_params.get('q', '').strip()[:80]
        if len(q) < 2:
            return User.objects.none()
        return User.objects.filter(is_active=True).filter(
            Q(username__icontains=q) | Q(display_name__icontains=q)
        ).annotate(
            followers_count=Count('follower_edges', distinct=True),
            following_count=Count('following_edges', distinct=True),
        ).order_by('username')[:20]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class FollowView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, username):
        target = get_object_or_404(User, username__iexact=username, is_active=True)
        if target.pk == request.user.pk:
            return Response({'detail': 'You cannot follow yourself.'}, status=status.HTTP_400_BAD_REQUEST)
        # Change #18 — guard against race condition on unique constraint
        try:
            edge, created = Follow.objects.get_or_create(follower=request.user, followed=target)
        except IntegrityError:
            created = False
            edge = Follow.objects.get(follower=request.user, followed=target)
        if created:
            from .models import Notification
            Notification.objects.create(recipient=target, actor=request.user, event_type='follow')
        return Response({'following': True}, status=status.HTTP_200_OK)

    def delete(self, request, username):
        target = get_object_or_404(User, username__iexact=username)
        Follow.objects.filter(follower=request.user, followed=target).delete()
        return Response({'following': False})


# ---------------------------------------------------------------------------
# Post views
# ---------------------------------------------------------------------------

class PostListCreateView(generics.ListCreateAPIView):
    serializer_class = PostSerializer

    def get_queryset(self):
        return visible_posts_for(self.request.user)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def get_permissions(self):
        return [permissions.IsAuthenticated()] if self.request.method == "POST" else [permissions.AllowAny()]

    def perform_create(self, serializer):
        # Change #10 — extract hashtags after save
        post = serializer.save(author=self.request.user)
        extract_and_link_hashtags(post)


# Change #4 — explicit permission handling on delete
class PostDetailView(APIView):
    def get_permissions(self):
        if self.request.method == 'DELETE':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get(self, request, pk):
        post = get_object_or_404(Post.objects.select_related("author"), pk=pk, is_deleted=False)
        if post.visibility != Post.Visibility.PUBLIC and (
            not request.user.is_authenticated or post.author_id != request.user.id
        ):
            raise PermissionDenied("You cannot view this post.")
        post = visible_posts_for(request.user).filter(pk=pk).first() or post
        return Response(PostSerializer(post, context={"request": request}).data)

    def delete(self, request, pk):
        post = get_object_or_404(Post, pk=pk, is_deleted=False)
        if post.author_id != request.user.id and not request.user.is_staff:
            raise PermissionDenied("You can only delete your own posts.")
        post.is_deleted = True
        post.save(update_fields=["is_deleted", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


# Change #9 — following feed support
class HomeFeedView(generics.ListAPIView):
    serializer_class = PostSerializer

    def get_queryset(self):
        qs = visible_posts_for(self.request.user)
        if (self.request.query_params.get('feed') == 'following'
                and self.request.user.is_authenticated):
            following_ids = Follow.objects.filter(
                follower=self.request.user
            ).values('followed_id')
            qs = qs.filter(author_id__in=following_ids)
        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class LikeView(APIView):
    def put(self, request, pk):
        post = get_object_or_404(Post, pk=pk, is_deleted=False, visibility=Post.Visibility.PUBLIC)
        # Change #18 — guard against race condition
        try:
            like, created = Like.objects.get_or_create(user=request.user, post=post)
        except IntegrityError:
            created = False
            like = Like.objects.get(user=request.user, post=post)
        if created and post.author_id != request.user.id:
            from .models import Notification
            Notification.objects.create(recipient=post.author, actor=request.user, post=post, event_type='like')
        return Response({"liked": True, "likes_count": post.like_edges.count()})

    def delete(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        Like.objects.filter(user=request.user, post=post).delete()
        return Response({"liked": False, "likes_count": post.like_edges.count()})


# Change #15 — serializer context for reply list
class ReplyListCreateView(generics.ListCreateAPIView):
    serializer_class = PostSerializer

    def get_queryset(self):
        parent = get_object_or_404(Post, pk=self.kwargs['pk'], is_deleted=False)
        return Post.objects.filter(reply_to=parent, is_deleted=False).select_related('author').order_by('created_at')

    def get_permissions(self):
        return [permissions.IsAuthenticated()] if self.request.method == 'POST' else [permissions.AllowAny()]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def perform_create(self, serializer):
        parent = get_object_or_404(
            Post, pk=self.kwargs['pk'], is_deleted=False, visibility=Post.Visibility.PUBLIC
        )
        serializer.save(author=self.request.user, reply_to=parent, visibility=Post.Visibility.PUBLIC)
        if parent.author_id != self.request.user.id:
            from .models import Notification
            Notification.objects.create(
                recipient=parent.author, actor=self.request.user, post=parent, event_type='reply'
            )


class BookmarkView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, pk):
        post = get_object_or_404(Post, pk=pk, is_deleted=False, visibility=Post.Visibility.PUBLIC)
        # Change #18 — guard against race condition
        try:
            Bookmark.objects.get_or_create(user=request.user, post=post)
        except IntegrityError:
            pass
        return Response({'bookmarked': True})

    def delete(self, request, pk):
        Bookmark.objects.filter(user=request.user, post_id=pk).delete()
        return Response({'bookmarked': False})


# Change #14 — serializer context + visible_posts_for for BookmarkListView
class BookmarkListView(generics.ListAPIView):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return visible_posts_for(self.request.user).filter(
            bookmark_edges__user=self.request.user
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


# Change #12 — GET /api/v1/users/<username>/posts/
class UserPostsView(generics.ListAPIView):
    serializer_class = PostSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = get_object_or_404(
            User, username__iexact=self.kwargs['username'], is_active=True
        )
        return visible_posts_for(self.request.user).filter(author=user)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


# ---------------------------------------------------------------------------
# Notification views
# ---------------------------------------------------------------------------

class NotificationListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, *args, **kwargs):
        from .models import Notification
        rows = Notification.objects.filter(recipient=request.user).select_related('actor', 'post')[:50]
        data = [
            {
                'id': n.id,
                'type': n.event_type,
                'actor': UserSerializer(n.actor).data,
                'post_id': str(n.post_id) if n.post_id else None,
                'is_read': n.is_read,
                'created_at': n.created_at,
            }
            for n in rows
        ]
        return Response(data)


class NotificationReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .models import Notification
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({'marked_read': True})


# ---------------------------------------------------------------------------
# Repost view
# ---------------------------------------------------------------------------

class RepostView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, pk):
        post = get_object_or_404(Post, pk=pk, is_deleted=False, visibility=Post.Visibility.PUBLIC)
        # Change #18 — guard against race condition
        try:
            repost, created = Repost.objects.get_or_create(user=request.user, post=post)
        except IntegrityError:
            pass
        return Response({"reposted": True, "reposts_count": post.repost_edges.count()})

    def delete(self, request, pk):
        post = get_object_or_404(Post, pk=pk, is_deleted=False)
        Repost.objects.filter(user=request.user, post=post).delete()
        return Response({"reposted": False, "reposts_count": post.repost_edges.count()})
