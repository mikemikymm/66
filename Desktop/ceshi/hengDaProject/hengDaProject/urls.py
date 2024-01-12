"""hengDaProject URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/2.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf.urls import include
from homeApp.views import home
from gold_prices.views import gold_prices_template

urlpatterns = [
    path('admin/', admin.site.urls),                    # 管理员
    path('', home, name='home'),                        # 首页
    path('aboutApp/', include('aboutApp.urls')),        # 公司简介
    path('gold_prices/', include('gold_prices.urls', namespace='gold_prices')),
    #path('golds_display/', golds_display, name='golds_display'),  
    path('golds_display/', gold_prices_template, name='golds_display'),  
    path('contactApp/', include('contactApp.urls')),    # 人才招聘
    path('analysis/', include('analysisApp.urls', namespace='analysisApp')), # 数据分析
    path('newsApp/', include('newsApp.urls')),          # 新闻动态
    path('productsApp/', include('productsApp.urls')),  # 产品中心
    path('scienceApp/', include('scienceApp.urls')),    # 科研基地
    path('serviceApp/', include('serviceApp.urls')),    # 服务支持
]
