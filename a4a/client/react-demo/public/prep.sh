#!/bin/bash

# --- Configuration ---
INPUT_DIR="premera_policies"
OUTPUT_DIR="premera_policies_markdown"
MODEL="gemini-2.5-flash-preview-04-17"
# --- End Configuration ---

# --- Define the Prompt Inline in a Bash Variable ---
# Using a heredoc to assign the multi-line prompt to a variable.
# Quoting 'EOF' prevents variable/command expansion within the heredoc.
read -r -d '' PROMPT_TEXT <<'EOF'
Please perform a perfect Markdown transcription of the provided PDF policy document.

Focus on accurately capturing all text content starting with the policy title. Repreesnt the title with #.

Represent treatments and indications using ## / ### as appropriate.

Convert tables to simple bullet lists, using sections where helpfuli.

Completely OMIT any sections titled 'Clinical Evidence Summary', 'Bibliography', or 'History of changes to policy', along with all content that falls under those specific headings.

Output *only* the transcribed Markdown content, without any introductory or concluding remarks from you.
EOF

# --- Process Files ---
# Ensure the input directory exists
if [ ! -d "$INPUT_DIR" ]; then
  echo "Error: Input directory '$INPUT_DIR' not found."
  exit 1
fi

# Create the output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

echo "Starting transcription process..."
echo "Input Directory: $INPUT_DIR"
echo "Output Directory: $OUTPUT_DIR"
echo "Model: $MODEL"
echo "Using inline prompt defined in script variable."
echo "-------------------------------------"

# Loop through all PDF files in the input directory
for pdf_file in "$INPUT_DIR"/*.pdf; do
  # Check if the file exists (handles cases where no PDFs are found)
  [ -e "$pdf_file" ] || continue

  # Get the base filename without the extension
  base_name=$(basename "$pdf_file" .pdf)
  output_md_file="$OUTPUT_DIR/$base_name.md"

  echo "--- Processing '$pdf_file' -> '$output_md_file' ---"
  echo "(Output will be displayed below and saved to file)"

  # Run the llm command
  # -m: Specifies the model
  # -a: Attaches the PDF file for the model to process
  # "$PROMPT_TEXT": Passes the prompt defined above as the main argument
  # | tee: Pipes the output to tee for display and saving
  llm -m "$MODEL" -a "$pdf_file" "$PROMPT_TEXT" | tee "$output_md_file"

  # Check the exit status of the tee command
  if [ $? -eq 0 ]; then
      echo -e "\n--- Finished processing '$pdf_file'. Output saved to '$output_md_file' ---"
  else
      echo -e "\n--- Error processing '$pdf_file'. Check output above. ---"
  fi

  # Optional: Add a small delay to avoid hitting rate limits
  # sleep 1

done

echo "-------------------------------------"
echo "Transcription process finished."
echo "Markdown files are located in '$OUTPUT_DIR'."

exit 0
