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


SPORT_CHOICES = ("football", "basketball", "american-football", "volleyball", "mma")


class EventsQuery(serializers.Serializer):
    sport = serializers.ChoiceField(choices=SPORT_CHOICES)
    date = serializers.DateField()

    def validate_date(self, value):
        today = date.today()
        if not (today - timedelta(days=7) <= value <= today + timedelta(days=7)):
            raise serializers.ValidationError("Pick a date within a week of today.")
        return value


class OddsConfig(serializers.Serializer):
    weight = serializers.FloatField(min_value=0, max_value=1, default=0.6)
    max = serializers.IntegerField(min_value=0, max_value=1000, default=40)
    valueEdge = serializers.FloatField(min_value=0, max_value=0.5, default=0.05)


class TipsRequest(EventsQuery):
    leagues = serializers.ListField(child=serializers.IntegerField(min_value=0), required=False, allow_empty=True, max_length=200)
    odds = OddsConfig(required=False, allow_null=True)
