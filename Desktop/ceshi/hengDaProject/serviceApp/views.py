from django.shortcuts import render
from django.shortcuts import HttpResponse


# Create your views here.
def download(request):
    html = '<html><body>资料下载</body></html>'
    return HttpResponse(html)


def platform(request):
    html = '<html><body>人脸识别开放平台</body></html>'
    return HttpResponse(html)
