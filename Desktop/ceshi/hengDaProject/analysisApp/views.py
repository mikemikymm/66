from django.shortcuts import render
from django.shortcuts import HttpResponse

def analysis(request):
    html = '<html><body>数据分析</body></html>'
    return HttpResponse(html)


