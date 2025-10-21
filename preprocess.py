# import pandas as pd
# import json

# # Replace with your actual file name
# df = pd.read_csv("public/data.csv")

# # Clean column names
# df.columns = [c.strip().upper() for c in df.columns]

# # Fill NaN with empty string
# df = df.fillna("")

# records = []
# current_file = None

# for _, row in df.iterrows():
#     file_no = row["FILE NO"].strip()
#     file_name = row["FILE NAME"].strip()
#     current = row["CURRENT"].strip()
#     record = row["RECORD"].strip()
#     completed = row["COMPLETED"].strip()
#     remark = row["REMARK"].strip()

#     # Case 1: New file (has a FILE NO)
#     if file_no:
#         current_file = {
#             "file_no": file_no,
#             "file_name": file_name,
#             "current": current,
#             "record": record,
#             "completed": completed,
#             "remark": remark,
#             "sub_files": []
#         }
#         records.append(current_file)

#     # Case 2: Subfile (no FILE NO)
#     elif current_file and file_name:
#         sub = {
#             "name": file_name,
#             "current": current,
#             "record": record,
#             "completed": completed,
#             "remark": remark
#         }
#         current_file["sub_files"].append(sub)

# # Save cleaned version as JSON
# with open("public/cleaned_files.json", "w", encoding="utf-8") as f:
#     json.dump(records, f, indent=2, ensure_ascii=False)

# print("✅ Cleaned data saved to cleaned_files.json")


import pandas as pd
import json

# --- Configuration ---
# Your original data file (must be in the same folder as this script)
# Make sure your columns are named this way in the file!
SOURCE_FILE = 'data.xlsx' 
OUTPUT_FILE = 'new_cleaned_files.json'

COLUMNS = ['FILE NO', 'FILE NAME', 'CURRENT', 'RECORD', 'COMPLETED', 'REMARK']
# ---------------------

def process_data():
    print(f"Reading data from {SOURCE_FILE}...")
    
    # --- 1. Read the Data ---
    # Use this line for CSV
    try:
        # df = pd.read_csv(SOURCE_FILE) # <-- 2. COMMENTED THIS OUT
        df = pd.read_excel(SOURCE_FILE, sheet_name='ALL PROJECTS LIST ') # <-- 3. UNCOMMENTED & CHANGED THIS
        
    except FileNotFoundError:
        print(f"ERROR: Could not find {SOURCE_FILE}.")
        print("Please place your original data file in the same folder as this script.")
        return
    except Exception as e:
        print(f"Error reading file: {e}")
        return
        
    # --- UNCOMMENT THE LINE BELOW IF YOU HAVE AN EXCEL FILE ---
    # df = pd.read_excel(SOURCE_FILE, sheet_name='ALL PROJECT LIST')

    # --- 2. Clean the Data ---
    # Drop rows where *all* important columns are blank
    df = df.dropna(how='all', subset=COLUMNS)
    # Replace all remaining 'NaN' (blank cells) with an empty string
    df = df.fillna('')
    
    processed_data = []
    current_parent_sub_files = None # Stores a reference to the parent's sub_files list

    print(f"Processing {len(df)} rows...")

    # --- 3. Loop Through and Group ---
    for _, row in df.iterrows():
        file_no = str(row['FILE NO']).strip()
        file_name = str(row['FILE NAME']).strip()
        
        # Check if this is a PARENT row (it has a FILE NO)
        if file_no:
            parent_record = {
                "file_no": file_no,
                "file_name": file_name,
                "current": str(row['CURRENT']).strip(),
                "record": str(row['RECORD']).strip(),
                "completed": str(row['COMPLETED']).strip(),
                "remark": str(row['REMARK']).strip(),
                "sub_files": []  # Initialize an empty list for sub-files
            }
            processed_data.append(parent_record)
            # Store a reference to this parent's sub_files list
            current_parent_sub_files = parent_record['sub_files']
            
        # Check if this is a CHILD row (no FILE NO, but has a FILE NAME)
        elif file_name: 
            if current_parent_sub_files is not None:
                # This is a sub-file, add it to the last seen parent
                sub_file = {
                    "name": file_name,
                    "current": str(row['CURRENT']).strip(),
                    "record": str(row['RECORD']).strip(),
                    "completed": str(row['COMPLETED']).strip(),
                    "remark": str(row['REMARK']).strip()
                }
                # Only add non-empty key/value pairs
                sub_file_cleaned = {k: v for k, v in sub_file.items() if v}
                
                current_parent_sub_files.append(sub_file_cleaned)
            else:
                print(f"Warning: Found a sub-file '{file_name}' with no parent. Skipping.")
        
        # Else: This is a totally blank row (no file_no or file_name), so we ignore it.

    # --- 4. Save the New JSON File ---
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(processed_data, f, indent=2, ensure_ascii=False)
        
    print(f"\nSuccess! Processed {len(processed_data)} parent files.")
    print(f"New file created: {OUTPUT_FILE}")

if __name__ == "__main__":
    process_data()