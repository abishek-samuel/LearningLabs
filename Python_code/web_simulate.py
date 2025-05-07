import requests
import pandas as pd
from pprint import pprint

# Simulate CSV loading (you could use your own CSV file)
df = pd.read_csv("course_description.csv")
course_list = df.to_dict(orient='records')

# pprint (course_list)

# Current course the user is enrolled in
# current_courses = ["Circuit Analysis",'Analog Electronics']

# Send POST request
response = requests.post("http://localhost:5001/recommend", json={
    # "courses": course_list,
    # "current_courses": current_courses,
    "user_id": "2"
})
print(response)
print("Recommendations:", response.json())
