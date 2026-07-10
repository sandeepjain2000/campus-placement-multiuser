import pandas as pd

file_path = r"C:\Users\sandeep\Downloads\Claudes\Applicant_List_for_Intern_-_CSE_Internship_Drive_M_at_Unique_School_App_India_LLP_Internship_Batch_2027.xlsx"
df = pd.read_excel(file_path)
print("Columns found:", df.columns.tolist())
print("\nFirst row sample:")
print(df.iloc[0].to_dict())
