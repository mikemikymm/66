from django.db import models

# Create your models here.
# 消费者
class Seller(models.Model):
    username=models.CharField(max_length=32) #用户名
    password=models.CharField(max_length=128) #密码
    gender=models.BooleanField(default=True) #性别
    phone=models.CharField(max_length=32) #电话
    email=models.EmailField() #邮箱
    heading=models.CharField(max_length=128,default='1.jpg') #头像
    address=models.CharField(max_length=128) #地址

