import React, { createContext, useContext } from 'react';
import { FullEHR } from '../EhrApp';

// Create the context, initially undefined
const EhrContext = createContext<FullEHR | undefined>(undefined);

// Provider component
export const EhrProvider: React.FC<{ ehrData: FullEHR; children?: React.ReactNode }> = ({ ehrData, children }) => (
    <EhrContext.Provider value={ehrData}>{children}</EhrContext.Provider>
);

// Hook to access the context
export function useEhrContext(): FullEHR {
    const context = useContext(EhrContext);
    if (!context) {
        throw new Error('useEhrContext must be used within an EhrProvider');
    }
    return context;
} 