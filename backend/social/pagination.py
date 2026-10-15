from rest_framework.pagination import CursorPagination


class PostCursorPagination(CursorPagination):
    ordering = "-created_at"
    page_size = 20
