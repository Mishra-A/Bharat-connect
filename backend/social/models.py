import uuid
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.text import slugify

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    display_name = models.CharField(max_length=80, blank=True)
    bio = models.CharField(max_length=240, blank=True)
    preferred_language = models.CharField(max_length=12, default="en")
    avatar_url = models.URLField(blank=True)
    is_private = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if self.email:
            self.email = self.email.strip().lower()
        if not self.display_name:
            self.display_name = self.username
        super().save(*args, **kwargs)

class Follow(models.Model):
    follower = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="following_edges")
    followed = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="follower_edges")
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["follower", "followed"], name="uniq_follow_pair"),
            models.CheckConstraint(condition=~models.Q(follower=models.F("followed")), name="no_self_follow"),
        ]
        indexes = [models.Index(fields=["follower", "-created_at"]), models.Index(fields=["followed", "-created_at"])]

class Post(models.Model):
    class Visibility(models.TextChoices):
        PUBLIC = "public", "Public"
        FOLLOWERS = "followers", "Followers"
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="posts")
    text = models.CharField(max_length=280)
    language = models.CharField(max_length=12, default="en")
    visibility = models.CharField(max_length=16, choices=Visibility.choices, default=Visibility.PUBLIC)
    reply_to = models.ForeignKey("self", null=True, blank=True, on_delete=models.CASCADE, related_name="replies")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["-created_at", "id"]), models.Index(fields=["author", "-created_at"])]
    def __str__(self):
        return f"{self.author.username}: {self.text[:40]}"

class Like(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="likes")
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="like_edges")
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "post"], name="uniq_user_post_like")]

class Bookmark(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bookmarks")
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="bookmark_edges")
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "post"], name="uniq_user_post_bookmark")]

class Repost(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reposts")
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="repost_edges")
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "post"], name="uniq_user_post_repost")]

class Hashtag(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=110, unique=True, blank=True)
    def save(self, *args, **kwargs):
        self.name = self.name.strip().lstrip("#").lower()
        self.slug = slugify(self.name) or self.name
        super().save(*args, **kwargs)

class PostHashtag(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="hashtag_edges")
    hashtag = models.ForeignKey(Hashtag, on_delete=models.CASCADE, related_name="post_edges")
    class Meta:
        constraints = [models.UniqueConstraint(fields=["post", "hashtag"], name="uniq_post_hashtag")]

class Notification(models.Model):
    # Change #13 — validated enum for event_type instead of a free CharField
    class EventType(models.TextChoices):
        LIKE   = 'like',   'Like'
        REPLY  = 'reply',  'Reply'
        FOLLOW = 'follow', 'Follow'
        REPOST = 'repost', 'Repost'

    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="actions")
    post = models.ForeignKey(Post, null=True, blank=True, on_delete=models.CASCADE)
    event_type = models.CharField(max_length=24, choices=EventType.choices)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["recipient", "is_read", "-created_at"])]

class Block(models.Model):
    blocker = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="blocks_made")
    blocked = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="blocks_received")
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["blocker", "blocked"], name="uniq_block_pair"),
            models.CheckConstraint(condition=~models.Q(blocker=models.F("blocked")), name="no_self_block"),
        ]
