# repositories/base_repository.py
from django.db.models import Model, QuerySet
from django.core.exceptions import ObjectDoesNotExist


class BaseRepository:
    model: Model = None  # subclasses must define this

    @classmethod
    def get_all(cls) -> QuerySet:
        return cls.model.objects.all()

    @classmethod
    def get_by_id(cls, pk: int):
        try:
            return cls.model.objects.get(id=pk)
        except ObjectDoesNotExist:
            return None

    @classmethod
    def filter(cls, **kwargs) -> QuerySet:
        """
        Generic filter that supports both normal fields and related lookups
        (e.g., enrollment__grade_level).
        """
        # Remove None values so they don’t break queries
        cleaned_filters = {k: v for k, v in kwargs.items() if v is not None}
        return cls.model.objects.filter(**cleaned_filters)

    @classmethod
    def filter_related(cls, base_queryset: QuerySet = None, **kwargs) -> QuerySet:
        """
        Apply filters on an existing queryset (useful for related fields).
        Example: repository.filter_related(qs, enrollment__grade_level=1)
        """
        if base_queryset is None:
            base_queryset = cls.get_all()
        cleaned_filters = {k: v for k, v in kwargs.items() if v is not None}
        return base_queryset.filter(**cleaned_filters)

    @classmethod
    def create(cls, **kwargs):
        return cls.model.objects.create(**kwargs)

    @classmethod
    def update(cls, pk: int, **kwargs):
        obj = cls.get_by_id(pk)
        if obj:
            for key, value in kwargs.items():
                setattr(obj, key, value)
            obj.save()
            return obj
        return None

    @classmethod
    def delete(cls, pk: int) -> bool:
        obj = cls.get_by_id(pk)
        if obj:
            obj.delete()
            return True
        return False
    
