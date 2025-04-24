import json
import os
import glob

# --- Configuration ---
# Directory containing the JSON files (can be relative or absolute)
source_directory = "premera_policies_abstracted"
# Pattern to match files within the directory
# Use *.json to get all json files, or be more specific if needed
file_pattern = os.path.join(source_directory, "*.json")
# --- End Configuration ---

# Find all files matching the pattern
json_files = glob.glob(file_pattern)

if not json_files:
    print(f"No files found matching pattern: {file_pattern}")
    exit()

print(f"Found {len(json_files)} files matching pattern. Processing...\n")

# List to store extracted data from all valid files (optional)
all_extracted_data = []

for file_path in json_files:
    base_filename = os.path.basename(file_path)
    print(f"--- Processing: {base_filename} ---")

    try:
        # Open and read the file
        with open(file_path, 'r', encoding='utf-8') as f:
            # Attempt to parse the JSON content
            data = json.load(f)

        # Check if the loaded data is a dictionary (basic structure check)
        if not isinstance(data, dict):
            print(f"Skipping {base_filename}: Root element is not a JSON object (dictionary).")
            print("-" * (len(base_filename) + 20))
            continue

        # Extract required fields using .get() for safety against missing keys
        # Use default values (like {} or []) to avoid errors if top-level keys are missing
        policy_metadata = data.get('policyMetadata', {})
        title = policy_metadata.get('policyTitle', 'N/A') # Default to 'N/A' if title is missing

        treatments = data.get('treatments', []) # Default to empty list if missing
        indications = data.get('indications', []) # Default to empty list if missing

        # Ensure treatments and indications are lists, even if present but wrong type
        if not isinstance(treatments, list):
             print(f"Warning: 'treatments' in {base_filename} is not a list. Using empty list.")
             treatments = []
        if not isinstance(indications, list):
             print(f"Warning: 'indications' in {base_filename} is not a list. Using empty list.")
             indications = []

        for t in treatments:
            t.pop("keywords", None) # Use pop with None default for safety
            t.pop("codes", None)
            t.pop("id", None)
        for i in indications: # Changed variable name from 't' to 'i'
            i.pop("keywords", None)
            i.pop("codes", None)
            i.pop("id", None)

        # Prepare the dictionary with extracted information
        extracted_info = {
            "policyTitle": title,
            "sourceFilename": base_filename,
            "treatments": treatments,
            "indications": indications
        }

        # Create and print compact format for standard output
        treatment_names = [t.get('name', 'N/A') for t in treatments]
        indication_names = [i.get('name', 'N/A') for i in indications] # Changed variable name

        # Extract file stem (remove .json extension)
        file_stem, _ = os.path.splitext(base_filename)

        # Construct the new compact output string
        compact_output = f"{file_stem}: {title} Treatments: [{', '.join(treatment_names)}]; Indications: [{', '.join(indication_names)}]"
        print(compact_output)

        # Add the compact string to the list
        all_extracted_data.append(compact_output)

    except json.JSONDecodeError as e:
        # Handle files that are not valid JSON
        print(f"Skipping {base_filename}: Invalid JSON structure - {e}")
    except FileNotFoundError:
        # Handle case where file disappears between glob and open (rare)
        print(f"Skipping {base_filename}: File not found.")
    except Exception as e:
        # Catch any other unexpected errors during file processing
        print(f"Skipping {base_filename}: An unexpected error occurred - {e}")

    print("-" * (len(base_filename) + 20)) # Print a separator line

print(f"\nProcessing complete. Extracted data from {len(all_extracted_data)} valid files.")

# Optional: You can now use the 'all_extracted_data' list for further processing,
# like writing it to a single combined output file.
# Example:
if all_extracted_data:
    output_filename = "policies_compact.txt" # Changed output filename and extension
    with open(output_filename, 'w', encoding='utf-8') as outfile:
        # Write each compact string on a new line
        for line in all_extracted_data:
            outfile.write(line + '\n')
    print(f"\nCompact data saved to {output_filename}")
