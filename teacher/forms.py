from django import forms
from django.core.exceptions import ValidationError

class InputFinalAverageForm(forms.Form):
    final_average = forms.DecimalField(
        max_digits=5, decimal_places=2,
        error_messages={"required": "Final average is required.", "invalid": "Enter a valid number."},
    )
    student_id = forms.IntegerField(widget=forms.HiddenInput())
    
    def clean_final_average(self):
        final_average = self.cleaned_data.get("final_average")
        if final_average and not (75 <= final_average <= 100):
            raise ValidationError("Final average must be between 75 and 100.")
        return final_average

