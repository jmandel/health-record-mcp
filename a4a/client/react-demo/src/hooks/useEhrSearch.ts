import { useCallback } from 'react';
import { grepRecordLogic } from '../tools'; // Assuming tools are accessible
import { summarizeMarkdown } from '../utils/textUtils'; // <-- Updated import path
import { useEhrContext } from '../context/EhrContext';

export type EhrSearchFn = (
  keywords: string[],
  opts?: { max?: number; signal?: AbortSignal } // Note: max/signal not currently used by grepRecordLogic
) => Promise<{
  md: string;           // raw markdown hits for Gemini
  summary: string;      // 150-char human summary
}>;

interface UseEhrSearchReturn {
  ehrSearch: EhrSearchFn;
  isEhrDataAvailable: boolean;
}

export const useEhrSearch = (): UseEhrSearchReturn => {
  const { ehrData } = useEhrContext();

  const ehrSearch = useCallback<EhrSearchFn>(
    async (keywords, opts) => {
      if (!ehrData) {
        throw new Error("EhrSearchFn called when EHR data is not available.");
      }

      // Basic input validation
      if (!keywords || keywords.length === 0) {
         return { md: "**No keywords provided for search.**", summary: "No keywords provided." };
      }

      // Construct regex query (simple OR for now)
      // Escape regex special characters in keywords
      const escapedKeywords = keywords.map(k => k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
      const regexQuery = escapedKeywords.join('|'); // Use '|' for OR logic
      console.log(`[useEhrSearch] Constructed grep query: /${regexQuery}/gi`);

      let grepResultMarkdown: string = "";
      let grepResultSummary: string = "";
      try {
        let {markdown, filteredEhr} = await grepRecordLogic(ehrData, regexQuery);
        grepResultMarkdown = markdown;
        // count total resources (sum over # of all types) + attachments
        grepResultSummary =  `Found ${Object.values(filteredEhr.fhir).reduce((sum, typeMap) => sum + Object.keys(typeMap).length, 0)} resources and ${filteredEhr.attachments.length} attachments.`;
      } catch (grepError: any) {
        console.error("[useEhrSearch] Error calling grepRecordLogic:", grepError);
        grepResultMarkdown = `**Error during EHR search:** ${grepError.message || 'Unknown error'}`;
      }
      // console.log("[useEhrSearch] Grep Result Markdown length:", grepResultMarkdown?.length || 0);

      
      return { md: grepResultMarkdown || "**No results found.**", summary: grepResultSummary || "Search complete, no summary generated." };
    },
    [ehrData] // Dependency: ehrData from context
  );

  return {
    ehrSearch,
    isEhrDataAvailable: !!ehrData,
  };
};
