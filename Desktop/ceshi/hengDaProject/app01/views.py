from django.db.models import Q, F, Count
from django.http import HttpResponse
from django.shortcuts import render

# Create your views here.
from app01 import models


def register(request):
    if request.method == 'POST':
        # 1.获取表单提交的内容
        name = request.POST.get('name')
        password = request.POST.get('password')
        gender = request.POST.get('gender')
        phone = request.POST.get('phone')
        email = request.POST.get('email')
        address = request.POST.get('address')
        # 2.保存到数据库
        # 第一种方式
        # seller_obj = models.Seller()
        # seller_obj.username = name
        # seller_obj.password = password
        # seller_obj.phone = phone
        # seller_obj.address = address
        # seller_obj.gender = gender
        # seller_obj.email = email
        # seller_obj.save()
        # 第二种方式：
        models.Seller.objects.create(username=name,
                                     password=password,
                                     phone=phone,
                                     address=address,
                                     gender=gender,
                                     email=email)
        # 3.返回
        return HttpResponse('注册成功了...')

    return render(request, 'register.html')


# 删除操作
def delete_person(request):
    models.Seller.objects.get(id=1).delete()
    return HttpResponse('删除成功了...')


# 更新操作
def update_person(request):
    # 第一种方式：使用 save()
    # seller_obj = models.Seller.objects.get(id=2)
    # seller_obj.username = 'zhangsan'
    # seller_obj.password = '222'
    # seller_obj.save()
    # 第二种方式：使用update()
    ret = models.Seller.objects.filter(id=2).update(username='zs')
    # print(ret, type(ret))  # <class 'django.db.models.query.QuerySet'>
    return HttpResponse('修改成功了...')


def findall(request):
    ret=models.Seller.objects.all()
    print(ret)
    return HttpResponse("查询所有数据........")
def find(request):
    # 1. get() 直接返回当前对象, 只能返回一个对象，一般使用唯一标识
    ret = models.Seller.objects.get(id=2)
    # print(ret)
    # 2. filter(), 过滤，返回一个QuerySet类型的对象。当成列表使用即可
    # ret = models.Seller.objects.filter(password='222')
    # print(ret)  # <QuerySet [<Seller: Seller object (2)>]>
    # print(ret[1].username)

    return HttpResponse('查询成功了...')
# 条件查询
def Filtle(req):
    # 排序  class类名.objects.order_by('字段名')   (-字段名)表示降序
    print(models.Seller.objects.order_by("-id").all()) #<QuerySet [<Seller: Seller object (3)>, <Seller: Seller object (2)>]>
    #获取第一条数据 class类名.objects.first()
    print(models.Seller.objects.first()) #Seller object (2)
    # 获取最后一条数据 class类名.objects.last()
    print(models.Seller.objects.last())  # Seller object (3)
    #双下划线  字段__gte 大于等于 字段__gt 大于  字段__lt 小于 字段__lte 小于等于   字段__startswith 以什么开头
    print(models.Seller.objects.filter(id__gte=1).all()) #<QuerySet [<Seller: Seller object (2)>, <Seller: Seller object (3)>]>

    #聚合函数:aggregate
    #平均值 aggregate(Avg('字段'))
    #数目 aggregate(Count('字段'))

    #F和Q查询
    #性别是男而且电话是123的消费者
    print(models.Seller.objects.filter(gender=True,phone='123').all()) #<QuerySet [<Seller: Seller object (3)>]>
    #电话是123或者用户名是123的消费者
    print(models.Seller.objects.filter(Q(username=True) | Q(phone='123')).all()) #<QuerySet [<Seller: Seller object (3)>]>

    #F使用:同一张表格的不同字段进行比较
    print(models.Seller.objects.filter(username__lt=F('phone')).first())#None
    #分组查询
    #查询不同性别的人数
    print(models.Seller.objects.all().values('gender').annotate(Count('gender'))) #<QuerySet [{'gender': True, 'gender__count': 2}]>
    return HttpResponse("条件.........")

