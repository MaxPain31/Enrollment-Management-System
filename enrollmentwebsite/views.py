# filepath: c:\Users\USER\Desktop\LAGA-BSIT 3-3\capstone-system\enrollmentwebsite\views.py
from django.shortcuts import render


def custom_404_view(request, exception):
    return render(request, "page_not_found.html", status=500)
