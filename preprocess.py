import pandas as pd
import json

# Replace with your actual file name
df = pd.read_csv("public/data.csv")

# Clean column names
df.columns = [c.strip().upper() for c in df.columns]

# Fill NaN with empty string
df = df.fillna("")

records = []
current_file = None

for _, row in df.iterrows():
    file_no = row["FILE NO"].strip()
    file_name = row["FILE NAME"].strip()
    current = row["CURRENT"].strip()
    record = row["RECORD"].strip()
    completed = row["COMPLETED"].strip()
    remark = row["REMARK"].strip()

    # Case 1: New file (has a FILE NO)
    if file_no:
        current_file = {
            "file_no": file_no,
            "file_name": file_name,
            "current": current,
            "record": record,
            "completed": completed,
            "remark": remark,
            "sub_files": []
        }
        records.append(current_file)

    # Case 2: Subfile (no FILE NO)
    elif current_file and file_name:
        sub = {
            "name": file_name,
            "current": current,
            "record": record,
            "completed": completed,
            "remark": remark
        }
        current_file["sub_files"].append(sub)

# Save cleaned version as JSON
with open("public/cleaned_files.json", "w", encoding="utf-8") as f:
    json.dump(records, f, indent=2, ensure_ascii=False)

print("✅ Cleaned data saved to cleaned_files.json")
