from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Post, Follow, Like, Bookmark, Repost, Hashtag, PostHashtag, Notification, Block

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (("BharatConnect", {"fields": ("display_name", "bio", "preferred_language", "avatar_url", "is_private")}),)
    list_display = ("username", "email", "display_name", "is_staff", "is_active")
    search_fields = ("username", "email", "display_name")

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("id", "author", "text", "visibility", "is_deleted", "created_at")
    list_filter = ("visibility", "is_deleted", "created_at")
    search_fields = ("text", "author__username")
    readonly_fields = ("id", "created_at", "updated_at")

admin.site.register([Follow, Like, Bookmark, Repost, Hashtag, PostHashtag, Notification, Block])
