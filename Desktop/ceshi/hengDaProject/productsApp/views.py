from django.shortcuts import render
from django.shortcuts import HttpResponse


# Create your views here.
def robot(request):
    html = '<html><body>家用机器人</body></html>'
    return HttpResponse(html)


def monitoring(request):
    html = '<html><body>智能监控</body></html>'
    return HttpResponse(html)


def face(request):
    html = '<html><body>人脸识别解决方案</body></html>'
    return HttpResponse(html)