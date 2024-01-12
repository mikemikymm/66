from django.contrib import admin
from import_export.admin import ImportExportModelAdmin
# Register your models here.

from .models import GoldPrice

class GoldPriceAdmin(admin.ModelAdmin, ):
    list_display = ['label', 'value', 'unit', 'name', 'search_time']
admin.site.register(GoldPrice,GoldPriceAdmin )


