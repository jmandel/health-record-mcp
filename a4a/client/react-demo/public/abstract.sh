#!/bin/bash

# --- Configuration ---
INPUT_DIR="premera_policies"
OUTPUT_DIR="premera_policies_abstracted"
PROMPT_FILE="abstract.md" # Prompt defining the abstraction task
MODEL="gemini-2.5-flash-preview-04-17"
# --- End Configuration ---

# --- Validate Prompt File ---
if [ ! -f "$PROMPT_FILE" ]; then
  echo "Error: Prompt file '$PROMPT_FILE' not found."
  exit 1
fi
echo "Using prompt file: $PROMPT_FILE"
# Read the prompt content
PROMPT_TEXT=$(cat "$PROMPT_FILE")
if [ -z "$PROMPT_TEXT" ]; then
   echo "Error: Prompt file '$PROMPT_FILE' is empty."
   exit 1
fi

# --- Process Files ---
# Determine files to process: CLI args or default input directory
if [ "$#" -gt 0 ]; then
  files=( "$@" )
  # Validate provided files
  for md_file in "${files[@]}"; do
    if [ ! -f "$md_file" ]; then
      echo "Error: File '$md_file' not found or not a regular file."
      exit 1
    fi
  done
else
  # Ensure the input directory exists
  if [ ! -d "$INPUT_DIR" ]; then
    echo "Error: Input directory '$INPUT_DIR' not found."
    exit 1
  fi
  files=( "$INPUT_DIR"/*.md )
fi

# Create the output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

echo "Starting abstraction process..."
if [ "$#" -gt 0 ]; then
  echo "Files to process: ${files[*]}"
else
  echo "Input Directory: $INPUT_DIR"
fi
echo "Output Directory: $OUTPUT_DIR"
echo "Model: $MODEL"
echo "-------------------------------------"

# Loop through selected Markdown files
for md_file in "${files[@]}"; do
  # Skip if file doesn't exist (handles glob no-match)
  [ -e "$md_file" ] || continue

  # Get the base filename without the extension
  base_name=$(basename "$md_file" .md)
  output_json_file="$OUTPUT_DIR/$base_name.json" # Output as JSON

  echo "--- Processing '$md_file' -> '$output_json_file' ---"

  # Read the markdown file content
  MARKDOWN_CONTENT=$(cat "$md_file")
  if [ -z "$MARKDOWN_CONTENT" ]; then
      echo "Warning: Skipping empty file '$md_file'."
      continue
  fi

  # Combine prompt and markdown content for the LLM input
  # Use $'\n' for portability across shells for newline
  COMBINED_INPUT="$PROMPT_TEXT"$'\n\n---\n\n'"$MARKDOWN_CONTENT"
  echo "$COMBINED_INPUT"

  echo "(Running LLM command... Output will be displayed below and saved to file)"

  # Run the LLM command, capture raw output then strip code fences before saving
  temp_output=$(mktemp) || { echo "Error: Unable to create temporary file"; exit 1; }
  llm -m "$MODEL" "$COMBINED_INPUT" | tee "$temp_output"
  pipeline_status=${PIPESTATUS[0]}
  sed '/^```/d' "$temp_output" > "$output_json_file"
  rm "$temp_output"

  if [ $pipeline_status -eq 0 ]; then
      # Basic JSON validation (optional but helpful)
      if jq . "$output_json_file" > /dev/null 2>&1; then
          echo -e "\n--- Finished processing '$md_file'. JSON output saved to '$output_json_file' (Valid JSON) ---"
      else
          echo -e "\n--- Warning: Finished processing '$md_file', but output in '$output_json_file' is NOT valid JSON. ---"
      fi
  else
      echo -e "\n--- Error processing '$md_file' (LLM exit code: $pipeline_status). Check output above. '$output_json_file' may be incomplete or invalid. ---"
  fi

  # Optional: Add a small delay to avoid hitting rate limits
  # sleep 1
done

echo "-------------------------------------"
echo "Abstraction process finished."
echo "JSON files are located in '$OUTPUT_DIR'."

exit 0
