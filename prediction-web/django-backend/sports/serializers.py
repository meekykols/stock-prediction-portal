from datetime import date, timedelta

from rest_framework import serializers


class FixturesQuery(serializers.Serializer):
    date = serializers.DateField(required=False)

    def validate_date(self, value):
        today = date.today()
        if not (today - timedelta(days=3) <= value <= today + timedelta(days=14)):
            raise serializers.ValidationError("Pick a date from 3 days ago up to 14 days ahead.")
        return value


class SportsPredictionRequest(serializers.Serializer):
    fixtureId = serializers.IntegerField(min_value=1)
