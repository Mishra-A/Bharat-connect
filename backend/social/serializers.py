from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import Post, Like, Follow

User = get_user_model()

# Reserved usernames that would conflict with URL patterns (Change #5)
RESERVED_USERNAMES = {
    'me', 'search', 'admin', 'api', 'feed', 'posts',
    'notifications', 'bookmarks', 'health',
}


class UserSerializer(serializers.ModelSerializer):
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    # Change #7 — expose whether the requesting user follows this user
    is_following = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "display_name", "email", "bio",
            "preferred_language", "avatar_url",
            "followers_count", "following_count", "is_following",
        ]
        read_only_fields = ["id", "email"]

    # Change #2 — use annotation when available, fall back to count()
    def get_followers_count(self, obj):
        if hasattr(obj, 'followers_count'):
            return obj.followers_count
        return obj.follower_edges.count()

    def get_following_count(self, obj):
        if hasattr(obj, 'following_count'):
            return obj.following_count
        return obj.following_edges.count()

    # Change #7 — is_following field
    def get_is_following(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return Follow.objects.filter(follower=request.user, followed=obj).exists()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, trim_whitespace=False)
    email = serializers.EmailField()

    class Meta:
        model = User
        fields = ["username", "email", "password", "display_name", "preferred_language"]

    def validate_username(self, value):
        value = value.strip()
        if not value or len(value) > 30:
            raise serializers.ValidationError("Username must be between 1 and 30 characters.")
        if not value.replace("_", "").isalnum():
            raise serializers.ValidationError("Use letters, numbers and underscores only.")
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        # Change #5 — block reserved usernames to prevent URL conflicts
        if value.lower() in RESERVED_USERNAMES:
            raise serializers.ValidationError("This username is reserved and cannot be used.")
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class PostSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    likes_count = serializers.IntegerField(read_only=True)
    replies_count = serializers.IntegerField(read_only=True)
    reposts_count = serializers.IntegerField(read_only=True)
    liked_by_me = serializers.SerializerMethodField()
    bookmarked_by_me = serializers.SerializerMethodField()
    # Change #6 — expose reposted_by_me
    reposted_by_me = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            "id", "author", "text", "language", "visibility", "reply_to", "created_at",
            "likes_count", "replies_count", "reposts_count",
            "liked_by_me", "bookmarked_by_me", "reposted_by_me",
        ]
        read_only_fields = [
            "id", "author", "created_at",
            "likes_count", "replies_count", "reposts_count",
            "liked_by_me", "bookmarked_by_me", "reposted_by_me",
        ]

    def validate_text(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Post cannot be empty.")
        if len(value) > 280:
            raise serializers.ValidationError("Posts can contain at most 280 characters.")
        return value

    # Change #1 — use annotation when available, fall back to DB query
    def get_liked_by_me(self, obj):
        if hasattr(obj, 'liked_by_me'):
            return bool(obj.liked_by_me)
        request = self.context.get("request")
        return bool(
            request and request.user.is_authenticated
            and obj.like_edges.filter(user=request.user).exists()
        )

    def get_bookmarked_by_me(self, obj):
        if hasattr(obj, 'bookmarked_by_me'):
            return bool(obj.bookmarked_by_me)
        request = self.context.get("request")
        return bool(
            request and request.user.is_authenticated
            and obj.bookmark_edges.filter(user=request.user).exists()
        )

    # Change #6
    def get_reposted_by_me(self, obj):
        if hasattr(obj, 'reposted_by_me'):
            return bool(obj.reposted_by_me)
        request = self.context.get('request')
        from .models import Repost
        return bool(
            request and request.user.is_authenticated
            and Repost.objects.filter(user=request.user, post=obj).exists()
        )
