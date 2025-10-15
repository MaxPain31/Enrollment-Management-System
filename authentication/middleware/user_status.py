from django.shortcuts import redirect
from django.urls import reverse
from django.http import JsonResponse
from django.contrib.auth import logout

class CheckUserStatusMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        
    def __call__(self, request):
        if request.user.is_authenticated and request.user.deactivated:
            logout(request)
            if request.headers.get("x-requested-with") == "XMLHttpRequest":
                return JsonResponse({"error": "User deactivated"}, status=401)
            return redirect(reverse("signin"))
        return self.get_response(request)
    
    
