from django.db import models


class GoldPrice(models.Model):
    id = models.BigAutoField(primary_key=True)
    label = models.TextField()
    value = models.TextField()
    unit = models.TextField()
    name = models.TextField()
    search_time = models.DateTimeField()




    def __str__(self):
        return f'{self.label} - {self.name} ({self.search_time})'
    