from django.shortcuts import render
from .serializers import UserSerializers
from rest_framework import generics
from django.contrib.auth.models import User
from rest_framework.permissions import AllowAny

# Create your views here.
class RegisterView(generics.CreateAPIView):
    print("i got to this endpoint")
    queryset=User.objects.all()
    serializer_class=UserSerializers
    permission_classes = [AllowAny]
