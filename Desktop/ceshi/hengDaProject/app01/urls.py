from django.urls import path
from . import views


urlpatterns = [
    path('register',views.register),
    path('delete_person',views.delete_person),
    path('update_person',views.update_person),
    path('findall',views.findall),
    path('find',views.find),
]
