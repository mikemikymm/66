
from django.urls import path
from . import views

app_name = 'analysisApp'

urlpatterns = [
    path('analysis/', views.analysis, name='analysis'),     # 公司要闻
    
]