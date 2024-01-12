# gold_prices/urls.py
from django.urls import path
from .views import gold_prices, gold_prices_template, golds_display, result_gold_prices
from . import views
app_name = 'gold_prices'

urlpatterns = [
    path('', views.gold_prices, name='gold_prices'),
    path('result/', views.result_gold_prices, name='result_gold_prices'),
    path('template/', views.gold_prices_template, name='gold_prices_template'),
    path('golds_display/', views.golds_display, name='golds_display'),

]