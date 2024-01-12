from django.shortcuts import render
from django.shortcuts import HttpResponse


# Create your views here.
def company(request):
    html = '<html><body>公司要闻</body></html>'
    return HttpResponse(html)


def industry(request):
    html = '<html><body>行业新闻</body></html>'
    return HttpResponse(html)


def notice(request):
    html = '<html><body>通知公告</body></html>'
    return HttpResponse(html)
